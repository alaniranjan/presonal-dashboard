/**
 * Compares a job description with resume text using a QA/SDET skill dictionary.
 * Reports only what is present or absent; it never invents experience.
 */

const SKILLS: Record<string, string[]> = {
  Playwright: ["playwright"],
  TypeScript: ["typescript"],
  JavaScript: ["javascript", "es6"],
  "Node.js": ["node.js", "nodejs", "node js"],
  Selenium: ["selenium", "webdriver"],
  Cypress: ["cypress"],
  WebdriverIO: ["webdriverio", "wdio"],
  Appium: ["appium"],
  Java: ["java"],
  Python: ["python"],
  "C#": ["c#", "csharp"],
  "API testing": ["api testing", "api automation", "api test", "apis"],
  "REST APIs": ["rest api", "restful", "rest apis", "rest services"],
  GraphQL: ["graphql"],
  Postman: ["postman", "newman"],
  "REST Assured": ["rest assured", "restassured"],
  SQL: ["sql"],
  MySQL: ["mysql"],
  PostgreSQL: ["postgresql", "postgres"],
  MongoDB: ["mongodb", "mongo"],
  Jenkins: ["jenkins"],
  "GitHub Actions": ["github actions"],
  "GitLab CI": ["gitlab ci", "gitlab-ci"],
  "Azure DevOps": ["azure devops"],
  "CI/CD": ["ci/cd", "ci cd", "continuous integration", "continuous delivery", "ci pipeline", "ci pipelines"],
  Docker: ["docker", "containers"],
  Kubernetes: ["kubernetes", "k8s"],
  Git: ["git", "github", "gitlab", "bitbucket"],
  Jira: ["jira"],
  "Agile/Scrum": ["agile", "scrum", "sprint"],
  BDD: ["bdd", "cucumber", "gherkin"],
  TestNG: ["testng"],
  JUnit: ["junit"],
  Jest: ["jest"],
  Mocha: ["mocha"],
  Allure: ["allure"],
  "Page Object Model": ["page object", "pom"],
  "Framework design": ["framework design", "automation framework", "test framework", "frameworks"],
  "Performance testing": ["performance testing", "load testing", "jmeter", "k6", "gatling", "loadrunner"],
  "Security testing": ["security testing", "owasp", "penetration"],
  "Accessibility testing": ["accessibility", "a11y", "wcag"],
  "Mobile testing": ["mobile testing", "android", "ios"],
  "Cross-browser testing": ["cross-browser", "cross browser", "browserstack", "sauce labs"],
  "Manual testing": ["manual testing", "exploratory testing"],
  "Regression testing": ["regression"],
  "Test planning": ["test plan", "test planning", "test strategy"],
  "Test case design": ["test case", "test cases", "test design", "test scenarios"],
  "Defect tracking": ["defect", "bug tracking", "bug reports", "defect tracking"],
  "Microservices": ["microservices", "micro-services"],
  AWS: ["aws", "amazon web services"],
  Linux: ["linux", "unix", "shell scripting", "bash"],
  "JSON/XML": ["json", "xml"],
  "HTML/CSS": ["html", "css"],
  "SDLC/STLC": ["sdlc", "stlc"],
};

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

const PATTERNS = Object.entries(SKILLS).map(([skill, aliases]) => ({
  skill,
  re: new RegExp(`(^|[^a-z0-9+#])(${aliases.map(escape).join("|")})(?![a-z0-9+#])`, "i"),
}));

export function findSkills(text: string): string[] {
  return PATTERNS.filter((p) => p.re.test(text)).map((p) => p.skill);
}

const STOPWORDS = new Set(
  ("a an the and or of to in on for with by at as is are be will you your we our this that from have has who what " +
    "experience years year work working team teams strong good ability knowledge skills skill etc using use role job " +
    "candidate must should able including such other new well across within based plus responsibilities requirements " +
    "required preferred qualifications looking join company about into more their they them it its can may also").split(" "),
);

export interface MatchResult {
  jdSkills: string[];
  matched: string[];
  missing: string[];
  score: number;
  keywords: string[];
  suggestions: string[];
}

export function compareResume(jd: string, resumeText: string): MatchResult {
  const jdSkills = findSkills(jd);
  const resumeSkills = new Set(findSkills(resumeText));
  const matched = jdSkills.filter((s) => resumeSkills.has(s));
  const missing = jdSkills.filter((s) => !resumeSkills.has(s));
  const score = jdSkills.length ? Math.round((matched.length / jdSkills.length) * 100) : 0;

  // Frequent JD words that never appear in the resume (beyond the skill dictionary).
  const resumeLower = resumeText.toLowerCase();
  const counts = new Map<string, number>();
  for (const w of jd.toLowerCase().match(/[a-z][a-z+#./-]{2,}/g) ?? []) {
    const word = w.replace(/[./-]+$/, "");
    if (word.length < 4 || STOPWORDS.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  const keywords = [...counts.entries()]
    .filter(([w, n]) => n >= 2 && !resumeLower.includes(w))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  const suggestions: string[] = [];
  for (const s of missing.slice(0, 8)) {
    suggestions.push(`${s}: if you have genuinely used it, add it to your skills and to a project or experience bullet. If not, add it to your learning plan, not your resume.`);
  }
  if (!/\d/.test(resumeText)) {
    suggestions.push("Add measurable outcomes you can verify (number of tests automated, run-time reduced, defects found).");
  }
  if (matched.length && score < 60) {
    suggestions.push("Move the matching skills higher, into your summary and first bullets, so they're visible within a few seconds.");
  }
  if (!jdSkills.length) suggestions.push("No known QA skills were found in this job description. Paste the full requirements section.");
  return { jdSkills, matched, missing, score, keywords, suggestions };
}

export function resumeText(r: {
  summary: string | null; skills: string[]; experience_text: string | null;
  projects_text: string | null; achievements: string | null; content: string | null;
}) {
  return [r.summary, r.skills.join(", "), r.experience_text, r.projects_text, r.achievements, r.content].filter(Boolean).join("\n");
}
