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

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("سيف المعرفة");
  await expect(page.locator("main")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: /إنشاء غرفة معركة/ }).click();
  await page.getByRole("button", { name: "التالي →" }).click();
  await expect(page.getByRole("heading", { name: "اختر القسم" })).toBeVisible();
});

test("requires a full join code and normalizes it to uppercase", async ({ page }) => {
  await page.getByRole("button", { name: /Join with Code/ }).click();
  const code = page.getByPlaceholder("ABCXYZ");
  const join = page.getByRole("button", { name: /Join Code/ });
  await expect(join).toBeDisabled();
  await code.fill("ab12");
  await expect(code).toHaveValue("AB12");
  await expect(join).toBeDisabled();
  await code.fill("ab12cd");
  await expect(code).toHaveValue("AB12CD");
  await expect(join).toBeEnabled();
});
