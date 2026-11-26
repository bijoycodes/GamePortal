import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/admin/login");
  await page.locator("#login-email").fill("admin@gameportal.test");
  await page.locator("#login-password").fill("password");
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

test("admin can create a draft and publish it", async ({ page }) => {
  await signIn(page);

  await page.goto("/admin/games/new");
  await page.locator("#title").fill("E2E Sample Game");
  await expect(page.locator("#slug")).toHaveValue("e2e-sample-game");
  await page.getByRole("button", { name: "Create draft" }).click();

  await expect(page).toHaveURL(/\/admin\/games\/\d+\/edit/);
  await expect(page.getByRole("heading", { name: "Edit E2E Sample Game" })).toBeVisible();

  await page.getByRole("region", { name: "Publishing lifecycle" }).getByRole("button", { name: "Publish" }).click();
  await expect(page.getByText("Current status: published")).toBeVisible();
});
