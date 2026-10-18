/** Starter project briefs (is_sample). Milestones start Not Started and need evidence to complete. */

export interface SeedProject {
  name: string;
  summary: string;
  requirements: string[];
  folder: string;
  scenarios: string[];
  acceptance: string[];
  designQuestions: string[];
  milestones: [title: string, description: string][];
}

export const PROJECTS: SeedProject[] = [
  {
    name: "Project 1: E-commerce end-to-end framework",
    summary:
      "A Playwright + TypeScript framework for a demo e-commerce site (e.g. a public practice store) covering UI and API flows from login to order history.",
    requirements: [
      "Login and authentication (valid, invalid, locked user)",
      "Product search and filtering",
      "Product details and cart (add, update quantity, remove)",
      "Checkout and order placement with form validation",
      "Order-history verification after placing an order",
      "UI and API test coverage for critical flows",
      "Test data builders and reusable fixtures",
    ],
    folder: `ecommerce-playwright/
├── playwright.config.ts
├── tests/
│   ├── auth/login.spec.ts
│   ├── catalog/search.spec.ts
│   ├── cart/cart.spec.ts
│   └── checkout/checkout.spec.ts
├── pages/            # page objects (LoginPage, ProductsPage, CartPage, CheckoutPage)
├── components/       # header, cart badge, modal
├── fixtures/         # test.extend: page objects, logged-in user
├── api/              # typed API clients for setup/cleanup
├── test-data/        # builders + static JSON
└── utils/`,
    scenarios: [
      "Valid user logs in and lands on products page",
      "Invalid password shows an error and stays on login",
      "Search returns only matching products; filter by price range",
      "Add two products, update quantity, verify subtotal",
      "Checkout with missing address shows validation errors",
      "Place an order and find it in order history",
      "Create a cart via API, verify it in the UI",
    ],
    acceptance: [
      "≥ 15 tests, no raw locators inside test files",
      "Runs green in Chromium, Firefox and WebKit with fullyParallel",
      "HTML report with traces retained on failure",
      "README explains architecture and how to run",
    ],
    designQuestions: [
      "Why did you choose these locator strategies?",
      "How do your fixtures provide page objects and logged-in state?",
      "How do you keep tests independent when they run in parallel?",
      "What would you change to run this suite against multiple environments?",
    ],
    milestones: [
      ["Repository, config and folder structure", "Initialise the repo, playwright.config.ts with projects and baseURL, push to GitHub."],
      ["Page objects for login, products, cart, checkout", "Page objects with readonly locators and action methods."],
      ["Login and search tests", "Positive and negative login, search and filter tests."],
      ["Cart and checkout tests", "Cart operations, checkout validation and order placement."],
      ["Order history + API-backed tests", "Verify orders via UI and API; create data via API."],
      ["Cross-browser run and HTML report", "All tests green on 3 browsers; report attached."],
      ["README and architecture walkthrough", "Write the README and record or write a 3-minute explanation."],
    ],
  },
  {
    name: "Project 2: API automation framework",
    summary:
      "An API test framework using Playwright's APIRequestContext against a public REST API, with typed clients, token handling and schema validation.",
    requirements: [
      "Positive and negative API tests for CRUD endpoints",
      "Authentication and token handling",
      "Response validation (status, headers, body schema) and error handling",
      "Reusable, typed request utilities",
      "Environment-based configuration",
    ],
    folder: `api-playwright/
├── playwright.config.ts
├── tests/
│   ├── users.spec.ts
│   ├── auth.spec.ts
│   └── negative.spec.ts
├── clients/          # UsersClient, AuthClient (typed)
├── schemas/          # zod/ajv schemas
├── fixtures/         # authenticated request context (worker scope)
└── config/           # env loading`,
    scenarios: [
      "Create, read, update, delete a resource and verify each response",
      "Request without token returns 401",
      "Invalid payload returns 400/422 with an error message",
      "Response body matches the schema",
      "Pagination returns the expected page size",
    ],
    acceptance: [
      "≥ 15 API tests including ≥ 5 negative tests",
      "No hard-coded tokens or URLs in test files",
      "Schema validation on every success response",
    ],
    designQuestions: [
      "How do you share a token across tests safely?",
      "When would you test at API level instead of UI?",
      "How do you validate response schemas and why?",
    ],
    milestones: [
      ["Repo and environment configuration", "Config per environment via env variables."],
      ["Typed API clients and auth fixture", "Clients for each resource; worker-scoped token fixture."],
      ["Positive CRUD tests", "Full CRUD flow with assertions."],
      ["Negative and boundary tests", "Missing auth, invalid payloads, boundaries."],
      ["Schema validation and README", "Schemas for all responses; document the framework."],
    ],
  },
  {
    name: "Project 3: CI/CD automation pipeline",
    summary:
      "Run Project 1 (and 2) in Jenkins from GitHub: install dependencies and browsers, run headless tests, publish reports and keep traces for failures.",
    requirements: [
      "GitHub repository integration (webhook or polling)",
      "Declarative Jenkins pipeline in a Jenkinsfile",
      "Install dependencies and browser binaries (or use the Playwright Docker image)",
      "Run Playwright tests headless with CI settings",
      "Publish HTML/JUnit reports and archive screenshots/traces",
      "Diagnose a failed build from its artifacts",
    ],
    folder: `ecommerce-playwright/
├── Jenkinsfile
├── playwright.config.ts   # CI: retries, workers, reporters, forbidOnly
└── docs/ci.md             # how the pipeline works + troubleshooting`,
    scenarios: [
      "Push to main triggers the pipeline",
      "Parameterised build runs a chosen browser/environment",
      "A failing test produces a trace artifact you can open",
      "Nightly scheduled run",
    ],
    acceptance: [
      "Pipeline green on a clean agent",
      "HTML report visible from the build page",
      "Traces archived on failure",
      "Secrets come from Jenkins credentials only",
    ],
    designQuestions: [
      "Walk me through each stage of your pipeline.",
      "How do you keep secrets out of logs?",
      "How did you diagnose your last CI failure?",
    ],
    milestones: [
      ["Jenkins running with NodeJS available", "Local Jenkins, Docker Jenkins or a provided server."],
      ["Jenkinsfile: install + test stages", "npm ci, browser install, npx playwright test."],
      ["Reports and artifacts published", "publishHTML, junit, archiveArtifacts."],
      ["GitHub trigger and parameters", "Webhook/polling plus browser and environment parameters."],
      ["Failure diagnosis write-up", "Break a test on purpose and document the investigation."],
    ],
  },
  {
    name: "Project 4: Advanced automation challenge",
    summary: "Combine advanced techniques: auth reuse, parallelism, cross-browser runs, flaky-test debugging, dynamic data and API + UI integration.",
    requirements: [
      "Authentication reuse with storageState and per-worker accounts",
      "Parallel execution with fully independent tests",
      "Cross-browser and mobile-emulation projects",
      "Flaky-test debugging with a documented root cause",
      "Dynamic test data generation and cleanup",
      "API and UI integration in the same scenario",
    ],
    folder: `advanced-playwright/
├── playwright.config.ts   # setup project, browser + device projects
├── tests/setup/auth.setup.ts
├── tests/...
├── fixtures/              # per-worker accounts, data factories
└── docs/flaky-tests.md`,
    scenarios: [
      "Setup project logs in once; all tests start authenticated",
      "Same suite runs on desktop and mobile projects",
      "Data created via API is cleaned up even when the test fails",
      "A previously flaky test passes 20 runs in a row (--repeat-each)",
    ],
    acceptance: [
      "Green in CI 3 runs in a row with 4+ workers",
      "No waitForTimeout anywhere",
      "Flaky-test root cause and fix documented",
    ],
    designQuestions: [
      "How do you guarantee test independence under parallel execution?",
      "Explain a flaky test you fixed and how you proved it was fixed.",
      "How do you decide what belongs in a fixture vs a helper?",
    ],
    milestones: [
      ["Auth setup project + storageState", "Log in once, reuse state across projects."],
      ["Per-worker data and cleanup fixtures", "Unique data per worker, teardown cleanup."],
      ["Cross-browser and mobile projects", "Desktop + mobile emulation projects passing."],
      ["API + UI integrated scenarios", "Seed via API, assert via UI and API."],
      ["Flaky-test investigation documented", "Root cause, fix, and repeat-each proof."],
    ],
  },
];
