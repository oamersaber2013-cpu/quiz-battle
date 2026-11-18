import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sword of Knowledge");
});

test("advances through the real room-creation wizard", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.getByRole("button", { name: /Create Battle Room/ }).click();
  await expect(page.getByRole("heading", { name: "Choose Game Mode" })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  await expect(page.getByRole("heading", { name: "Choose Category" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Mixed Trivia/ })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  await expect(page.getByRole("heading", { name: "Difficulty Level" })).toBeVisible();
  await page.getByRole("button", { name: /Novice/ }).click();
  await expect(page.getByText("Game Summary", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("preserves Arabic language and RTL after a reload", async ({ page }) => {
  await page.getByRole("button", { name: /العربية/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("سيف المعرفة");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("سيف المعرفة");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).not.toContain("user-scalable=no");
  expect(viewport).not.toContain("maximum-scale=1");
  await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
  await page.getByRole("button", { name: "التالي →" }).click();
  await expect(page.getByRole("heading", { name: "اختر القسم" })).toBeVisible();
});

test("joins by keyboard and announces an invalid room code", async ({ page }) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type" };
  await page.route("**/api/auth/guest", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    expect(route.request().postDataJSON()).toEqual({ username: "Keyboard Guest" });
    await route.fulfill({
      headers: cors,
      json: { userId: "join-player", username: "Keyboard Gues_ab12ef", token: "fixture-token", isGuest: true },
    });
  });
  await page.route("**/api/games/join/AB12CD", (route) => route.fulfill({
    headers: cors,
    status: 404,
    json: { error: "Game not found" },
  }));

  await page.getByRole("textbox", { name: "Enter your warrior name" }).fill("Keyboard Guest");
  const openJoin = page.getByRole("button", { name: /Join with Code/ });
  await openJoin.focus();
  await page.keyboard.press("Enter");
  const code = page.getByRole("textbox", { name: /Join Code/ });
  const join = page.getByRole("button", { name: /Join Code/ });
  await expect(code).toBeFocused();
  await expect(join).toBeDisabled();
  await code.fill("ab12");
  await expect(code).toHaveValue("AB12");
  await expect(join).toBeDisabled();
  await code.fill("ab12cd");
  await expect(code).toHaveValue("AB12CD");
  await expect(join).toBeEnabled();

  const lookup = page.waitForResponse((response) => response.url().endsWith("/api/games/join/AB12CD"));
  await code.press("Enter");
  expect((await lookup).status()).toBe(404);
  const savedName = await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage") || "{}").state.username);
  expect(savedName).toBe("Keyboard Gues_ab12ef");
  const joinError = page.locator("main").getByRole("alert");
  await expect(joinError).toHaveText("Invalid join code");
  await expect(code).toHaveAttribute("aria-invalid", "true");
  await code.fill("ab12ce");
  await expect(joinError).toHaveCount(0);
  await page.getByRole("button", { name: /Back/ }).click();
  await expect(openJoin).toBeFocused();
});

test("recovers the same page after losing the connection", async ({ page, context }) => {
  await page.goto("/stats");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise<void>(resolve => {
      navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), { once: true });
    });
  });
  await context.setOffline(true);
  try {
    await page.reload();
    await expect(page.getByRole("link", { name: /Retry/ })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
  await page.getByRole("link", { name: /Retry/ }).click();
  await expect(page.getByRole("heading", { name: "Player statistics" })).toBeVisible();
  await expect(page).toHaveURL(/\/stats$/);
});
