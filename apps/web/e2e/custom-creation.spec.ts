import { expect, test } from "@playwright/test";

test("creates Custom from the visible settings without a blocking dialog", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: {
      userId: "custom-browser-host", token: "custom-browser-token", username: "Custom host", isGuest: true, language: "en",
    } }));
  });
  let body: any;
  await page.route("**/api/games", async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      gameId: "custom-browser-room", joinCode: "CUSTOM", mode: "custom", difficulty: body.customSettings.difficulty,
      totalRounds: body.customSettings.rounds, maxPlayers: body.customSettings.maxPlayers, customSettings: body.customSettings,
    }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Create Battle Room/ }).click();
  await page.getByText("Custom", { exact: true }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("textbox", { name: "Battle name" }).fill("Quick private quiz");
  await page.getByRole("spinbutton", { name: "Number of rounds" }).fill("2");
  await page.getByRole("combobox", { name: "Seconds per question" }).selectOption("5");
  await page.getByRole("combobox", { name: "Difficulty" }).selectOption("master");
  await page.getByRole("spinbutton", { name: "Player limit" }).fill("4");
  await page.getByRole("combobox", { name: "Question category" }).selectOption("science");
  await page.getByRole("button", { name: "Disable all powers" }).click();
  await page.getByRole("button", { name: /Create Battle Room/ }).click();
  await expect(page).toHaveURL(/\/lobby\/custom-browser-room$/);
  expect(body).toMatchObject({ mode: "custom", difficulty: "master", customSettings: {
    name: "Quick private quiz", rounds: 2, timePerQuestion: 5, difficulty: "master",
    enabledPowerUps: [], maxPlayers: 4, categoryFilter: "science",
  } });
});
