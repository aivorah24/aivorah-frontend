// Regression test: ensures the Curriculum & Syllabus feature is wired to the
// new canonical implementation (TeacherCurriculumLearningPathScreen) and that
// the legacy TeacherSyllabusImport route has been removed.
//
// TeacherAnnouncements remains legacy, awaiting its own refactor pass.

describe('TeacherNavigator — route wiring', () => {
  let source: string;

  beforeAll(() => {
    const fs = require('fs');
    const path = require('path');
    source = fs.readFileSync(path.join(__dirname, '../TeacherNavigator.tsx'), 'utf8');
  });

  test('registers TeacherCurriculumLearningPath as the canonical Curriculum & Syllabus route', () => {
    expect(source).toMatch(/<Drawer\.Screen name="TeacherCurriculumLearningPath"/);
    expect(source).toMatch(/curriculum-learning-path\/TeacherCurriculumLearningPathScreen/);
  });

  test('does NOT register the legacy TeacherSyllabusImport route', () => {
    expect(source).not.toMatch(/<Drawer\.Screen name="TeacherSyllabusImport"/);
    expect(source).not.toMatch(/TeacherSyllabusImportScreen/);
  });

  test('TeacherAnnouncements uses the shared Announcements screen, not a legacy copy', () => {
    expect(source).toMatch(/<Drawer\.Screen name="TeacherAnnouncements" component=\{AnnouncementsScreen\}/);
    expect(source).toMatch(/screens\/shared\/announcements\/AnnouncementsScreen/);
    expect(source).not.toMatch(/teacher-legacy\/TeacherAnnouncementsScreen/);
  });

  test('the new canonical screen file exists on disk', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(__dirname, '../../screens/teacher/curriculum-learning-path/TeacherCurriculumLearningPathScreen.tsx'))).toBe(true);
  });
});
