import { buildDashboardStats } from '../../utils/buildDashboardStats';

const GOLD = '#FFD700';

function student(overrides: any = {}) {
  return {
    id: 's1', name: 'Aarav Sharma', progressPct: 50, needsAttention: false,
    lastActive: '2026-08-24', learningPathTime: 30, assignmentTime: 10, challengeTime: 5,
    completedTopics: [],
    ...overrides,
  };
}

describe('buildDashboardStats — class-level counts', () => {
  test('empty class -> zeroed counts, no crash', () => {
    const stats = buildDashboardStats([], null, [], GOLD);
    expect(stats.totalStudents).toBe(0);
    expect(stats.avgProgress).toBe(0);
    expect(stats.activeToday).toBe(0);
    expect(stats.needsAttentionStudents).toEqual([]);
  });

  test('counts students active today (matching todayISO)', () => {
    const today = new Date().toISOString().split('T')[0];
    const stats = buildDashboardStats(
      [student({ lastActive: today }), student({ id: 's2', lastActive: '2020-01-01' })],
      null, [], GOLD,
    );
    expect(stats.activeToday).toBe(1);
  });

  test('avgProgress is the mean of all students progressPct, rounded', () => {
    const stats = buildDashboardStats(
      [student({ progressPct: 40 }), student({ id: 's2', progressPct: 61 })],
      null, [], GOLD,
    );
    expect(stats.avgProgress).toBe(51); // (40+61)/2 = 50.5 -> rounds to 51
  });

  test('needsAttentionStudents caps at 3 even when more are flagged', () => {
    const students = [1, 2, 3, 4, 5].map(n => student({ id: `s${n}`, status: 'needs_attention' }));
    const stats = buildDashboardStats(students, null, [], GOLD);
    expect(stats.allNeedsAttention).toHaveLength(5);
    expect(stats.needsAttentionStudents).toHaveLength(3);
  });
});

describe('buildDashboardStats — assignment/challenge percentages', () => {
  test('zero assigned -> 0% submit rate, not NaN/Infinity', () => {
    const stats = buildDashboardStats([student()], { totals: {} }, [], GOLD);
    expect(stats.assignSubmitPct).toBe(0);
    expect(stats.challCompletePct).toBe(0);
  });

  test('computes assignSubmitPct and challCompletePct from insights totals', () => {
    const insights = {
      assignments: [], challenges: [],
      totals: {
        totalAssignmentsAssigned: 10, totalSubmissions: 5,
        totalChallengesAssigned: 4, totalChallengesCompleted: 2,
      },
    };
    const stats = buildDashboardStats([student()], insights, [], GOLD);
    expect(stats.assignSubmitPct).toBe(50);
    expect(stats.challCompletePct).toBe(50);
  });

  test('classProgressPct is the equal-weight average of Learning Path, Assignments, Challenges', () => {
    const insights = {
      assignments: [], challenges: [],
      totals: { totalAssignmentsAssigned: 10, totalSubmissions: 10, totalChallengesAssigned: 10, totalChallengesCompleted: 10 },
    };
    const stats = buildDashboardStats([student({ progressPct: 40 })], insights, [], GOLD);
    // avgProgress=40, assignSubmitPct=100, challCompletePct=100 -> (40+100+100)/3 = 80
    expect(stats.classProgressPct).toBe(80);
  });
});

describe('buildDashboardStats — inactive students (3+ days)', () => {
  test('a student with no lastActive at all counts as inactive', () => {
    const stats = buildDashboardStats([student({ lastActive: undefined })], null, [], GOLD);
    expect(stats.inactiveStudents).toHaveLength(1);
  });

  test('a student active within the last 3 days is not inactive', () => {
    const today = new Date().toISOString();
    const stats = buildDashboardStats([student({ lastActive: today })], null, [], GOLD);
    expect(stats.inactiveStudents).toHaveLength(0);
  });

  test('a student inactive for exactly 3+ days is flagged', () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
    const stats = buildDashboardStats([student({ lastActive: fourDaysAgo })], null, [], GOLD);
    expect(stats.inactiveStudents).toHaveLength(1);
  });
});

describe('buildDashboardStats — insight tiles, fully populated (positive-content branches)', () => {
  const insights = {
    assignments: [
      { id: 's1', name: 'Aarav Sharma', submitted: 2, avgScore: 90 },
      { id: 's2', name: 'Bela Rao', submitted: 0, avgScore: null },
    ],
    challenges: [
      { id: 's1', name: 'Aarav Sharma', assigned: 2, completed: 2, avgScore: 95 },
      { id: 's2', name: 'Bela Rao', assigned: 1, completed: 0, avgScore: null },
    ],
    totals: {
      totalAssignmentsAssigned: 4, totalSubmissions: 2, classAvgScore: 75,
      totalChallengesAssigned: 3, totalChallengesCompleted: 2,
    },
  };
  const populatedStudents = [student({ id: 's1', name: 'Aarav Sharma' }), student({ id: 's2', name: 'Bela Rao' })];

  test('Avg Score tile: a class average >= 70 gives the "raise the difficulty" encouragement', () => {
    const stats = buildDashboardStats(populatedStudents, insights, [], GOLD);
    expect(stats.assignmentTiles[1].body).toContain('raise the difficulty');
    expect(stats.assignmentTiles[1].stat).toBe('75%');
  });

  test('Submitted tile: names the top-scoring student by first name', () => {
    const stats = buildDashboardStats(populatedStudents, insights, [], GOLD);
    expect(stats.assignmentTiles[2].body).toContain('Aarav leads at 90%');
  });

  test('Challenge Attempted tile: real counts across students with challenges', () => {
    const stats = buildDashboardStats(populatedStudents, insights, [], GOLD);
    expect(stats.challengeTiles[0].title).toContain('2 of 2 Students Have Challenges');
  });

  test('Challenge Completed tile: real finished count', () => {
    const stats = buildDashboardStats(populatedStudents, insights, [], GOLD);
    expect(stats.challengeTiles[1].title).toBe('1 Finished');
  });

  test('Challenge Top Scorer tile: names the top challenge scorer', () => {
    const stats = buildDashboardStats(populatedStudents, insights, [], GOLD);
    expect(stats.challengeTiles[2].title).toBe('Aarav Leads');
    expect(stats.challengeTiles[2].stat).toBe('95%');
  });

  test('a class average below 70 gives the "review common mistakes" guidance instead', () => {
    const lowScoreInsights = { ...insights, totals: { ...insights.totals, classAvgScore: 50 } };
    const stats = buildDashboardStats(populatedStudents, lowScoreInsights, [], GOLD);
    expect(stats.assignmentTiles[1].body).toContain('Review common mistakes');
  });
});

describe('buildDashboardStats — insight tiles', () => {
  test('learningPathTiles has exactly 4 tiles, assignmentTiles 3, challengeTiles 3', () => {
    const stats = buildDashboardStats([student()], null, [], GOLD);
    expect(stats.learningPathTiles).toHaveLength(4);
    expect(stats.assignmentTiles).toHaveLength(3);
    expect(stats.challengeTiles).toHaveLength(3);
    expect(stats.aiInsightTiles).toHaveLength(10);
  });

  test('the "Need Support" tile reflects allNeedsAttention count', () => {
    const stats = buildDashboardStats([student({ status: 'needs_attention' })], null, [], GOLD);
    expect(stats.learningPathTiles[0].stat).toBe('1');
    expect(stats.learningPathTiles[0].label).toBe('Needs Attention');
  });

  test('with no students, the Top Score tile shows placeholder text, not a crash', () => {
    const stats = buildDashboardStats([], null, [], GOLD);
    expect(stats.learningPathTiles[1].stat).toBe('—');
    expect(stats.learningPathTiles[1].title).toBe('No Data Yet');
  });
});

describe('buildDashboardStats — recent activity feed', () => {
  test('maps the first 3 activityFeed events, with initials and icon', () => {
    const events = [
      { studentId: 's1', name: 'Aarav Sharma', text: 'Completed "Fractions"', type: 'topic', timestamp: new Date().toISOString() },
      { studentId: 's2', name: 'Bela Rao', text: 'Completed challenge', type: 'challenge', timestamp: new Date().toISOString() },
    ];
    const stats = buildDashboardStats([], null, events, GOLD);
    expect(stats.recentStudents).toHaveLength(2);
    expect(stats.recentStudents[0].initials).toBe('AS');
    expect(stats.recentStudents[0].name).toBe('Aarav Sharma');
  });

  test('caps recentStudents at 3 even with more events', () => {
    const events = [1, 2, 3, 4].map(n => ({
      studentId: `s${n}`, name: `Student ${n}`, text: 'x', type: 'topic', timestamp: new Date().toISOString(),
    }));
    const stats = buildDashboardStats([], null, events, GOLD);
    expect(stats.recentStudents).toHaveLength(3);
  });
});

describe('buildDashboardStats — AI suggested action', () => {
  test('with struggling students, the action nudges toward reviewing them', () => {
    const stats = buildDashboardStats([student({ status: 'needs_attention', name: 'Aarav Sharma' })], null, [], GOLD);
    expect(stats.aiActionTitle).toContain('Re-engage inactive students');
    expect(stats.aiActionBody).toContain('Aarav');
  });

  test('with no struggling students and progress > 0, the action encourages continuing', () => {
    const stats = buildDashboardStats([student({ status: 'excelling', progressPct: 60 })], null, [], GOLD);
    expect(stats.aiActionTitle).toContain('60%');
  });

  test('with zero progress and no students needing attention, suggests setting up the first assignment', () => {
    const stats = buildDashboardStats([], null, [], GOLD);
    expect(stats.aiActionTitle).toBe('Set up your first assignment to get started');
  });
});
