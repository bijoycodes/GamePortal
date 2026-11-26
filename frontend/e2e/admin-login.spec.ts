import { expect, test } from "@playwright/test";

async function submitLogin(page: import("@playwright/test").Page, password: string): Promise<void> {
  await page.goto("/admin/login");
  await page.locator("#login-email").fill("admin@gameportal.test");
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /Sign in/ }).click();
}

test("admin area redirects unauthenticated visitors to sign in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
});

test("invalid credentials show the API error message", async ({ page }) => {
  await submitLogin(page, "wrong-password");
  await expect(page.locator("form [role='alert']")).toContainText("These credentials do not match our records.");
});

test("valid credentials open the dashboard", async ({ page }) => {
  await submitLogin(page, "password");
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();
});

test("login errors can be mocked with Playwright routes without a backend", async ({ page }) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Mocked sign-in failure." }),
    }),
  );

  await submitLogin(page, "anything");
  await expect(page.locator("form [role='alert']")).toContainText("Mocked sign-in failure.");
});
