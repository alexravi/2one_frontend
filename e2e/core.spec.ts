import { test, expect } from "@playwright/test";

test.describe("Core Application", () => {
  test("should return 404 page for non-existent routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("protected routes should redirect to login", async ({ page }) => {
    await page.goto("/recordings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("wallet page should redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/wallet");
    await expect(page).toHaveURL(/\/login/);
  });

  test("settings page should redirect to login when unauthenticated", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page should have proper meta title", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveTitle(/Voice Data Collection/i);
  });
});
