import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("shows real dashboard totals and keeps denied requests out of the statistics", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("quiz-battle-storage", JSON.stringify({
    version: 0, state: { token: "admin-ui-fixture", language: "en" },
  })));
  const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization" };
  let allowed = true;
  await page.route("**/api/admin/stats", async route => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
    expect(route.request().headers().authorization).toBe("Bearer admin-ui-fixture");
    return route.fulfill({ headers, status: allowed ? 200 : 403, json: allowed
      ? { totalUsers: 17, totalGames: 4, totalQuestions: 25, activeGames: 2, suspiciousUsers: [] }
      : { error: "Forbidden" } });
  });
  await page.goto("/admin/dashboard");
  await expect(page.locator("dd").first()).toHaveText("17");
  allowed = false;
  await page.reload();
  await expect(page.getByRole("heading", { name: "Administrator access required" })).toBeVisible();
  await expect(page.locator("dd")).toHaveCount(0);
});
