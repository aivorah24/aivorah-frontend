// NOTE: This array is currently not rendered in the active dashboard UI (kept for
// future use). If re-enabled, filter out school-only screens (TeacherAttendance)
// for B2C teachers who have no schoolId, mirroring Sidebar.tsx / DrawerContent.tsx.
export const QUICK_ACTIONS = [
  { icon: 'plus-circle' as const, label: 'New Assignment', color: '#6366f1', screen: 'TeacherAssignments' },
  { icon: 'edit-3' as const, label: 'Grade Papers', color: '#f59e0b', screen: 'TeacherAssignments' },
  { icon: 'clipboard' as const, label: 'Attendance', color: '#ba905a', screen: 'TeacherAttendance' }, // B2B only
  { icon: 'calendar' as const, label: 'Schedule', color: '#10b981', screen: 'TeacherSchedule' },
  { icon: 'bar-chart-2' as const, label: 'Progress', color: '#06b6d4', screen: 'TeacherProgress' },
  { icon: 'users' as const, label: 'Students', color: '#8b5cf6', screen: 'TeacherStudents' },
];

export const ACTIVITY_ICON: Record<string, any> = { topic: 'book-open', assignment: 'edit-3', challenge: 'target' };
