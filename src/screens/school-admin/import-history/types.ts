export interface ImportRun {
  id: string;
  type: 'students' | 'teachers';
  fileName: string;
  runByEmail: string;
  importedCount: number;
  skippedCount: number;
  status: string;
  createdAt: string;
}
