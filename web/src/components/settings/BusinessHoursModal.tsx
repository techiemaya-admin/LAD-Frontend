import React, { useState } from 'react';
import type { BusinessHoursPayload } from '@lad/frontend-features/settings';


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
        className={`w-full bg-gray-50 border rounded-xl px-3.5 py-2.5 text-sm font-medium text-gray-800 cursor-pointer transition-all flex items-center justify-between ${isOpen ? 'border-[#0B1957] ring-2 ring-[#0B1957]/10' : 'border-gray-200 hover:border-[#0B1957]/50'}`}
      >
        <span>{display}</span>
        <span className="text-gray-400 text-sm">⏰</span>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl py-1">
          {options.map(o => {
            const isSelected = value === o.val || (value === '23:59' && o.val === '23:30');
            return (
              <div
                key={o.val}
                onClick={() => { onChange(o.val); setIsOpen(false); }}
                className={`px-3.5 py-2 text-sm cursor-pointer transition-colors ${isSelected ? 'bg-[#0B1957] text-white font-medium' : 'text-gray-700 hover:bg-[#0B1957]/10'}`}
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
}

export const BusinessHoursModal: React.FC<BusinessHoursModalProps> = ({ initialData, initialSummary, onSave, onClose }) => {
  const [startTime, setStartTime] = useState(initialData?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initialData?.endTime ?? '18:00');
  const [timezone, setTimezone] = useState(initialData?.timezone ?? 'GST+4');
  const [activeDays, setActiveDays] = useState<number[]>(initialData?.activeDays ?? [0, 1, 2, 3, 4]);

  const timezoneOptions = [
    { value: 'UTC+0', label: 'UTC — Coordinated Universal Time (UTC+0)', short: 'UTC(UTC+0)' },
    { value: 'GMT+0', label: 'GMT — Greenwich Mean Time (UTC+0)', short: 'GMT(UTC+0)' },
    { value: 'GST+4', label: 'GST — Gulf Standard Time (UTC+4)', short: 'GST(UTC+4)' },
    { value: 'IST+5:30', label: 'IST — India Standard Time (UTC+5:30)', short: 'IST(UTC+5:30)' },
    { value: 'EST-5', label: 'EST — Eastern Standard Time (UTC−5)', short: 'EST(UTC-5)' },
    { value: 'PST-8', label: 'PST — Pacific Standard Time (UTC−8)', short: 'PST(UTC-8)' },
    { value: 'CET+1', label: 'CET — Central European Time (UTC+1)', short: 'CET(UTC+1)' },
    { value: 'JST+9', label: 'JST — Japan Standard Time (UTC+9)', short: 'JST(UTC+9)' },
    { value: 'AEST+10', label: 'AEST — Australian Eastern Time (UTC+10)', short: 'AEST(UTC+10)' },
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
    if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) return 'Mon – Fri selected';
    if (JSON.stringify(sorted) === JSON.stringify([5, 6])) return 'Sat – Sun selected';
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
    else if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) dayStr = 'Mon–Fri';
    else if (JSON.stringify(sorted) === JSON.stringify([5, 6])) dayStr = 'Sat–Sun';
    else dayStr = sorted.map(i => DAYS[i]).join(', ');
    return `${fmt12(startTime)} – ${fmt12(endTime)} · ${dayStr} · ${tzText}`;
  };

  const PRESET_LABELS: Record<string, string> = {
    weekdays: 'Weekdays', all: 'All Days', weekend: 'Weekends', custom: 'Custom',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden font-sans"
        onClick={e => e.stopPropagation()}
      >
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#0B1957] rounded-t-2xl" />

        <div className="p-9">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#0B1957] flex items-center justify-center text-lg shadow-md flex-shrink-0">
              🕐
            </div>
            <div>
              <h2 className="text-[20px] font-bold text-gray-900 leading-tight tracking-tight">Business Hours</h2>
              <p className="text-[13px] text-gray-400 mt-0.5">Configure availability &amp; timezone</p>
            </div>
            <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          </div>

          {/* Operating Hours */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Operating Hours</p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Start Time', value: startTime, onChange: setStartTime },
              { label: 'End Time', value: endTime, onChange: setEndTime },
            ].map(({ label, value, onChange }) => (
              <div key={label}>
                <label className="block text-xs text-gray-500 mb-1.5 font-medium">{label}</label>
                <div className="relative">
                  <CustomTimePicker value={value} onChange={onChange} />
                </div>
              </div>
            ))}
          </div>

          {/* Timezone */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Timezone</p>
          <div className="relative mb-6">
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 pr-9 text-sm text-gray-800 outline-none focus:border-[#0B1957] focus:ring-2 focus:ring-[#0B1957]/10 transition-all appearance-none cursor-pointer"
            >
              {timezoneOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
          </div>

          <hr className="border-gray-100 mb-6" />

          {/* Active Days */}
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">Active Days</p>

          {/* Presets */}
          <div className="flex gap-2 flex-wrap mb-4">
            {(['weekdays', 'all', 'weekend', 'custom'] as const).map(preset => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${currentPreset === preset
                  ? 'bg-[#0B1957]/8 border-[#0B1957] text-[#0B1957]'
                  : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700'
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
                    ? 'bg-[#0B1957]/10 border-[#0B1957] text-[#0B1957] shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                    }`}
                >
                  <span>{d}</span>
                  <span className={`w-1 h-1 rounded-full transition-colors ${active ? 'bg-[#0B1957]' : 'bg-transparent'}`} />
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-gray-400 text-center mb-6">{getDayHint()}</p>

          {/* Summary */}
          <div className="bg-[#0B1957]/5 border border-[#0B1957]/15 rounded-xl px-4 py-3.5 flex items-center gap-3 mb-5">
            <span className="text-xl">📋</span>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Schedule Summary</p>
              <p className="text-sm font-semibold text-gray-800 mt-0.5">{getSummary()}</p>
            </div>
          </div>

          {/* Save button */}
          <button
            onClick={() => {
              const payload: BusinessHoursPayload = { startTime, endTime, timezone, activeDays };
              onSave(payload, getSummary());
            }}
            className="w-full py-3.5 bg-[#0B1957] hover:bg-[#0a1648] text-white rounded-xl font-bold text-[15px] tracking-wide shadow-lg shadow-[#0B1957]/30 hover:shadow-[#0B1957]/50 hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Save Business Hours
          </button>
        </div>
      </div>
    </div>
  );
};
\n\n\n