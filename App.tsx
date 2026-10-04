import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, Check, ChevronDown, CircleHelp, Download, GraduationCap, LayoutDashboard, Leaf, Menu, Plus, Printer, RefreshCw, Settings2, ShieldCheck, Target, TrendingUp, Upload, Users, X } from 'lucide-react';
import { downloadCSV, request } from './api';
import { DashboardCharts, Filters, Modal, StudentReport, StudentTable } from './components';
import { FormError, ImportForm, NewClassForm, Settings, StudentForm } from './forms';
import { type ClassData, type ClassInfo, type MarkRow, type Page, type ResultRow, mean } from './types';

type Dialog = 'student' | 'class' | 'import' | 'delete' | 'help' | null;
const nav = [{ page: 'overview', label: 'Overview', icon: LayoutDashboard }, { page: 'students', label: 'Students', icon: Users }, { page: 'reports', label: 'Student reports', icon: BookOpen }, { page: 'settings', label: 'Grading rules', icon: Settings2 }] as const;
const headings = {
  overview: ['A clearer view of your class.', 'From individual marks to the bigger picture.'],
  students: ['Every student, in one place.', 'Manage marks and find the students who need you.'],
  reports: ['See the story behind the score.', 'Understand strengths and plan the next step.'],
  settings: ['Your class. Your grading rules.', 'Set a clear, consistent standard for every result.'],
};

export default function App() {
  const [classes, setClasses] = useState<ClassInfo[]>([]); const [selected, setSelected] = useState('');
  const [data, setData] = useState<ClassData | null>(null); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState<Page>('overview'); const [query, setQuery] = useState(''); const [grade, setGrade] = useState(''); const [status, setStatus] = useState('');
  const [studentId, setStudentId] = useState(''); const [dialog, setDialog] = useState<Dialog>(null); const [editing, setEditing] = useState<MarkRow>();
  const [busy, setBusy] = useState(false); const [formError, setFormError] = useState(''); const [toast, setToast] = useState(''); const [sidebarOpen, setSidebarOpen] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshCounter = useRef(0); const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    request<ClassInfo[]>('/classes', { signal: controller.signal }).then(list => {
      setClasses(list); let previous = ''; try { previous = localStorage.getItem('classroom-class') || ''; } catch { /* Storage can be disabled. */ }
      setSelected(list.find(c => c.id === previous)?.id || list[0]?.id || '');
    }).catch(e => { if (!controller.signal.aborted) { setLoadError(e.message || 'Could not connect to the workspace.'); setLoading(false); } });
    return () => controller.abort();
  }, [refreshKey]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController(); setLoading(true); setLoadError('');
    request<ClassData>(`/classes/${selected}`, { signal: controller.signal }).then(result => {
      setData(result); setLoading(false);
      try { localStorage.setItem('classroom-class', selected); } catch { /* Optional preference. */ }
    }).catch(e => { if (!controller.signal.aborted) { setLoadError(e.message || 'Could not load this class.'); setLoading(false); } });
    return () => controller.abort();
  }, [selected, refreshKey]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === '/' && !dialog && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) { const input = document.getElementById('student-search'); if (input) { e.preventDefault(); input.focus(); } } };
    document.addEventListener('keydown', handler); return () => document.removeEventListener('keydown', handler);
  }, [dialog]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const notify = (message: string) => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 5000); };
  const clearFilters = () => { setQuery(''); setGrade(''); setStatus(''); };
  const open = (kind: Dialog, row?: MarkRow) => { setEditing(row); setFormError(''); setDialog(kind); };
  const navigate = (next: Page) => { setPage(next); setSidebarOpen(false); };
  const switchClass = (id: string) => { setSelected(id); setData(null); setStudentId(''); clearFilters(); setDialog(null); };
  const refresh = () => { setFormError(''); setDialog(null); setLoading(true); setRefreshKey(++refreshCounter.current); };
  const applyData = (next: ClassData) => { setData(next); setClasses(old => old.some(c => c.id === next.id) ? old.map(c => c.id === next.id ? next : c) : [...old, next]); };
  const mutate = async (path: string, body: unknown, message: string, method = 'PUT') => {
    setBusy(true); setFormError('');
    try { const next = await request<ClassData>(path, { method, body: JSON.stringify(body) }); applyData(next); notify(message); setDialog(null); return next; }
    catch (e) { const message = e instanceof Error ? e.message : 'Could not save. Please try again.'; setFormError(message); throw e; }
    finally { setBusy(false); }
  };
  const saveStudent = async (row: MarkRow) => {
    if (!data) return;
    const records = editing ? data.records.map(r => r['Student ID'] === editing['Student ID'] ? row : r) : [...data.records, row];
    try { const next = await mutate(`/classes/${data.id}/records`, { records, revision: data.revision }, editing ? 'Student changes saved.' : 'Student added to your class.'); if (studentId === editing?.['Student ID']) setStudentId(row['Student ID']); applyData(next); } catch { /* Error is visible in the form. */ }
  };
  const rows = useMemo(() => (data?.results ?? []).filter(row => (!grade || row.Grade === grade) && (!status || row.Status === status) && `${row.Name} ${row['Student ID']}`.toLowerCase().includes(query.trim().toLowerCase())), [data, grade, status, query]);
  const activeFilters = !!(query || grade || status);
  const chosen = data?.results.find(r => r['Student ID'] === studentId) || data?.results[0];
  const report = (id: string) => { setStudentId(id); navigate('reports'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const exportRows = () => { if (data) downloadCSV(rows, ['Student ID', 'Name', ...data.subjects, 'Total', 'Average', 'Grade', 'Status', 'Position'], 'classroom_results.csv'); };
  const passCount = rows.filter(r => r.Status === 'Pass').length;
  const metrics = [
    { label: 'Students in view', value: String(rows.length).padStart(2, '0'), suffix: '', note: `${data?.results.length ?? 0} students in this class`, icon: Users, tone: 'green' },
    { label: 'Average score', value: rows.length ? mean(rows.map(r => r.Average)).toFixed(1) : '—', suffix: rows.length ? '%' : '', note: 'Across all subjects · equal weight', icon: BarChart3, tone: 'purple' },
    { label: 'Pass rate', value: rows.length ? ((passCount / rows.length) * 100).toFixed(0) : '—', suffix: rows.length ? '%' : '', note: `${passCount} of ${rows.length} meet the ${data?.pass_mark ?? 40}% pass mark`, icon: Target, tone: 'gold' },
    { label: 'Highest average', value: rows.length ? Math.max(...rows.map(r => r.Average)).toFixed(1) : '—', suffix: rows.length ? '%' : '', note: rows.length ? [...rows].sort((a, b) => b.Average - a.Average)[0].Name : 'Add students to get started', icon: TrendingUp, tone: 'rose' },
  ];

  return <div className="app-shell">
    {sidebarOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setSidebarOpen(false)}/>}
    <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('overview'); }}><span className="brand-symbol"><GraduationCap size={25}/></span><span>classroom<span className="brand-dot">.</span></span></a><div className="workspace-label"><span className="workspace-avatar">C</span><div><strong>Results workspace</strong><small>Your classroom, connected</small></div></div><span className="nav-label">WORKSPACE</span><nav>{nav.map(item => <button key={item.page} aria-label={item.label} className={page === item.page ? 'nav-item active' : 'nav-item'} aria-current={page === item.page ? 'page' : undefined} onClick={() => navigate(item.page)}><item.icon size={19}/>{item.label}{item.page === 'students' && data && <span>{data.results.length}</span>}</button>)}</nav><div className="sidebar-card"><span className="leaf-icon"><Leaf size={23}/></span><h3>Small insights.<br/>Meaningful progress.</h3><p>Every score is a chance to help a student grow.</p><button onClick={() => open('help')}>Explore your workspace<ArrowRight size={15}/></button></div><div className="sidebar-bottom"><button className="nav-item" onClick={() => open('help')}><CircleHelp size={19}/>Help & quick guide</button><div className="workspace-owner"><span className="owner-avatar"><GraduationCap size={18}/></span><div><strong>Teacher workspace</strong><small>Local edition</small></div><span className="online-dot"/></div></div></aside>
    <div className="main-shell"><header className="topbar"><div className="breadcrumb"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={22}/></button><span>Workspace</span><span>/</span><strong>{nav.find(n => n.page === page)?.label}</strong></div><div className="topbar-right"><span className="saved-state"><ShieldCheck size={15}/>{busy ? 'Saving…' : loading ? 'Connecting…' : loadError ? 'Connection unavailable' : 'Saved to workspace'}</span><button className="icon-button" aria-label="Refresh workspace" title="Reload saved data" disabled={busy} onClick={refresh}><RefreshCw size={17}/></button><span className="topbar-avatar">CW</span></div></header>
    <main><div className="page-header"><div><div className="eyebrow"><span className="tiny-leaf"/>CLASSROOM INSIGHTS</div><h1>{headings[page][0]}</h1><p>{headings[page][1]}</p></div><div className="class-controls"><div className="class-selector"><GraduationCap size={18}/><select aria-label="Choose class" value={selected} disabled={busy || classes.length === 0} onChange={e => switchClass(e.target.value)}>{classes.map(c => <option value={c.id} key={c.id}>{c.name} · {c.term}</option>)}</select><ChevronDown size={14}/></div><button className="icon-button add-class" aria-label="Create a class" title="Create a class" disabled={busy || loading} onClick={() => open('class')}><Plus size={19}/></button></div></div>
    {loadError ? <div className="panel connection-error"><CircleHelp size={32}/><h2>We couldn't load your workspace.</h2><p>{loadError}</p><button className="button primary" onClick={refresh}><RefreshCw size={16}/>Try again</button></div> : loading || !data ? <div className="loading-state" role="status"><span className="spinner"/><h3>Opening your workspace…</h3><p>Gathering your class results.</p></div> : <>
    {(page === 'overview' || page === 'students') && <><div className="view-toolbar"><div className="term-label"><span className="live-dot"/>{data.name}<span className="separator">/</span>{data.term}{data.name === 'Demo class' && <span className="sample-badge">Fictional sample</span>}</div><div className="action-buttons"><button className="button secondary" onClick={() => open('import')}><Upload size={15}/>Import CSV</button><button className="button secondary" onClick={exportRows} disabled={!rows.length}><Download size={15}/>Export view</button><button className="button primary" onClick={() => open('student')}><Plus size={17}/>Add student</button></div></div><Filters query={query} setQuery={setQuery} grade={grade} setGrade={setGrade} status={status} setStatus={setStatus} clear={clearFilters} active={activeFilters}/>
    {page === 'overview' && <><div className="metrics-grid">{metrics.map(m => <section className="metric-card" key={m.label}><div><span>{m.label}</span><span className={`metric-icon ${m.tone}`}><m.icon size={18}/></span></div><strong>{m.value}<small>{m.suffix}</small></strong><p>{m.note}</p></section>)}</div>{data.results.length > 0 ? <DashboardCharts data={data} rows={rows} selectedGrade={grade} onGrade={setGrade}/> : <section className="welcome-card"><div className="welcome-art"><GraduationCap size={54}/><span><Plus size={20}/></span></div><div><span className="eyebrow">A FRESH START</span><h2>Your next great class starts here.</h2><p>Add your first student or import a marks file to bring this dashboard to life.</p><button className="button primary" onClick={() => open('student')}><Plus size={16}/>Add your first student</button></div></section>}</>}
    <StudentTable rows={rows} total={data.results.length} onReport={report} onEdit={row => open('student', row)}/><div className="view-note"><span><ShieldCheck size={14}/>Changes are saved to your workspace database.</span><a href={`/api/classes/${data.id}/export?raw=true`}><Download size={14}/>Download raw marks</a></div></>}
    {page === 'reports' && <>{chosen ? <><div className="report-toolbar"><label>Choose a student<select aria-label="Choose a student" value={chosen['Student ID']} onChange={e => setStudentId(e.target.value)}>{data.results.map(r => <option key={r['Student ID']} value={r['Student ID']}>{r.Name} · {r['Student ID']}</option>)}</select></label><div className="action-buttons"><button className="button secondary" onClick={() => downloadCSV(data.subjects.map(subject => ({ Subject: subject, Mark: Number(chosen[subject]), 'Class average': mean(data.results.map(r => Number(r[subject]))) })), ['Subject', 'Mark', 'Class average'], `${chosen['Student ID']}_report.csv`)}><Download size={15}/>Download report</button><button className="button primary" onClick={() => window.print()}><Printer size={16}/>Print report</button></div></div><StudentReport row={chosen} data={data} onEdit={() => open('student', chosen)}/></> : <section className="panel empty-state"><BookOpen size={38}/><h2>A report for every student.</h2><p>Add students to this class to see their individual reports.</p><button className="button primary" onClick={() => open('student')}><Plus size={16}/>Add student</button></section>}</>}
    {page === 'settings' && <Settings key={`${data.id}-${data.revision}`} data={data} busy={busy} onSave={async (scale, passMark) => { await mutate(`/classes/${data.id}/rules`, { revision: data.revision, scale, pass_mark: passMark }, 'Grading rules saved. All results recalculated.'); }}/>}
    <footer className="app-footer"><span>Made for the moments that move learning forward.</span><span><Leaf size={13}/>classroom.</span></footer></>}
    </main></div>
    {toast && <div className="toast" role="status"><span><Check size={17}/></span>{toast}<button className="icon-button" aria-label="Dismiss notification" onClick={() => setToast('')}><X size={15}/></button></div>}
    {dialog && <Modal title={dialog === 'student' ? editing ? 'Edit student' : 'Add a student' : dialog === 'class' ? 'Create a class' : dialog === 'import' ? 'Bring your marks in' : dialog === 'delete' ? 'Delete this student?' : 'Welcome to Classroom'} description={dialog === 'student' ? 'Clear records make better insights. Every subject needs a mark.' : dialog === 'class' ? 'Start a separate class for each group or assessment.' : dialog === 'import' ? 'Import marks for the subjects already in this class.' : undefined} busy={busy} onClose={() => setDialog(null)}>
      {dialog === 'student' && data && <StudentForm data={data} row={editing} busy={busy} error={formError} onSubmit={row => void saveStudent(row)} onDelete={() => { setFormError(''); setDialog('delete'); }} onClose={() => setDialog(null)}/>}
      {dialog === 'class' && <NewClassForm busy={busy} error={formError} onClose={() => setDialog(null)} onSubmit={async (name, term, subjects) => { try { const created = await mutate('/classes', { name, term, subjects }, 'Your new class is ready.', 'POST'); switchClass(created.id); navigate('overview'); } catch { /* Form shows errors. */ } }}/>}
      {dialog === 'import' && data && <ImportForm data={data} busy={busy} error={formError} onClose={() => setDialog(null)} onSubmit={async (csv_text, replace) => { try { await mutate(`/classes/${data.id}/import`, { csv_text, replace, revision: data.revision }, 'Marks imported. Your results are up to date.', 'POST'); } catch { /* Form shows errors. */ } }}/>}
      {dialog === 'delete' && data && editing && <><p className="delete-message"><strong>{editing.Name}</strong> and their marks will be removed from {data.name}. Download raw marks first if you need a backup.</p><FormError error={formError}/><div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setDialog('student')}>Keep student</button><button className="button danger-button" disabled={busy} onClick={async () => { try { await mutate(`/classes/${data.id}/records`, { revision: data.revision, records: data.records.filter(r => r['Student ID'] !== editing['Student ID']) }, 'Student removed.'); } catch { /* Error is visible. */ } }}>{busy ? 'Deleting…' : 'Delete student'}</button></div></>}
      {dialog === 'help' && <div className="help-content"><div><span>01</span><p><strong>Start with your class</strong>Create a class for each term or assessment. The demo contains fictional students you can explore.</p></div><div><span>02</span><p><strong>Enter or import marks</strong>Add students individually, or download the CSV template in Import CSV. Use unique student IDs and marks from 0 to 100.</p></div><div><span>03</span><p><strong>Explore the picture</strong>Search students or select a grade to filter the overview. Class positions always refer to the full class.</p></div><div><span>04</span><p><strong>Make the next step count</strong>Open individual reports to spot subject strengths and support needs. Print reports or export the current view.</p></div><div className="help-note"><ShieldCheck size={19}/><p>Records save automatically when you submit changes. Download raw marks for a portable backup. This local edition has one shared workspace.</p></div><button className="button primary" onClick={() => setDialog(null)}>Got it<ArrowRight size={16}/></button></div>}
      {formError.includes('another window') && <button className="text-button conflict-refresh" onClick={refresh}><RefreshCw size={15}/>Refresh class and close this form</button>}
    </Modal>}
  </div>;
}
