import { expect, test } from "@playwright/test";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const player = { userId: "standings-player", username: "KnowledgeKeeper", token: "standings-token", isGuest: true };
const endedAt = "2026-11-18T10:00:00Z";

test.use({ serviceWorkers: "block" });

for (const language of ["en", "ar"] as const) {
  test(`keeps saved placements and mode units through results, statistics and play again (${language})`, async ({ page }, testInfo) => {
    const ar = language === "ar";
    const mutations: string[] = [];
    // All API responses are local fixtures; this flow never writes a public record.
    await page.route("**/api/**", route => {
      if (!["GET", "OPTIONS"].includes(route.request().method())) mutations.push(route.request().method());
      return route.abort();
    });
    await page.addInitScript(({ player, language }) => {
      localStorage.setItem("quiz-battle-storage", JSON.stringify({ state: { ...player, language: language === "ar" ? "en" : "ar" }, version: 0 }));
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Permission denied"); } } });
    }, { player, language });
    await page.route("**/api/results/standings-fixture", async route => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      expect(route.request().method()).toBe("GET");
      expect(route.request().headers().authorization).toBe("Bearer standings-token");
      await route.fulfill({ headers: cors, json: {
        gameId: "standings-fixture", mode: "conquest", difficulty: "novice", language, totalRounds: 12, endedAt,
        // Response order deliberately differs from the persisted rank order.
        results: [
          { userId: "peer", username: ar ? "محارب آخر" : "Other player", rank: 2, score: 8, correctAnswers: 6, totalAnswers: 15, avgAnswerTime: 2300, xpEarned: 10 },
          { ...player, username: ar ? "حارس المعرفة" : player.username, rank: 1, score: 8, correctAnswers: 12, totalAnswers: 15, avgAnswerTime: 1200, xpEarned: 20 },
        ],
      } });
    });
    await page.route("**/api/user/stats", async route => {
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
      expect(route.request().method()).toBe("GET");
      expect(route.request().headers().authorization).toBe("Bearer standings-token");
      await route.fulfill({ headers: cors, json: {
        memberSince: endedAt, achievements: [], totalGames: 2, wins: 1, totalScore: 808, totalAnswers: 18, correctAnswers: 12,
        history: [
          { id: "standings-fixture", mode: "conquest", endedAt, playerCount: 2, score: 8, rank: 1 },
          { id: "classic-fixture", mode: "classic", endedAt, playerCount: 2, score: 800, rank: 2 },
        ],
      } });
    });

    await page.goto("/results/standings-fixture");
    await expect(page.getByRole("heading", { name: ar ? "تعادل في أعلى رصيد" : "Top score tied" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator("main")).toHaveAttribute("dir", ar ? "rtl" : "ltr");
    const standings = page.getByRole("listitem");
    await expect(standings.first()).toContainText(ar ? "حارس المعرفة" : player.username);
    await expect(standings.last()).toContainText(ar ? "محارب آخر" : "Other player");
    await expect(standings.first()).toContainText(ar ? "رصيد متساوٍ" : "Equal score");
    await expect(page.getByText(new Intl.NumberFormat(language, { style: "percent" }).format(.8), { exact: true })).toBeVisible();
    await page.getByRole("button", { name: ar ? "شارك النتيجة" : "Share Result", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(ar ? "تعذر نسخ نتيجتك. حاول مجدداً." : "Could not copy your result. Try again.");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const resultShot = testInfo.outputPath(`results-${language}.png`);
    await page.screenshot({ path: resultShot, fullPage: true });
    await testInfo.attach(`results-${language}`, { path: resultShot, contentType: "image/png" });

    await page.getByRole("link", { name: ar ? "إحصائياتي" : "My statistics", exact: true }).click();
    await expect(page.getByRole("heading", { name: ar ? "إحصائيات اللاعب" : "Player statistics", exact: true })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.getByText(ar ? "الإجابات المُرسلة" : "Answers submitted", { exact: true })).toBeVisible();
    await expect(page.locator('a[href="/results/standings-fixture"]')).toContainText(ar ? "أقاليم" : "territories");
    await expect(page.locator('a[href="/results/classic-fixture"]')).toContainText(ar ? "نقطة" : "points");
    await expect(page.getByRole("link", { name: ar ? "ابدأ معركة" : "Start a battle", exact: true })).toHaveAttribute("href", "/");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const statsShot = testInfo.outputPath(`statistics-${language}.png`);
    await page.screenshot({ path: statsShot, fullPage: true });
    await testInfo.attach(`statistics-${language}`, { path: statsShot, contentType: "image/png" });

    await page.locator('a[href="/results/standings-fixture"]').click();
    await expect(page.getByRole("heading", { name: ar ? "تعادل في أعلى رصيد" : "Top score tied" })).toBeVisible();
    await page.getByRole("button", { name: ar ? "العب مجدداً" : "Play Again", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    const identity = await page.evaluate(() => JSON.parse(localStorage.getItem("quiz-battle-storage") || "{}").state);
    expect(identity).toMatchObject({ ...player, language });
    expect(mutations).toEqual([]);
  });
}
