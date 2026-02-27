'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  MessageSquare, 
  Handshake, 
  TrendingUp, 
  Calendar, 
  ArrowLeft,
  Mail,
  MapPin,
  ExternalLink,
  Target,
  BarChart2,
  ArrowUpRight,
  Flame
} from 'lucide-react'
import { 
  useMember, 
  useMemberRelationships, 
  useMemberReferrals,
  useMemberRecentActivity,
  useMemberActivityHistory
} from '@lad/frontend-features/community-roi'
import { OutreachAnalysis } from './OutreachAnalysis'
import { EngagementFeed } from './EngagementFeed'
import { ActivityHeatmap } from './ActivityHeatmap'
import { UUID } from '@lad/frontend-features/community-roi/types'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useMemo } from 'react'

interface MemberProfileViewProps {
  memberId: UUID
  onBack: () => void
}

export default function MemberProfileView({ memberId, onBack }: MemberProfileViewProps) {
  const { data: member, isLoading: memberLoading } = useMember(memberId)
  const { data: relationships } = useMemberRelationships(memberId)
  const { data: referrals } = useMemberReferrals(memberId)
  const { activity } = useMemberRecentActivity(memberId)
  const { history } = useMemberActivityHistory(memberId)

  // Calculate dynamic KPIs from member data
  const kpis = useMemo(() => {
    if (!member) return null;

    const meetingsCount = member.total_one_to_ones || 0;
    const referralsGiven = member.total_referrals_given || 0;
    const referralsReceived = member.total_referrals_received || 0;
    const businessValue = member.total_business_inside_aed || 0;

    // Use weightings aligned with BNI Rising Phoenix analysis
    // OTO (15) + RefGiven (25) + RefReceived (10) + Revenue (Value/500)
    const impactScore = Math.floor(
      (meetingsCount * 15) + 
      (referralsGiven * 25) + 
      (referralsReceived * 10) + 
      (businessValue / 500)
    );

    // Network strength based on engagement vs chapter size (simulated 92 members)
    // Formula: (Target 1-to-1s met) + (Referral baseline met)
    const targetOTO = 20; // High benchmark
    const targetRef = 15; // High benchmark
    const networkStrength = Math.min(100, Math.floor(((meetingsCount / targetOTO) * 50) + ((referralsGiven / targetRef) * 50)));

    return {
      meetingsCount,
      referralsGiven,
      referralsReceived,
      businessValue,
      impactScore,
      networkStrength
    };
  }, [member]);

  const lastInteractionDate = useMemo(() => {
    if (!activity?.[0]) return 'No activity yet';
    try {
      return formatDistanceToNow(parseISO(activity[0].created_at), { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  }, [activity]);

  if (memberLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!member) {
      return <div>Member not found</div>
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 rounded-lg border-slate-200 shadow-sm">
            <Mail className="w-4 h-4 text-slate-500" /> Share Insights
          </Button>
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 rounded-lg">
            <Calendar className="w-4 h-4" /> Book 1-to-1
          </Button>
        </div>
      </div>

      {/* Hero Profile Section */}
      <div className="relative">
        <div className="h-48 rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 shadow-2xl" />
        <div className="px-8 -mt-20">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end bg-white/5 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-white to-slate-100 p-1 shadow-2xl ring-4 ring-white/10">
              <div className="w-full h-full bg-slate-50 rounded-[2.4rem] flex items-center justify-center text-5xl font-bold text-slate-300">
                {member.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
            
            <div className="flex-1 pb-2">
              <div className="flex flex-col mb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{member.name}</h1>
                  <Badge className={`${(kpis?.impactScore || 0) > 500 ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'} font-bold px-4 py-1 rounded-full border-none shadow-lg whitespace-nowrap`}>
                    {(kpis?.impactScore || 0) > 500 ? 'Top Contributor' : 'Active Member'}
                  </Badge>
                  {member.current_streak > 0 && (
                    <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse border border-orange-200">
                      <Flame className="w-4 h-4 fill-orange-500 animate-bounce" />
                      {member.current_streak} Day Streak
                    </div>
                  )}
                </div>
                <p className="text-2xl font-semibold text-slate-500 tracking-tight mt-1">({member.company_name || 'BNI Rising Phoenix'})</p>
              </div>
              <div className="flex flex-wrap gap-6 text-slate-400 font-medium text-sm">
                <span className="flex items-center gap-2.5"><Target className="w-4 h-4 text-slate-300" /> {member.designation || 'Member'}</span>
                <span className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-slate-300" /> Dubai, UAE</span>
                <span className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-slate-300" /> {member.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-4 pb-2">
              <Button variant="outline" size="icon" className="w-14 h-14 bg-white border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                <ExternalLink className="w-6 h-6" />
              </Button>
              <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-1">
                Book 1-to-1
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Metrics - High Fidelity Fin-Style Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 px-4">
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 mb-1">
            <Handshake className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Referrals Given</span>
          <span className="text-4xl font-bold text-emerald-600">+{kpis?.referralsGiven || 0}</span>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-50/50 px-3 py-1 rounded-full">
            <ArrowUpRight className="w-3.5 h-3.5" /> 12% vs last month
          </div>
        </div>
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 mb-1">
            <Users className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Meetings Logged</span>
          <span className="text-4xl font-bold text-blue-600">+{kpis?.meetingsCount || 0}</span>
          <Badge variant="outline" className="text-[10px] font-semibold uppercase px-3 py-0.5 text-slate-400 border-slate-200">Target: 20+</Badge>
        </div>
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Growth Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-orange-500 italic">{member?.current_streak || 0}</span>
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse group-hover:scale-125 transition-transform" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase">Best: {member?.max_streak || 0}</span>
        </div>
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900 mb-1">
            <TrendingUp className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Business Value</span>
          <span className="text-4xl font-bold text-slate-900">AED {(kpis?.businessValue || 0).toLocaleString()}</span>
          <span className="text-[11px] font-medium text-slate-400 italic">Net Generated Impact</span>
        </div>
        <div className="bg-blue-600 rounded-[2rem] p-8 shadow-2xl shadow-blue-200 flex flex-col items-center justify-center text-center space-y-2 hover:scale-[1.02] transition-all">
          <div className="p-2.5 rounded-xl bg-white/10 text-blue-100 mb-1">
            <Target className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-blue-100/80 uppercase tracking-widest">Total Impact Score</span>
          <span className="text-5xl font-bold text-white tracking-tight">{kpis?.impactScore || 0}</span>
          <div className="text-[11px] font-bold text-blue-200 uppercase tracking-tighter">Elite Member Status</div>
        </div>
      </div>

      {/* Contribution Report / Heatmap Section */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden bg-white">
        <CardHeader className="p-8 pb-0 border-none">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">Contribution Report</CardTitle>
              <CardDescription className="text-slate-500 font-medium text-base">Weekly engagement footprint and revenue impact analysis</CardDescription>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Segment</span>
                <span className="text-sm font-bold text-slate-700">All Communities</span>
              </div>
              <div className="px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</span>
                <span className="text-sm font-bold text-slate-700">Last 12 Months</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 pt-10">
          <ActivityHeatmap data={history || []} member={member} />
        </CardContent>
      </Card>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
        
        {/* Main Column - Insights & Analytics */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Outreach Analysis Component */}
          <OutreachAnalysis memberId={memberId} />

          {/* Engagement Overview / Recent Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-[1.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-md font-bold flex items-center justify-between">
                  Latest Referral
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-100">Success</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {referrals?.[0] ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="font-bold text-slate-900 mb-1">{referrals[0].business_type || 'Business Referral'}</p>
                      <p className="text-sm text-slate-500 line-clamp-2">Value: AED {(referrals[0].estimated_value_aed || 0).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-400">Referred to</span>
                      <span className="text-blue-600">Network Member</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-slate-400 text-sm italic">
                    No referrals yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-slate-100 shadow-sm overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50">
                <CardTitle className="text-md font-bold flex items-center justify-between">
                  Member Type
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100 uppercase tracking-tighter">Premium</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <span className="font-medium text-slate-700">BNI Rising Phoenix</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-slate-500 italic">WhatsApp Group: UAE Founders</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-slate-500 italic">LinkedIn Connection</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar - Feed & More */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Quick Actions / Bio */}
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Member Insights</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {member.name} is a {kpis?.impactScore && kpis.impactScore > 500 ? 'leading contributor' : 'dedicated member'} within the {member.company_name} ecosystem. 
                  Maintaining a network strength of {kpis?.networkStrength || 0}%, they have generated approximately 
                  AED {(kpis?.businessValue || 0).toLocaleString()} in business value through {kpis?.referralsGiven || 0} referrals.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Join Date</span>
                  <span className="text-slate-900 font-black">{new Date(member.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Last Interaction</span>
                  <span className="text-slate-900 font-black">{lastInteractionDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Feed Component */}
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
            <CardContent className="p-8">
              <EngagementFeed memberId={memberId} />
            </CardContent>
          </Card>

          {/* Community Health / Badge Section from screenshot */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/40 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div>
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Network Health</h4>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black">{kpis?.networkStrength || 0}</span>
                  <span className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-widest">
                    {(kpis?.networkStrength || 0) > 85 ? 'Excellent' : (kpis?.networkStrength || 0) > 60 ? 'Good' : 'Growing'}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${kpis?.networkStrength || 0}%` }} />
              </div>
              <p className="text-white/60 text-xs font-medium leading-relaxed">
                This member is currently in the {(kpis?.impactScore || 0) > 700 ? 'top 5%' : 'top 20%'} of community contributors based on cross-platform engagement and revenue generation.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
