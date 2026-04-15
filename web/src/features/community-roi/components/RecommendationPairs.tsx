'use client';

import React, { useState } from 'react';
import { Search, X, ChevronDown, Send } from 'lucide-react';
import { useGenerateBulkRecommendations, useListMembers } from '@lad/frontend-features/community-roi';
import MessageTemplateSender from './MessageTemplateSender';

interface RecommendationPair {
  member_a: string;
  member_b: string;
  member_a_company?: string;
  member_b_company?: string;
  industry_a?: string;
  industry_b?: string;
  score: number;
  reason: string;
  combination_type: number;
}

interface WeekData {
  week_number: number;
  pairs: RecommendationPair[];
}

interface GenerateResult {
  success: boolean;
  totalPairs: number;
  totalMembers: number;
  weeks: WeekData[];
  error?: string;
}

function initials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#14B8A6'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'md' }) => (
  <div
    className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[11px]'}`}
    style={{ backgroundColor: avatarColor(name) }}
    title={name}
  >
    {initials(name)}
  </div>
);

const IndustryTag: React.FC<{ industry?: string }> = ({ industry }) => {
  if (!industry) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium truncate max-w-[120px]">
      {industry}
    </span>
  );
};

const MemberOptionCard: React.FC<{ memberA: string; industryA?: string; options: RecommendationPair[]; index: number }> = ({ memberA, industryA, options, index }) => {
  const [selectedOption, setSelectedOption] = React.useState(0);
  const selected = options[selectedOption];
  const isReferral = selected?.combination_type === 2;

  return (
    <div className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* Index */}
      <span className="text-xs font-bold text-slate-300 w-5 flex-shrink-0 text-center">{index + 1}</span>

      {/* Member A (Left side - fixed) */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-[180px]">
        <Avatar name={memberA} />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{memberA}</p>
          <IndustryTag industry={industryA} />
        </div>
      </div>

      {/* Dropdown with 3 options (Right side) */}
      <div className="flex-1 ml-auto">
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(Number(e.target.value))}
          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 hover:border-indigo-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none bg-no-repeat bg-right pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23334155' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 0.5rem center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {options.map((option, idx) => (
            <option key={idx} value={idx}>
              {option.member_b} ({option.score}) {option.combination_type === 2 ? '⭐' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Member B info */}
      {selected && (
        <div className="flex items-center gap-3 flex-shrink-0 min-w-[200px] justify-end">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full bg-indigo-500">{selected.score}</span>
              {isReferral && (
                <span className="text-[9px] font-semibold text-yellow-600 bg-yellow-50 border border-yellow-200 px-1.5 py-0.5 rounded">
                  Has Referral
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate mt-1">{selected.member_b}</p>
            <IndustryTag industry={selected.industry_b} />
          </div>
          <Avatar name={selected.member_b} />
        </div>
      )}
    </div>
  );
};

// ── Week selector options ────────────────────────────────────────────────────
const WEEK_OPTIONS = [1, 2, 3, 4, 6, 8, 12];

export const RecommendationPairs: React.FC = () => {
  const { generate, isGenerating, result, error } = useGenerateBulkRecommendations();
  const { members } = useListMembers();
  const data = result as GenerateResult | null;
  const [activeWeek, setActiveWeek] = useState(1);
  const [selectedWeeks, setSelectedWeeks] = useState(2);
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [showMessageSender, setShowMessageSender] = useState(false);

  const weekData = data?.weeks?.find(w => w.week_number === activeWeek);

  const handleGenerate = () => {
    generate(selectedWeeks);
    setActiveWeek(1);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 hover:text-slate-800"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <ChevronDown 
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
            />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">1-to-1 Meeting Recommendations</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Each member gets top 3 personalized options per week based on industry synergy and interaction history.
            </p>
          </div>
        </div>

        {/* Controls: week selector + generate button */}
        <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Week count selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Next</span>
            <select
              value={selectedWeeks}
              onChange={e => setSelectedWeeks(Number(e.target.value))}
              disabled={isGenerating}
              className="text-sm font-semibold text-slate-800 bg-transparent border-none outline-none cursor-pointer disabled:opacity-60"
            >
              {WEEK_OPTIONS.map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'week' : 'weeks'}</option>
              ))}
            </select>
          </div>

          {/* Send Messages button (only show if data exists) */}
          {data?.success && (
            <button
              onClick={() => setShowMessageSender(true)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Send Messages
            </button>
          )}

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating&hellip;
              </>
            ) : data ? 'Regenerate' : 'Generate Recommendations'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {/* Error */}
          {(error || (data && !data.success)) && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-600">{(error as any)?.message ?? data?.error ?? 'Failed to generate.'}</p>
            </div>
          )}

          {/* Empty state */}
          {!data && !isGenerating && !error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">🤝</div>
              <div>
                <p className="text-sm font-semibold text-slate-700">No recommendations yet</p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Select how many weeks ahead to plan, then click <strong>Generate Recommendations</strong>.
                  Each member gets 3 personalized 1-to-1 options per week based on industry synergy.
                </p>
              </div>
            </div>
          )}

          {/* Generating */}
          {isGenerating && (
            <div className="flex items-center justify-center py-16 gap-3">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Analysing industries and building conflict-free pairs&hellip;</span>
            </div>
          )}

          {/* Results */}
        {data?.success && !isGenerating && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-indigo-700">{data.totalPairs}</p>
                <p className="text-xs text-indigo-500 font-medium mt-0.5">Total recommendations ({data.weeks?.length} weeks)</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{data.totalMembers}</p>
                <p className="text-xs text-emerald-500 font-medium mt-0.5">Members with options</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-700">
                  {data.weeks?.reduce((sum, w) => sum + w.pairs.filter(p => p.combination_type === 2).length, 0)}
                </p>
                <p className="text-xs text-yellow-600 font-medium mt-0.5">With referral exist</p>
              </div>
            </div>

            {/* Week tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {data.weeks?.map(w => (
                <button
                  key={w.week_number}
                  onClick={() => setActiveWeek(w.week_number)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    activeWeek === w.week_number
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Week {w.week_number}
                  <span className={`ml-1.5 text-xs ${activeWeek === w.week_number ? 'text-indigo-200' : 'text-slate-400'}`}>
                    ({w.pairs.length} options)
                  </span>
                </button>
              ))}
            </div>

            {/* Search Filter */}
            <div className="mb-6 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 pl-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded transition-colors text-slate-400 hover:text-slate-600"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

      {/* Pairs for selected week */}
            {weekData?.pairs?.length ? (
              <div className="flex flex-col gap-2">
                {Array.from(
                  weekData.pairs.reduce((map, pair) => {
                    const key = pair.member_a;
                    if (!map.has(key)) {
                      map.set(key, []);
                    }
                    map.get(key)!.push(pair);
                    return map;
                  }, new Map<string, RecommendationPair[]>())
                )
                  .filter(([memberA]) => 
                    memberA.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(([memberA, options], index) => {
                    const first = options[0];
                    return (
                      <MemberOptionCard
                        key={memberA}
                        memberA={memberA}
                        industryA={first?.industry_a}
                        options={options.slice(0, 3)}
                        index={index}
                      />
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-8">
                {searchQuery ? 'No members match your search.' : 'No options for this week.'}
              </p>
            )}
          </>
        )}
        </div>
      )}

      {/* Message Sender Modal */}
      {showMessageSender && data?.success && (
        <MessageTemplateSender
          memberName={data?.weeks?.[0]?.pairs?.[0]?.member_a || 'Member'}
          noInteractionCount={0}
          recommendations={data?.weeks?.flatMap(w => w.pairs) || []}
          allMembers={members || []}
          onClose={() => setShowMessageSender(false)}
          onSuccess={(result) => {
            console.log('Messages sent:', result);
            setShowMessageSender(false);
          }}
        />
      )}
    </div>
  );
};

export default RecommendationPairs;
