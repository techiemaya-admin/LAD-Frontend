'use client';

/**
 * One knob, rendered from its definition.
 *
 * Generic on purpose. The backend sends the definitions with the values, so a
 * knob added to the snapshot manifest shows up here with no frontend change —
 * which is the only way five-knobs-per-feature stays sustainable.
 *
 * Every type in knobSchema.js is handled. An UNKNOWN type falls back to a text
 * input rather than rendering nothing: a knob the studio cannot see is a knob
 * they cannot fix, and silently dropping one would be indistinguishable from
 * the field not existing.
 */

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

import type { KnobDefinition, KnobValue } from '../types';

interface Props {
  def: KnobDefinition;
  value: KnobValue;
  onChange: (key: string, value: KnobValue) => void;
  disabled?: boolean;
}

/** `list` and `multiselect` are stored as arrays; the textarea edits them by line. */
const toLines = (v: KnobValue): string =>
  Array.isArray(v) ? v.join('\n') : '';

const fromLines = (s: string): string[] =>
  s.split('\n').map((l) => l.trim()).filter(Boolean);

export function KnobField({ def, value, onChange, disabled }: Props) {
  const id = `knob-${def.key}`;
  const set = (v: KnobValue) => onChange(def.key, v);

  const help = def.help ? (
    <p className="mt-1 text-xs text-muted-foreground">{def.help}</p>
  ) : null;

  // A boolean reads as a statement with a switch, not a labelled field.
  if (def.type === 'boolean') {
    return (
      <div className="flex items-start justify-between gap-4 py-3">
        <div className="min-w-0">
          <Label htmlFor={id} className="text-sm font-medium">{def.label}</Label>
          {help}
        </div>
        <Switch
          id={id}
          checked={value === true}
          onCheckedChange={(c) => set(c)}
          disabled={disabled}
        />
      </div>
    );
  }

  let control: React.ReactNode;

  switch (def.type) {
    case 'textarea':
      control = (
        <Textarea
          id={id}
          rows={3}
          maxLength={def.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
      break;

    case 'number':
      control = (
        <Input
          id={id}
          type="number"
          min={def.min}
          max={def.max}
          step={def.integer ? 1 : 'any'}
          value={value === null || value === undefined ? '' : String(value)}
          // Empty clears the knob rather than writing 0 — 0 is a legitimate
          // value for several of these (a zero-hour cutoff means "right up to
          // the start"), so it must not be what "I left this blank" produces.
          onChange={(e) => set(e.target.value === '' ? null : Number(e.target.value))}
          disabled={disabled}
        />
      );
      break;

    case 'select':
      control = (
        <Select
          value={typeof value === 'string' && value ? value : undefined}
          onValueChange={(v) => set(v)}
          disabled={disabled}
        >
          <SelectTrigger id={id}><SelectValue placeholder="Choose…" /></SelectTrigger>
          <SelectContent>
            {(def.options || []).map((o) => (
              <SelectItem key={o} value={o}>{o}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;

    case 'multiselect':
      // Checkboxes rather than a multi-select widget: the option sets here are
      // short (days of the week) and a list you can see all of beats one you
      // have to open.
      control = (
        <div className="flex flex-wrap gap-3 pt-1">
          {(def.options || []).map((o) => {
            const chosen = Array.isArray(value) && value.includes(o);
            return (
              <label key={o} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={chosen}
                  disabled={disabled}
                  onChange={() => {
                    const cur = Array.isArray(value) ? value : [];
                    set(chosen ? cur.filter((x) => x !== o) : [...cur, o]);
                  }}
                />
                {o}
              </label>
            );
          })}
        </div>
      );
      break;

    case 'list':
      control = (
        <Textarea
          id={id}
          rows={4}
          placeholder="One per line"
          value={toLines(value)}
          onChange={(e) => set(fromLines(e.target.value))}
          disabled={disabled}
        />
      );
      break;

    case 'time':
      control = (
        <Input
          id={id}
          type="time"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
      break;

    case 'phone':
      control = (
        <Input
          id={id}
          type="tel"
          inputMode="tel"
          placeholder="+971…"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
      break;

    default:
      // 'text' and anything the manifest grows later.
      control = (
        <Input
          id={id}
          maxLength={def.maxLength}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => set(e.target.value)}
          disabled={disabled}
        />
      );
  }

  return (
    <div className="py-3">
      <Label htmlFor={id} className="text-sm font-medium">{def.label}</Label>
      {help}
      <div className="mt-2">{control}</div>
      {def.type === 'list' && Array.isArray(value) && def.maxItems ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {value.length} of {def.maxItems}
        </p>
      ) : null}
    </div>
  );
}
