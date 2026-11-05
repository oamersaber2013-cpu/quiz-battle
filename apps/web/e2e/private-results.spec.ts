import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.addInitScript(() => localStorage.setItem("quiz-battle-storage", JSON.stringify({
    state: { userId: "fixture-player", username: "Warrior", token: "fixture-token", isGuest: true, language: "en" }, version: 0,
  })));
});

test("reloads saved standings through authenticated fetch with the room's Arabic layout", async ({ page }) => {
  await page.route("**/api/results/saved-browser-battle", async (route) => {
    if (route.request().method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization" } });
      return;
    }
    expect(route.request().headers()["authorization"]).toBe("Bearer fixture-token");
    await route.fulfill({ headers: { "Access-Control-Allow-Origin": "*" }, json: {
      gameId: "saved-browser-battle", mode: "classic", difficulty: "novice", language: "ar", totalRounds: 8, endedAt: "2026-11-05T10:00:00Z",
      results: [{ userId: "fixture-player", username: "محارب محفوظ", score: 1500, rank: 1, correctAnswers: 6, totalAnswers: 8, avgAnswerTime: 900, xpEarned: 20 }],
    } });
  });
  await page.goto("/results/saved-browser-battle");
  await expect(page.getByText("محارب محفوظ", { exact: false })).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(page.getByText("محارب محفوظ", { exact: false })).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
});

test("requires a valid private password and clears it when returning to a public room", async ({ page }) => {
  await page.route("**/api/purchase/status", (route) => route.fulfill({ headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization" }, json: { hasPurchased: true, shortGames: 3, longGames: 2, price: 35 } }));
  await page.goto("/");
  await page.getByRole("button", { name: /Create Battle Room/ }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  const privateRoom = page.getByRole("checkbox", { name: /Private room with a password/ });
  await privateRoom.check();
  const password = page.getByLabel("Room password", { exact: true });
  const create = page.getByRole("button", { name: /Create Battle Room/ });
  await expect(create).toBeDisabled();
  await password.fill("ع".repeat(37));
  await expect(create).toBeDisabled();
  await password.fill(" browser-only key ");
  await expect(create).toBeEnabled();
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain("browser-only key");
  await privateRoom.uncheck();
  await privateRoom.check();
  await expect(password).toHaveValue("");
  await expect(create).toBeDisabled();
});
