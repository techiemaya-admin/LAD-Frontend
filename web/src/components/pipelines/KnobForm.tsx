'use client';

/**
 * Knob form - the typed settings surface that replaces the workflow builder.
 *
 * Renders whatever the snapshot manifest declares for a pipeline. It knows the
 * knob TYPES but not the knobs themselves, so a new setting ships by editing
 * the manifest, not this file.
 *
 * Validation is server-side. This form does light input shaping (number inputs,
 * option lists) but never decides what is acceptable - that lives in
 * core/entitlements/knobSchema.js, which is also what a direct API call hits.
 */

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { KnobDefinition, KnobValues, KnobOption } from '@lad/frontend-features/snapshots';

function optionValue(option: KnobOption): string {
  return typeof option === 'string' ? option : option.value;
}
function optionLabel(option: KnobOption): string {
  return typeof option === 'string' ? option : option.label;
}

function KnobField({
  knob,
  value,
  onChange,
  disabled,
}: {
  knob: KnobDefinition;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled: boolean;
}) {
  const id = `knob-${knob.key}`;
  const base =
    'w-full rounded-md border border-gray-300 dark:border-blue-950/40 bg-white dark:bg-[#000c3b] px-2.5 py-1.5 text-sm text-gray-900 dark:text-white disabled:bg-gray-50 dark:disabled:bg-[#071131] disabled:text-gray-400 dark:disabled:text-slate-500 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';

  switch (knob.type) {
    case 'boolean':
      return (
        <label htmlFor={id} className="flex items-center gap-2 cursor-pointer">
          <input
            id={id}
            type="checkbox"
            checked={value === true}
            disabled={disabled}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600"
          />
          <span className="text-sm text-gray-700 dark:text-slate-300">{knob.label}</span>
        </label>
      );

    case 'select':
      return (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
          className={base}
        >
          <option value="">Not set</option>
          {(knob.options || []).map((o) => (
            <option key={optionValue(o)} value={optionValue(o)}>
              {optionLabel(o)}
            </option>
          ))}
        </select>
      );

    case 'multiselect': {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-1.5">
          {(knob.options || []).map((o) => {
            const v = optionValue(o);
            const on = selected.includes(v);
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                aria-pressed={on}
                onClick={() => onChange(on ? selected.filter((s) => s !== v) : [...selected, v])}
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-50 ${
                  on
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300'
                    : 'border-gray-300 dark:border-blue-950/40 bg-white dark:bg-[#000c3b] text-gray-600 dark:text-slate-300 hover:border-gray-400'
                }`}
              >
                {optionLabel(o)}
              </button>
            );
          })}
        </div>
      );
    }

    case 'list': {
      // One entry per line: the shape a studio owner already thinks in when
      // listing their classes, and it round-trips without a tag-input widget.
      const text = Array.isArray(value) ? (value as string[]).join('\n') : '';
      return (
        <textarea
          id={id}
          rows={4}
          value={text}
          disabled={disabled}
          placeholder="One per line"
          onChange={(e) =>
            onChange(e.target.value.split('\n').map((s) => s.trim()).filter(Boolean))
          }
          className={base}
        />
      );
    }

    case 'textarea':
      return (
        <textarea
          id={id}
          rows={3}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          maxLength={knob.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );

    case 'number':
      return (
        <input
          id={id}
          type="number"
          value={typeof value === 'number' ? value : ''}
          disabled={disabled}
          min={knob.min}
          max={knob.max}
          step={knob.integer ? 1 : 'any'}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={base}
        />
      );

    case 'time':
      return (
        <input
          id={id}
          type="time"
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value || null)}
          className={base}
        />
      );

    case 'phone':
    case 'text':
    default:
      return (
        <input
          id={id}
          type={knob.type === 'phone' ? 'tel' : 'text'}
          value={typeof value === 'string' ? value : ''}
          disabled={disabled}
          maxLength={knob.maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
  }
}

export function KnobForm({
  knobs,
  values,
  saving,
  onSave,
}: {
  knobs: KnobDefinition[];
  values: KnobValues;
  saving: boolean;
  onSave: (changed: KnobValues) => Promise<string[]>;
}) {
  const [draft, setDraft] = useState<KnobValues>(values);
  const [errors, setErrors] = useState<string[]>([]);

  // Only the fields that actually changed are sent. The server merges rather
  // than replaces, so a narrow patch is both cheaper and safer - it cannot
  // clobber a value this version's form does not know about.
  const changed = useMemo(() => {
    const out: KnobValues = {};
    for (const knob of knobs) {
      const before = JSON.stringify(values[knob.key] ?? null);
      const after = JSON.stringify(draft[knob.key] ?? null);
      if (before !== after) out[knob.key] = draft[knob.key] ?? null;
    }
    return out;
  }, [knobs, values, draft]);

  const dirty = Object.keys(changed).length > 0;

  const handleSave = async () => {
    const fieldErrors = await onSave(changed);
    setErrors(fieldErrors);
  };

  return (
    <div className="mt-4 border-t border-gray-100 dark:border-blue-950/40 pt-4">
      <div className="grid gap-3.5">
        {knobs.map((knob) => (
          <div key={knob.key} className="grid gap-1">
            {knob.type !== 'boolean' && (
              <label htmlFor={`knob-${knob.key}`} className="text-xs font-medium text-gray-700 dark:text-slate-300">
                {knob.label}
              </label>
            )}
            <KnobField
              knob={knob}
              value={draft[knob.key]}
              disabled={saving}
              onChange={(next) => setDraft((d) => ({ ...d, [knob.key]: next }))}
            />
            {knob.help && <p className="text-xs leading-relaxed text-gray-500 dark:text-slate-400">{knob.help}</p>}
          </div>
        ))}
      </div>

      {errors.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-md bg-red-50 dark:bg-red-950/40 p-2.5">
          {errors.map((e) => (
            <li key={e} className="text-xs text-red-800 dark:text-red-300">{e}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-700"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Save settings
        </button>
        {dirty && !saving && (
          <button
            type="button"
            onClick={() => { setDraft(values); setErrors([]); }}
            className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
          >
            Discard
          </button>
        )}
      </div>
    </div>
  );
}
