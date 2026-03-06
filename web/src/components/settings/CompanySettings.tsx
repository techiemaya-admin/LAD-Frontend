'use client';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Building2, Upload, MapPin, Target, FileText, Briefcase, Save, X, Clock, ChevronDown } from 'lucide-react';
import { selectSettings, setCompanyLocation, setCompanyIcp, setCompanyAbout, setCompanyServices, setCompanyBusinessHours } from '@/store/slices/settingsSlice';
import { useBusinessHours, useUpdateBusinessHours } from '@lad/frontend-features/settings';
import type { BusinessHoursPayload } from '@lad/frontend-features/settings';
interface CompanySettingsProps {
  companyName: string;
  setCompanyName: (name: string) => void;
  companyLogo: string;
  setCompanyLogo: (logo: string) => void;
}
export const CompanySettings: React.FC<CompanySettingsProps> = ({
  companyName: externalCompanyName,
  setCompanyName: setExternalCompanyName,
  companyLogo: externalCompanyLogo,
  setCompanyLogo: setExternalCompanyLogo,
}) => {
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);

  // ── Settings SDK hooks (persist Business Hours to DB) ─────────────────────
  const { data: savedBH } = useBusinessHours();
  const updateBH = useUpdateBusinessHours({
    onSuccess: (data: import('@lad/frontend-features/settings').BusinessHoursRecord) => {
      const summary = bhGetSummary({
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        activeDays: data.activeDays,
      });
      dispatch(setCompanyBusinessHours(summary));
    },
  });

  const [companyData, setCompanyData] = useState({
    companyName: externalCompanyName,
    logo: null as File | null,
    logoPreview: '',
    location: settings.companyLocation || '',
    icp: settings.companyIcp || '',
    about: settings.companyAbout || '',
    businessServices: settings.companyServices || '',
    businessHours: settings.companyBusinessHours || '',
  });

  const [bhData, setBhData] = useState({
    startTime: '09:00',
    endTime: '18:00',
    timezone: 'GST+4',
    activeDays: [0, 1, 2, 3, 4] as number[],
  });

  const [bhTzOpen, setBhTzOpen] = useState(false);
  const [bhDaysOpen, setBhDaysOpen] = useState(false);

  const BH_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const BH_TZ_OPTIONS = [
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

  const bhFmt12 = (val: string) => {
    if (!val) return '12:00 AM';
    const [h, m] = val.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  };

  const bhGetPreset = (days: number[]) => {
    const s = JSON.stringify([...days].sort((a, b) => a - b));
    if (s === JSON.stringify([0, 1, 2, 3, 4])) return 'weekdays';
    if (s === JSON.stringify([0, 1, 2, 3, 4, 5, 6])) return 'all';
    if (s === JSON.stringify([5, 6])) return 'weekend';
    return 'custom';
  };

  const bhToggleDay = (i: number) => {
    setBhData(prev => ({
      ...prev,
      activeDays: prev.activeDays.includes(i)
        ? prev.activeDays.filter(d => d !== i)
        : [...prev.activeDays, i].sort((a, b) => a - b),
    }));
  };

  const bhApplyPreset = (type: string) => {
    if (type === 'weekdays') setBhData(p => ({ ...p, activeDays: [0, 1, 2, 3, 4] }));
    else if (type === 'all') setBhData(p => ({ ...p, activeDays: [0, 1, 2, 3, 4, 5, 6] }));
    else if (type === 'weekend') setBhData(p => ({ ...p, activeDays: [5, 6] }));
    else if (type === 'custom') setBhData(p => ({ ...p, activeDays: [] }));
  };

  const bhGetDayHint = (days: number[]) => {
    const s = [...days].sort((a, b) => a - b);
    if (!s.length) return 'No days selected';
    if (s.length === 7) return 'All 7 days selected';
    if (JSON.stringify(s) === JSON.stringify([0, 1, 2, 3, 4])) return 'Mon – Fri selected';
    if (JSON.stringify(s) === JSON.stringify([5, 6])) return 'Sat – Sun selected';
    return s.map(i => BH_DAYS[i]).join(', ') + ' selected';
  };

  const bhGetSummary = (data: typeof bhData) => {
    const tzOpt = BH_TZ_OPTIONS.find(o => o.value === data.timezone);
    const sorted = [...data.activeDays].sort((a, b) => a - b);
    let dayStr = 'No days';
    if (sorted.length === 7) dayStr = 'All Days';
    else if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) dayStr = 'Mon–Fri';
    else if (JSON.stringify(sorted) === JSON.stringify([5, 6])) dayStr = 'Sat–Sun';
    else dayStr = sorted.map(i => BH_DAYS[i]).join(', ');
    return `${bhFmt12(data.startTime)} – ${bhFmt12(data.endTime)} · ${dayStr} · ${tzOpt?.short ?? ''}`;
  };
  // Sync company name with external prop
  useEffect(() => {
    setCompanyData(prev => ({ ...prev, companyName: externalCompanyName }));
  }, [externalCompanyName]);

  // Seed bhData from server when the query resolves (persists across refreshes)
  useEffect(() => {
    if (savedBH) {
      setBhData({
        startTime: savedBH.startTime,
        endTime: savedBH.endTime,
        timezone: savedBH.timezone,
        activeDays: savedBH.activeDays,
      });
      setCompanyData(prev => ({ ...prev, businessHours: bhGetSummary(savedBH) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedBH]);
  const [isEditing, setIsEditing] = useState({
    companyName: false,
    location: false,
    icp: false,
    about: false,
    businessServices: false,
    businessHours: false,
  });
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCompanyData(prev => ({
        ...prev,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      }));
    }
  };
  const handleInputChange = (field: keyof typeof companyData, value: string) => {
    setCompanyData(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  const toggleEdit = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };
  const handleSaveField = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: false,
    }));
    // Persist to Redux + localStorage
    if (field === 'companyName') {
      setExternalCompanyName(companyData.companyName);
    } else if (field === 'location') {
      dispatch(setCompanyLocation(companyData.location));
    } else if (field === 'icp') {
      dispatch(setCompanyIcp(companyData.icp));
    } else if (field === 'about') {
      dispatch(setCompanyAbout(companyData.about));
    } else if (field === 'businessServices') {
      dispatch(setCompanyServices(companyData.businessServices));
    } else if (field === 'businessHours') {
      dispatch(setCompanyBusinessHours(companyData.businessHours));
    }
  };
  const handleCancelField = (field: keyof typeof isEditing) => {
    setIsEditing(prev => ({
      ...prev,
      [field]: false,
    }));
    // TODO: Reset to original value from server
  };
  const handleKeyDown = (e: React.KeyboardEvent, field: keyof typeof isEditing) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveField(field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelField(field);
    }
  };
  const handleSave = () => {
    // Persist all active edits to Redux
    dispatch(setCompanyLocation(companyData.location));
    dispatch(setCompanyIcp(companyData.icp));
    dispatch(setCompanyAbout(companyData.about));
    dispatch(setCompanyServices(companyData.businessServices));
    dispatch(setCompanyBusinessHours(companyData.businessHours));
    setExternalCompanyName(companyData.companyName);
    setIsEditing({
      companyName: false,
      location: false,
      icp: false,
      about: false,
      businessServices: false,
      businessHours: false,
    });
  };
  return (
    <div className="space-y-6">
      {/* Company Name */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Company Name
          </h2>
          {!isEditing.companyName ? (
            <button
              onClick={() => toggleEdit('companyName')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('companyName')}
              className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.companyName ? (
          <input
            type="text"
            value={companyData.companyName}
            onChange={(e) => handleInputChange('companyName', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'companyName')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957]"
            placeholder="Enter company name"
            autoFocus
          />
        ) : (
          <p className="text-gray-700">{companyData.companyName || 'Not set'}</p>
        )}
      </div>
      {/* Location */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Location
          </h2>
          {!isEditing.location ? (
            <button
              onClick={() => toggleEdit('location')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('location')}
              className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.location ? (
          <input
            type="text"
            value={companyData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'location')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957]"
            placeholder="e.g., San Francisco, CA, USA"
            autoFocus
          />
        ) : (
          <p className="text-gray-700">{companyData.location || 'Not set'}</p>
        )}
      </div>
      {/* ICP (Ideal Customer Profile) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Ideal Customer Profile (ICP)
          </h2>
          {!isEditing.icp ? (
            <button
              onClick={() => toggleEdit('icp')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('icp')}
              className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.icp ? (
          <textarea
            value={companyData.icp}
            onChange={(e) => handleInputChange('icp', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'icp')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957] min-h-[120px]"
            placeholder="Describe your ideal customer profile (e.g., industry, company size, role, pain points)"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{companyData.icp || 'Not set'}</p>
        )}
      </div>
      {/* About Company */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5" />
            About Company
          </h2>
          {!isEditing.about ? (
            <button
              onClick={() => toggleEdit('about')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('about')}
              className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.about ? (
          <textarea
            value={companyData.about}
            onChange={(e) => handleInputChange('about', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'about')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957] min-h-[150px]"
            placeholder="Tell us about your company, mission, and values"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">{companyData.about || 'Not set'}</p>
        )}
      </div>
      {/* Business Services */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Business Services
          </h2>
          {!isEditing.businessServices ? (
            <button
              onClick={() => toggleEdit('businessServices')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={() => handleSaveField('businessServices')}
              className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] text-sm font-medium flex items-center gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              Save
            </button>
          )}
        </div>
        {isEditing.businessServices ? (
          <textarea
            value={companyData.businessServices}
            onChange={(e) => handleInputChange('businessServices', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'businessServices')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957] min-h-[150px]"
            placeholder="List the services or products your company offers"
            autoFocus
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">
            {companyData.businessServices || 'Not set'}
          </p>
        )}
      </div>
      {/* Business Hours */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 text-xl font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Business Hours
          </h2>
          {!isEditing.businessHours ? (
            <button
              onClick={() => toggleEdit('businessHours')}
              className="text-[#0B1957] hover:opacity-75 text-sm font-medium"
            >
              Edit
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {updateBH.isError && (
                <span className="text-xs text-red-500">Save failed — retry?</span>
              )}
              <button
                disabled={updateBH.isPending}
                onClick={() => {
                  const payload: BusinessHoursPayload = {
                    startTime: bhData.startTime,
                    endTime: bhData.endTime,
                    timezone: bhData.timezone,
                    activeDays: bhData.activeDays,
                  };
                  updateBH.mutate(payload, {
                    onSuccess: () => {
                      setCompanyData(prev => ({ ...prev, businessHours: bhGetSummary(bhData) }));
                      setIsEditing(prev => ({ ...prev, businessHours: false }));
                    },
                  });
                }}
                className="px-4 py-1.5 bg-[#0B1957] text-white rounded-lg hover:bg-[#0a1648] disabled:opacity-60 text-sm font-medium flex items-center gap-1"
              >
                <Save className="w-3.5 h-3.5" />
                {updateBH.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
        {isEditing.businessHours ? (
          <div className="space-y-5">
            {/* Operating Hours */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Operating Hours</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">Start Time</label>
                  <input
                    type="time"
                    value={bhData.startTime}
                    onChange={e => setBhData(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957] text-sm font-medium bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1 font-medium">End Time</label>
                  <input
                    type="time"
                    value={bhData.endTime}
                    onChange={e => setBhData(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B1957] focus:border-[#0B1957] text-sm font-medium bg-gray-50"
                  />
                </div>
              </div>
            </div>
            {/* Row 2: Timezone + Active Days side by side */}
            <div className="grid grid-cols-2 gap-3">
              {/* Timezone */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Timezone</p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setBhTzOpen(o => !o); setBhDaysOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium hover:border-gray-300 hover:bg-white transition-all shadow-sm"
                  >
                    <span className="truncate pr-2">{BH_TZ_OPTIONS.find(o => o.value === bhData.timezone)?.short ?? 'Select timezone'}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${bhTzOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {bhTzOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBhTzOpen(false)} />
                      <div className="absolute z-50 bottom-full mb-1.5 w-[320px] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                        {BH_TZ_OPTIONS.map(o => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => { setBhData(p => ({ ...p, timezone: o.value })); setBhTzOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between ${o.value === bhData.timezone ? 'bg-blue-50 text-[#0B1957] font-semibold' : 'text-gray-700 hover:bg-gray-50'
                              }`}
                          >
                            <span>{o.label}</span>
                            {o.value === bhData.timezone && (
                              <svg className="w-4 h-4 text-[#0B1957] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {/* Active Days */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Active Days</p>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setBhDaysOpen(o => !o); setBhTzOpen(false); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium hover:border-gray-300 hover:bg-white transition-all shadow-sm"
                  >
                    <span className="truncate pr-2">
                      {bhGetPreset(bhData.activeDays) === 'weekdays' ? 'Weekdays (Mon–Fri)'
                        : bhGetPreset(bhData.activeDays) === 'all' ? 'All Days'
                          : bhGetPreset(bhData.activeDays) === 'weekend' ? 'Weekends (Sat–Sun)'
                            : bhGetDayHint(bhData.activeDays)}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${bhDaysOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {bhDaysOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setBhDaysOpen(false)} />
                      <div className="absolute right-0 z-50 bottom-full mb-1.5 w-[280px] bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                        {/* Presets */}
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {(['weekdays', 'all', 'weekend', 'custom'] as const).map(preset => (
                            <button
                              key={preset}
                              onClick={() => bhApplyPreset(preset)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${bhGetPreset(bhData.activeDays) === preset
                                ? 'border-[#0B1957] text-[#0B1957] bg-blue-50'
                                : 'border-gray-200 text-gray-500 bg-gray-50 hover:border-gray-400'
                                }`}
                            >
                              {preset === 'weekdays' ? 'Weekdays' : preset === 'all' ? 'All Days' : preset === 'weekend' ? 'Weekends' : 'Custom'}
                            </button>
                          ))}
                        </div>
                        {/* Day grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {BH_DAYS.map((d, i) => (
                            <button
                              key={d}
                              onClick={() => bhToggleDay(i)}
                              className={`h-8 rounded-lg text-[10px] font-semibold border transition-all flex flex-col items-center justify-center gap-0.5 ${bhData.activeDays.includes(i)
                                ? 'border-[#0B1957] text-[#0B1957] bg-blue-50 shadow-sm'
                                : 'border-gray-200 text-gray-400 bg-gray-50 hover:border-gray-400 hover:text-gray-600'
                                }`}
                            >
                              <span>{d}</span>
                              <span className={`w-1 h-1 rounded-full ${bhData.activeDays.includes(i) ? 'bg-[#0B1957]' : 'bg-transparent'}`} />
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">{bhGetDayHint(bhData.activeDays)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="text-lg">📋</span>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Schedule Summary</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5">{bhGetSummary(bhData)}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">
            {companyData.businessHours || 'Not set'}
          </p>
        )}
      </div>

    </div>
  );
};
\n\n