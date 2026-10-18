/** Starter interview questions (marked is_sample). Users can edit, delete or add their own. */
import type { Difficulty } from "@/lib/types";

export interface SeedQuestion {
  category: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  points: string[];
  hints: string[];
  answer: string;
  followUps: string[];
}

export const QUESTIONS: SeedQuestion[] = [
  // A. JavaScript & TypeScript
  {
    category: "js-ts", topic: "Closures", difficulty: "beginner",
    question: "What is a closure in JavaScript? Give a practical example.",
    points: ["A function that remembers variables from its outer (lexical) scope", "Works even after the outer function has returned", "Practical use: data privacy, counters, memoization, event handlers", "Common pitfall: closures over `var` in loops"],
    hints: ["Think about what happens to a variable declared inside a function after the function returns.", "Try writing a makeCounter() function."],
    answer: "A closure is a function bundled with references to the variables of the scope it was created in. Because the inner function keeps those references, it can read and update them after the outer function has returned. Example: makeCounter() declares `let count = 0` and returns `() => ++count`; each call increments the private count. Closures give data privacy, power memoization and callbacks, and explain the classic `var`-in-a-loop bug, which `let` fixes because it creates a new binding per iteration.",
    followUps: ["How does `let` in a for loop change closure behaviour compared with `var`?", "Can closures cause memory leaks? How?"],
  },
  {
    category: "js-ts", topic: "Async", difficulty: "intermediate",
    question: "Explain the difference between Promise.all, Promise.allSettled and Promise.race. When would you use each in test automation?",
    points: ["all: resolves when every promise resolves, rejects on the first rejection", "allSettled: waits for all, returns status/value/reason for each", "race: settles with the first promise to settle", "Automation example: Promise.all([page.waitForEvent('popup'), click()])"],
    hints: ["What happens to Promise.all if one promise rejects?", "Playwright docs use one of these to wait for a popup while clicking."],
    answer: "Promise.all runs promises concurrently and resolves with an array of results, but rejects as soon as any one rejects. Promise.allSettled always waits for every promise and returns objects describing fulfilled or rejected outcomes — useful when you want every result, e.g. cleaning up several test users. Promise.race settles with whichever finishes first — useful for timeouts. In Playwright, `const [popup] = await Promise.all([page.waitForEvent('popup'), page.click('a')])` avoids missing the event.",
    followUps: ["What is Promise.any and how is it different from race?", "What happens if you forget `await` before an expect in Playwright?"],
  },
  {
    category: "js-ts", topic: "TypeScript types", difficulty: "beginner",
    question: "What is the difference between `interface` and `type` in TypeScript?",
    points: ["Both describe object shapes", "Interfaces can be merged (declaration merging) and extended with `extends`", "Type aliases can describe unions, tuples, primitives and mapped types", "Common convention: interfaces for object contracts, types for unions/compositions"],
    hints: ["Can you declare the same interface twice?", "Can an interface represent `'a' | 'b'`?"],
    answer: "Both can describe object shapes and both can be extended (interfaces with `extends`, types with intersections `&`). Interfaces support declaration merging, so two declarations with the same name combine. Type aliases are more general: they can name unions, tuples, primitives, function types and mapped/conditional types. Many teams use interfaces for public object contracts like page-object options and types for unions such as `type Env = 'dev' | 'qa' | 'prod'`.",
    followUps: ["What is a discriminated union?", "When would you use `unknown` instead of `any`?"],
  },
  {
    category: "js-ts", topic: "Generics", difficulty: "intermediate",
    question: "What are generics in TypeScript? Show how you would use one in a test framework.",
    points: ["Type parameters let a function/class work with many types while staying type-safe", "Constraints with `extends`", "Example: typed API helper `get<T>(url): Promise<T>`", "Avoids `any` and gives autocomplete"],
    hints: ["Think of an API helper that returns different response shapes.", "How do you restrict a generic to objects with an `id`?"],
    answer: "Generics are type parameters that let code be reused across types without losing type information. In a framework, an API helper `async function getJson<T>(request: APIRequestContext, url: string): Promise<T>` returns `T` so callers get typed responses: `const user = await getJson<User>(request, '/users/1')`. Constraints like `<T extends { id: string }>` limit what types are allowed. This avoids `any` and gives compile-time checks and autocomplete.",
    followUps: ["What does `Partial<T>` do and where is it useful for test data?", "What's the difference between `keyof` and `typeof`?"],
  },
  // B. Playwright
  {
    category: "playwright", topic: "Locators", difficulty: "beginner",
    question: "Which locator strategies does Playwright recommend, and why?",
    points: ["User-facing locators first: getByRole, getByLabel, getByText, getByPlaceholder", "getByTestId for elements without accessible names", "Avoid long CSS/XPath tied to DOM structure", "Locators are lazy and re-resolve, enabling auto-waiting", "Filtering and chaining (filter({ hasText }), nth)"],
    hints: ["How would a real user find a button?", "What happens to an XPath when a developer adds a wrapper div?"],
    answer: "Playwright recommends locators that reflect how users and assistive tech perceive the page: getByRole (with name), getByLabel, getByPlaceholder, getByText, then getByTestId when there's no accessible handle. These survive refactors better than structural CSS or XPath. Locators are lazy — they are resolved at action time and retried, which is what makes auto-waiting work. They can be chained and filtered, e.g. `page.getByRole('listitem').filter({ hasText: 'Laptop' }).getByRole('button', { name: 'Add' })`.",
    followUps: ["What is strict mode in locators?", "How would you locate an element inside an iframe?"],
  },
  {
    category: "playwright", topic: "Auto-waiting", difficulty: "beginner",
    question: "How does auto-waiting work in Playwright? Why should you avoid page.waitForTimeout?",
    points: ["Before actions Playwright checks actionability: attached, visible, stable, enabled, receives events", "Web-first assertions (expect(locator)) retry until timeout", "Hard waits slow tests and still flake", "Use explicit waits for real conditions (response, URL, element state)"],
    hints: ["What does Playwright check before click()?", "What's the difference between expect(await locator.isVisible()) and expect(locator).toBeVisible()?"],
    answer: "Before each action Playwright waits for the element to be attached, visible, stable (not animating), enabled and able to receive events, up to the action timeout. Web-first assertions like `await expect(locator).toHaveText('Done')` retry until they pass or time out. `waitForTimeout` is a fixed sleep: too short and it flakes, too long and the suite is slow. Wait for real conditions instead — a locator state, `page.waitForResponse`, or `expect(page).toHaveURL`.",
    followUps: ["Why is `expect(await locator.isVisible()).toBe(true)` worse than `toBeVisible()`?", "How do you change timeouts globally and per assertion?"],
  },
  {
    category: "playwright", topic: "Fixtures", difficulty: "intermediate",
    question: "What are fixtures in Playwright Test, and how do you create a custom one?",
    points: ["Fixtures provide isolated setup/teardown to tests (page, context, request, browser)", "Custom fixtures via test.extend<{...}>()", "Code before `await use()` is setup, after is teardown", "Test-scoped vs worker-scoped fixtures", "Only fixtures a test uses are set up"],
    hints: ["Look at what `async ({ page }) =>` actually is.", "What does `use` do inside a fixture?"],
    answer: "Fixtures are Playwright Test's dependency-injection system. Built-in ones (page, context, browser, request) give every test an isolated environment. Custom fixtures are defined with `test.extend`: `export const test = base.extend<{ loginPage: LoginPage }>({ loginPage: async ({ page }, use) => { await use(new LoginPage(page)); } })`. Code before `use` is setup, code after is teardown. Fixtures can be test-scoped or `{ scope: 'worker' }` for expensive resources like a shared account, and they're lazy — only set up if a test requests them.",
    followUps: ["When would you use a worker-scoped fixture?", "How do fixtures compare with beforeEach hooks?"],
  },
  {
    category: "playwright", topic: "Authentication", difficulty: "intermediate",
    question: "How do you avoid logging in through the UI in every test?",
    points: ["Log in once in a setup project", "Save storageState (cookies + localStorage) to a file", "Configure projects to use storageState and depend on setup", "Separate state files per role; per-worker accounts if tests mutate shared state", "Keep state files out of git"],
    hints: ["Which Playwright option loads cookies into a new context?", "How can one project run before others?"],
    answer: "Create an auth setup test (e.g. auth.setup.ts) that logs in once and calls `page.context().storageState({ path: 'playwright/.auth/user.json' })`. In playwright.config.ts add a `setup` project, then make browser projects `dependencies: ['setup']` with `use: { storageState: 'playwright/.auth/user.json' }`. Every test starts already authenticated. Use separate files per role (admin/user) and per-worker accounts when tests change server-side state. Add the .auth folder to .gitignore.",
    followUps: ["Could you authenticate via API instead of UI in setup? How?", "What if the session expires mid-run?"],
  },
  {
    category: "playwright", topic: "Parallelism", difficulty: "advanced",
    question: "How does Playwright run tests in parallel, and how do you keep parallel tests reliable?",
    points: ["Worker processes; each has its own browser", "Files run in parallel by default; fullyParallel parallelises tests within files", "test.describe.configure({ mode: 'serial' }) when order matters (rare)", "Isolation: independent data, no shared accounts mutating state", "Sharding across machines with --shard"],
    hints: ["What's a worker?", "What breaks if two tests edit the same user's cart?"],
    answer: "Playwright Test starts multiple worker processes (configurable with `workers`). By default test files are distributed across workers; `fullyParallel: true` also splits tests inside a file. Each test gets a fresh context, but server-side data is still shared, so tests must create their own data or use per-worker accounts (`testInfo.parallelIndex`). Serial mode exists for dependent tests but should be rare. For CI scale, `--shard=1/4` splits the suite across machines and reports can be merged.",
    followUps: ["How do you merge reports from shards?", "What is the difference between workerIndex and parallelIndex?"],
  },
  {
    category: "playwright", topic: "Traces", difficulty: "intermediate",
    question: "A test failed in CI. How do you use Playwright's tooling to find out why?",
    points: ["Open the HTML report", "Trace Viewer: actions, DOM snapshots, network, console", "Screenshots and video on failure", "trace: 'on-first-retry' or 'retain-on-failure' config", "Reproduce locally with same browser/env, --debug"],
    hints: ["What config option records a trace?", "Which tab in the trace shows API calls?"],
    answer: "First open the HTML report artifact and look at the error and the step where it failed. If traces are enabled (`trace: 'on-first-retry'` or `'retain-on-failure'`), open the trace with `npx playwright show-trace trace.zip` or in trace.playwright.dev. It shows each action with before/after DOM snapshots, network requests, console logs and the source line. Screenshots/videos confirm what the page looked like. Then reproduce locally with the same browser and env vars, using `--debug` or UI mode, and compare CI-specific factors like timing, data and resources.",
    followUps: ["Why not keep traces on for every test?", "What would you check if it only fails in headless mode?"],
  },
  // C. Framework design
  {
    category: "framework", topic: "Page Object Model", difficulty: "intermediate",
    question: "Explain the Page Object Model. What should and shouldn't go inside a page object?",
    points: ["Encapsulates locators and actions for a page/component", "Tests read as business steps; locator changes are fixed in one place", "Keep assertions mostly in tests (or explicit verify methods)", "No test data or test flow logic hard-coded inside pages", "Compose component objects for shared UI"],
    hints: ["Who should own the decision of what to assert?", "How do you handle a header present on every page?"],
    answer: "POM wraps a page or component in a class that exposes its locators and user actions, e.g. `LoginPage.login(user)`. Tests describe intent while page objects hide DOM details, so a locator change is fixed in one place. Page objects should contain locators and actions; tests should own assertions and data (or use clearly named verify methods). Shared UI like a header becomes a component object composed into pages. Inject page objects through fixtures so tests don't construct them manually.",
    followUps: ["What problems appear when page objects grow too large?", "POM vs screenplay pattern — have you heard of it?"],
  },
  {
    category: "framework", topic: "Architecture", difficulty: "advanced",
    question: "Walk me through how you would design a Playwright + TypeScript framework from scratch for an e-commerce app.",
    points: ["Folder structure: tests, pages/components, fixtures, api clients, test-data, utils, config", "Config per environment via env variables", "Auth via setup project + storageState", "API helpers for data setup/cleanup", "Reporting (HTML/Allure), traces on failure", "CI integration (Jenkins), tagging, parallelism", "Coding standards: lint, review, no hard waits"],
    hints: ["Start from what a test file should look like, then work outwards.", "How does test data get created and cleaned up?"],
    answer: "I'd start from readable tests and build layers beneath them: `tests/` grouped by feature with @smoke/@regression tags; `pages/` and `components/` for POM; `fixtures/` that inject page objects, API clients and authenticated contexts; `api/` with typed request helpers used for data setup and cleanup; `test-data/` builders that generate unique data; `config/` reading baseURL and credentials from env. playwright.config.ts defines a setup project for auth, browser projects, retries and reporters (HTML + JUnit/Allure, traces retained on failure). A Jenkinsfile installs deps and browsers, runs tagged suites in parallel and publishes reports. ESLint/Prettier and code review keep it maintainable.",
    followUps: ["How would you handle test data that must be cleaned up even if the test fails?", "How do you decide what to automate at UI vs API level?"],
  },
  {
    category: "framework", topic: "Test data", difficulty: "intermediate",
    question: "How do you manage test data in an automation framework?",
    points: ["Generate unique data per test (timestamps, faker) to avoid collisions", "Create data through APIs rather than UI", "Clean up in fixture teardown", "Keep environment-specific data in config, secrets in env vars", "Avoid depending on data created by other tests"],
    hints: ["What happens if two parallel tests use the same email?", "Where is the fastest place to create an order?"],
    answer: "Each test should own its data. I generate unique values (e.g. `user+${Date.now()}@test.com` or faker), create entities through API helpers in fixtures, and delete them in the fixture teardown so cleanup runs even when tests fail. Static reference data lives in versioned JSON per environment, and credentials come from environment variables or CI credentials. Tests never rely on another test having run first.",
    followUps: ["How would you handle data that can't be deleted (e.g. orders)?", "What's a data builder pattern?"],
  },
  // D. API testing
  {
    category: "api", topic: "HTTP", difficulty: "beginner",
    question: "What's the difference between PUT, PATCH and POST? Which are idempotent?",
    points: ["POST creates a resource / triggers processing; not idempotent", "PUT replaces a resource entirely; idempotent", "PATCH partially updates; not guaranteed idempotent", "GET, PUT, DELETE are idempotent; GET is also safe"],
    hints: ["What happens if you send the same request twice?", "Full replacement vs partial update."],
    answer: "POST creates a new resource or triggers an action; sending it twice usually creates two resources, so it is not idempotent. PUT replaces the whole resource at a known URI — repeating it leaves the same state, so it is idempotent. PATCH applies a partial update and isn't guaranteed to be idempotent (e.g. 'increment quantity'). GET, HEAD, PUT and DELETE are idempotent; GET and HEAD are also safe (no side effects).",
    followUps: ["What status codes would you expect from a successful POST and DELETE?", "How would you test idempotency of a PUT endpoint?"],
  },
  {
    category: "api", topic: "Status codes", difficulty: "beginner",
    question: "Explain 401 vs 403, and 400 vs 422 vs 409.",
    points: ["401 Unauthorized: not authenticated / invalid credentials", "403 Forbidden: authenticated but not allowed", "400 Bad Request: malformed request", "422 Unprocessable: well-formed but fails validation", "409 Conflict: state conflict, e.g. duplicate"],
    hints: ["One of 401/403 is about who you are, the other about what you're allowed to do."],
    answer: "401 means the request lacks valid authentication — no token or an expired one. 403 means the server knows who you are but you don't have permission. 400 indicates a malformed request such as invalid JSON. 422 means the syntax is fine but the content fails business validation (e.g. negative quantity). 409 signals a conflict with current state, such as creating a user whose email already exists.",
    followUps: ["What would you assert in a negative test for an expired token?", "When would a 404 be returned instead of a 403?"],
  },
  {
    category: "api", topic: "Playwright API testing", difficulty: "intermediate",
    question: "How do you write API tests with Playwright? How do you handle authentication tokens?",
    points: ["Use the `request` fixture or request.newContext({ baseURL, extraHTTPHeaders })", "Assert status, headers and JSON body; validate schema", "Get a token once (setup/worker fixture) and reuse in headers", "Negative tests: missing/expired token, invalid payload", "Reusable typed request helpers"],
    hints: ["Which fixture gives you an APIRequestContext?", "Where would you store a token for all tests in a worker?"],
    answer: "Playwright's `request` fixture (or `request.newContext`) gives an APIRequestContext: `const res = await request.post('/api/orders', { data })`, then `expect(res.status()).toBe(201)` and `expect(await res.json()).toMatchObject({...})`. For auth I fetch a token once in a worker-scoped fixture and create a context with `extraHTTPHeaders: { Authorization: `Bearer ${token}` }`. Typed helper classes wrap endpoints, and I add negative tests for missing/expired tokens, invalid payloads and boundary values, plus schema validation with zod or ajv.",
    followUps: ["How do you share an API-created entity with a UI test?", "How would you test pagination?"],
  },
  // E. Jenkins / Git / CI
  {
    category: "cicd", topic: "Jenkinsfile", difficulty: "intermediate",
    question: "Describe a Jenkins pipeline that runs your Playwright tests and publishes reports.",
    points: ["Declarative pipeline with agent (node or Playwright Docker image)", "Stages: checkout, npm ci, npx playwright install --with-deps, test", "Credentials via withCredentials / environment", "post { always { publish HTML report, junit, archive traces } }", "Parameters for browser/env, cron trigger"],
    hints: ["What must be installed besides npm packages?", "Which block runs whether tests pass or fail?"],
    answer: "A declarative Jenkinsfile uses an agent such as the official Playwright Docker image matching the project's Playwright version. Stages: Checkout; Install (`npm ci` and, if not using the image, `npx playwright install --with-deps`); Test (`npx playwright test --project=$BROWSER`) with secrets injected via `withCredentials` or `environment { X = credentials('id') }`. A `post { always { ... } }` block publishes the HTML report (publishHTML), records JUnit XML and archives traces/screenshots. Parameters choose browser and environment, and a cron trigger runs nightly regression.",
    followUps: ["How do you prevent secrets from appearing in console logs?", "How would you run browsers in parallel stages?"],
  },
  {
    category: "cicd", topic: "Git", difficulty: "beginner",
    question: "What is the difference between git merge and git rebase?",
    points: ["Merge combines histories and creates a merge commit; preserves history", "Rebase replays commits on top of another branch; linear history", "Don't rebase shared/public branches", "Conflict resolution happens in both"],
    hints: ["Which one rewrites commit hashes?"],
    answer: "git merge integrates another branch by creating a merge commit, keeping the true history of both branches. git rebase moves your commits so they sit on top of the target branch, rewriting their hashes to produce a linear history. Rebase is great for cleaning up a local feature branch before a PR; avoid rebasing branches others have pulled, because it rewrites shared history.",
    followUps: ["What does git stash do?", "How do you undo the last commit but keep the changes?"],
  },
  // F. SQL
  {
    category: "sql", topic: "Joins", difficulty: "beginner",
    question: "Explain INNER JOIN vs LEFT JOIN with an example a tester might use.",
    points: ["INNER returns only matching rows in both tables", "LEFT returns all left rows, NULLs where no match", "Example: find customers without orders using LEFT JOIN ... WHERE o.id IS NULL"],
    hints: ["Which join keeps customers who never ordered?"],
    answer: "INNER JOIN returns rows where the join condition matches in both tables — customers who have orders. LEFT JOIN returns every row from the left table and matching rows from the right, filling NULLs where there's no match. A useful tester query: `SELECT c.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.id IS NULL` finds customers with no orders, or orphan checks the other way round.",
    followUps: ["What does a FULL OUTER JOIN return?", "How would you find duplicate emails?"],
  },
  {
    category: "sql", topic: "Aggregation", difficulty: "intermediate",
    question: "Write a query to find the second highest salary from an employees table.",
    points: ["Handle duplicates (DISTINCT)", "Option: subquery with MAX(salary) WHERE salary < (SELECT MAX(...))", "Option: ORDER BY DESC LIMIT 1 OFFSET 1 with DISTINCT", "Option: DENSE_RANK() window function", "Return NULL if it doesn't exist"],
    hints: ["What's the highest salary that is less than the maximum?"],
    answer: "`SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);` handles duplicates and returns NULL when no second salary exists. Alternatives: `SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;` or with a window function: `SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) r FROM employees) t WHERE r = 2 LIMIT 1;`.",
    followUps: ["How would you get the Nth highest salary per department?", "Difference between RANK and DENSE_RANK?"],
  },
  {
    category: "sql", topic: "Database testing", difficulty: "intermediate",
    question: "How would you verify in the database that an order placed through the UI was saved correctly?",
    points: ["Capture order ID from UI/API response", "Query orders and order_items by ID", "Check totals, status, customer, timestamps, item quantities", "Check constraints/related tables (inventory, payments)", "Use read-only credentials; avoid coupling every UI test to DB"],
    hints: ["What identifier links the UI action to DB rows?"],
    answer: "After placing the order I capture the order ID from the confirmation page or the API response. Then, using a read-only DB connection configured via env vars, I query `orders` and `order_items` for that ID and verify customer, status, item quantities, prices and total, and related side effects like inventory decrement or a payment record. I'd do this for a few critical flows rather than every UI test, and prefer API checks where the API exposes the same data.",
    followUps: ["How do you connect to a database from a Playwright test?", "What are the risks of DB checks in tests?"],
  },
  // G. Manual testing
  {
    category: "manual", topic: "Test design", difficulty: "beginner",
    question: "Explain boundary value analysis and equivalence partitioning with an example.",
    points: ["EP: divide inputs into valid/invalid classes, test one per class", "BVA: test at and around boundaries (min-1, min, max, max+1)", "Example: age field 18–60", "They reduce test count while keeping coverage"],
    hints: ["Try an input that accepts ages 18 to 60."],
    answer: "Equivalence partitioning splits inputs into classes expected to behave the same — for an age field accepting 18–60: below 18 (invalid), 18–60 (valid), above 60 (invalid) — and tests one value per class. Boundary value analysis targets the edges where bugs cluster: 17, 18, 19 and 59, 60, 61. Together they give strong coverage with few tests.",
    followUps: ["What is a decision table and when do you use it?", "How would you test a password field?"],
  },
  {
    category: "manual", topic: "Bug reporting", difficulty: "beginner",
    question: "What makes a good bug report? Explain severity vs priority.",
    points: ["Clear title, steps to reproduce, expected vs actual", "Environment, build, browser, test data", "Evidence: screenshots, logs, video, trace", "Severity = impact on the system; priority = urgency to fix", "Example: typo on homepage logo = low severity, high priority"],
    hints: ["Who decides priority — QA or product?"],
    answer: "A good bug report lets anyone reproduce the issue quickly: a specific title, preconditions, numbered steps, expected vs actual results, environment (build, browser, OS, data) and evidence such as screenshots, logs or a Playwright trace. Severity describes technical impact (a crash in checkout is critical); priority describes how urgently it should be fixed, usually set with product. A misspelled company name on the homepage is low severity but high priority; a crash in a rarely used admin report may be high severity but lower priority.",
    followUps: ["What would you do if a developer says 'works on my machine'?", "What is a regression bug?"],
  },
  // H. Coding
  {
    category: "coding", topic: "Strings", difficulty: "beginner",
    question: "Write a function that returns the first non-repeating character in a string. What is its time complexity?",
    points: ["Count frequencies with a Map/object in one pass", "Second pass to find first char with count 1", "O(n) time, O(k) space", "Handle empty string / no result"],
    hints: ["Two passes are fine.", "Which data structure gives O(1) lookups?"],
    answer: "function firstUnique(s: string): string | null {\n  const counts = new Map<string, number>();\n  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);\n  for (const ch of s) if (counts.get(ch) === 1) return ch;\n  return null;\n}\nIt's O(n) time with two linear passes and O(k) space for distinct characters.",
    followUps: ["How would you make it case-insensitive?", "How would you test this function?"],
  },
  {
    category: "coding", topic: "Arrays", difficulty: "intermediate",
    question: "Given an array of numbers and a target, return the indices of the two numbers that add up to the target.",
    points: ["Brute force O(n²)", "Optimal: single pass with a Map of value → index", "Check complement before inserting current", "Handle no-solution case"],
    hints: ["For each number, what value would you need to have seen already?"],
    answer: "function twoSum(nums: number[], target: number): [number, number] | null {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need)!, i];\n    seen.set(nums[i], i);\n  }\n  return null;\n}\nO(n) time, O(n) space, versus O(n²) for nested loops.",
    followUps: ["What if the array is sorted?", "What if you need all pairs?"],
  },
  {
    category: "coding", topic: "Async", difficulty: "advanced",
    question: "Implement a retry(fn, attempts, delayMs) helper for async functions.",
    points: ["Loop or recursion over attempts", "await fn() inside try/catch", "Wait delay between attempts (optionally exponential backoff)", "Re-throw last error after final attempt", "Typed generic return Promise<T>"],
    hints: ["You need a sleep helper: new Promise(r => setTimeout(r, ms))."],
    answer: "async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 500): Promise<T> {\n  let lastError: unknown;\n  for (let i = 1; i <= attempts; i++) {\n    try { return await fn(); }\n    catch (err) {\n      lastError = err;\n      if (i < attempts) await new Promise(r => setTimeout(r, delayMs * 2 ** (i - 1)));\n    }\n  }\n  throw lastError;\n}",
    followUps: ["Why might retrying hide real bugs in tests?", "Playwright has expect.poll and toPass — when would you use them?"],
  },
  // I. HR & managerial
  {
    category: "hr", topic: "Self-introduction", difficulty: "beginner",
    question: "Tell me about yourself.",
    points: ["Current role and years of experience", "Key skills relevant to the role (Playwright, TypeScript, API, CI)", "One or two achievements or projects", "Why you're interested in this role", "60–90 seconds, structured: present → past → future"],
    hints: ["Present, past, future.", "End with why this role."],
    answer: "Structure: (1) Present — 'I'm a QA engineer with X years of experience, currently working on …'. (2) Skills and proof — 'I've built a Playwright + TypeScript framework covering UI and API tests, running in Jenkins with HTML reports…'. (3) Past highlights relevant to the job. (4) Future — 'I'm looking for an SDET role where I can …'. Keep it truthful, about 60–90 seconds, and tailor the middle part to the job description.",
    followUps: ["Walk me through your current project.", "Why should we hire you?"],
  },
  {
    category: "hr", topic: "Job change", difficulty: "beginner",
    question: "Why are you looking to change your job?",
    points: ["Positive, forward-looking reason (growth, automation focus, product company)", "No criticism of current employer", "Link to what this role offers", "Brief and honest"],
    hints: ["Talk about what you're moving towards, not away from."],
    answer: "Keep it positive and specific: 'I've built strong testing fundamentals in my current role and have spent the last six months developing Playwright, TypeScript and CI/CD skills through real projects. I'm looking for a role where automation is a core part of the work and I can contribute to framework design — which is why this SDET position interests me.' Avoid complaints about your manager or company.",
    followUps: ["What would make you stay in your current company?", "Where do you see yourself in three years?"],
  },
  {
    category: "hr", topic: "Behavioural", difficulty: "intermediate",
    question: "Tell me about a time you disagreed with a developer about a bug. How did you handle it? (Use STAR.)",
    points: ["Situation and Task clearly set", "Action: evidence (steps, logs, trace), stayed respectful, involved PO if needed", "Result: outcome and what you learned", "Shows collaboration, not winning an argument"],
    hints: ["Situation, Task, Action, Result.", "What evidence convinced the other person?"],
    answer: "Use a real example in STAR format. Situation: the developer marked a checkout bug 'not reproducible'. Task: confirm whether it was a real defect before release. Action: reproduced it with exact data, captured a trace and network logs showing the failing API call, walked through it with the developer, and agreed with the product owner on priority. Result: the root cause (a race condition) was fixed before release and we added an automated regression test. Emphasise collaboration and evidence.",
    followUps: ["What if the product owner still decided not to fix it?", "How do you handle pressure to sign off a release?"],
  },
  // J. Real-world debugging
  {
    category: "debugging", topic: "Flaky tests", difficulty: "advanced",
    question: "A test passes locally but fails intermittently in CI. How do you investigate and fix it?",
    points: ["Collect evidence: trace, screenshots, logs, failure pattern/frequency", "Common causes: timing/race conditions, shared test data, order dependence, environment differences, resource limits", "Reproduce: --repeat-each, CI-like workers, headless, same browser version", "Fix root cause (proper waits/assertions, isolate data) rather than adding retries/sleeps", "Track flaky tests; quarantine with annotations if needed"],
    hints: ["What's different about CI compared with your laptop?", "Which CLI option runs a test many times?"],
    answer: "I'd first gather evidence: retained traces, screenshots, the error message and how often it fails. Then compare CI and local conditions — more parallel workers, slower machines, headless mode, different data or env vars. I try to reproduce with `npx playwright test my.spec.ts --repeat-each=20 --workers=4`. Typical root causes are missing web-first assertions (asserting before data loads), shared test data between parallel tests, dependence on test order, animations, or third-party calls. I fix the cause — wait for the right response or state, isolate data, mock unstable externals — rather than adding sleeps or relying on retries, and I track the test until it's stable.",
    followUps: ["When is it acceptable to use retries?", "How do you prove a flaky test is fixed?"],
  },
  {
    category: "debugging", topic: "Locator failures", difficulty: "intermediate",
    question: "Your test fails with 'strict mode violation: locator resolved to 2 elements'. What does it mean and how do you fix it?",
    points: ["Playwright locators are strict: actions require exactly one match", "Inspect which elements match (codegen/inspector)", "Make the locator more specific: role + name, scope within a container, filter()", "Use .first()/.nth() only when order is meaningful"],
    hints: ["What would you scope the locator to?"],
    answer: "Playwright actions are strict — the locator must resolve to exactly one element. The error means the locator is ambiguous, e.g. two 'Add to cart' buttons. Inspect the matches in the error output or inspector, then make the locator more specific: scope it inside a container (`page.getByTestId('product-42').getByRole('button', { name: 'Add to cart' })`), use filter({ hasText }), or a better role/name. Use .first() or .nth() only when position genuinely matters, because it can silently target the wrong element.",
    followUps: ["What does `locator.count()` return and is it auto-waiting?", "How would you click the 3rd row of a table that changes order?"],
  },
];
