import { expect } from '@playwright/test';

// Checks one number in the Attendance Record's Present/Absent/Late/Total
// Days row (ParentDashboardScreen.tsx line 702-719). Each number and its
// label are siblings inside the same miniStatItem View, so scoping by the
// label's parent is the only reliable way to check a specific value - a
// bare page-wide number search breaks whenever two stats share the same
// value (e.g. Absent and Late both 0), since exact text becomes ambiguous.
export async function assertAttendanceStat(page, label, value) {
  const item = page.getByText(label, { exact: true }).locator('xpath=..');
  await expect(item.getByText(String(value), { exact: true })).toBeVisible({ timeout: 15000 });
}
