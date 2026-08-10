export interface ScheduleEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  note: string;
  studentId: string;
  createdBy: string;
  tag: string | null;
  tagCategory?: 'assignment' | 'event';
  assignmentId?: string | null;
  createdAt?: string;
  isCompleted?: boolean;
  startDate?: string;
  isTimetableClass?: boolean;
  isAllDay?: boolean;
}

export interface DragPreview {
  dayIso: string;
  top: number;
  height: number;
  startT: string;
  endT: string;
}

export interface SelectedEventDetail extends ScheduleEvent {
  accent: string;
  fill: string;
  textCol: string;
}
