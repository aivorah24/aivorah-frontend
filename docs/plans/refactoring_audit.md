# Aivorah Frontend Refactoring Audit

Based on an inspection of the `aivorah-frontend` directory and the new modular architecture in `src/screens/student/` vs the monolithic `App.tsx` and legacy screens, here is the audit report for the Student features.

## Feature-by-Feature Report

| Feature | Status | Notes |
| :--- | :--- | :--- |
| **Dashboard** | ✅ **PASS** | Cleanly separated. Contains `components/`, `hooks/`, `services/`, `utils/`, `constants.ts`, `types.ts`, and `DashboardScreen.tsx`. |
| **AI Coach** | ✅ **PASS** | Properly refactored. Contains `components/`, `hooks/`, `services/`, `utils/`, `__tests__/`, and screen files. |
| **Challenges** | ✅ **PASS** | Properly refactored. Contains `components/`, `hooks/`, `services/`, `utils/`, `__tests__/`, and screen files. |
| **Profile** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`, `services/`, `constants.ts`. Missing a `utils/` folder (if applicable). |
| **Schedule** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`, `utils/`. **Missing `services/`**. |
| **World & You** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`, `utils/`. **Missing `services/`**. |
| **Leaderboard** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. **Missing `services/` and `utils/`**. |
| **Daily Habits** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. **Missing `services/` and `utils/`**. |
| **Bedtime Stories** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`, `utils/`. **Missing `services/`**. |
| **Help Center** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. **Missing `services/` and `utils/`**. |
| **Learning Path** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. Uses `utils.ts` instead of a `utils/` folder. **Missing `services/`**. |
| **Settings** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. **Missing `services/` and `utils/`**. |
| **Assignments** | ⚠️ **PARTIAL** | Contains `components/`, `hooks/`. Uses `utils.ts` instead of a `utils/` folder. **Missing `services/`**. |
| **Progress** | ❌ **MISSING** | **Not refactored.** `ProgressScreen.tsx` is still sitting as a monolithic file in the root of `src/screens/student/`. There is no `progress/` feature directory. |

---

## Overall Refactoring Score: 6 / 10

**Why 6/10?**
The new architecture correctly aims for a modular feature-driven design (Feature folder $\rightarrow$ `components`, `hooks`, `services`, `utils`). However, the migration is incomplete. While UI components and hooks are generally well separated, the API calls/business logic (`services/`) are missing from almost all feature folders except Dashboard, AI Coach, and Challenges. Furthermore, several critical structural issues in navigation and root configuration remain unaddressed.

---

## Most Important Things to Fix

> [!WARNING]
> **Missing StudentNavigator**
> While `TeacherNavigator`, `ParentNavigator`, and `SchoolAdminNavigator` have been successfully extracted into `src/navigation/`, there is no `StudentNavigator.tsx`. Instead, all Student screens are dumped directly into `AppNavigator.tsx`. This breaks the separation of concerns and clutters the root navigator.

> [!IMPORTANT]
> **Root Clutter in `src/screens/student/`**
> Aside from `ProgressScreen.tsx`, there are over 10 other monolithic screens still floating in the root of the `student/` directory (e.g., `ReadAloudScreen.tsx`, `MathHelperScreen.tsx`, `VideoLessonScreen.tsx`, `RewardsScreen.tsx`, `SubscriptionScreen.tsx`). These need to be migrated into their own feature directories with proper `components/`, `hooks/`, etc.

> [!CAUTION]
> **Massive `App.tsx` Configuration**
> The `App.tsx` file is nearly 50KB. It contains a massive hardcoded `LINKING_SCREENS` map with ~60 screens. This configuration should be extracted into a dedicated `src/navigation/linking.ts` file to keep the root entry point clean.

> [!TIP]
> **Inconsistent Utilities**
> Some features use a `utils/` directory while others (like Learning Paths and Assignments) use a single `utils.ts` file. Standardizing this across the codebase will prevent structural debt from accumulating.
