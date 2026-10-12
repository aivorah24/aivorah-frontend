import { formatStudyTime, formatRelativeTime, median, todayISO } from './dashboardHelpers';
import { ACTIVITY_ICON } from '../constants';
import type { InsightTile, RecentActivityItem } from '../types';
import { resolveStudentStatus } from '../../../../utils/studentStatus';

// Pure computation of every derived stat/tile the Teacher Dashboard renders,
// extracted verbatim from TeacherDashboardScreen so the screen only calls this
// once per render instead of owning ~250 lines of inline derivation. `gold`
// is the theme's accent color (all tile "colors" collapse to it — see the
// original `T` palette object).
export function buildDashboardStats(students: any[], insights: any, activityFeed: any[], gold: string) {
  const today = todayISO();
  const totalStudents = students.length;
  const allNeedsAttention = students.filter(s => resolveStudentStatus(s) === 'needs_attention');
  const needsAttentionStudents = allNeedsAttention.slice(0, 3); // show max 3 in dashboard card
  const activeToday = students.filter(s => s.lastActive === today).length;
  const avgProgress = totalStudents > 0
    ? Math.round(students.reduce((sum, s) => sum + (s.progressPct || 0), 0) / totalStudents)
    : 0;
  // Learning Path Insights tile shows Learning Path time specifically (not
  // Challenges/Assignments time), so it uses learningPathTime, not the
  // combined studyTime.
  const studyTimes = students.map(s => s.learningPathTime || 0);
  const medianStudyMins = median(studyTimes);
  // Class Progress donut ("Typical Study Time" + Lowest/Typical/Highest) is
  // an overall metric — combine time spent across all 3 streams per student
  // (not just Learning Path) so it reflects total engagement.
  const combinedStudyTimes = students.map(s => (s.learningPathTime || 0) + (s.assignmentTime || 0) + (s.challengeTime || 0));
  const medianCombinedMins = median(combinedStudyTimes);
  const minCombinedMins = combinedStudyTimes.length > 0 ? Math.min(...combinedStudyTimes) : 0;
  const maxCombinedMins = combinedStudyTimes.length > 0 ? Math.max(...combinedStudyTimes) : 0;

  const ins = insights || { assignments: [], challenges: [], totals: {} };
  const totalAssignmentsAssigned = ins.totals?.totalAssignmentsAssigned || 0;
  const totalAssignmentsSubmitted = ins.totals?.totalSubmissions || 0;
  const assignSubmitPct = totalAssignmentsAssigned > 0
    ? Math.round((totalAssignmentsSubmitted / totalAssignmentsAssigned) * 100)
    : 0;

  const totalChallengesAssigned = ins.totals?.totalChallengesAssigned || 0;
  const totalChallengesCompleted = ins.totals?.totalChallengesCompleted || 0;
  const challCompletePct = totalChallengesAssigned > 0
    ? Math.round((totalChallengesCompleted / totalChallengesAssigned) * 100)
    : 0;
  // Overall class progress = equal-weight average across all 3 tracked activity streams,
  // not just Learning Path — matches industry-standard composite progress rings.
  const classProgressPct = Math.round((avgProgress + assignSubmitPct + challCompletePct) / 3);

  // ── AI insight computations ────────────────────────────
  const inactiveStudents = students.filter(s => {
    if (!s.lastActive) return true;
    const days = Math.floor((Date.now() - new Date(s.lastActive).getTime()) / 86400000);
    return days >= 3;
  });
  const topStudent = [...students].sort((a, b) => (b.progressPct || 0) - (a.progressPct || 0))[0];

  // Avg study time per student (for insight tile) — Learning Path only
  const totalStudyMins = students.reduce((sum, s) => sum + (s.learningPathTime || 0), 0);

  // Assignment insights from server data
  const totals = insights?.totals || {};
  const assignStats = insights?.assignments || [];
  const challStats = insights?.challenges || [];

  const studentsWithSubmissions = assignStats.filter((s: any) => s.submitted > 0).length;
  const studentsWithNoSubmissions = totalStudents - studentsWithSubmissions;
  const classAvgScore = totals.classAvgScore;
  const topAssignStudent = [...assignStats].sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0))[0];

  const studentsWithChallenges = challStats.filter((s: any) => s.assigned > 0).length;
  const studentsCompletedChallenge = challStats.filter((s: any) => s.completed > 0).length;
  const topChallStudent = [...challStats].sort((a: any, b: any) => (b.avgScore || 0) - (a.avgScore || 0))[0];

  // ── SECTION 1: Learning Path Insights ───────────────────
  const learningPathTiles: InsightTile[] = [
    {
      icon: 'book-open', color: gold,
      stat: `${allNeedsAttention.length}`,
      label: 'Needs Attention',
      title: 'Need Support',
      body: `${allNeedsAttention.length} student${allNeedsAttention.length !== 1 ? 's' : ''} not active for 7+ days.`,
      screen: 'TeacherStudents', params: { initialTab: 'Needs Attention' },
    },
    {
      icon: 'award', color: gold,
      stat: topStudent ? `${topStudent.progressPct}%` : '—',
      label: 'Top Score',
      title: topStudent ? `${topStudent.name?.split(' ')[0]} Leads` : 'No Data Yet',
      body: topStudent
        ? `${topStudent.completedTopics?.length || 0} topics done. Give them a challenge!`
        : 'Assign the first topic to get going.',
      screen: 'TeacherStudents', params: { initialTab: 'Top Performers' },
    },
    {
      icon: 'moon', color: gold,
      stat: `${inactiveStudents.length}`,
      label: 'Inactive 3d+',
      title: inactiveStudents.length > 0 ? 'Going Quiet' : 'All Active',
      body: inactiveStudents.length > 0
        ? `${inactiveStudents.slice(0, 2).map(s => s.name?.split(' ')[0]).join(', ')}${inactiveStudents.length > 2 ? ` +${inactiveStudents.length - 2}` : ''} — nudge them back.`
        : 'Great engagement this week!',
      screen: 'TeacherStudents', params: { initialTab: 'Inactive' },
    },
    {
      icon: 'clock', color: gold,
      stat: formatStudyTime(totalStudyMins),
      label: 'Study Time',
      title: totalStudyMins > 0 ? `${formatStudyTime(medianStudyMins)} median per student` : 'No Study Yet',
      body: totalStudyMins > 0
        ? `${formatStudyTime(totalStudyMins)} total across ${totalStudents} student${totalStudents !== 1 ? 's' : ''}.`
        : 'Study time appears once students start learning.',
      screen: 'TeacherProgress',
    },
  ];

  // ── SECTION 2: Assignment Insights ──────────────────────
  const assignmentTiles: InsightTile[] = [
    {
      icon: 'clipboard', color: gold,
      stat: `${studentsWithNoSubmissions}`,
      label: 'Pending',
      title: studentsWithNoSubmissions > 0 ? 'Not Started' : 'All Submitted',
      body: studentsWithNoSubmissions > 0
        ? `${studentsWithNoSubmissions} student${studentsWithNoSubmissions !== 1 ? 's' : ''} haven't submitted yet.`
        : 'Everyone has submitted. Assign next chapter.',
      screen: 'TeacherAssignments',
    },
    {
      icon: 'bar-chart-2', color: gold,
      stat: classAvgScore != null ? `${classAvgScore}%` : '—',
      label: 'Avg Score',
      title: classAvgScore != null ? `Class Avg: ${classAvgScore}%` : 'No Scores Yet',
      body: classAvgScore != null
        ? classAvgScore >= 70
          ? `Strong performance — raise the difficulty.`
          : `Review common mistakes or assign practice.`
        : 'Scores appear once students submit.',
      screen: 'TeacherAssignments',
    },
    {
      icon: 'check-circle', color: gold,
      stat: `${studentsWithSubmissions}/${totalStudents}`,
      label: 'Submitted',
      title: studentsWithSubmissions > 0
        ? `${studentsWithSubmissions} Submitted`
        : 'No Submissions',
      body: studentsWithSubmissions > 0
        ? topAssignStudent?.avgScore != null
          ? `${topAssignStudent.name?.split(' ')[0]} leads at ${topAssignStudent.avgScore}%.`
          : `${totals.totalSubmissions || 0} total submissions.`
        : 'Create your first assignment to start.',
      screen: 'TeacherAssignments',
    },
  ];

  // ── SECTION 3: Challenge Insights ───────────────────────
  const challengeTiles: InsightTile[] = [
    {
      icon: 'target', color: gold,
      stat: `${studentsWithChallenges}/${totalStudents}`,
      label: 'Attempted',
      title: studentsWithChallenges > 0
        ? `${studentsWithChallenges} of ${totalStudents} Students Have Challenges`
        : 'No Challenges Yet',
      body: studentsWithChallenges > 0
        ? `${totals.totalChallengesAssigned || 0} challenges assigned in total across those ${studentsWithChallenges} student${studentsWithChallenges !== 1 ? 's' : ''}.`
        : 'Assign challenges to test their skills.',
      screen: 'TeacherStudents',
    },
    {
      icon: 'flag', color: gold,
      stat: `${studentsCompletedChallenge}`,
      label: 'Completed',
      title: studentsCompletedChallenge > 0
        ? `${studentsCompletedChallenge} Finished`
        : 'None Completed',
      body: studentsCompletedChallenge > 0
        ? `${totals.totalChallengesCompleted || 0} challenges done.`
        : 'Encourage students to attempt challenges.',
      screen: 'TeacherStudents',
    },
    {
      icon: 'trending-up', color: gold,
      stat: topChallStudent?.avgScore != null ? `${topChallStudent.avgScore}%` : '—',
      label: 'Top Scorer',
      title: topChallStudent?.avgScore != null
        ? `${topChallStudent.name?.split(' ')[0]} Leads`
        : 'No Scores Yet',
      body: topChallStudent?.avgScore != null
        ? `${topChallStudent.completed || 0} completed — give advanced challenges!`
        : 'Scores appear after completion.',
      screen: 'TeacherStudents',
    },
  ];

  // Combined flat array for modal index lookup (Learning Path 0-3, Assignments 4-6, Challenges 7-9)
  const aiInsightTiles: InsightTile[] = [...learningPathTiles, ...assignmentTiles, ...challengeTiles];

  const recentStudents: RecentActivityItem[] = activityFeed.slice(0, 3).map((ev, i) => ({
    id: `${ev.studentId}-${i}`,
    initials: (ev.name || '??').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
    name: ev.name || 'Unknown',
    action: ev.text,
    prefix: ev.prefix, title: ev.title, suffix: ev.suffix,
    icon: ACTIVITY_ICON[ev.type] || 'activity',
    time: formatRelativeTime(ev.timestamp),
    studentId: ev.studentId,
  }));

  const aiActionTitle = allNeedsAttention.length > 0
    ? `Re-engage inactive students (${allNeedsAttention.length} flagged)`
    : avgProgress > 0
      ? `Class at ${avgProgress}% — keep pushing!`
      : 'Set up your first assignment to get started';

  const aiActionBody = allNeedsAttention.length > 0
    ? `${needsAttentionStudents[0]?.name?.split(' ')[0] || 'A student'} and others haven't been active for 7+ days. Send a reminder or assign a short practice task to bring them back.`
    : `Median study time is ${formatStudyTime(medianStudyMins)} per student. Assign a chapter task or quiz to keep them engaged.`;

  return {
    totalStudents, allNeedsAttention, needsAttentionStudents, activeToday, avgProgress,
    medianCombinedMins, minCombinedMins, maxCombinedMins,
    totalAssignmentsAssigned, totalAssignmentsSubmitted, assignSubmitPct,
    totalChallengesAssigned, totalChallengesCompleted, challCompletePct, classProgressPct,
    inactiveStudents, totalStudyMins,
    assignStats, challStats,
    studentsWithSubmissions, studentsWithNoSubmissions, classAvgScore,
    studentsWithChallenges, studentsCompletedChallenge,
    learningPathTiles, assignmentTiles, challengeTiles, aiInsightTiles,
    recentStudents, aiActionTitle, aiActionBody,
  };
}
