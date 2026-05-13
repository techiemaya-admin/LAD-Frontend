'use client';
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Phone, Globe, Linkedin, Users, Zap, Target, Radio, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SearchResult {
  id?: string;
  companyName?: string;
  name?: string;
  full_name?: string;
  username?: string;
  location?: string;
  phone?: string;
  website?: string;
  linkedinProfile?: string;
  linkedin_url?: string;
  industry?: string;
  employeeCount?: number | string;
  logoUrl?: string;
  logo?: string;
  profileImage?: string;
  companyLogo?: string;
  headline?: string;
  // Intent scoring fields
  buy_intent_score?: number;
  intent_level?: 'high' | 'medium' | 'low';
  score_breakdown?: Record<string, number>;
  module_used?: string;
  // Signal / competitor context
  signal_context?: {
    signal_type?: string;
    urgency?: string;
    post_url?: string;
    posted_at?: string;
  };
  competitor_context?: {
    competitor_name?: string;
    relationship?: string;
    switching_signals?: boolean;
    reasoning?: string;
  };
  [key: string]: any;
}

interface SearchResultsCardsProps {
  results: SearchResult[];
  onCompanyClick?: (company: SearchResult) => void;
  moduleUsed?: string;
  moduleLabel?: string;
}

// Module badge config
const MODULE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  abm:               { label: 'ABM Target',        icon: <Target className="w-3 h-3" />,    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  advanced_search:   { label: 'Multi-Filter',       icon: <TrendingUp className="w-3 h-3" />, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  signal_detection:  { label: 'Intent Signal',      icon: <Radio className="w-3 h-3" />,     color: 'bg-orange-100 text-orange-700 border-orange-200' },
  competitor_intent: { label: 'Competitor Lead',    icon: <Zap className="w-3 h-3" />,       color: 'bg-red-100 text-red-700 border-red-200' },
};

// Intent score bar
function IntentScoreBar({ score, level }: { score: number; level?: string }) {
  const barColor = level === 'high' ? 'bg-green-500' : level === 'medium' ? 'bg-yellow-500' : 'bg-gray-400';
  const labelColor = level === 'high' ? 'text-green-700' : level === 'medium' ? 'text-yellow-700' : 'text-gray-600';
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-xs text-gray-500 w-16 shrink-0">Buy Intent</span>
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${labelColor}`}>{score}</span>
    </div>
  );
}

export default function SearchResultsCards({ results, onCompanyClick, moduleUsed, moduleLabel }: SearchResultsCardsProps) {
  if (!results || results.length === 0) {
    return null;
  }

  const getCompanyName = (result: SearchResult) => {
    return result.companyName || result.full_name || result.name || result.username || 'Unknown';
  };
  const getCompanyLogo = (result: SearchResult) => {
    return result.logoUrl || result.logo || result.profileImage || result.companyLogo;
  };
  const getLinkedInUrl = (result: SearchResult) => {
    return result.linkedinProfile || result.linkedin_url;
  };

  // Determine module from first result if not passed explicitly
  const resolvedModule = moduleUsed || results[0]?.module_used || 'advanced_search';
  const moduleConfig = MODULE_CONFIG[resolvedModule] || MODULE_CONFIG.advanced_search;

  return (
    <div className="mt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Found {results.length} {results.length === 1 ? 'Lead' : 'Leads'}
        </h3>
        <Badge variant="outline" className={`flex items-center gap-1 text-xs px-2 py-1 ${moduleConfig.color}`}>
          {moduleConfig.icon}
          {moduleLabel || moduleConfig.label}
        </Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {results.map((result, index) => {
          const companyName = getCompanyName(result);
          const logo = getCompanyLogo(result);
          const linkedInUrl = getLinkedInUrl(result);
          const hasIntentScore = typeof result.buy_intent_score === 'number';
          const resultModule = result.module_used || resolvedModule;
          const resultModuleConfig = MODULE_CONFIG[resultModule] || moduleConfig;

          return (
            <Card
              key={result.id || index}
              className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 rounded-xl overflow-hidden"
              onClick={() => onCompanyClick?.(result)}
            >
              <CardContent className="p-0">
                {/* Header */}
                <div className="bg-white p-4 border-b border-gray-100">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border-2 border-gray-200 shrink-0">
                      <AvatarImage src={logo} alt={companyName} />
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        <Building2 className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
                        {companyName}
                      </h4>
                      {result.headline && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {result.headline}
                        </p>
                      )}
                      {result.current_company && result.current_company !== companyName && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                          @ {result.current_company}
                        </p>
                      )}
                    </div>
                  </div>
                  {/* Buy Intent Score bar */}
                  {hasIntentScore && (
                    <IntentScoreBar score={result.buy_intent_score!} level={result.intent_level} />
                  )}
                </div>

                {/* Details */}
                <div className="p-3 space-y-2">
                  {/* Module badge per card (only if mixed modules) */}
                  <div className="flex flex-wrap gap-1">
                    {result.module_used && result.module_used !== resolvedModule && (
                      <Badge variant="outline" className={`flex items-center gap-1 text-xs px-1.5 py-0.5 ${resultModuleConfig.color}`}>
                        {resultModuleConfig.icon}
                        {resultModuleConfig.label}
                      </Badge>
                    )}
                    {result.industry && (
                      <Badge variant="outline" className="text-xs font-medium">
                        {result.industry}
                      </Badge>
                    )}
                    {result.intent_level && (
                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold ${
                          result.intent_level === 'high'   ? 'border-green-300 text-green-700 bg-green-50'
                        : result.intent_level === 'medium' ? 'border-yellow-300 text-yellow-700 bg-yellow-50'
                        :                                    'border-gray-300 text-gray-600 bg-gray-50'
                        }`}
                      >
                        {result.intent_level === 'high' ? '🔥 High Intent' : result.intent_level === 'medium' ? '⚡ Medium' : '• Low'}
                      </Badge>
                    )}
                  </div>

                  {/* Location */}
                  {result.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{result.location}</span>
                    </div>
                  )}

                  {/* Signal context */}
                  {result.signal_context?.signal_type && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-600">
                      <Radio className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate capitalize">
                        {result.signal_context.signal_type} signal
                        {result.signal_context.urgency === 'high' ? ' · Urgent' : ''}
                      </span>
                    </div>
                  )}

                  {/* Competitor context */}
                  {result.competitor_context?.competitor_name && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {result.competitor_context.relationship?.replace('_', ' ') || 'uses'} {result.competitor_context.competitor_name}
                        {result.competitor_context.switching_signals ? ' · Switching' : ''}
                      </span>
                    </div>
                  )}

                  {/* Phone */}
                  {result.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{result.phone}</span>
                    </div>
                  )}

                  {/* Employee Count */}
                  {result.employeeCount && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {typeof result.employeeCount === 'number'
                          ? result.employeeCount.toLocaleString()
                          : result.employeeCount}{' '}
                        employees
                      </span>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-gray-100">
                    {result.website && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(result.website, '_blank');
                        }}
                      >
                        <Globe className="w-3.5 h-3.5 text-gray-500" />
                      </Button>
                    )}
                    {linkedInUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(linkedInUrl, '_blank');
                        }}
                      >
                        <Linkedin className="w-3.5 h-3.5 text-blue-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
