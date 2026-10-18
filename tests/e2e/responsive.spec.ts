import { devices, expect, test, type Page } from "@playwright/test";

// Runs after app.spec and modules.spec (alphabetical, one worker), so the test database has data on every page.
test.use({ ...devices["iPhone 13"], browserName: "chromium" });

const STATIC_PAGES = [
  "/dashboard", "/roadmap", "/tasks", "/tasks?view=week", "/tasks?view=month", "/tasks?view=all",
  "/interview", "/interview?view=revision", "/mock-interviews", "/projects", "/resume", "/resume?tab=match",
  "/resume?tab=intro", "/resume?tab=star", "/jobs", "/jobs?view=board", "/jobs?view=routine", "/jobs?view=stats",
  "/jobs/new", "/reports", "/settings",
];

/** Width the page scrolls beyond the viewport, and the widest offending elements. */
async function overflow(page: Page) {
  // Compare with the device width, not innerWidth: mobile browsers widen the layout viewport
  // (and zoom the page out) when content is too wide, which would hide the problem.
  const vw = page.viewportSize()!.width;
  return page.evaluate((vw) => {
    const extra = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - vw;
    const culprits: string[] = [];
    if (extra > 0) {
      for (const el of Array.from(document.querySelectorAll<HTMLElement>("body *"))) {
        const r = el.getBoundingClientRect();
        // Ignore content inside intentional horizontal scrollers.
        let p: HTMLElement | null = el.parentElement;
        let scroller = false;
        while (p) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") { scroller = true; break; }
          p = p.parentElement;
        }
        const parentWide = el.parentElement && el.parentElement.getBoundingClientRect().right > vw + 1 && el.parentElement !== document.body;
        // Report the outermost too-wide element (fixed-position bars just stretch to the widened page).
        if (!scroller && !parentWide && r.right > vw + 1 && getComputedStyle(el).position !== "fixed") {
          culprits.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} → ${Math.round(r.right)}px`);
        }
      }
    }
    return { extra, culprits: culprits.slice(0, 6) };
  }, vw);
}

async function check(page: Page, path: string, name: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `test-results/mobile/${name}.png`, fullPage: true });
  const o = await overflow(page);
  expect(o.extra, `${path} scrolls sideways by ${o.extra}px:\n${o.culprits.join("\n")}`).toBeLessThanOrEqual(0);
}

for (const path of STATIC_PAGES) {
  test(`no sideways scrolling on ${path}`, async ({ page }) => {
    await check(page, path, path.replace(/[/?=&]+/g, "_").replace(/^_/, ""));
  });
}

test("no sideways scrolling on detail pages", async ({ page }) => {
  const detail = async (list: string, linkPattern: RegExp, name: string) => {
    await page.goto(list);
    const href = await page.locator("a").filter({ has: page.locator(":scope") }).evaluateAll(
      (as, src) => as.map((a) => a.getAttribute("href") ?? "").find((h) => new RegExp(src).test(h)) ?? null, linkPattern.source);
    if (href) await check(page, href, name);
  };
  await detail("/interview", /^\/interview\/[0-9a-f-]{36}$/, "interview-detail");
  await detail("/projects", /^\/projects\/[0-9a-f-]{36}$/, "project-detail");
  await detail("/jobs", /^\/jobs\/[0-9a-f-]{36}$/, "job-detail");
  await detail("/mock-interviews", /^\/mock-interviews\/[0-9a-f-]{36}$/, "mock-detail");
});

test("mobile menu opens and navigates", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(async () => {
    await page.getByRole("button", { name: "Open navigation" }).click({ timeout: 1000 });
    await expect(page.getByRole("dialog", { name: "Navigation" })).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20_000 });
  await page.screenshot({ path: "test-results/mobile/menu-open.png" });
  await page.getByRole("dialog", { name: "Navigation" }).getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("dialog", { name: "Navigation" })).toBeHidden();
});
