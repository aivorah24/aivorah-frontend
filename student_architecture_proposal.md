# Student Persona - Refactored Frontend Architecture

Based on the audit of the current `aivorah-frontend` codebase, here is the expert recommendation for the ideal feature-sliced architecture tailored for the Student persona. This structure enforces a strict separation of concerns, ensures modularity, and natively bakes in both unit and integration testing.

## Proposed Directory Structure

```text
src/
├── navigation/
│   ├── StudentNavigator.tsx          <-- Extract student routes from App.tsx here
│   └── StudentNavigationTypes.ts     
│
├── screens/student/                  <-- Root for the Student Persona
│   │
│   ├── shared/                       <-- Reusable components strictly for students
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── dashboard/                    <-- Example Feature Module
│   │   ├── components/               <-- UI components specific to the dashboard
│   │   │   ├── ProgressWidget.tsx
│   │   │   └── __tests__/            <-- UNIT TESTS (UI)
│   │   │       └── ProgressWidget.test.tsx
│   │   │
│   │   ├── hooks/                    <-- Custom React logic & state management
│   │   │   ├── useDashboardData.ts
│   │   │   └── __tests__/            <-- UNIT TESTS (Logic)
│   │   │       └── useDashboardData.test.ts
│   │   │
│   │   ├── services/                 <-- API calls & external communications
│   │   │   ├── dashboardApi.ts
│   │   │   └── __tests__/            <-- INTEGRATION TESTS (API/Services)
│   │   │       └── dashboardApi.test.ts
│   │   │
│   │   ├── utils/                    <-- Feature-specific helpers
│   │   │   ├── formatDashboardMetrics.ts
│   │   │   └── __tests__/            <-- UNIT TESTS (Helpers)
│   │   │       └── formatDashboardMetrics.test.ts
│   │   │
│   │   ├── constants.ts              <-- Static configs, layout numbers, enums
│   │   ├── types.ts                  <-- TypeScript interfaces for this feature
│   │   │
│   │   ├── DashboardScreen.tsx       <-- The main entry screen connecting it all
│   │   └── __tests__/                <-- INTEGRATION TESTS (Screen-level)
│   │       └── DashboardScreen.test.tsx
│   │
│   ├── ai-coach/                     <-- Another cleanly separated feature
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── constants.ts
│   │   ├── types.ts
│   │   └── AICoachScreen.tsx
│   │
│   └── progress/                     <-- Needs to be migrated to this structure
│       └── ...
```

---

## The Testing Suite Strategy

To maintain high confidence in the refactor without slowing down development, tests should be collocated inside the feature directories. 

### 1. Unit Tests (Collocated in `__tests__/`)
- **Components (`components/__tests__/`)**: Test rendering, prop drilling, user interactions (clicks, swipes), and visual states. Mock out the hooks/services.
- **Hooks (`hooks/__tests__/`)**: Test state mutations, lifecycle effects, and memoizations. Use `@testing-library/react-hooks`.
- **Utils (`utils/__tests__/`)**: Standard Jest tests for pure functions (e.g., date formatting, data transformations).

### 2. Integration Tests 
- **Screen Level (`feature-name/__tests__/`)**: Render the entire `DashboardScreen.tsx`. Mock the `services/` (API responses) but let the `components` and `hooks` execute together to ensure the pieces fit.
- **Service Level (`services/__tests__/`)**: Mock the network layer (e.g., Axios/fetch) or use a tool like MSW (Mock Service Worker) to test that the app handles API success, failure, and malformed data correctly.

---

## 3 Immediate Steps to Achieve This

1. **Create `StudentNavigator.tsx`**
   - Extract the 20+ student screens currently cluttering `AppNavigator.tsx` and move them to `src/navigation/StudentNavigator.tsx`. This instantly cleans up the app's routing.
2. **Standardize the Missing Layers**
   - Folders like `leaderboard`, `settings`, and `daily-habits` are missing the `services/` layer. Extract their API logic out of the `.tsx` components and into `services/[feature]Api.ts`.
3. **Quarantine and Migrate Monoliths**
   - Move raw files like `ProgressScreen.tsx`, `MathHelperScreen.tsx`, and `VideoLessonScreen.tsx` into their own feature directories (e.g., `src/screens/student/progress/`) to stop the root folder from becoming a junk drawer.
