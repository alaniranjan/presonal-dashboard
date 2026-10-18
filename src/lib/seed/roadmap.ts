/**
 * Starter 6-month roadmap. This is curriculum content, not progress data:
 * it is copied into the user's own rows once, then fully editable.
 */
import type { Difficulty } from "@/lib/types";

const R = {
  mdnGuide: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
  mdnClosures: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures",
  mdnPromises: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises",
  mdnAsync: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Async_JS",
  mdnArray: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array",
  tsHandbook: "https://www.typescriptlang.org/docs/handbook/intro.html",
  tsGenerics: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
  tsNarrowing: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
  gitBook: "https://git-scm.com/book/en/v2",
  nodeLearn: "https://nodejs.org/en/learn",
  pwIntro: "https://playwright.dev/docs/intro",
  pwLocators: "https://playwright.dev/docs/locators",
  pwAssertions: "https://playwright.dev/docs/test-assertions",
  pwFixtures: "https://playwright.dev/docs/test-fixtures",
  pwAnnotations: "https://playwright.dev/docs/test-annotations",
  pwPages: "https://playwright.dev/docs/pages",
  pwDialogs: "https://playwright.dev/docs/dialogs",
  pwFrames: "https://playwright.dev/docs/frames",
  pwInput: "https://playwright.dev/docs/input",
  pwDownloads: "https://playwright.dev/docs/downloads",
  pwAuth: "https://playwright.dev/docs/auth",
  pwTrace: "https://playwright.dev/docs/trace-viewer",
  pwDebug: "https://playwright.dev/docs/debug",
  pwRetries: "https://playwright.dev/docs/test-retries",
  pwPom: "https://playwright.dev/docs/pom",
  pwApi: "https://playwright.dev/docs/api-testing",
  pwParallel: "https://playwright.dev/docs/test-parallel",
  pwProjects: "https://playwright.dev/docs/test-projects",
  pwReporters: "https://playwright.dev/docs/test-reporters",
  pwCi: "https://playwright.dev/docs/ci",
  pwDocker: "https://playwright.dev/docs/docker",
  pwMock: "https://playwright.dev/docs/mock",
  pwBestPractices: "https://playwright.dev/docs/best-practices",
  mdnHttp: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
  mdnStatus: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Status",
  postman: "https://learning.postman.com/docs/introduction/overview/",
  pgTutorial: "https://www.postgresql.org/docs/current/tutorial.html",
  owaspTop10: "https://owasp.org/www-project-top-ten/",
  jenkinsBook: "https://www.jenkins.io/doc/book/",
  jenkinsPipeline: "https://www.jenkins.io/doc/book/pipeline/",
  jenkinsfile: "https://www.jenkins.io/doc/book/pipeline/jenkinsfile/",
  jenkinsCreds: "https://www.jenkins.io/doc/book/using/using-credentials/",
  dockerStart: "https://docs.docker.com/get-started/",
};

type T = [title: string, category: string, difficulty: Difficulty, minutes: number, description: string, links?: string[]];

export interface SeedWeek {
  title: string;
  goal: string;
  criteria: string;
  tasks: T[];
}

export interface SeedMonth {
  month: number;
  title: string;
  level: string;
  goal: string;
  outcome: string;
  weeks: SeedWeek[];
}

export const ROADMAP: SeedMonth[] = [
  {
    month: 1,
    title: "JavaScript & TypeScript foundations",
    level: "Foundation",
    goal: "JavaScript, TypeScript, Git and basic coding problems",
    outcome: "Write code independently and explain the fundamentals.",
    weeks: [
      {
        title: "JavaScript core",
        goal: "Be comfortable with variables, types, functions and scope.",
        criteria: "Solve 5 small exercises without looking up syntax; explain let/const/var and scope aloud.",
        tasks: [
          ["Variables, data types and type coercion", "js-ts", "beginner", 45, "let/const/var, primitives vs objects, == vs ===, truthy/falsy.", [R.mdnGuide]],
          ["Functions: declarations, expressions, arrow functions", "js-ts", "beginner", 45, "Parameters, default values, rest/spread, return values, `this` differences.", [R.mdnGuide]],
          ["Scope, hoisting and closures", "js-ts", "beginner", 60, "Block vs function scope, hoisting, write 3 closure examples (counter, once, memoize).", [R.mdnClosures]],
          ["Node.js and npm basics", "js-ts", "beginner", 45, "Install Node LTS, run scripts, package.json, npm install/scripts, ES modules vs CommonJS.", [R.nodeLearn]],
          ["Practice: 5 beginner coding problems", "coding", "beginner", 60, "Reverse a string, count vowels, FizzBuzz, find max in array, palindrome check."],
        ],
      },
      {
        title: "Arrays, objects and problem solving",
        goal: "Use map/filter/reduce fluently and manipulate objects.",
        criteria: "Solve 8 array/object problems using higher-order functions.",
        tasks: [
          ["Arrays: map, filter, reduce, find, some, every", "js-ts", "beginner", 60, "Rewrite loops using higher-order functions. Know when reduce is overkill.", [R.mdnArray]],
          ["Objects: destructuring, spread, Object.keys/entries", "js-ts", "beginner", 45, "Clone vs reference, shallow vs deep copy, optional chaining and nullish coalescing.", [R.mdnGuide]],
          ["Strings and common string methods", "js-ts", "beginner", 45, "split/join, slice/substring, includes, replace, template literals, regex basics."],
          ["Practice: frequency counting and grouping", "coding", "beginner", 60, "Character frequency, group by key, remove duplicates, two-sum with a map."],
          ["Practice: 3 interview-style array problems", "coding", "intermediate", 60, "Flatten nested array, chunk an array, find second largest without sorting."],
        ],
      },
      {
        title: "Asynchronous JavaScript",
        goal: "Understand the event loop, promises and async/await — the base of every Playwright test.",
        criteria: "Explain the event loop; convert callback code to async/await; handle errors with try/catch.",
        tasks: [
          ["Callbacks, the event loop and the task queue", "js-ts", "intermediate", 45, "Call stack, microtasks vs macrotasks, why setTimeout(0) runs later.", [R.mdnAsync]],
          ["Promises: then/catch, Promise.all/allSettled/race", "js-ts", "intermediate", 60, "Create and chain promises; compare all vs allSettled for parallel work.", [R.mdnPromises]],
          ["async/await and error handling", "js-ts", "intermediate", 60, "Sequential vs parallel awaits, try/catch/finally, common mistakes (forgotten await).", [R.mdnAsync]],
          ["Practice: fetch a public API with async/await", "js-ts", "intermediate", 45, "Use fetch in Node to call a JSON API, handle non-200 responses and timeouts."],
          ["Practice: async coding problems", "coding", "intermediate", 60, "Implement sleep(), retry(fn, n), and run promises with a concurrency limit."],
        ],
      },
      {
        title: "TypeScript, Git and debugging",
        goal: "Write typed code with interfaces and generics; use Git daily.",
        criteria: "Convert a JS exercise file to strict TypeScript with no `any`; push it to a GitHub repo.",
        tasks: [
          ["TypeScript basics: types, interfaces, type aliases", "js-ts", "beginner", 60, "Primitive types, arrays, tuples, interfaces vs types, optional and readonly.", [R.tsHandbook]],
          ["Unions, narrowing, enums and literal types", "js-ts", "intermediate", 45, "Discriminated unions, type guards, `as const`, when to avoid enums.", [R.tsNarrowing]],
          ["Generics and utility types", "js-ts", "intermediate", 60, "Generic functions, constraints, Partial/Pick/Omit/Record.", [R.tsGenerics]],
          ["Git and GitHub essentials", "cicd", "beginner", 60, "init, add, commit, branch, merge, rebase basics, pull requests, .gitignore.", [R.gitBook]],
          ["Debugging in VS Code + error handling in TS", "debugging", "beginner", 45, "Breakpoints, watch expressions, stack traces, custom Error classes."],
        ],
      },
    ],
  },
  {
    month: 2,
    title: "Playwright fundamentals",
    level: "Beginner → Intermediate",
    goal: "Playwright locators, assertions, waits, fixtures, browser contexts",
    outcome: "Automate real UI workflows reliably.",
    weeks: [
      {
        title: "Setup, locators and assertions",
        goal: "Install Playwright and write stable tests with user-facing locators.",
        criteria: "10 passing tests against a demo site using getByRole/getByLabel and web-first assertions.",
        tasks: [
          ["Install Playwright and understand the config", "playwright", "beginner", 45, "npm init playwright, playwright.config.ts, projects, baseURL, running tests and UI mode.", [R.pwIntro]],
          ["Locators: getByRole, getByLabel, getByText, getByTestId", "playwright", "beginner", 60, "Locator priority, chaining and filtering, why to avoid XPath and brittle CSS.", [R.pwLocators]],
          ["Web-first assertions and auto-waiting", "playwright", "beginner", 60, "expect(locator).toBeVisible/toHaveText/toHaveURL, soft assertions, actionability checks.", [R.pwAssertions]],
          ["Actions: click, fill, select, check, keyboard and mouse", "playwright", "beginner", 45, "Form interactions, press, hover, drag and drop.", [R.pwInput]],
          ["Practice: automate a login + search flow", "playwright", "beginner", 60, "Pick a public demo site; write 5 tests covering happy path and validation errors."],
        ],
      },
      {
        title: "Test organization",
        goal: "Structure suites with hooks, fixtures, annotations and tags.",
        criteria: "Suite uses describe blocks, beforeEach, a custom fixture and @smoke/@regression tags runnable with --grep.",
        tasks: [
          ["describe, hooks and test isolation", "playwright", "beginner", 45, "beforeEach/afterEach/beforeAll, why each test gets a fresh context.", [R.pwIntro]],
          ["Built-in and custom fixtures", "playwright", "intermediate", 60, "page/context/request fixtures, test.extend, worker vs test scope.", [R.pwFixtures]],
          ["Annotations and tags", "playwright", "beginner", 30, "skip, fixme, fail, slow, test.step, tags and --grep.", [R.pwAnnotations]],
          ["Folder structure for a growing suite", "framework", "intermediate", 45, "tests/, pages/, fixtures/, utils/, test-data/; naming conventions."],
          ["Practice: refactor last week's tests", "playwright", "intermediate", 60, "Apply hooks, a custom fixture and tags; push to GitHub."],
        ],
      },
      {
        title: "Browser features",
        goal: "Handle contexts, multiple pages, dialogs, frames, uploads and downloads.",
        criteria: "One test per feature (new tab, dialog, iframe, upload, download) passing reliably 5 runs in a row.",
        tasks: [
          ["Browser, context and page; multiple tabs", "playwright", "intermediate", 45, "Isolation model, waitForEvent('page'), popups.", [R.pwPages]],
          ["Dialogs and iframes", "playwright", "intermediate", 45, "page.on('dialog'), frameLocator.", [R.pwDialogs, R.pwFrames]],
          ["File uploads and downloads", "playwright", "intermediate", 45, "setInputFiles, waitForEvent('download'), saving and asserting downloads.", [R.pwInput, R.pwDownloads]],
          ["Authentication and storageState", "playwright", "intermediate", 60, "Log in once in a setup project, reuse storageState across tests.", [R.pwAuth]],
          ["Practice: test each browser feature", "playwright", "intermediate", 60, "Write one stable test per feature above on a demo site."],
        ],
      },
      {
        title: "Debugging, traces and flakiness",
        goal: "Diagnose failures quickly with traces and know why tests flake.",
        criteria: "Open a trace for a failing test and explain the root cause; fix one deliberately flaky test.",
        tasks: [
          ["Screenshots, videos and the Trace Viewer", "debugging", "intermediate", 45, "trace: 'on-first-retry', show-trace, reading actions/network/console.", [R.pwTrace]],
          ["Debug mode, codegen and the inspector", "debugging", "beginner", 45, "--debug, page.pause(), codegen for locator discovery.", [R.pwDebug]],
          ["Retries and flaky-test analysis", "debugging", "intermediate", 60, "Retries config, common causes: timing, shared state, test order, animations.", [R.pwRetries]],
          ["Playwright best practices", "playwright", "intermediate", 30, "Test user-visible behaviour, isolate tests, avoid hard waits.", [R.pwBestPractices]],
          ["Practice: create and fix 3 flaky tests", "debugging", "intermediate", 60, "Introduce waitForTimeout/shared state/order dependency, then fix each properly."],
        ],
      },
    ],
  },
  {
    month: 3,
    title: "Advanced Playwright & framework development",
    level: "Intermediate",
    goal: "Page Object Model, framework design, API + UI, reporting",
    outcome: "Build and explain an end-to-end framework.",
    weeks: [
      {
        title: "Page Object Model",
        goal: "Design page objects and reusable components that keep tests readable.",
        criteria: "E-commerce framework skeleton with 4 page objects and tests that contain no raw locators.",
        tasks: [
          ["Page Object Model in TypeScript", "framework", "intermediate", 60, "Classes, readonly locators, action methods vs assertions in tests.", [R.pwPom]],
          ["Reusable components (header, cart widget, modal)", "framework", "intermediate", 45, "Component objects composed into pages."],
          ["Fixtures that provide page objects", "framework", "intermediate", 45, "test.extend to inject page objects; avoid `new` in every test.", [R.pwFixtures]],
          ["Project 1 kickoff: e-commerce framework skeleton", "framework", "intermediate", 60, "Create the repo, config, folder structure and first page objects."],
          ["Practice: login and product search tests via POM", "playwright", "intermediate", 60, "Cover login success/failure and search/filter scenarios."],
        ],
      },
      {
        title: "Test data and environments",
        goal: "Manage test data and run against multiple environments safely.",
        criteria: "Tests read baseURL/credentials from env; data builders create unique users/orders.",
        tasks: [
          ["Test-data management: builders and factories", "framework", "intermediate", 45, "Static JSON vs generated data, unique IDs, cleanup strategy."],
          ["Environment configuration with dotenv", "framework", "intermediate", 45, "Per-env config, secrets in env vars, never in the repo."],
          ["API setup for UI tests", "api", "intermediate", 60, "Create data via request fixture before UI steps to save time.", [R.pwApi]],
          ["Network mocking and route interception", "playwright", "advanced", 45, "page.route, fulfilling mocked responses, testing error states.", [R.pwMock]],
          ["Practice: cart and checkout tests with seeded data", "playwright", "intermediate", 60, "Project 1: add to cart, update quantity, checkout validation."],
        ],
      },
      {
        title: "Parallelism, projects and cross-browser",
        goal: "Run suites fast and reliably across browsers.",
        criteria: "Suite passes in Chromium, Firefox and WebKit with 4 workers and fullyParallel.",
        tasks: [
          ["Parallel execution and workers", "playwright", "intermediate", 45, "fullyParallel, workers, serial mode, test independence.", [R.pwParallel]],
          ["Projects: browsers, devices and setup dependencies", "playwright", "intermediate", 45, "Multiple projects, mobile emulation, setup project for auth.", [R.pwProjects]],
          ["Sharding and test selection", "playwright", "advanced", 30, "--shard, --grep, --last-failed for faster feedback.", [R.pwParallel]],
          ["Authentication strategies at scale", "framework", "advanced", 45, "One account per worker, storageState per role.", [R.pwAuth]],
          ["Practice: run Project 1 cross-browser in parallel", "playwright", "intermediate", 60, "Fix any browser-specific failures and document them."],
        ],
      },
      {
        title: "Reporting and framework polish",
        goal: "Produce useful reports and explain your framework design in an interview.",
        criteria: "HTML report + one more reporter configured; README explains architecture; 3-minute verbal walkthrough recorded or written.",
        tasks: [
          ["Reporters: HTML, list, JUnit and Allure", "framework", "intermediate", 45, "Configure multiple reporters, attach screenshots and traces.", [R.pwReporters]],
          ["Custom helpers, test.step and readable output", "framework", "intermediate", 45, "Wrap business steps for clearer reports."],
          ["Order history verification (Project 1)", "playwright", "intermediate", 60, "Place an order and verify it via UI and API."],
          ["Write the framework README", "framework", "beginner", 45, "Architecture, folder structure, how to run, design decisions."],
          ["Interview: explain your framework architecture", "hr", "intermediate", 45, "Practise a 3-minute explanation: layers, fixtures, data, reporting, CI."],
        ],
      },
    ],
  },
  {
    month: 4,
    title: "API testing & supporting QA skills",
    level: "Intermediate → Advanced",
    goal: "REST APIs, Postman, SQL, negative testing, debugging",
    outcome: "Solve realistic QA and automation scenarios.",
    weeks: [
      {
        title: "HTTP and REST fundamentals",
        goal: "Know methods, status codes, headers and payloads cold.",
        criteria: "Explain 15 status codes and idempotency; build a Postman collection with 10 requests and tests.",
        tasks: [
          ["HTTP: methods, idempotency, headers", "api", "beginner", 45, "GET/POST/PUT/PATCH/DELETE, safe vs idempotent, content-type, caching headers.", [R.mdnHttp]],
          ["Status codes and error responses", "api", "beginner", 30, "2xx/3xx/4xx/5xx, 401 vs 403, 400 vs 422, 409.", [R.mdnStatus]],
          ["Postman: collections, environments, tests", "api", "beginner", 60, "Variables, pre-request scripts, pm.test assertions, collection runner.", [R.postman]],
          ["Authentication: API keys, Basic, Bearer tokens, OAuth overview", "api", "intermediate", 45, "Token lifecycle, refresh tokens, where tokens are stored."],
          ["Practice: test a public REST API in Postman", "api", "beginner", 60, "CRUD flow with positive and negative tests."],
        ],
      },
      {
        title: "API automation with Playwright",
        goal: "Automate API tests using APIRequestContext.",
        criteria: "Project 2: 15 API tests (positive + negative) with reusable request helpers and schema checks.",
        tasks: [
          ["APIRequestContext basics", "api", "intermediate", 60, "request fixture, newContext with baseURL and headers.", [R.pwApi]],
          ["Response validation and JSON schema checks", "api", "intermediate", 45, "Status, headers, body shape; validate with zod or ajv."],
          ["Negative testing and error handling", "api", "intermediate", 45, "Invalid payloads, missing auth, boundary values, rate limits."],
          ["Project 2 kickoff: API framework", "api", "intermediate", 60, "Request utilities, token handling, environment config."],
          ["Practice: combine API + UI in one test", "framework", "advanced", 60, "Create via API, verify in UI, clean up via API."],
        ],
      },
      {
        title: "SQL and database testing",
        goal: "Write the SQL a QA engineer is asked about.",
        criteria: "Solve 15 SQL problems including joins, group by, subqueries and window functions basics.",
        tasks: [
          ["SELECT, WHERE, ORDER BY, LIMIT", "sql", "beginner", 45, "Install PostgreSQL or use an online sandbox.", [R.pgTutorial]],
          ["JOINs: inner, left, right, full, self", "sql", "intermediate", 60, "Draw the result sets; find orphan records."],
          ["GROUP BY, HAVING, aggregates and subqueries", "sql", "intermediate", 60, "Second highest salary, duplicates, counts per group."],
          ["Database testing: data integrity and constraints", "sql", "intermediate", 45, "Verify UI actions in the DB, constraints, transactions."],
          ["Practice: 10 classic SQL interview questions", "sql", "intermediate", 60, "Nth highest salary, employees without managers, duplicate emails, etc."],
        ],
      },
      {
        title: "Test design, bugs and non-functional basics",
        goal: "Strengthen manual testing fundamentals interviewers still ask.",
        criteria: "Write test cases for a feature using BVA/EP; write 3 high-quality bug reports.",
        tasks: [
          ["Test design techniques: EP, BVA, decision tables, state transition", "manual", "beginner", 60, "Apply each to a login or checkout form."],
          ["Bug reporting and severity vs priority", "manual", "beginner", 45, "Steps, expected vs actual, evidence, environment."],
          ["Regression, smoke, sanity and test strategy", "manual", "beginner", 45, "Choosing what to automate, risk-based testing."],
          ["Basic performance and security testing concepts", "manual", "intermediate", 45, "Load vs stress, response-time metrics, OWASP Top 10 basics.", [R.owaspTop10]],
          ["Practice: scenario-based debugging questions", "debugging", "intermediate", 60, "Test passes locally but fails in CI; flaky login; slow API — write how you'd investigate."],
        ],
      },
    ],
  },
  {
    month: 5,
    title: "Jenkins, CI/CD & real-world projects",
    level: "Advanced",
    goal: "Jenkins, GitHub, CI/CD, Docker basics, reports, flaky tests",
    outcome: "Run your framework through a CI pipeline.",
    weeks: [
      {
        title: "Jenkins basics",
        goal: "Run Jenkins locally and create freestyle and pipeline jobs.",
        criteria: "Jenkins running; a freestyle job and a pipeline job that run `npx playwright test`.",
        tasks: [
          ["Install Jenkins (local, Docker or a provided server)", "cicd", "beginner", 60, "Unlock, install suggested plugins, create an admin user, install NodeJS plugin.", [R.jenkinsBook]],
          ["Freestyle jobs", "cicd", "beginner", 45, "Source control, build steps, post-build actions."],
          ["Pipeline jobs and Jenkinsfile syntax", "cicd", "intermediate", 60, "Declarative pipeline: agent, stages, steps, post.", [R.jenkinsPipeline, R.jenkinsfile]],
          ["Credentials and environment variables", "cicd", "intermediate", 45, "withCredentials, credentials(), never echo secrets.", [R.jenkinsCreds]],
          ["Practice: pipeline that runs Project 1", "cicd", "intermediate", 60, "Install deps, install browsers, run tests headless."],
        ],
      },
      {
        title: "GitHub integration and reports",
        goal: "Trigger builds from GitHub and publish reports and artifacts.",
        criteria: "Push triggers the pipeline; HTML report published; traces archived on failure.",
        tasks: [
          ["GitHub integration: webhooks or polling", "cicd", "intermediate", 45, "Multibranch pipelines, PR builds."],
          ["Publish HTML/JUnit reports and archive artifacts", "cicd", "intermediate", 45, "publishHTML, junit, archiveArtifacts for traces and screenshots.", [R.pwCi]],
          ["Running Playwright headless in CI", "cicd", "intermediate", 45, "CI-specific config: retries, workers, reporters, forbidOnly.", [R.pwCi]],
          ["Project 3 kickoff: CI/CD automation framework", "cicd", "intermediate", 60, "Jenkinsfile in repo, parameterised browser/environment."],
          ["Practice: diagnose a failed CI build", "debugging", "intermediate", 45, "Break a test on purpose, find the cause from the report and trace."],
        ],
      },
      {
        title: "Docker and scheduling",
        goal: "Run tests in containers and on a schedule.",
        criteria: "Tests run inside the Playwright Docker image in Jenkins; nightly cron build configured.",
        tasks: [
          ["Docker fundamentals", "cicd", "beginner", 60, "Images, containers, volumes, Dockerfile basics.", [R.dockerStart]],
          ["Playwright's official Docker image", "cicd", "intermediate", 45, "Run tests in mcr.microsoft.com/playwright with the matching version.", [R.pwDocker]],
          ["Parallel stages and sharding in Jenkins", "cicd", "advanced", 45, "parallel {} blocks, merging shard reports."],
          ["Scheduled runs and notifications", "cicd", "intermediate", 30, "cron triggers, email/Slack notifications on failure."],
          ["Practice: dockerised pipeline for Project 3", "cicd", "advanced", 60, "Agent docker image, artifacts, report publishing."],
        ],
      },
      {
        title: "Advanced automation challenge",
        goal: "Combine everything in Project 4 and practise debugging flaky CI.",
        criteria: "Project 4: auth reuse, parallel, cross-browser, dynamic data and API+UI checks, green in CI 3 runs in a row.",
        tasks: [
          ["Project 4: auth reuse and dynamic test data", "framework", "advanced", 60, "Per-worker accounts, data factories."],
          ["Project 4: API + UI integration scenarios", "framework", "advanced", 60, "Seed via API, assert via UI and API."],
          ["Flaky test debugging in CI", "debugging", "advanced", 60, "Compare local vs CI traces, resource limits, timing."],
          ["Code review your own framework", "framework", "advanced", 45, "Duplication, naming, waits, assertions; refactor."],
          ["Interview: explain your CI pipeline", "hr", "intermediate", 45, "Stages, triggers, reports, how you handle failures."],
        ],
      },
    ],
  },
  {
    month: 6,
    title: "Interview preparation & job switching",
    level: "Interview-ready",
    goal: "Mock interviews, coding, HR, resume, project explanation, applications",
    outcome: "Demonstrate your skills and actively pursue suitable roles.",
    weeks: [
      {
        title: "Resume and profiles",
        goal: "Have a truthful, keyword-matched resume and up-to-date profiles.",
        criteria: "Resume v1 done; LinkedIn and Naukri updated; 2 JD comparisons completed.",
        tasks: [
          ["Rewrite resume summary and skills", "career", "beginner", 60, "Target QA Automation / SDET; only real skills and experience."],
          ["Project bullets with measurable outcomes", "career", "intermediate", 60, "Describe Projects 1–4 with what you built and real results."],
          ["Update LinkedIn and Naukri profiles", "career", "beginner", 45, "Headline, about, skills, featured GitHub repos."],
          ["Self-introduction: 30s, 60s and 2-minute versions", "hr", "beginner", 45, "Write and rehearse all three."],
          ["Compare resume with 2 real job descriptions", "career", "intermediate", 45, "Matching skills, missing skills, honest improvements."],
        ],
      },
      {
        title: "Technical interview drills",
        goal: "Answer Playwright, TypeScript and framework questions confidently.",
        criteria: "20 questions attempted in Interview Practice with average score ≥ 70.",
        tasks: [
          ["Playwright advanced questions", "playwright", "advanced", 60, "Fixtures, auto-waiting, auth, parallelism, flakiness."],
          ["TypeScript and JavaScript questions", "js-ts", "intermediate", 45, "Closures, async, generics, types vs interfaces."],
          ["Framework architecture and debugging scenarios", "framework", "advanced", 60, "Design decisions and trade-offs."],
          ["API, SQL and CI/CD rapid-fire", "api", "intermediate", 45, "Short answers, then follow-ups."],
          ["Coding round: 3 problems with a timer", "coding", "intermediate", 60, "Think aloud, write tests for your solution."],
        ],
      },
      {
        title: "HR and behavioural rounds",
        goal: "Prepare honest, structured answers for HR and managerial rounds.",
        criteria: "STAR answers saved for 6 behavioural questions; salary and notice-period answers prepared.",
        tasks: [
          ["Why are you changing jobs? Strengths and weaknesses", "hr", "beginner", 45, "Positive, honest, future-focused answers."],
          ["STAR stories: difficult bug, disagreement, deadline", "hr", "intermediate", 60, "Situation, Task, Action, Result — with real examples."],
          ["Salary expectations and notice period", "hr", "beginner", 30, "Research ranges, give a reasoned range, negotiation basics."],
          ["Explain your current project end to end", "hr", "intermediate", 45, "Domain, team, your role, tools, challenges."],
          ["Mock HR interview (self or with a friend)", "hr", "intermediate", 45, "Record notes on what to improve."],
        ],
      },
      {
        title: "Mock interviews and applications",
        goal: "Run full mock interviews and apply to targeted roles.",
        criteria: "2 full mock interviews logged; 15 targeted applications tracked with follow-up dates.",
        tasks: [
          ["Full technical mock interview #1", "playwright", "advanced", 60, "Mixed topics, follow-up questions, timed."],
          ["Targeted applications: 5 roles", "career", "beginner", 60, "Customise resume version per JD; log in Job Tracker."],
          ["Full technical mock interview #2", "framework", "advanced", 60, "Focus on your weakest topics from mock #1."],
          ["Follow-ups and recruiter messages", "career", "beginner", 30, "Polite, short follow-ups on due applications."],
          ["Revise weak topics from the revision queue", "revision", "intermediate", 60, "Re-attempt every question marked Needs Improvement."],
        ],
      },
    ],
  },
];
