export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = typeof body.detail === 'string' ? body.detail :
      Array.isArray(body.detail) ? body.detail.map((e: { msg: string; loc: string[] }) => `${e.loc.slice(1).join(' ')}: ${e.msg}`).join('; ') :
      `Request failed (${response.status}). Please try again.`;
    throw new ApiError(message, response.status);
  }
  return response.json();
}

export function downloadCSV(rows: Record<string, string | number>[], columns: string[], filename: string) {
  const cell = (value: string | number) => {
    let text = String(value ?? '');
    if (typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = '\ufeff' + [columns.map(cell).join(','), ...rows.map(row => columns.map(c => cell(row[c])).join(','))].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
