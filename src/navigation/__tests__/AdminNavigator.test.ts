import { adminRouteFromPath } from '../AdminNavigator';

jest.mock('@react-navigation/drawer', () => ({ createDrawerNavigator: () => ({ Navigator: () => null, Screen: () => null }) }));
jest.mock('../../components/common/DrawerContent', () => () => null);
jest.mock('../../screens/aivorah-admin/overview/PlatformOverviewScreen', () => () => null);
jest.mock('../../screens/aivorah-admin/users/AdminUsersScreen', () => () => null);
jest.mock('../../screens/aivorah-admin/map-to-teacher/MapToTeacherScreen', () => () => null);
jest.mock('../../screens/aivorah-admin/bulk-import/BulkImportScreen', () => () => null);
jest.mock('../../screens/aivorah-admin/llm-usage/LlmUsageScreen', () => () => null);
jest.mock('../../context/ThemeContext', () => ({ useTheme: () => ({ colors: {} }) }));

describe('adminRouteFromPath', () => {
  test.each([
    ['/admin-users', 'AdminUsers'],
    ['/AdminUsers', 'AdminUsers'],
    ['/admin-map-to-teacher', 'MapToTeacher'],
    ['/admin-bulk-import?x=1', 'BulkImport'],
    ['/LlmUsage/', 'LlmUsage'],
    ['/admin-login', 'PlatformOverview'],
    ['/', 'PlatformOverview'],
    ['/teacher/dashboard', 'PlatformOverview'],
  ])('%s -> %s', (path, route) => {
    expect(adminRouteFromPath(path)).toBe(route);
  });
});
