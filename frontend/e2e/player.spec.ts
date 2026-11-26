import { expect, test } from "@playwright/test";

test("player embeds the sandboxed game host and shows metadata", async ({ page }) => {
  await page.goto("/games/neon-runner");

  const iframe = page.locator('iframe[title="Play Neon Runner"]');
  await expect(iframe).toHaveAttribute("src", "http://127.0.0.1:8401/g/neon-runner/index.html");
  await expect(iframe).toHaveAttribute("sandbox", "allow-scripts allow-pointer-lock allow-fullscreen");
  await expect(iframe).toHaveAttribute("allow", "fullscreen; gamepad; autoplay");
  await expect(iframe).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(await iframe.getAttribute("sandbox")).not.toContain("allow-same-origin");

  await expect(page.getByRole("button", { name: /Fullscreen/ })).toBeVisible();
  await expect(page.getByText("How to play")).toBeVisible();
  await expect(page.getByRole("link", { name: "View licence" })).toHaveAttribute("href", "https://opensource.org/license/mit");
});

test("a missing game renders the not-found state", async ({ page }) => {
  const response = await page.goto("/games/does-not-exist");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  // Next dev may stream the not-found UI with a 200; production returns 404.
  expect([200, 404]).toContain(response?.status());
});
