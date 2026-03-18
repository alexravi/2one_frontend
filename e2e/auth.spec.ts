import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    // Middleware should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page should render correctly", async ({ page }) => {
    await page.goto("/login");
    // Check critical elements exist
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|login/i })).toBeVisible();
  });

  test("should show error on invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("textbox", { name: /email/i }).fill("invalid@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login/i }).click();
    // Should show an error message (API returns error)
    await expect(page.locator(".bg-red-50, [role='alert']")).toBeVisible({ timeout: 5000 });
  });

  test("signup page should render correctly", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("textbox", { name: /email/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up|register|create/i })).toBeVisible();
  });

  test("should navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
