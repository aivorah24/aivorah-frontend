export interface AdminStudent {
  id: string;
  name: string;
  email: string;
  grade: string;
  curriculum: string;
  school: string;
  section: string;
  created_at: string;
  teacher_student: { teacher_id: string; subject: string; teacher: { id: string; name: string; email: string } | null }[];
}

export interface AdminTeacher {
  id: string;
  name: string;
  email: string;
  school: string;
  curriculum: string;
  teaches: { grade?: string; curriculum?: string; subject?: string; subjects?: string[] }[];
}

// curriculum = the school's board ("IB", "CBSE", "IB PYP", …) or null if not set.
export interface AdminSchool {
  id: string;
  name: string;
  curriculum: string | null;
}

export interface AssignTeacherPayload {
  studentIds: string[];
  teacherEmail: string;
  subject?: string;
}
