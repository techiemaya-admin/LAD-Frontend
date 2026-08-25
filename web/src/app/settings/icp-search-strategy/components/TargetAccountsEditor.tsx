/**
 * TargetAccountsEditor - managed list of `{ company_name, domain?, apollo_company_id? }`
 * rows used by the AbmSearchAdapter (D10).
 *
 * UX:
 *   - Table of current accounts with inline edit + per-row remove
 *   - "Add account" form (company name + optional domain)
 *   - Bulk-paste textarea: one account per line, comma-separated
 *       Acme,acme.com
 *       Beta,beta.io
 *       Gamma            ← domain optional
 *   - Live count + a hint when accounts have no resolvable domain (because
 *     the AbmSearchAdapter will skip those silently for now).
 *
 * Pure controlled component - emits the whole accounts array on every change.
 */
'use client';

import { useState } from 'react';

type TargetAccount = {
  company_name: string;
  domain?: string;
  apollo_company_id?: string;
};

function cleanDomain(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];
}

function parseBulk(text: string): TargetAccount[] {
  return text
    .split(/[\n\r]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Support both comma and tab separators
      const parts = line.split(/[,\t]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length === 0) return null;
      const company_name = parts[0];
      const domain = parts[1] ? cleanDomain(parts[1]) : undefined;
      return { company_name, ...(domain ? { domain } : {}) };
    })
    .filter((a): a is TargetAccount => Boolean(a && a.company_name));
}

export interface TargetAccountsEditorProps {
  value: TargetAccount[];
  onChange: (next: TargetAccount[]) => void;
  disabled?: boolean;
}

export function TargetAccountsEditor({
  value,
  onChange,
  disabled = false,
}: TargetAccountsEditorProps) {
  const [newCompany, setNewCompany] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkOpen, setBulkOpen] = useState(false);

  const noDomainCount = value.filter((a) => !a?.domain && !a?.apollo_company_id).length;

  const addOne = () => {
    const name = newCompany.trim();
    if (!name) return;
    const domain = newDomain.trim() ? cleanDomain(newDomain) : undefined;
    onChange([...value, { company_name: name, ...(domain ? { domain } : {}) }]);
    setNewCompany('');
    setNewDomain('');
  };

  const removeAt = (idx: number) => {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  };

  const updateAt = (idx: number, patch: Partial<TargetAccount>) => {
    const next = value.slice();
    const current = next[idx];
    next[idx] = {
      ...current,
      ...patch,
      ...(patch.domain !== undefined ? { domain: patch.domain ? cleanDomain(patch.domain) : undefined } : {}),
    };
    onChange(next);
  };

  const applyBulk = () => {
    const parsed = parseBulk(bulkText);
    if (parsed.length === 0) return;
    // De-dupe by (company_name + domain)
    const merged = [...value, ...parsed];
    const seen = new Set<string>();
    const deduped: TargetAccount[] = [];
    for (const a of merged) {
      const key = `${(a.company_name || '').toLowerCase()}|${(a.domain || '').toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(a);
    }
    onChange(deduped);
    setBulkText('');
    setBulkOpen(false);
  };

  const clearAll = () => {
    if (!confirm(`Remove all ${value.length} target accounts?`)) return;
    onChange([]);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-slate-800 px-5 py-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Named target accounts</h4>
          <p className="mt-0.5 text-xs text-gray-500">
            ABM searches only fire when this list is non-empty.{' '}
            <strong>{value.length}</strong> account{value.length === 1 ? '' : 's'} configured.
            {noDomainCount > 0 && (
              <>
                {' '}
                <span className="text-amber-700">
                  ({noDomainCount} without a domain will be skipped)
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            disabled={disabled}
            className="rounded border border-gray-300 bg-white dark:bg-slate-900 dark:border-slate-700 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
          >
            {bulkOpen ? 'Cancel bulk' : 'Bulk paste'}
          </button>
          {value.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              disabled={disabled}
              className="rounded border border-rose-200 bg-white px-3 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:opacity-50"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      {bulkOpen && (
        <div className="space-y-2 border-b border-gray-200 bg-gray-50 dark:bg-slate-900 dark:border-slate-800 px-5 py-3">
          <label className="block text-xs font-medium text-gray-700">
            One account per line, comma-separated: <code>Company Name, domain.com</code>
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            disabled={disabled}
            rows={6}
            placeholder={'Acme, acme.com\nBeta, beta.io\nGamma'}
            className="w-full rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm font-mono disabled:opacity-50"
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={applyBulk}
              disabled={disabled || !bulkText.trim()}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Append {parseBulk(bulkText).length || ''} account
              {parseBulk(bulkText).length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {value.length > 0 ? (
        <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
          {value.map((a, idx) => (
            <li
              key={`${a.company_name}-${idx}`}
              className="flex items-center gap-2 px-5 py-2 text-sm"
            >
              <input
                type="text"
                value={a.company_name || ''}
                onChange={(e) => updateAt(idx, { company_name: e.target.value })}
                disabled={disabled}
                className="flex-1 rounded border border-gray-200 px-2 py-1 text-sm disabled:opacity-50"
                aria-label="Company name"
              />
              <input
                type="text"
                value={a.domain || ''}
                onChange={(e) => updateAt(idx, { domain: e.target.value })}
                disabled={disabled}
                placeholder="domain.com (optional)"
                className="w-48 rounded border border-gray-200 px-2 py-1 text-sm text-gray-700 disabled:opacity-50"
                aria-label="Domain"
              />
              {!a.domain && !a.apollo_company_id && (
                <span
                  title="Without a domain or Apollo company id, this account is skipped at search time."
                  className="text-xs text-amber-700"
                >
                  no domain
                </span>
              )}
              <button
                type="button"
                onClick={() => removeAt(idx)}
                disabled={disabled}
                className="text-gray-400 hover:text-rose-600 disabled:opacity-30"
                aria-label="Remove account"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-5 py-6 text-center text-sm text-gray-500">
          No target accounts yet. Add one below, or use Bulk paste.
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-gray-200 bg-gray-50 dark:bg-slate-900 dark:border-slate-800 px-5 py-3">
        <input
          type="text"
          value={newCompany}
          onChange={(e) => setNewCompany(e.target.value)}
          disabled={disabled}
          placeholder="Company name"
          className="flex-1 min-w-0 rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOne();
            }
          }}
        />
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          disabled={disabled}
          placeholder="domain.com (optional)"
          className="w-48 rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm disabled:opacity-50"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addOne();
            }
          }}
        />
        <button
          type="button"
          onClick={addOne}
          disabled={disabled || !newCompany.trim()}
          className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}

export type { TargetAccount };
