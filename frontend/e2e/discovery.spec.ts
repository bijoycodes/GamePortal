import { expect, test } from "@playwright/test";

test("discovery reflects search and filters in URL parameters", async ({ page }) => {
  await page.goto("/games");

  await expect(page.getByRole("heading", { name: "Browse games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Neon Runner" })).toBeVisible();

  await page.getByRole("searchbox", { name: "Search games" }).fill("space");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page).toHaveURL(/\/games\?q=space/);
  await expect(page.getByRole("heading", { name: "Space Cadet" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Neon Runner" })).toHaveCount(0);
});

test("discovery supports tag filters, sorting and an empty state", async ({ page }) => {
  await page.goto("/games?tag=retro");

  await expect(page).toHaveURL(/tag=retro/);
  await expect(page.getByRole("heading", { name: "Retro Racer" })).toBeVisible();

  await page.getByLabel("Sort by").selectOption("title");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/sort=title/);

  await page.goto("/games?q=no-such-game");
  await expect(page.getByRole("heading", { name: "No games match your filters" })).toBeVisible();
});
