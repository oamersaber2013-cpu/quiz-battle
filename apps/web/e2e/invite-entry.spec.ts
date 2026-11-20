import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("opens a fresh Arabic invitation and explains an expired code without losing it", async ({ page }) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  let guestRequests = 0;
  await page.routeWebSocket(/socket\.io/, socket => socket.close());
  await page.route("**/api/auth/guest", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    guestRequests++;
    expect(route.request().postDataJSON()).toEqual({ username: "زائر الجوال" });
    await route.fulfill({ headers: cors, json: { userId: "invited-guest", username: "زائر_12", token: "fixture-token", isGuest: true } });
  });
  await page.route("**/api/games/join/AB12CD", route => route.fulfill({ status: 404, headers: cors, json: { error: "Game not found" } }));
  await page.goto("/?join=%E2%80%8Fab12cd%20&lang=ar");
  const code = page.getByRole("textbox", { name: "كود الانضمام", exact: true });
  await expect(code).toHaveValue("AB12CD");
  await expect(page.getByRole("textbox", { name: "ادخل اسمك", exact: true })).toBeFocused();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  expect(guestRequests).toBe(0);
  await page.getByRole("textbox", { name: "ادخل اسمك", exact: true }).fill("زائر الجوال");
  await page.getByRole("button", { name: "انضم إلى الغرفة", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("رمز الغرفة غير صحيح");
  await expect(code).toHaveValue("AB12CD");
  await expect(code).toHaveAttribute("aria-invalid", "true");
  expect(guestRequests).toBe(0);
  await expect(page.getByRole("textbox", { name: "ادخل اسمك", exact: true })).toHaveValue("زائر الجوال");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage") || "{}").state?.userId)).toBeFalsy();
  await code.fill("ab١٢ce");
  await expect(code).toHaveValue("AB12CE");
  await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
});

test("keeps immediate typing in the name field when an invitation hydrates", async ({ page }) => {
  await page.goto("/?join=AB12CD&lang=ar", { waitUntil: "domcontentloaded" });
  await page.locator("#player-name").fill("ضيف الجوال");
  await expect(page.locator("form #player-name")).toHaveValue("ضيف الجوال");
  await expect(page.getByRole("textbox", { name: "كود الانضمام", exact: true })).toHaveValue("AB12CD");
  await expect(page.getByRole("button", { name: "انضم إلى الغرفة", exact: true })).toBeEnabled();
});

test("explains an unsupported guest name before sending a join request", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => { if (/\/api\/(auth\/guest|games\/join\/)/.test(request.url())) requests.push(request.url()); });
  await page.goto("/?join=AB12CD&lang=ar");
  const name = page.getByRole("textbox", { name: "ادخل اسمك", exact: true });
  await name.fill("Omar!@");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "انضم إلى الغرفة", exact: true })).toBeDisabled();
  await expect(page.locator("#player-name-help")).toContainText("حروف");
  await name.fill("عُمَر-7");
  await expect(name).toHaveAttribute("aria-invalid", "false");
  await expect(page.getByRole("button", { name: "انضم إلى الغرفة", exact: true })).toBeEnabled();
  expect(requests).toEqual([]);
});

test("keeps an older direct invitation and spectator intent on a fresh browser", async ({ page }) => {
  await page.goto("/lobby/older-browser-room?spectate=true");
  await expect(page).toHaveURL(/\?room=older-browser-room&lang=en&spectate=true$/);
  await expect(page.getByRole("heading", { name: "Join invited room" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Enter your warrior name", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Watch match", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Join Code", exact: true })).toHaveCount(0);
});

test("accepts a formatted copied code and leaves an overlong code invalid", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Join with Code", exact: true }).click();
  const code = page.getByRole("textbox", { name: "Join Code", exact: true });
  await code.fill(" \u200eab12cd\u200f ");
  await expect(code).toHaveValue("AB12CD");
  await expect(page.getByRole("button", { name: "Join room", exact: true })).toBeEnabled();
  await code.fill("AB12CDX");
  await expect(code).toHaveValue("AB12CDX");
  await expect(page.getByRole("button", { name: "Join room", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("preserves an invitation through registration links and a successful sign-in", async ({ page }) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  await page.routeWebSocket(/socket\.io/, socket => socket.close());
  await page.route("**/api/auth/login", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    await route.fulfill({ headers: cors, json: { userId: "signed-invite", username: "SignedPlayer", token: "fixture-token" } });
  });
  await page.goto("/?join=AB12CD&lang=en");
  await page.getByRole("link", { name: "Sign In", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?returnTo=/);
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/?join=AB12CD&lang=en");
  await page.getByRole("link", { name: "Create an account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  expect(new URL(page.url()).searchParams.get("returnTo")).toBe("/?join=AB12CD&lang=en");
  await page.getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
  await page.getByLabel("Email address", { exact: true }).fill("player@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/\?join=AB12CD&lang=en$/);
  await expect(page.getByRole("textbox", { name: "Join Code", exact: true })).toHaveValue("AB12CD");
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
  const identity = page.locator("#player-name");
  await expect(identity).not.toBeEditable();
  await expect(identity).toHaveValue("SignedPlayer");
});
