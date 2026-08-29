// Mirrors TeacherDashboardScreen.tsx's exact tile business-logic formulas
// (median/formatStudyTime/topStudent/inactiveStudents/etc.), so tests can
// compute the REAL expected tile title from live API data and assert it
// verbatim - not a guessed string, and not just "a placeholder went away".
//
// Every function here is a byte-for-byte port of the app's own logic
// (see TeacherDashboardScreen.tsx lines 82-96, 163-273, 288-407). If the
// app's formula changes, this file must be updated to match - that's the
// point: these tests fail the moment dashboard business logic and this
// mirror disagree, whether the bug is in the app or in the mirror.

function formatStudyTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

// students: GET /student/by-teacher/:teacherId response. Mirrors
// TeacherDashboardScreen.tsx lines 161-165 exactly.
export function computeStudentOverview(students) {
  const today = todayISO();
  return {
    totalStudents: students.length,
    activeToday: students.filter((s) => s.lastActive === today).length,
    needAttention: students.filter((s) => s.needsAttention).length,
  };
}

// students: GET /student/by-teacher/:teacherId response
export function computeLearningPathTiles(students) {
  const allNeedsAttention = students.filter((s) => s.needsAttention);
  const inactiveStudents = students.filter((s) => {
    if (!s.lastActive) return true;
    const days = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000);
    return days >= 3;
  });
  const topStudent = [...students].sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0))[0];
  const totalStudyMins = students.reduce((sum, s) => sum + (s.learningPathTime || 0), 0);
  const studyTimes = students.map((s) => s.learningPathTime || 0);
  const medianStudyMins = median(studyTimes);

  return {
    needSupport: 'Need Support', // always static, regardless of data
    topScore: topStudent ? `${topStudent.name?.split(' ')[0]} Leads` : 'No Data Yet',
    inactive: inactiveStudents.length > 0 ? 'Going Quiet' : 'All Active',
    studyTime: totalStudyMins > 0 ? `${formatStudyTime(medianStudyMins)} median per student` : 'No Study Yet',
  };
}

// students + insights: GET /student/by-teacher/:teacherId and .../insights
export function computeAssignmentTiles(students, insights) {
  const totalStudents = students.length;
  const assignStats = insights.assignments || [];
  const totals = insights.totals || {};

  const studentsWithSubmissions = assignStats.filter((s) => s.submitted > 0).length;
  const studentsWithNoSubmissions = totalStudents - studentsWithSubmissions;
  const classAvgScore = totals.classAvgScore;

  return {
    pending: studentsWithNoSubmissions > 0 ? 'Not Started' : 'All Submitted',
    avgScore: classAvgScore != null ? `Class Avg: ${classAvgScore}%` : 'No Scores Yet',
    submitted: studentsWithSubmissions > 0 ? `${studentsWithSubmissions} Submitted` : 'No Submissions',
  };
}

export function computeChallengeTiles(students, insights) {
  const totalStudents = students.length;
  const challStats = insights.challenges || [];

  const studentsWithChallenges = challStats.filter((s) => s.assigned > 0).length;
  const studentsCompletedChallenge = challStats.filter((s) => s.completed > 0).length;
  const topChallStudent = [...challStats].sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))[0];

  return {
    attempted:
      studentsWithChallenges > 0
        ? `${studentsWithChallenges} of ${totalStudents} Students Have Challenges`
        : 'No Challenges Yet',
    completed: studentsCompletedChallenge > 0 ? `${studentsCompletedChallenge} Finished` : 'None Completed',
    topScorer:
      topChallStudent?.avgScore != null ? `${topChallStudent.name?.split(' ')[0]} Leads` : 'No Scores Yet',
  };
}
