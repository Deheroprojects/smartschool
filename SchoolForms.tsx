import { useState, type FormEvent } from 'react';
import { Save } from 'lucide-react';
import { ErrorMessage } from './SchoolUI';
import { type Gender, type ResultEntry, type SchoolResult, type Student, type SubmittedScore, type Workspace } from './school-types';

export type StudentInput = { student_code: string; name: string; gender: Gender; class_id: number; session_id: number };

export function StudentForm({ data, student, busy, error, onSave, onClose }: { data: Workspace; student?: Student; busy: boolean; error: string; onSave: (values: StudentInput) => void; onClose: () => void }) {
  const [values, setValues] = useState<StudentInput>({ student_code: student?.student_code || '', name: student?.name || '', gender: student?.gender || 'Male', class_id: student?.class_id || data.selected.class_id, session_id: student?.session_id || data.selected.session_id });
  return <form onSubmit={e => { e.preventDefault(); onSave(values); }}><fieldset disabled={busy}><div className="grid gap-5 sm:grid-cols-2"><label className="form-label">Student ID<input autoFocus required maxLength={50} value={values.student_code} onChange={e => setValues({ ...values, student_code: e.target.value })} placeholder="e.g. BFS013"/></label><label className="form-label">Student name<input required maxLength={150} value={values.name} onChange={e => setValues({ ...values, name: e.target.value })} placeholder="Full name"/></label><label className="form-label">Gender<select aria-label="Gender" value={values.gender} onChange={e => setValues({ ...values, gender: e.target.value as Gender })}><option>Male</option><option>Female</option><option>Not specified</option></select></label><label className="form-label">Class<select aria-label="Student class" value={values.class_id} onChange={e => setValues({ ...values, class_id: Number(e.target.value) })}>{data.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="form-label sm:col-span-2">Academic session<select disabled={!!student} aria-label="Student session" value={values.session_id} onChange={e => setValues({ ...values, session_id: Number(e.target.value) })}>{data.sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div><p className="mt-5 text-sm leading-relaxed text-slate-500">Add student details here, then enter subject marks on the Results page.</p><ErrorMessage error={error}/><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn" type="submit"><Save size={17}/>{busy ? 'Saving…' : student ? 'Save student' : 'Add student'}</button></div></fieldset></form>;
}

export function preserveScore(row: SchoolResult, subject: string, total: string): SubmittedScore {
  if (total.trim() === '') return null;
  const value = Number(total);
  const previous = row.scores[subject];
  if (previous && previous.total === value && previous.ca !== null && previous.exam !== null) return { ca: previous.ca, exam: previous.exam };
  return { total: value };
}

export function ScoresForm({ data, row, busy, error, onSave, onClose }: { data: Workspace; row: SchoolResult; busy: boolean; error: string; onSave: (entry: ResultEntry) => void; onClose: () => void }) {
  const [mode, setMode] = useState<'ca' | 'total'>(Object.values(row.scores).some(s => s && s.ca === null) ? 'total' : 'ca');
  const [values, setValues] = useState(() => Object.fromEntries(data.subjects.map(s => [s.name, { ca: row.scores[s.name]?.ca === null || !row.scores[s.name] ? '' : String(row.scores[s.name]!.ca), exam: row.scores[s.name]?.exam === null || !row.scores[s.name] ? '' : String(row.scores[s.name]!.exam), total: row.scores[s.name] ? String(row.scores[s.name]!.total) : '' }])));
  const [localError, setLocalError] = useState('');
  const set = (subject: string, field: 'ca' | 'exam' | 'total', value: string) => setValues({ ...values, [subject]: { ...values[subject], [field]: value } });
  const submit = (e: FormEvent) => {
    e.preventDefault(); setLocalError('');
    const scores: Record<string, SubmittedScore> = {};
    for (const subject of data.subjects) {
      const v = values[subject.name];
      if (mode === 'total') scores[subject.name] = preserveScore(row, subject.name, v.total);
      else if (v.ca === '' && v.exam === '') scores[subject.name] = null;
      else if (v.ca === '' || v.exam === '') { setLocalError(`${subject.name}: enter both CA and exam, or leave both empty.`); return; }
      else scores[subject.name] = { ca: Number(v.ca), exam: Number(v.exam) };
    }
    onSave({ student_id: row.id, scores });
  };
  return <form onSubmit={submit}><fieldset disabled={busy}><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold text-navy">{row.name}</h3><p className="mt-1 text-sm text-slate-500">{row.student_code} · {data.selected.term}</p></div><div className="flex rounded-xl bg-slate-100 p-1"><button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'ca' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('ca')}>CA & exam</button><button type="button" className={`rounded-lg px-3 py-2 text-sm font-semibold ${mode === 'total' ? 'bg-white text-navy shadow-sm' : 'text-slate-500'}`} onClick={() => setMode('total')}>Totals only</button></div></div><div className="relative overflow-x-auto rounded-xl border border-slate-200"><table className="school-table"><thead><tr><th>Subject</th>{mode === 'ca' && <><th>CA / 30</th><th>Exam / 70</th></>}<th>Total / 100</th></tr></thead><tbody>{data.subjects.map(s => { const v = values[s.name]; return <tr key={s.id}><td className="font-semibold text-navy">{s.name}</td>{mode === 'ca' ? <><td><input className="results-input" aria-label={`${s.name} CA`} type="number" min={0} max={30} step="any" value={v.ca} onChange={e => set(s.name, 'ca', e.target.value)}/></td><td><input className="results-input" aria-label={`${s.name} Exam`} type="number" min={0} max={70} step="any" value={v.exam} onChange={e => set(s.name, 'exam', e.target.value)}/></td><td className="font-semibold">{v.ca !== '' && v.exam !== '' ? Number(v.ca) + Number(v.exam) : '—'}</td></> : <td><input className="results-input" aria-label={`${s.name} total`} type="number" min={0} max={100} step="any" value={v.total} onChange={e => set(s.name, 'total', e.target.value)}/></td>}</tr>; })}</tbody></table></div><p className="mt-4 text-sm leading-relaxed text-slate-500">CA + exam = subject total. Leave missing marks empty. A totals-only change does not invent a CA/exam breakdown.</p><ErrorMessage error={localError || error}/><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn" type="submit"><Save size={17}/>{busy ? 'Saving…' : 'Save results'}</button></div></fieldset></form>;
}

export function ClassForm({ busy, error, onSave, onClose }: { busy: boolean; error: string; onSave: (name: string, subjects: string[]) => void; onClose: () => void }) {
  const [name, setName] = useState(''); const [subjects, setSubjects] = useState('Mathematics, English, Biology, Physics, Chemistry');
  return <form onSubmit={e => { e.preventDefault(); onSave(name, subjects.split(',').map(s => s.trim())); }}><fieldset disabled={busy}><label className="form-label">Class name<input autoFocus required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SS3 Science"/></label><label className="form-label mt-5">Subjects<textarea aria-label="Class subjects" required rows={3} value={subjects} onChange={e => setSubjects(e.target.value)}/></label><p className="mt-2 text-sm text-slate-500">Separate subject names with commas.</p><ErrorMessage error={error}/><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn" type="submit">{busy ? 'Creating…' : 'Create class'}</button></div></fieldset></form>;
}

export function SessionForm({ busy, error, onSave, onClose }: { busy: boolean; error: string; onSave: (name: string) => void; onClose: () => void }) {
  const [name, setName] = useState('');
  return <form onSubmit={e => { e.preventDefault(); onSave(name); }}><fieldset disabled={busy}><label className="form-label">Academic session<input autoFocus required pattern="[0-9]{4}/[0-9]{4}" placeholder="e.g. 2027/2028" value={name} onChange={e => setName(e.target.value)}/></label><p className="mt-3 text-sm leading-relaxed text-slate-500">A new session starts with an empty student register. Previous sessions and results remain saved.</p><ErrorMessage error={error}/><div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button className="btn" type="submit">{busy ? 'Creating…' : 'Create session'}</button></div></fieldset></form>;
}
