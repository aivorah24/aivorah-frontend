export interface BulkCreatePayload {
  students: string[];
  grade: string;
  section?: string;
  school: string;
  curriculum: string;
}

export interface CreatedStudent {
  name: string;
  email: string;
  password: string;
  grade: string;
  curriculum: string;
  section?: string;
  school: string;
}

export interface BulkCreateError {
  name: string;
  error: string;
}

export interface BulkCreateResult {
  created: CreatedStudent[];
  errors: BulkCreateError[];
  total: number;
}
