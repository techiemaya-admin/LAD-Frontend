import React, { useState } from 'react';
import type { BusinessHoursPayload } from '@lad/frontend-features/settings';
import { XIcon } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const CustomTimePicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const d = value ? new Date(`1970-01-01T${value}:00`) : new Date();
  const h = d.getHours();
  const m = d.getMinutes();
  const display = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;

  // Generate 30min intervals
  const options = Array.from({ length: 48 }).map((_, i) => {
    const hr = Math.floor(i / 2);
    const min = i % 2 === 0 ? '00' : '30';
    const ampm = hr < 12 ? 'AM' : 'PM';
    const displayH = String(hr % 12 || 12).padStart(2, '0');
    return {
      val: `${String(hr).padStart(2, '0')}:${min}`,
      label: `${displayH}:${min} ${ampm}`
    };
  });

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 dark:bg-slate-800/60 border rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 dark:text-slate-100 cursor-pointer transition-all flex items-center justify-between ${
          isOpen 
          ? 'border-[#0B1957] dark:border-[#2B7CFF] ring-2 ring-[#0B1957]/10 dark:ring-[#2B7CFF]/20' 
          : 'border-gray-200 dark:border-slate-700/60 hover:border-[#0B1957]/50 dark:hover:border-[#2B7CFF]/60'}`}
      >
        <span>{display}</span>
        <span className="text-gray-400 dark:text-slate-400 text-sm">⏰</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-[#081331] border border-gray-100 dark:border-slate-700/60 rounded-xl shadow-xl py-1 custom-scrollbar">
          {options.map(o => {
            const isSelected = value === o.val || (value === '23:59' && o.val === '23:30');
            return (
              <div
                key={o.val}
                onClick={() => { onChange(o.val); setIsOpen(false); }}
                className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${
                  isSelected 
                  ? 'bg-[#0B1957] dark:bg-[#2B7CFF] text-white font-medium' 
                  : 'text-gray-700 dark:text-slate-300 hover:bg-[#0B1957] hover:text-white dark:hover:bg-[#2B7CFF] dark:hover:text-white'}`}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CustomTimezoneSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; short: string }[];
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-gray-50 dark:bg-slate-800/60 border rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 dark:text-slate-100 cursor-pointer transition-all flex items-center justify-between ${
          isOpen
            ? 'border-[#0B1957] dark:border-[#2B7CFF] ring-2 ring-[#0B1957]/10 dark:ring-[#2B7CFF]/20'
            : 'border-gray-200 dark:border-slate-700/60 hover:border-[#0B1957]/50 dark:hover:border-[#2B7CFF]/60'
        }`}
      >
        <span className="truncate pr-2">{selectedOption?.label}</span>
        <span className={`text-gray-400 dark:text-slate-400 text-xs flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-56 overflow-y-auto bg-white dark:bg-[#081331] border border-gray-100 dark:border-slate-700/60 rounded-xl shadow-xl py-1 custom-scrollbar">
          {options.map(o => {
            const isSelected = value === o.value;
            return (
              <div
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setIsOpen(false);
                }}
                className={`px-3.5 py-2.5 text-sm cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[#0B1957] dark:bg-[#2B7CFF] text-white font-medium'
                    : 'text-gray-700 dark:text-slate-300 hover:bg-[#0B1957] hover:text-white dark:hover:bg-[#2B7CFF] dark:hover:text-white'
                }`}
              >
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

interface BusinessHoursModalProps {
  /** Pre-populate form with saved values fetched from DB */
  initialData?: BusinessHoursPayload;
  initialSummary?: string;
  /** Receives structured payload AND formatted summary string */
  onSave: (payload: BusinessHoursPayload, summary: string) => void;
  onClose: () => void;
  /** Mutation in flight - disables the button so a slow save can't be double-fired. */
  saving?: boolean;
  /** Set by the caller's onError. Previously there was nowhere for this to go:
   *  a failed save left the modal open with no indication anything went wrong. */
  error?: string | null;
}

export const BusinessHoursModal: React.FC<BusinessHoursModalProps> = ({ initialData, initialSummary, onSave, onClose, saving = false, error = null }) => {
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '18:00');
  const [timezone, setTimezone] = useState(initialData?.timezone ?? 'GST+4');
  const [activeDays, setActiveDays] = useState<number[]>(initialData?.activeDays ?? [0, 1, 2, 3, 4]);

  const timezoneOptions = [
    { value: 'UTC+0', label: 'UTC - Coordinated Universal Time (UTC+0)', short: 'UTC(UTC+0)' },
    { value: 'GMT+0', label: 'GMT - Greenwich Mean Time (UTC+0)', short: 'GMT(UTC+0)' },
    { value: 'GST+4', label: 'GST - Gulf Standard Time (UTC+4)', short: 'GST(UTC+4)' },
    { value: 'IST+5:30', label: 'IST - India Standard Time (UTC+5:30)', short: 'IST(UTC+5:30)' },
    { value: 'EST-5', label: 'EST - Eastern Standard Time (UTC−5)', short: 'EST(UTC-5)' },
    { value: 'PST-8', label: 'PST - Pacific Standard Time (UTC−8)', short: 'PST(UTC-8)' },
    { value: 'CET+1', label: 'CET - Central European Time (UTC+1)', short: 'CET(UTC+1)' },
    { value: 'JST+9', label: 'JST - Japan Standard Time (UTC+9)', short: 'JST(UTC+9)' },
    { value: 'AEST+10', label: 'AEST - Australian Eastern Time (UTC+10)', short: 'AEST(UTC+10)' },
  ];

  const toggleDay = (i: number) => {
    setActiveDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a, b) => a - b)
    );
  };

  const applyPreset = (type: 'weekdays' | 'all' | 'weekend' | 'custom') => {
    if (type === 'weekdays') setActiveDays([0, 1, 2, 3, 4]);
    else if (type === 'all') setActiveDays([0, 1, 2, 3, 4, 5, 6]);
    else if (type === 'weekend') setActiveDays([5, 6]);
    else setActiveDays([]);
  };

  const getPreset = () => {
    const s = JSON.stringify([...activeDays].sort((a, b) => a - b));
    if (s === JSON.stringify([0, 1, 2, 3, 4])) return 'weekdays';
    if (s === JSON.stringify([0, 1, 2, 3, 4, 5, 6])) return 'all';
    if (s === JSON.stringify([5, 6])) return 'weekend';
    return 'custom';
  };

  const currentPreset = getPreset();

  const getDayHint = () => {
    const sorted = [...activeDays].sort((a, b) => a - b);
    if (!sorted.length) return 'No days selected';
    if (sorted.length === 7) return 'All 7 days selected';
    if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) return 'Mon-Fri selected';
    if (JSON.stringify(sorted) === JSON.stringify([5, 6])) return 'Sat-Sun selected';
    return sorted.map(i => DAYS[i]).join(', ') + ' selected';
  };

  const fmt12 = (val: string) => {
    if (!val) return '12:00 AM';
    const [hStr, mStr] = val.split(':');
    const h = Number(hStr) || 0;
    const m = Number(mStr) || 0;
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const getSummary = () => {
    const tzText = timezoneOptions.find(o => o.value === timezone)?.short ?? '';
    const sorted = [...activeDays].sort((a, b) => a - b);
    let dayStr = 'No days';
    if (sorted.length === 7) dayStr = 'All Days';
    else if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) dayStr = 'Mon-Fri';
    else if (JSON.stringify(sorted) === JSON.stringify([5, 6])) dayStr = 'Sat-Sun';
    else dayStr = sorted.map(i => DAYS[i]).join(', ');
    return `${fmt12(startTime)} - ${fmt12(endTime)} · ${dayStr} · ${tzText}`;
  };

  const PRESET_LABELS: Record<string, string> = {
    weekdays: 'Weekdays', all: 'All Days', weekend: 'Weekends', custom: 'Custom',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4 pt-16 sm:pt-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] max-h-[calc(100dvh-5rem)] sm:max-h-[85dvh] flex flex-col bg-white dark:bg-[#000724] border border-transparent dark:border-blue-950/40 rounded-2xl shadow-2xl overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* STICKY TOP HEADER (Close button aligns with heading) */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#081331]/95 backdrop-blur-md p-5 sm:p-8 pb-4 sm:pb-4 border-b border-gray-100 dark:border-blue-950/40 flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            {/* Header Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#0B1957] dark:bg-[#2B7CFF]/20 text-white dark:text-[#2B7CFF] flex items-center justify-center text-lg shadow-md flex-shrink-0">
                🕐
              </div>
              <div className="min-w-0">
                <h2 className="text-[18px] sm:text-[20px] font-bold text-gray-900 dark:text-slate-100 leading-tight tracking-tight">Business Hours</h2>
                <p className="text-[12px] sm:text-[13px] text-gray-400 dark:text-slate-400 mt-0.5">Configure availability &amp; timezone</p>
              </div>
            </div>

            {/* Fixed Close Button aligned with Heading */}
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center p-2 text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-gray-100 dark:hover:bg-slate-800/80 rounded-xl transition-all focus:outline-none cursor-pointer flex-shrink-0 -mr-1"
            >
              <XIcon className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <div className="p-5 sm:p-8 pt-6 sm:pt-6 overflow-y-auto custom-scrollbar flex-1 space-y-6 bg-white dark:bg-[#071131]">
          {/* Operating Hours */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-2.5">Operating Hours</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Start Time', value: startTime, onChange: setStartTime },
                { label: 'End Time', value: endTime, onChange: setEndTime },
              ].map(({ label, value, onChange }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 dark:text-slate-400 mb-1.5 font-medium">{label}</label>
                  <div className="relative">
                    <CustomTimePicker value={value} onChange={onChange} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-2.5">Timezone</p>
            <CustomTimezoneSelect
              value={timezone}
              onChange={setTimezone}
              options={timezoneOptions}
            />
          </div>

          <hr className="border-gray-100 dark:border-slate-800" />

          {/* Active Days */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-slate-400 mb-2.5">Active Days</p>

            {/* Presets */}
            <div className="flex gap-2 flex-wrap mb-4">
              {(['weekdays', 'all', 'weekend', 'custom'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${currentPreset === preset
                    ? 'bg-[#0B1957]/8 border-[#0B1957] text-[#0B1957] dark:bg-[#2B7CFF]/20 dark:border-[#2B7CFF] dark:text-[#2B7CFF]'
                    : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60 text-gray-500 dark:text-slate-400 hover:border-gray-400 dark:hover:border-slate-500 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                >
                  {PRESET_LABELS[preset]}
                </button>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {DAYS.map((d, i) => {
                const active = activeDays.includes(i);
                return (
                  <button
                    key={d}
                    onClick={() => toggleDay(i)}
                    className={`aspect-square rounded-xl text-[11px] font-semibold border transition-all flex flex-col items-center justify-center gap-0.5 ${active
                      ? 'bg-[#0B1957]/10 border-[#0B1957] text-[#0B1957] dark:bg-[#2B7CFF]/20 dark:border-[#2B7CFF] dark:text-[#2B7CFF] shadow-sm'
                      : 'bg-gray-50 dark:bg-slate-800/40 border-gray-200 dark:border-slate-700/60 text-gray-400 dark:text-slate-500 hover:border-gray-300 dark:hover:border-slate-600 hover:text-gray-600 dark:hover:text-slate-300'
                      }`}
                  >
                    <span>{d}</span>
                    <span className={`w-1 h-1 rounded-full transition-colors ${active ? 'bg-[#0B1957] dark:bg-[#2B7CFF]' : 'bg-transparent'}`} />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-slate-500 text-center">{getDayHint()}</p>
          </div>

          {/* Summary */}
          <div className="bg-[#0B1957]/5 dark:bg-[#2B7CFF]/10 border border-[#0B1957]/15 dark:border-[#2B7CFF]/20 rounded-xl px-4 py-3.5 flex items-center gap-3">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-[10px] text-gray-400 dark:text-slate-400 uppercase tracking-wider font-medium">Schedule Summary</p>
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200 mt-0.5">{getSummary()}</p>
            </div>
          </div>

          {/* Save error - the mutation's onError previously had nowhere to surface to. */}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300"
            >
              {error}
            </div>
          )}

          {/* Save button */}
          <button
            disabled={saving}
            onClick={() => {
              const payload: BusinessHoursPayload = { startTime, endTime, timezone, activeDays };
              onSave(payload, getSummary());
            }}
            className="w-full py-3.5 bg-[#0B1957] dark:bg-[#2B7CFF] hover:bg-[#0a1648] dark:hover:bg-[#1a6bf0] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-white rounded-xl font-bold text-[15px] tracking-wide shadow-lg shadow-[#0B1957]/30 dark:shadow-[#2B7CFF]/20 hover:shadow-[#0B1957]/50 dark:hover:shadow-[#2B7CFF]/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            {saving ? 'Saving…' : 'Save Business Hours'}
          </button>
        </div>
      </div>
    </div>
  );
};
