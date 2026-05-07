import { test, expect } from "@playwright/test";

test.describe("Game Creation", () => {
  test("should create and join a game", async ({ page }) => {
    await page.goto("/");
    
    await expect(page.locator("h1")).toContainText("Sword of Knowledge");
    
    await page.click('button:has-text("Create Game")');
    
    await page.selectOption('select[name="mode"]', "Solo");
    await page.selectOption('select[name="difficulty"]', "Novice");
    await page.selectOption('select[name="category"]', "General");
    
    await page.click('button:has-text("Create")');
    
    await expect(page).toHaveURL(/\/lobby\/.+/);
    
    const joinCode = await page.locator('[data-testid="join-code"]').textContent();
    expect(joinCode).toBeTruthy();
  });

  test("should handle mobile touch interactions", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto("/");
    
    await page.tap('button:has-text("Create Game")');
    
    await expect(page.locator("select")).toBeVisible();
  });
});

test.describe("Game Play", () => {
  test("should answer questions correctly", async ({ page }) => {
    await page.goto("/");
    
    await page.evaluate(() => {
      localStorage.setItem("token", "test-token");
      localStorage.setItem("userId", "test-user");
    });
    
    await page.goto("/game/test-game-id");
    
    await page.waitForSelector('[data-testid="question"]');
    
    await page.click('[data-testid="answer-0"]');
    
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
