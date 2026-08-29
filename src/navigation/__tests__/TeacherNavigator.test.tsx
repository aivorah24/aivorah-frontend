// Regression test: "Manage Syllabus" and "Announcements" in the teacher
// sidebar (DrawerContent.tsx/Sidebar.tsx point at screen names
// 'TeacherSyllabusImport'/'TeacherAnnouncements') were dead links — both
// names were declared in TeacherDrawerParamList (navigation/types.ts) and
// their legacy screen files already existed under
// src/.legacy-screens/teacher-legacy/, but neither was ever registered as
// an actual <Drawer.Screen> in TeacherNavigator, so tapping either sidebar
// item did nothing. A full navigator mount needs many unrelated screens/
// contexts mocked (and transitively pulls in firebase/auth's ESM build,
// which this project's Jest config can't transform outside a fully-mocked
// render) just to catch "someone deleted the Drawer.Screen line again" or
// "the import path is wrong" — a plain source-text check is simpler and
// exercises exactly what regressed.

describe('TeacherNavigator — legacy screen wiring', () => {
  test('TeacherNavigator.tsx registers both routes as Drawer.Screen, not just as dead sidebar links', () => {
    const fs = require('fs');
    const path = require('path');
    const source = fs.readFileSync(path.join(__dirname, '../TeacherNavigator.tsx'), 'utf8');
    expect(source).toMatch(/<Drawer\.Screen name="TeacherSyllabusImport"/);
    expect(source).toMatch(/<Drawer\.Screen name="TeacherAnnouncements"/);
    expect(source).toMatch(/@legacy\/teacher-legacy\/TeacherSyllabusImportScreen/);
    expect(source).toMatch(/@legacy\/teacher-legacy\/TeacherAnnouncementsScreen/);
  });

  test('both legacy screen files this navigator imports actually exist on disk', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(__dirname, '../../.legacy-screens/teacher-legacy/TeacherSyllabusImportScreen.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '../../.legacy-screens/teacher-legacy/TeacherAnnouncementsScreen.tsx'))).toBe(true);
  });
});
