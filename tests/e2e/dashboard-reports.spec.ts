import { expect, test, type Page } from "@playwright/test";

const email = process.env.TEST_EMAIL;
const password = process.env.TEST_PASSWORD;
const hasCredentials = Boolean(email && password);

async function login(page: Page) {
  await page.goto("/login");
  await page.locator('input[type="text"]').fill(email as string);
  await page.locator('input[type="password"]').fill(password as string);
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
}

test.describe("Dashboard and Reports public access", () => {
  test("login page renders without a page error", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto("/login");
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  for (const route of ["/dashboard", "/reports"]) {
    test(`protected ${route} has no fatal route error`, async ({ page }) => {
      const responses: number[] = [];
      page.on("response", (response) => responses.push(response.status()));
      await page.goto(route);
      await expect(page.locator("body")).not.toContainText("Application error");
      await expect(page.locator("body")).not.toContainText("Internal Server Error");
      expect(responses.filter((status) => status >= 500)).toEqual([]);
    });
  }
});

test.describe("Dashboard authenticated flows", () => {
  test.skip(!hasCredentials, "Set TEST_EMAIL and TEST_PASSWORD to run authenticated E2E checks.");
  test.beforeEach(async ({ page }) => login(page));

  test("shows the Dashboard period controls", async ({ page }) => {
    await expect(page.getByText("সংগ্রহের সারাংশ")).toBeVisible();
    await expect(page.getByRole("button", { name: "মাসিক" })).toBeVisible();
    await expect(page.getByRole("button", { name: "বাৎসরিক" })).toBeVisible();
    await expect(page.getByRole("button", { name: "সর্বমোট" })).toBeVisible();
    await expect(page.getByText("সংগ্রহ বনাম লক্ষ্য")).toBeVisible();
  });

  test("switches Dashboard from monthly to yearly and total", async ({ page }) => {
    await page.getByRole("button", { name: "বাৎসরিক" }).click();
    await expect(page.getByRole("button", { name: "বাৎসরিক" })).toHaveClass(/text-emerald-600/);
    await page.getByRole("button", { name: "সর্বমোট" }).click();
    await expect(page.getByRole("button", { name: "সর্বমোট" })).toHaveClass(/text-emerald-600/);
  });
});

test.describe("Reports authenticated flows", () => {
  test.skip(!hasCredentials, "Set TEST_EMAIL and TEST_PASSWORD to run authenticated E2E checks.");
  test.beforeEach(async ({ page }) => login(page));

  test("shows report type and period selectors", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByRole("heading", { name: "আর্থিক প্রতিবেদন" })).toBeVisible();
    await expect(page.getByText("সময়কাল")).toBeVisible();
    await expect(page.locator("select").first()).toBeVisible();
    await expect(page.locator("select").nth(1)).toBeVisible();
  });

  test("paid-member report exposes a separate month-year selector", async ({ page }) => {
    await page.goto("/reports");
    const reportType = page.locator("select").last();
    await reportType.selectOption("paid-members");
    await expect(page.getByText("Paid member মাস")).toBeVisible();
    const selectors = page.locator("select");
    await expect(selectors.last()).toBeVisible();
    const labels = await selectors.last().locator("option").allTextContents();
    expect(labels.some((label) => /^\d{4}-[A-Z][a-z]{2}$/.test(label))).toBeTruthy();
  });

  test("admin control exposes pledge history page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("অঙ্গীকার পরিবর্তনের ইতিহাস")).toBeVisible();
    await page.getByText("অঙ্গীকার পরিবর্তনের ইতিহাস").first().click();
    await expect(page).toHaveURL(/\/admin\/pledge-history/);
    await expect(page.getByRole("heading", { name: "মাসিক অঙ্গীকার পরিবর্তনের ইতিহাস" })).toBeVisible();
  });

  test("paid-member name rows can expand to show allocation details", async ({ page }) => {
    await page.goto("/reports");
    await page.locator("select").last().selectOption("paid-members");
    const candidate = page.locator("tbody tr button").first();
    if (await candidate.count()) {
      await candidate.click();
      const body = await page.locator("body").textContent();
      expect(body).toContain("Received Amount");
      expect(body).toContain("Covered Month");
      expect(body).toContain("Counted Amount");
    }
  });
});
