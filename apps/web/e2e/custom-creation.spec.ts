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
  await page.getByRole("combobox", { name: "Question category" }).selectOption("sports");
  await expect(page.getByRole("combobox", { name: "Difficulty" })).toHaveValue("novice");
  await expect(page.getByRole("combobox", { name: "Difficulty" }).locator("option")).toHaveCount(1);
  await page.getByRole("combobox", { name: "Question category" }).selectOption("science");
  await page.getByRole("combobox", { name: "Difficulty" }).selectOption("master");
  await page.getByRole("spinbutton", { name: "Player limit" }).fill("4");
  await expect(page.getByRole("checkbox", { name: "Echo", exact: true })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Extra time", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Disable all powers" }).click();
  await page.getByRole("button", { name: /Create Battle Room/ }).click();
  await expect(page).toHaveURL(/\/lobby\/custom-browser-room$/);
  expect(body).toMatchObject({ mode: "custom", difficulty: "master", customSettings: {
    name: "Quick private quiz", rounds: 2, timePerQuestion: 5, difficulty: "master",
    enabledPowerUps: [], maxPlayers: 4, categoryFilter: "science",
  } });
});

test("keeps Arabic Custom settings usable at 320px and submits the selected power only", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    localStorage.setItem("quiz-battle-storage", JSON.stringify({ version: 0, state: {
      userId: "custom-arabic-host", token: "custom-arabic-token", username: "مضيف تجريبي", isGuest: true, language: "ar",
    } }));
  });
  let body: any;
  await page.route("**/api/games", async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
      gameId: "custom-arabic-room", joinCode: "ARABIC", mode: "custom", difficulty: body.customSettings.difficulty,
      totalRounds: body.customSettings.rounds, maxPlayers: body.customSettings.maxPlayers, customSettings: body.customSettings,
    }) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
  await page.getByRole("radio", { name: /مخصص/ }).check();
  await page.getByRole("button", { name: "التالي →" }).click();
  await page.getByRole("button", { name: "التالي →" }).click();
  await page.getByRole("textbox", { name: "اسم المعركة" }).fill("تحدي الأصدقاء في المعلومات العلمية والثقافية");
  const playerLimit = page.getByRole("spinbutton", { name: "الحد الأقصى للاعبين" });
  await playerLimit.focus();
  await playerLimit.press("ControlOrMeta+A");
  await playerLimit.pressSequentially("10");
  await expect(playerLimit).toHaveValue("10");
  await playerLimit.press("Tab");
  await expect(playerLimit).toHaveValue("10");
  const roundsInput = page.getByRole("spinbutton", { name: "عدد الجولات" });
  await roundsInput.fill("3.5");
  await expect(roundsInput).toHaveValue("3.5");
  await roundsInput.press("Tab");
  await expect(roundsInput).toHaveValue("3");
  await roundsInput.fill("");
  await expect(roundsInput).toHaveValue("");
  await roundsInput.press("Tab");
  await expect(roundsInput).toHaveValue("3");
  await page.getByRole("combobox", { name: "ثواني لكل سؤال" }).selectOption("5");
  await playerLimit.fill("10.5");
  await expect(playerLimit).toHaveValue("10.5");
  await playerLimit.press("Tab");
  await expect(playerLimit).toHaveValue("10");
  await playerLimit.fill("");
  await expect(playerLimit).toHaveValue("");
  await playerLimit.press("Tab");
  await expect(playerLimit).toHaveValue("10");
  await page.getByRole("combobox", { name: "قسم الأسئلة" }).selectOption("sports");
  await expect(page.getByRole("combobox", { name: "الصعوبة" })).toHaveValue("novice");
  await page.getByRole("button", { name: "تعطيل جميع القوى" }).click();
  await expect(page.getByRole("checkbox", { name: "الصدى", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "وقت إضافي" }).check();
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(1);
  // Creating the room must commit the still-focused draft before reading its configuration.
  await playerLimit.fill("8");
  await playerLimit.press("Tab");
  await playerLimit.focus();
  await playerLimit.press("ControlOrMeta+A");
  await playerLimit.pressSequentially("10");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await testInfo.attach("Arabic Custom builder at 320px", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
  await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
  await expect(page).toHaveURL(/\/lobby\/custom-arabic-room$/);
  expect(body).toMatchObject({ mode: "custom", difficulty: "novice", language: "ar", customSettings: {
    name: "تحدي الأصدقاء في المعلومات العلمية والثقافية", rounds: 3, timePerQuestion: 5,
    difficulty: "novice", enabledPowerUps: ["time_warp"], maxPlayers: 10, categoryFilter: "sports",
  } });
});
