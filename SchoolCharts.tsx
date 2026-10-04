import { Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, EmptyState } from './SchoolUI';
import { type Grade, type SchoolResult, type Workspace, colors, formatNumber } from './school-types';

const tooltipStyle = { borderRadius: 12, border: '1px solid #dce3ed', fontSize: 14, color: '#102f55' };
const percent = (value: unknown) => [`${Number(value).toFixed(1)}%`, 'Average'];
const shortName = (name: string) => name.length > 14 ? name.split(' ')[0] : name;

export function PerformanceChart({ data, rows, onReport }: { data: Workspace; rows?: SchoolResult[]; onReport: (id: number) => void }) {
  const complete = (rows || data.results).filter(r => r.complete);
  return <Card title="Overall student performance" subtitle="Average across all subjects · select a bar to view the student report">
    {complete.length ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={complete} margin={{ top: 24, right: 12, left: -17, bottom: 5 }} barCategoryGap="28%">
      <CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e5eaf1"/><XAxis dataKey="name" tickFormatter={shortName} axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: '#64748b', fontSize: 12 }}/><YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}/>
      <Tooltip formatter={percent} contentStyle={tooltipStyle} cursor={{ fill: '#f0f4fa' }}/><ReferenceLine y={data.settings.pass_mark} stroke="#d9aa46" strokeDasharray="5 5"/>
      <Bar dataKey="average" maxBarSize={55} radius={[5, 5, 0, 0]} isAnimationActive={false} onClick={entry => onReport(Number(entry.id))}>{complete.map(r => <Cell key={r.id} fill={colors[r.grade!]}/>)}</Bar>
    </BarChart></ResponsiveContainer></div> : <EmptyState title="No complete results yet" detail="Enter all subject marks in Results to see student performance."/>}
    <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">Dashed line: {data.settings.pass_mark}% pass mark. Rankings use exact averages.</p>
  </Card>;
}

export function SubjectChart({ data, highest = false }: { data: Workspace; highest?: boolean }) {
  const rows = highest ? [...data.analytics.subjects].sort((a, b) => (b.average ?? -1) - (a.average ?? -1)) : data.analytics.subjects;
  return <Card title={highest ? 'Highest-performing subjects' : 'Class average by subject'} subtitle={highest ? 'Subjects ranked from highest to lowest class average' : 'Average score in each subject for the selected class'}>
    {data.summary.completed ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} layout={highest ? 'vertical' : 'horizontal'} margin={{ top: 10, right: highest ? 45 : 15, left: highest ? 5 : -18, bottom: 10 }}>
      <CartesianGrid vertical={!highest} horizontal={highest ? false : true} strokeDasharray="3 5" stroke="#e5eaf1"/>
      {highest ? <><XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false}/><YAxis dataKey="subject" type="category" width={100} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }}/></> : <><XAxis dataKey="subject" axisLine={false} tickLine={false} tickFormatter={name => name === 'Mathematics' ? 'Maths' : name} tick={{ fill: '#64748b', fontSize: 12 }} interval={0}/><YAxis domain={[0, 100]} axisLine={false} tickLine={false} ticks={[0, 25, 50, 75, 100]} tick={{ fill: '#64748b', fontSize: 12 }}/></>}
      <Tooltip formatter={percent} contentStyle={tooltipStyle} cursor={{ fill: '#f0f4fa' }}/><Bar dataKey="average" fill="#2b6492" radius={highest ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={45} isAnimationActive={false}>{rows.map((r, i) => <Cell key={r.subject} fill={highest && i === 0 ? '#d9aa46' : '#2b6492'}/>)}<LabelList dataKey="average" position={highest ? 'right' : 'top'} formatter={v => `${Number(v).toFixed(1)}%`} fill="#52667f" fontSize={12}/></Bar>
    </BarChart></ResponsiveContainer></div> : <EmptyState title="Subject averages are pending" detail="Complete results for at least one student to generate this chart."/>}
  </Card>;
}

export function GradeChart({ data, selected, onGrade }: { data: Workspace; selected: string; onGrade: (grade: string) => void }) {
  const rows = data.analytics.grades.filter(g => g.students > 0);
  return <Card title="Grade distribution" subtitle="Select a grade to focus the student performance chart">
    <div className="flex min-h-72 items-center justify-center gap-5 px-5 pb-5"><div className="relative h-52 w-52 max-w-[60%] shrink-0">
      {rows.length > 0 && <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={rows} dataKey="students" nameKey="grade" innerRadius="68%" outerRadius="92%" paddingAngle={3} stroke="none" isAnimationActive={false} onClick={entry => onGrade(selected === entry.name ? '' : String(entry.name))}>{rows.map(r => <Cell key={r.grade} fill={colors[r.grade]}/>)}</Pie><Tooltip formatter={(value, name) => [`${value} students`, `Grade ${name}`]} contentStyle={tooltipStyle}/></PieChart></ResponsiveContainer>}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-bold text-navy">{data.summary.completed}</strong><span className="mt-1 text-xs text-slate-500">complete results</span></div>
    </div><div className="min-w-0 flex-1 space-y-1">{data.analytics.grades.map(r => <button aria-label={`Filter grade ${r.grade}`} aria-pressed={selected === r.grade} key={r.grade} onClick={() => onGrade(selected === r.grade ? '' : r.grade)} className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${selected === r.grade ? 'bg-blue-50 font-bold' : 'hover:bg-slate-50'}`}><span className="flex items-center gap-2 whitespace-nowrap"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[r.grade] }}/>Grade {r.grade}</span><strong>{r.students}</strong></button>)}</div></div>
  </Card>;
}

export function GenderChart({ data }: { data: Workspace }) {
  const rows = data.analytics.gender.filter(r => r.gender !== 'Not specified');
  const unspecified = data.analytics.gender.find(r => r.gender === 'Not specified')?.students || 0;
  return <Card title="Male / female performance" subtitle="Class averages for students with complete subject marks">
    {data.summary.completed ? <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 28, right: 20, left: -10, bottom: 10 }} barCategoryGap="35%"><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e5eaf1"/><XAxis dataKey="gender" axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} axisLine={false} tickLine={false}/><Tooltip formatter={percent} contentStyle={tooltipStyle}/><Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={95} isAnimationActive={false}><Cell fill="#2b6492"/><Cell fill="#d9aa46"/><LabelList dataKey="average" position="top" formatter={v => v === null ? '—' : `${Number(v).toFixed(1)}%`} fill="#52667f" fontSize={14}/></Bar></BarChart></ResponsiveContainer></div> : <EmptyState title="No completed marks yet" detail="Gender comparisons appear after marks have been saved."/>}
    <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">Male: {rows[0].students} · Female: {rows[1].students}{unspecified > 0 ? ` · ${unspecified} not specified (excluded)` : ''}. An empty group has no average.</p>
  </Card>;
}

export function TermChart({ data }: { data: Workspace }) {
  return <Card title="Term-to-term performance" subtitle="Same class and session · each point uses that term's completed results">
    <div className="chart-area"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.analytics.terms} margin={{ top: 30, right: 25, left: -15, bottom: 5 }}><CartesianGrid vertical={false} strokeDasharray="3 5" stroke="#e5eaf1"/><XAxis dataKey="term" tickFormatter={name => name.replace(' Term', '')} axisLine={false} tickLine={false}/><YAxis domain={[0, 100]} axisLine={false} tickLine={false}/><Tooltip formatter={percent} contentStyle={tooltipStyle}/><Line dataKey="average" type="monotone" stroke="#2b6492" strokeWidth={3} dot={{ r: 6, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 8 }} isAnimationActive={false} connectNulls={false}><LabelList dataKey="average" position="top" formatter={v => v === null ? '' : `${Number(v).toFixed(1)}%`} fill="#52667f" fontSize={12}/></Line></LineChart></ResponsiveContainer></div>
    <p className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">{data.analytics.terms.map(t => `${t.term}: ${t.students} students`).join(' · ')}</p>
  </Card>;
}

export function Analytics({ data, selectedGrade, onGrade, onReport }: { data: Workspace; selectedGrade: string; onGrade: (grade: string) => void; onReport: (id: number) => void }) {
  const filtered = selectedGrade ? data.results.filter(r => r.grade === selectedGrade) : data.results;
  return <><div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><span>{data.summary.completed} completed results in this class. Missing marks are excluded from averages.</span>{selectedGrade && <button className="font-semibold underline" onClick={() => onGrade('')}>Clear grade {selectedGrade} filter</button>}</div><div className="grid gap-6 xl:grid-cols-2"><SubjectChart data={data}/><GradeChart data={data} selected={selectedGrade} onGrade={onGrade}/><SubjectChart data={data} highest/><PerformanceChart data={data} rows={filtered} onReport={onReport}/><GenderChart data={data}/><TermChart data={data}/></div><details className="school-card mt-6 p-5"><summary className="cursor-pointer font-semibold text-navy">View chart values</summary><div className="mt-4 grid gap-5 sm:grid-cols-2"><div><h3 className="mb-2 font-bold">Subject averages</h3>{data.analytics.subjects.map(s => <p key={s.subject} className="flex justify-between gap-3 py-1 text-sm"><span>{s.subject}</span><strong>{formatNumber(s.average)}%</strong></p>)}</div><div><h3 className="mb-2 font-bold">Term averages</h3>{data.analytics.terms.map(t => <p key={t.term} className="flex justify-between gap-3 py-1 text-sm"><span>{t.term}</span><strong>{formatNumber(t.average)}{t.average !== null ? '%' : ''}</strong></p>)}</div></div></details></>;
}
