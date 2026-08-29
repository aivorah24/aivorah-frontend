---
name: e2e-testing
description: Use when designing, reviewing, organizing, implementing, or validating Playwright E2E tests in this repo - for a new feature/screen, a user-provided screen recording, or a request to add/reorganize test coverage. Enforces reading CLAUDE.md and the real app code first, business-outcome-focused tests over UI-only checks, feature-based folder structure (role/module/feature), and a final structured report.
---

# Enterprise E2E Testing Skill

## Purpose

This skill is responsible for designing, reviewing, organizing, implementing, and validating enterprise-grade E2E tests for this codebase.

The skill must use ALL available context before creating tests:

1. User requirement
2. User-provided screen recording/video
3. Project-level CLAUDE.md instructions
4. Existing codebase
5. Existing E2E tests
6. Existing test infrastructure

The objective is not to maximize test count.

The objective is to provide high confidence in critical user journeys and business outcomes while keeping the E2E suite reliable, deterministic, maintainable, and easy to understand.

---

# PHASE 0 — READ PROJECT INSTRUCTIONS FIRST

Before analyzing or modifying code:

1. Locate all applicable CLAUDE.md files.
2. Read the root CLAUDE.md.
3. Read any nested CLAUDE.md files relevant to the feature being tested.
4. Understand all project-specific instructions.

Respect:

- Coding conventions
- Folder structure
- Naming conventions
- Testing conventions
- Authentication/session strategy
- Fixtures
- Test data strategy
- Playwright configuration
- Selector conventions
- API usage rules
- Database/test environment rules
- Existing architectural decisions

CLAUDE.md instructions are mandatory project rules.

Do not override them with generic testing preferences.

If a project convention differs from this skill, follow the project convention unless it conflicts with a direct user requirement.

---

# PHASE 1 — ANALYZE THE USER'S SCREEN RECORDING

If the user provides a screen recording, analyze it BEFORE inspecting the feature implementation.

The recording represents the user's actual experience.

Identify:

- User role
- Starting page
- Navigation
- Routes/screens visited
- Visible sections
- Cards
- Tables
- Buttons
- Filters
- Tabs
- Forms
- User actions
- Visible data
- State changes
- Loading states
- Empty states
- Error states
- Navigation between screens
- Important workflows
- Dynamic information
- Business-looking values

Create an initial understanding of:

WHO
→ does WHAT
→ WHERE
→ and expects WHAT result.

IMPORTANT:

Do NOT assume that everything visible in the recording is a complete business rule.

The recording describes the user experience.

The codebase must be used to determine actual behavior and business rules.

---

# PHASE 2 — UNDERSTAND THE USER'S REQUIREMENT

Read the user's explicit requirement carefully.

Identify:

- What feature they want tested
- What scenarios they specifically mentioned
- What business outcomes they care about
- What files/folders they expect
- Any existing test strategy they referenced
- Any constraints
- Any specific edge cases

Do not replace the user's requirement with a generic testing strategy.

Combine the user's requirement with the actual implementation.

---

# PHASE 3 — INSPECT THE CODEBASE

After understanding the video and requirement, inspect the codebase.

Find:

- Relevant frontend components
- Pages
- Routes
- Navigation
- API calls
- API routes
- Controllers
- Services
- Business logic
- Database queries/models
- State management
- Calculations
- Aggregations
- Permissions
- Authentication
- Existing fixtures
- Test data
- Existing Page Objects
- Existing helpers
- Existing E2E tests
- Unit tests
- Integration/API tests

Trace important flows:

UI
 ↓
Frontend logic
 ↓
API
 ↓
Backend
 ↓
Business/service logic
 ↓
Database/state
 ↓
API response
 ↓
UI

The codebase is the source of truth for actual implementation.

Never invent functionality that is not supported by the code.

---

# PHASE 4 — UNDERSTAND THE BUSINESS LOGIC

For every meaningful feature identified from the recording, determine:

- What is the business purpose?
- What triggers the behavior?
- What data is involved?
- What state changes?
- What calculations occur?
- What aggregation occurs?
- What conditions determine the result?
- What permissions apply?
- What happens when data is missing?
- What happens when there is no data?
- What happens when the operation fails?

Example:

If the UI shows:

Total Students: 3

Do NOT assume that this is simply a UI number.

Find out:

- What qualifies as a student?
- Is the student enrolled?
- Is inactive data excluded?
- Is it class-specific?
- Is it teacher-specific?
- What causes the number to change?

Then design the E2E around the actual business behavior.

---

# PHASE 5 — IDENTIFY TESTABLE BEHAVIOR

Classify discovered behavior into:

1. UI/navigation
2. Business workflow
3. Business state transition
4. Data consistency
5. Permission/authorization
6. Happy path
7. Negative path
8. Empty state
9. Error state
10. Edge case
11. Persistence/refresh
12. Cross-feature workflow

Do not blindly create every category.

Only create scenarios that are relevant to the actual feature.

---

# PHASE 6 — RESPECT THE TEST PYRAMID

Use the appropriate testing layer.

## Unit Tests

Use for:

- Individual calculations
- Pure functions
- Small business rules
- Data transformations

## Integration/API Tests

Use for:

- Detailed business rules
- Service interactions
- API behavior
- Database interactions
- Authorization rules
- Complex backend logic

## E2E Tests

Use for:

- Critical user journeys
- Cross-system workflows
- Important business outcomes
- UI + API + backend integration
- User-visible results

Do NOT duplicate every unit or integration test in E2E.

E2E should prove that the complete real-world workflow works.

---

# PHASE 7 — BUSINESS-FOCUSED E2E

For meaningful business features, use:

USER ACTION
 ↓
APPLICATION
 ↓
BUSINESS PROCESS
 ↓
STATE/PERSISTENCE
 ↓
USER-VISIBLE OUTCOME

Example:

Teacher adds student
 ↓
Student enrollment succeeds
 ↓
Enrollment is persisted
 ↓
Teacher Dashboard refreshes
 ↓
Total Students increases correctly

Example:

Student performs qualifying activity
 ↓
Activity is persisted
 ↓
Dashboard aggregation updates
 ↓
Active Today changes
 ↓
Recent Activity shows the correct activity

Do NOT write:

"Card is visible."

when the card represents meaningful business information.

---

# PHASE 8 — UI AND ROUTING TESTS

Not everything needs a business E2E test.

Basic dashboard-level UI/routing/smoke behavior should remain at the dashboard level.

Examples:

- Dashboard route loads
- Correct page opens
- Main dashboard sections are visible
- Navigation works
- Basic loading state works
- Dashboard-level empty/error state

These may belong in:

dashboard.spec.js

Feature-specific business behavior should live in the relevant feature folder.

---

# PHASE 9 — FEATURE-BASED FILE STRUCTURE

Organize E2E tests using:

ROLE
 ↓
MODULE/PAGE
 ↓
FEATURE
 ↓
TEST

Example:

e2e/
├── teacher/
│   └── dashboard/
│       ├── dashboard.spec.js
│       │
│       ├── student-overview/
│       │   └── student-overview.spec.js
│       │
│       ├── class-progress/
│       │   └── class-progress.spec.js
│       │
│       └── ai-insights/
│           └── ai-insights.spec.js
│
├── parent/
│   └── dashboard/
│       ├── dashboard.spec.js
│       ├── challenges/
│       │   └── challenges.spec.js
│       └── ...
│
└── student/
    └── ...

This is an example.

Inspect the actual repository and use its existing conventions.

Do not blindly create folders.

---

# PHASE 10 — DECIDE WHETHER SOMETHING IS A FEATURE

Create a feature folder when a dashboard/page section represents meaningful business functionality or multiple meaningful scenarios.

For example:

Student Overview:

- Total Students
- Active Today
- Need Attention
- Recent Activity

This is likely a feature because it represents multiple business outcomes.

Therefore:

dashboard/student-overview/

is appropriate.

But a simple static label or decorative UI element should not receive its own folder.

Avoid unnecessary nesting.

---

# PHASE 11 — TEST MATRIX

Before implementation, create a test matrix:

| ID | Scenario | Type | Business Rule | Priority | Existing/New |
|----|----------|------|---------------|----------|--------------|

Consider:

- Happy path
- Business logic
- State transitions
- UI/navigation
- Permissions
- Negative cases
- Empty states
- Error states
- Edge cases
- Persistence
- Cross-feature workflows

Priorities:

P0 = Critical business flow
P1 = Important functionality
P2 = Edge/secondary behavior

Do not generate shallow tests merely to increase test count.

---

# PHASE 12 — EXISTING TEST COVERAGE

Before writing new tests:

1. Find existing E2E tests.
2. Run relevant baseline tests where practical.
3. Understand what is already covered.
4. Identify duplicate coverage.
5. Identify UI-only tests.
6. Identify weak assertions.
7. Identify missing business coverage.
8. Identify flaky tests.
9. Identify incorrect file placement.

Do not delete valid coverage just to reorganize files.

Do not rewrite tests merely to make them pass.

---

# PHASE 13 — TEST DATA

Use deterministic test data.

Avoid:

- Random mutable data
- Production data
- Manual setup
- Test ordering dependencies
- Shared mutable state

Reuse existing:

- Fixtures
- Test users
- Data builders
- API helpers
- Database helpers

API/database setup may be used to prepare state.

However, do not replace the actual business action being tested with an API call.

## Data-driven dashboard features: the standard flow

For any dashboard/screen whose content is computed FROM other data (a
teacher dashboard reflecting student activity, a parent dashboard reflecting
a child's progress, etc.), use this exact flow:

1. Update student state/data through the API (real backend call, real DB
   write - test setup, not the thing being tested).
2. Open the dashboard through the real UI.
3. The dashboard calls its OWN real API on load - do not intercept or mock
   this call.
4. The UI receives the updated data.
5. Verify the correct value/status/progress is displayed on screen.

Example:

```
API:    Student A -> Challenge completed
              ↓
UI:     Teacher Dashboard -> Challenges -> Student A -> Completed
```

```
API:    Student A -> Learning Path progress = 80%
              ↓
UI:     Teacher Dashboard -> Learning Path -> Student A -> 80%
```

Why this is E2E, not a unit/integration test: it proves the full chain -
student state → API → the dashboard's own API consumption → UI → the
business result the user actually sees. The API mutation in step 1 is only
setup; the thing under test is "when the underlying data changes, does the
dashboard correctly reflect that change to the user."

Rule: never mock the dashboard's own data-fetching API to make this
assertion pass.

- ❌ Mock the dashboard's API response → assert UI shows X.
- ✅ Mutate real student data via the API → load the dashboard → let it
  call its real API → assert the real UI shows the correct result.

Mocking that call only proves the UI can render fake data - it proves
nothing about whether the real backend and real UI agree.

---

# PHASE 14 — TEST STABILITY

Use:

- Playwright auto-waiting
- expect()
- Network synchronization
- State-based synchronization
- Stable selectors
- data-testid
- Accessible roles

Avoid:

- waitForTimeout()
- Fragile CSS selectors
- Fragile XPath
- Force-click
- Test-order dependencies

Every test should be deterministic and independently runnable.

---

# PHASE 15 — TEST IMPLEMENTATION

After analysis:

1. Determine correct feature ownership.
2. Determine correct folder.
3. Determine whether the test belongs in dashboard.spec.js or a feature folder.
4. Implement the high-value missing tests.
5. Reuse existing infrastructure.
6. Follow CLAUDE.md rules.
7. Follow existing repository conventions.
8. Do not introduce unnecessary architecture changes.
9. Do not modify product functionality unless explicitly requested.

---

# PHASE 16 — VALIDATE THE IMPLEMENTATION

Run the relevant E2E tests.

For failures, classify them as:

1. Product bug
2. Test bug
3. Test-data/setup issue
4. Environment issue
5. Synchronization/flakiness issue

Never weaken assertions simply to make tests pass.

---

# PHASE 17 — FINAL REVIEW

Before finishing, verify:

### User Perspective

Does the test cover what the user actually does in the recording?

### Business Perspective

Does it validate the correct business outcome?

### Code Perspective

Does it match the actual implementation and business logic?

### Project Perspective

Does it follow CLAUDE.md and existing architecture?

### Testing Perspective

Are happy, negative, empty, error, permission, and edge scenarios covered where applicable?

### Structure Perspective

Is the test stored under the correct:

ROLE → MODULE → FEATURE

location?

### Maintainability

Is the test deterministic and easy for another engineer to understand?

---

# FINAL REPORT

Provide:

## 1. Feature Understanding

Summarize what was observed in the recording and confirmed in the code.

## 2. Business Rules Discovered

List the actual business rules found in the implementation.

## 3. Test Matrix

Show the scenarios considered.

## 4. Test Structure

Show where tests were placed.

## 5. Tests Added/Modified

List them.

## 6. Execution Result

- Passed
- Failed
- Existing failures
- New failures

## 7. Bugs/Risks

Separate:

- Product bugs
- Test bugs
- Data/setup issues
- Environment issues
- Flakiness

## 8. Coverage Gaps

Clearly identify important business behavior that remains untested.

---

# NON-NEGOTIABLE PRINCIPLES

1. Analyze the user's video FIRST when a video is provided.
2. Read applicable CLAUDE.md instructions.
3. Read the user's explicit requirement.
4. Inspect the actual codebase.
5. Never invent business rules.
6. Use the codebase as the source of truth for implementation behavior.
7. Use E2E for critical user journeys and business outcomes.
8. Keep detailed calculations/business rules in appropriate lower-level tests.
9. Keep dashboard shell/routing tests at dashboard level.
10. Put meaningful business features into feature-specific folders.
11. Avoid unnecessary folder nesting.
12. Use deterministic test data.
13. Avoid flaky synchronization.
14. Preserve valid existing tests.
15. Do not optimize for test count.
16. Optimize for business confidence, reliability, maintainability, and discoverability.

The final result must represent the intersection of:

USER REQUIREMENT
+
SCREEN RECORDING
+
CLAUDE.md
+
ACTUAL CODEBASE
+
EXISTING TEST ARCHITECTURE

That combined understanding determines the final E2E strategy and implementation.
