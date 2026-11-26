import { expect, test } from "@playwright/test";

test("home shows featured games, recent games and category chips", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Find your next favourite browser game/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Featured games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recently added" })).toBeVisible();

  await expect(page.getByRole("link", { name: /Neon Runner/ }).first()).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Filter by category" }).getByRole("link", { name: /Action/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Filter by category" }).getByRole("link", { name: /Puzzle/ }).click();
  await expect(page).toHaveURL(/\/games\?category=puzzle/);
  await expect(page.getByRole("heading", { name: "Puzzle Boxes" })).toBeVisible();
});
