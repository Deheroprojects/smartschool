import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpRight, Check, ChevronLeft, ChevronRight, Edit3, Search, SlidersHorizontal, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { type ClassData, type Grade, type ResultRow, gradeColors, initials, letters, mean, markGrade } from './types';

export function Modal({ title, description, children, onClose, busy = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); }, []);
  return <dialog ref={dialog} className="modal" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <header><div><span className="eyebrow">YOUR WORKSPACE</span><h2>{title}</h2></div><button className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20}/></button></header>
    {description && <p className="modal-description">{description}</p>}{children}
  </dialog>;
}

export function GradeBadge({ grade }: { grade: Grade }) { return <span className={`grade-badge grade-${grade}`}>{grade}</span>; }

export function Filters({ query, setQuery, grade, setGrade, status, setStatus, clear, active }: {
  query: string; setQuery: (s: string) => void; grade: string; setGrade: (s: string) => void;
  status: string; setStatus: (s: string) => void; clear: () => void; active: boolean;
}) {
  return <div className="filters">
    <div className="search-field"><Search size={17}/><input id="student-search" aria-label="Search students" placeholder="Search name or student ID…" value={query} onChange={e => setQuery(e.target.value)}/><kbd>/</kbd></div>
    <div className="filter-select"><SlidersHorizontal size={15}/><select aria-label="Filter by grade" value={grade} onChange={e => setGrade(e.target.value)}><option value="">All grades</option>{letters.map(g => <option key={g} value={g}>Grade {g}</option>)}</select></div>
    <select aria-label="Filter by status" value={status} onChange={e => setStatus(e.target.value)}><option value="">All outcomes</option><option value="Pass">Passing</option><option value="Needs improvement">Needs support</option></select>
    {active && <button className="text-button" onClick={clear}><X size={14}/>Clear filters</button>}
  </div>;
}

export function StudentTable({ rows, total, onReport, onEdit }: { rows: ResultRow[]; total: number; onReport: (id: string) => void; onEdit: (row: ResultRow) => void }) {
  const [sort, setSort] = useState('rank');
  const [page, setPage] = useState(0);
  const size = 8;
  useEffect(() => setPage(0), [rows, sort]);
  const sorted = [...rows].sort((a, b) => sort === 'name' ? a.Name.localeCompare(b.Name) : sort === 'low' ? a.Average - b.Average : a.Position - b.Position);
  const maxPage = Math.max(0, Math.ceil(rows.length / size) - 1);
  const safePage = Math.min(page, maxPage);
  return <section className="panel results-panel">
    <div className="panel-heading"><div><h2>Student results <span className="count-tag">{rows.length}</span></h2><p>Select a student to explore their report.</p></div><select aria-label="Sort students" value={sort} onChange={e => setSort(e.target.value)}><option value="rank">Highest average</option><option value="low">Lowest average</option><option value="name">Name A–Z</option></select></div>
    {rows.length === 0 ? <div className="empty-state"><Search size={30}/><h3>No students in this view</h3><p>Try clearing your filters, or add students to this class.</p></div> : <div className="table-scroll"><table><thead><tr><th>Student</th><th>Class rank</th><th>Average</th><th>Grade</th><th>Outcome</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
      {sorted.slice(safePage * size, (safePage + 1) * size).map((row, i) => <tr key={row['Student ID']}>
        <td><button className="student-link" aria-label={`${row.Name} ${row['Student ID']}`} onClick={() => onReport(row['Student ID'])}><span className={`avatar avatar-${i % 4}`}>{initials(row.Name)}</span><span><strong>{row.Name}</strong><small>{row['Student ID']}</small></span></button></td>
        <td><span className="rank">{String(row.Position).padStart(2, '0')}</span></td>
        <td><div className="average-cell"><strong>{row.Average.toFixed(1)}<span>%</span></strong><span className="mini-track"><span style={{ width: `${row.Average}%`, background: gradeColors[row.Grade] }}/></span></div></td>
        <td><GradeBadge grade={row.Grade}/></td>
        <td><span className={`status-pill ${row.Status === 'Pass' ? 'passing' : 'support'}`}><span/>{row.Status === 'Pass' ? 'Passing' : 'Needs support'}</span></td>
        <td><button className="icon-button" title={`Edit ${row.Name}`} aria-label={`Edit ${row.Name}`} onClick={() => onEdit(row)}><Edit3 size={16}/></button><button className="icon-button" aria-label={`View report for ${row.Name}`} onClick={() => onReport(row['Student ID'])}><ArrowUpRight size={17}/></button></td>
      </tr>)}
    </tbody></table></div>}
    <div className="table-footer"><span>{rows.length ? `${safePage * size + 1}–${Math.min((safePage + 1) * size, rows.length)} of ${rows.length}` : '0'} students{rows.length !== total ? ` · ${total} in class` : ''}</span><span className="pagination"><button className="icon-button" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft size={17}/></button><span>{safePage + 1} / {maxPage + 1}</span><button className="icon-button" aria-label="Next page" disabled={safePage === maxPage} onClick={() => setPage(safePage + 1)}><ChevronRight size={17}/></button></span></div>
  </section>;
}

export function DashboardCharts({ data, rows, selectedGrade, onGrade }: { data: ClassData; rows: ResultRow[]; selectedGrade: string; onGrade: (grade: string) => void }) {
  const [subject, setSubject] = useState('');
  useEffect(() => setSubject(''), [data.id]);
  const subjects = data.subjects.map(name => ({ name, average: Number(mean(rows.map(r => Number(r[name]))).toFixed(2)) }));
  const counts = letters.map(name => ({ name, value: rows.filter(r => r.Grade === name).length }));
  const focused = subjects.find(s => s.name === subject);
  return <div className="charts-grid">
    <section className="panel subject-chart"><div className="panel-heading"><div><h2>Subject performance</h2><p>{focused ? `${focused.name}: ${focused.average.toFixed(1)}% average in this view` : 'Average marks across the students in this view'}</p></div><span className="legend"><i/>Average</span></div>
      {rows.length ? <><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><BarChart data={subjects} margin={{ top: 18, right: 10, left: -20, bottom: 8 }} barCategoryGap="35%">
        <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e9ebe5"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#738076', fontSize: 11 }} interval={0} tickFormatter={name => name.length > 14 ? name.slice(0, 12) + '…' : name}/><YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#8b938a', fontSize: 11 }} ticks={[0, 25, 50, 75, 100]}/>
        <Tooltip cursor={{ fill: '#f2f5ee' }} formatter={value => [`${Number(value).toFixed(1)}%`, 'Average']} contentStyle={{ borderRadius: 12, border: '1px solid #e5e8df', fontSize: 13 }}/><ReferenceLine y={data.pass_mark} stroke="#c6a879" strokeDasharray="5 5"/>
        <Bar isAnimationActive={false} dataKey="average" radius={[7, 7, 0, 0]} maxBarSize={70}>{subjects.map(s => <Cell key={s.name} fill={!subject || s.name === subject ? '#547459' : '#dce5d5'}/>)}</Bar>
      </BarChart></ResponsiveContainer></div><div className="subject-buttons">{subjects.map(s => <button key={s.name} className={subject === s.name ? 'selected' : ''} onClick={() => setSubject(subject === s.name ? '' : s.name)}>{s.name}</button>)}</div><div className="chart-caption"><span className="dashed-line"/>Pass mark: {data.pass_mark}% <span>All subjects carry equal weight.</span></div></> : <div className="empty-chart">Add students or clear filters to see subject averages.</div>}
    </section>
    <section className="panel grade-chart"><div className="panel-heading"><div><h2>Grade distribution</h2><p>Select a grade to filter your view</p></div></div><div className="grade-chart-body"><div className="donut-wrap">
      {rows.length > 0 && <ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={false} data={counts.filter(c => c.value > 0)} dataKey="value" nameKey="name" innerRadius="70%" outerRadius="92%" paddingAngle={3} cornerRadius={5} stroke="none" onClick={entry => onGrade(selectedGrade === entry.name ? '' : String(entry.name))}>{counts.filter(c => c.value > 0).map(c => <Cell key={c.name} fill={gradeColors[c.name]}/>)}</Pie><Tooltip formatter={(value, name) => [`${value} student${Number(value) === 1 ? '' : 's'}`, `Grade ${name}`]} contentStyle={{ borderRadius: 12, border: '1px solid #e5e8df', fontSize: 13 }}/></PieChart></ResponsiveContainer>}
      <div className="donut-center"><strong>{rows.length}</strong><span>students</span></div></div><div className="grade-legend">{counts.map(c => <button key={c.name} className={selectedGrade === c.name ? 'active' : ''} aria-pressed={selectedGrade === c.name} onClick={() => onGrade(selectedGrade === c.name ? '' : c.name)}><span><i style={{ background: gradeColors[c.name] }}/>Grade {c.name}</span><strong>{c.value}</strong></button>)}</div></div><div className="chart-caption">Grades are based on each student's exact average.</div></section>
  </div>;
}

export function StudentReport({ row, data, onEdit }: { row: ResultRow; data: ClassData; onEdit: () => void }) {
  const average = mean(data.results.map(r => r.Average));
  const gap = row.Average - average;
  const support = data.subjects.filter(s => Number(row[s]) < data.pass_mark);
  const marks = data.subjects.map(subject => ({ subject, mark: Number(row[subject]), average: mean(data.results.map(r => Number(r[subject]))) }));
  return <div className="report-area" id="print-report">
    <section className="report-identity"><div className="report-avatar">{initials(row.Name)}</div><div><span className="eyebrow">STUDENT REPORT · {data.term}</span><h2>{row.Name}</h2><p>{row['Student ID']} <span>·</span> {data.name}</p></div><button className="button secondary no-print" onClick={onEdit}><Edit3 size={16}/>Edit marks</button></section>
    <div className="report-metrics"><div><span>Overall average</span><strong>{row.Average.toFixed(2)}<small>%</small></strong></div><div><span>Overall grade</span><strong>{row.Grade}</strong></div><div><span>Class position</span><strong>{row.Position}<small> / {data.results.length}</small></strong></div><div><span>Compared to class</span><strong className={gap >= 0 ? 'positive' : 'negative'}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)}<small> pts</small></strong></div></div>
    <div className="report-grid"><section className="panel"><div className="panel-heading"><div><h2>Marks by subject</h2><p>A closer look at strengths and opportunities</p></div><span className={`status-pill ${row.Status === 'Pass' ? 'passing' : 'support'}`}><span/>{row.Status === 'Pass' ? 'Passing overall' : 'Needs support'}</span></div><div className="subject-reports">{marks.map(s => <div key={s.subject} className="subject-report"><div><strong>{s.subject}</strong><GradeBadge grade={markGrade(s.mark, data.scale)}/><span>{s.mark.toFixed(1)}<small> / 100</small></span></div><div className="score-track"><span style={{ width: `${s.mark}%`, background: gradeColors[markGrade(s.mark, data.scale)] }}/><i style={{ left: `${s.average}%` }} title={`Class average: ${s.average.toFixed(1)}%`}/></div><p>Class average {s.average.toFixed(1)}% <span>{s.mark >= s.average ? <ArrowUp size={13}/> : <ArrowDown size={13}/>} {Math.abs(s.mark - s.average).toFixed(1)} points {s.mark >= s.average ? 'above' : 'below'}</span></p></div>)}</div><div className="chart-caption"><span className="class-marker"/>Vertical marker shows the class average.</div></section>
    <aside className="report-insights"><section className={`insight-card ${support.length ? 'needs-support-card' : ''}`}><span className="insight-icon">{support.length ? <SlidersHorizontal size={21}/> : <Check size={21}/>}</span><h3>{support.length ? 'A little extra support' : 'On track in every subject'}</h3><p>{support.length ? `${support.join(', ')} ${support.length === 1 ? 'is' : 'are'} below the ${data.pass_mark}% pass mark. Focus the next check-in on ${support.length === 1 ? 'this subject' : 'these subjects'}.` : `Every subject meets the ${data.pass_mark}% pass mark. Keep building on this progress.`}</p></section><section className="panel report-rules"><span className="eyebrow">HOW THIS IS CALCULATED</span><p>Total marks <strong>{row.Total.toFixed(1)}</strong></p><p>Subjects <strong>{data.subjects.length}</strong></p><p>Overall pass mark <strong>{data.pass_mark}%</strong></p><small>Overall pass/fail uses the average. Tied averages share a position; the next position is skipped.</small></section></aside></div>
    <footer className="print-footer">Classroom · {data.name} · {data.term} · Graded using exact, unrounded averages.</footer>
  </div>;
}
