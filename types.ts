export const letters = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export type Grade = typeof letters[number];
export type MarkRow = { 'Student ID': string; Name: string; [key: string]: string | number };
export type ResultRow = MarkRow & { Total: number; Average: number; Grade: Grade; Status: string; Position: number };
export type ClassInfo = {
  id: string; name: string; term: string; subjects: string[];
  scale: Record<string, number>; pass_mark: number; revision: number; updated_at: string;
};
export type ClassData = ClassInfo & { records: MarkRow[]; results: ResultRow[] };
export type Page = 'overview' | 'students' | 'reports' | 'settings';
export const gradeColors: Record<Grade, string> = { A: '#365c45', B: '#739173', C: '#a8bda0', D: '#e8c77a', E: '#dba370', F: '#cd7d70' };
export const markGrade = (mark: number, scale: Record<string, number>): Grade => {
  for (const letter of letters.slice(0, 5)) if (mark >= scale[letter]) return letter;
  return 'F';
};
export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
export const mean = (values: number[]) => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
