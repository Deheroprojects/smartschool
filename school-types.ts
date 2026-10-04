export type SchoolPage = 'dashboard' | 'students' | 'results' | 'analytics' | 'reports' | 'settings';
export type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type Gender = 'Male' | 'Female' | 'Not specified';
export type Student = { id: number; student_code: string; name: string; gender: Gender; class_id: number; class_name: string; session_id: number; session: string };
export type Score = { ca: number | null; exam: number | null; total: number; grade: Grade };
export type SchoolResult = Student & {
  scores: Record<string, Score | null>; complete: boolean; total: number | null; average: number | null; grade: Grade | null;
  remark: string; position: number | null; status: string; comment: string; suggested_comment: string; support_subjects: string[];
};
export type User = { name: string; role: string };
export type Selection = { class_id: number; session_id: number; term: string };
export type Workspace = {
  school: { name: string; motto: string; demo: boolean }; user: User;
  classes: { id: number; name: string }[]; sessions: { id: number; name: string }[]; terms: string[];
  selected: Selection; assessment: { id: number; revision: number };
  settings: { scale: Record<string, number>; pass_mark: number; revision: number };
  subjects: { id: number; name: string }[]; students: Student[]; results: SchoolResult[];
  summary: { total_students: number; total_classes: number; total_subjects: number; outstanding: number; class_average: number | null; pass_rate: number | null; completed: number };
  analytics: {
    subjects: { subject: string; average: number | null }[];
    grades: { grade: Grade; students: number }[];
    gender: { gender: Gender; average: number | null; students: number }[];
    terms: { term: string; average: number | null; students: number }[];
  };
};
export type SubmittedScore = { ca: number; exam: number } | { total: number } | null;
export type ResultEntry = { student_id: number; scores: Record<string, SubmittedScore> };
export const grades: Grade[] = ['A', 'B', 'C', 'D', 'E', 'F'];
export const colors: Record<Grade, string> = { A: '#163f6c', B: '#377da1', C: '#50a49b', D: '#d0a342', E: '#c68144', F: '#b94f59' };
export const formatNumber = (value: number | null, digits = 1) => value === null ? '—' : value.toFixed(digits);
export const formatMark = (value: number | null) => value === null ? '—' : String(Number(value.toFixed(2)));
export const ordinal = (value: number | null) => {
  if (value === null) return '—';
  const mod = value % 100;
  return `${value}${mod >= 11 && mod <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] || 'th')}`;
};
export const queryFor = (selection: Selection) => new URLSearchParams({ class_id: String(selection.class_id), session_id: String(selection.session_id), term: selection.term }).toString();
