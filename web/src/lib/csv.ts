/**
 * CSV cell encoding, shared by every client-side CSV export.
 *
 * Does two things, in order:
 *
 *  1. FORMULA-INJECTION GUARD (CWE-1236). A cell whose text begins with one of
 *     = + - @ (or a tab / carriage-return, which some parsers strip to expose
 *     the next char) is interpreted as a FORMULA by Excel and Google Sheets when
 *     the file is opened. CRM values — names, companies, notes — come from
 *     untrusted enrichment/import, so a contact named `=HYPERLINK("http://evil",
 *     "invoice")` or `=WEBSERVICE(...)` would execute on the exporter's machine.
 *     We prefix such cells with a single quote, the OWASP-recommended mitigation:
 *     Excel/Sheets treat `'` as "the rest is literal text" and hide it, so a
 *     phone like `+9715…` still DISPLAYS as `+9715…` (and is correctly kept as
 *     text rather than mangled into a number). The one accepted trade-off is that
 *     a non-spreadsheet parser re-importing the file sees the literal leading `'`.
 *
 *  2. RFC-4180 QUOTING. Anything containing a comma, double-quote, CR or LF is
 *     wrapped in double-quotes with embedded quotes doubled, so the value can't
 *     break the row/column structure.
 */

// = + - @ start a formula; \t and \r can be used to smuggle one past a trimming
// parser; a leading NUL is defensive.
const FORMULA_TRIGGER = /^[=+\-@\t\r\x00]/;

export function csvCell(v: unknown): string {
  if (v == null) return '';
  let s: string;
  if (Array.isArray(v)) s = v.join('|');
  else if (typeof v === 'object') s = JSON.stringify(v);
  else s = String(v);

  // Guard BEFORE quoting so the apostrophe lands on the real leading character
  // even for a value that will also be quote-wrapped below.
  if (FORMULA_TRIGGER.test(s)) s = `'${s}`;

  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a CSV document from a header row and body rows. */
export function buildCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(',')];
  rows.forEach((row) => lines.push(row.map(csvCell).join(',')));
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Hand a CSV to the browser as a download. Prepends a UTF-8 BOM so Excel
 * detects the encoding instead of mangling non-Latin names.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
