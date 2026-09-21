export interface RecentAnnouncement {
  id: string;
  title: string;
  severity: string;
  status: 'published' | 'scheduled' | 'draft' | 'archived';
  createdAt: string;
  startsAt: string | null;
}

export interface Overview {
  school: { id: string; name: string };
  counts: {
    students: number;
    teachers: number;
    parents: number;
    publishedAnnouncements: number;
    scheduledAnnouncements: number;
    draftAnnouncements: number;
  };
  recentAnnouncements: RecentAnnouncement[];
}

export interface AccessRequestParent {
  name: string | null;
  email: string;
}

export interface AccessRequest {
  id: string;
  user_email: string;
  name: string | null;
  role: string | null;
  grade: string | null;
  section: string | null;
  studentGrade: string | null;
  curriculum: string | null;
  age?: number | null;
  isUnder14?: boolean;
  parents: AccessRequestParent[];
  created_at: string;
  phone?: string | null;
}

export interface ManageRow {
  key: string;
  icon: string;
  title: string;
  caption: string;
  meta?: string;
  onPress: () => void;
}
