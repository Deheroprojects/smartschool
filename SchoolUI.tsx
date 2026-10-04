import { useEffect, useRef, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { type Grade, colors } from './school-types';
export function Logo({ className = 'h-14 w-12' }: { className?: string }) { return <img src="/school-logo.svg" alt="Bright Future School crest" className={className}/>; }
export function GradeBadge({ grade }: { grade: Grade | null }) {
  return grade ? <span className="inline-flex min-w-9 items-center justify-center rounded-lg px-2.5 py-1 text-sm font-bold" style={{ color: colors[grade], background: colors[grade] + '12' }}>{grade}</span> : <span className="text-sm text-slate-400">Pending</span>;
}
export function Card({ title, subtitle, children, action, className = '' }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`school-card ${className}`}><div className="flex flex-wrap items-start justify-between gap-3 px-6 pt-6 pb-4"><div><h2 className="text-lg font-bold text-navy">{title}</h2>{subtitle && <p className="mt-1 text-sm leading-relaxed text-slate-500">{subtitle}</p>}</div>{action}</div>{children}</section>;
}
export function ErrorMessage({ error }: { error: string }) { return error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-relaxed text-red-700"><AlertCircle size={18} className="mt-0.5 shrink-0"/>{error}</div> : null; }
export function SchoolModal({ title, children, onClose, busy = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const node = ref.current; node?.showModal(); return () => node?.close(); }, []);
  return <dialog className="school-modal" ref={ref} onCancel={e => { e.preventDefault(); if (!busy) onClose(); }}><div className="mb-6 flex items-center justify-between gap-3"><h2 className="text-2xl font-bold text-navy">{title}</h2><button className="icon-btn" disabled={busy} aria-label="Close dialog" onClick={onClose}><X size={22}/></button></div>{children}</dialog>;
}
export function EmptyState({ title, detail, children }: { title: string; detail: string; children?: ReactNode }) { return <div className="p-10 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500"><CheckCircle2 size={27}/></div><h3 className="text-lg font-semibold text-navy">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">{detail}</p>{children}</div>; }
