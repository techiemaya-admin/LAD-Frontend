 "use client";

// import { useEffect, useMemo, useState } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Progress } from '@/components/ui/progress';
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// import Header from '@/components/Header';
// import { SignedIn, SignedOut, RedirectToSignIn, useAuth } from '@clerk/nextjs';


// type BackendCallLog = {
//   id: string;
//   from: string;
//   to: string;
//   startedAt: string;
//   status: string;
//   recordingUrl?: string;
//   timeline?: Array<{ t: string; title: string; desc?: string }>;
// };

// type PhoneNumber = {
//   id: string;
//   e164: string;
//   label?: string;
//   provider?: string;
//   sid?: string;
//   account?: string;
// };

// export default function DashboardPage() {
//   const [minutesLeft] = useState(193); // 3h 13m ≈ 193 minutes
//   const [calls, setCalls] = useState<BackendCallLog[]>([]);
//   const [countToday, setCountToday] = useState(0);
//   const [countThisMonth, setCountThisMonth] = useState(0);
//   const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
//   const [answerRate, setAnswerRate] = useState<number>(0);
//   const [objectiveAchieved, setObjectiveAchieved] = useState<number>(0);
//   // local auth: redirect to /login if not authenticated

//   const chartData = useMemo(() => {
//     const counts = new Map<string, number>();
//     for (const c of calls) {
//       const d = new Date(c.startedAt);
//       if (isNaN(d.getTime())) continue;
//       const key = d.toISOString().slice(0, 10);
//       counts.set(key, (counts.get(key) || 0) + 1);
//     }
//     const arr = Array.from(counts.entries())
//       .map(([key, count]) => {
//         const display = new Date(key).toLocaleDateString();
//         return { dateKey: key, date: display, calls: count };
//       })
//       .sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0));
//     return arr;
//   }, [calls]);

//   const chartRangeLabel = useMemo(() => {
//     if (!chartData.length) return undefined;
//     const first = chartData[0].date;
//     const last = chartData[chartData.length - 1].date;
//     return `From ${first} to ${last}`;
//   }, [chartData]);

//   const normalizeE164 = (v?: string) => {
//     if (!v) return undefined;
//     const s = v.replace(/[\s\-()]/g, '');
//     return s;
//   };

//   useEffect(() => {
//     const syncUser = async () => {
//       try {
//         let token: string | null | undefined = null;
//         for (let i = 0; i < 10; i++) {
//           token = await getToken({ template: 'backend' });
//           if (!token) token = await getToken();
//           if (token) break;
//           await new Promise((r) => setTimeout(r, 300));
//         }
//         if (!token) {
//           console.warn('Clerk token not available yet; skipping sync');
//           return;
//         }
//         const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
//         console.log('Syncing user with backend at', `${apiBase}/api/auth/login`);
//         await fetch(`${apiBase}/api/auth/login`, {
//           method: 'POST',
//           headers: { Authorization: `Bearer ${token}` },
//           credentials: 'include',
//         });
//       } catch {}
//     };
//     syncUser();
//   }, [getToken, isSignedIn]);

//   const numbersByE164 = useMemo(() => {
//     const m = new Map<string, PhoneNumber>();
//     for (const n of numbers) {
//       const key = normalizeE164(n.e164);
//       if (key) m.set(key, n);
//     }
//     return m;
//   }, [numbers]);

//   const numbersById = useMemo(() => {
//     const m = new Map<string, PhoneNumber>();
//     for (const n of numbers) m.set(n.id, n);
//     return m;
//   }, [numbers]);

//   const resolvePhoneNumber = (value?: string): PhoneNumber | undefined => {
//     if (!value) return undefined;
//     const norm = normalizeE164(value);
//     if (norm) {
//       const byE = numbersByE164.get(norm);
//       if (byE) return byE;
//     }
//     const direct = numbersById.get(value);
//     if (direct) return direct;
//     const m1 = value.match(/^mock_from_by_(.+)$/);
//     const id1 = m1?.[1];
//     if (id1) {
//       const byId1 = numbersById.get(id1);
//       if (byId1) return byId1;
//     }
//     const m2 = value.match(/(pn_[a-zA-Z0-9]+)/);
//     const id2 = m2?.[1];
//     if (id2) {
//       const byId2 = numbersById.get(id2);
//       if (byId2) return byId2;
//     }
//     return undefined;
//   };

//   useEffect(() => {
//     const fetchLogs = async () => {
//       try {
//         const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
//         const res = await fetch(`${apiBase}/api/calllogs?limit=10`);
//         if (!res.ok) return;
//         const data = await res.json();
//         const rows: any[] = data?.logs || data?.items || [];
//         const mapped: BackendCallLog[] = rows.map((r: any) => ({
//           id: String(r.id ?? r.call_id ?? r.uuid ?? crypto.randomUUID()),
//           from: r.from ?? r.from_number ?? r.fromnum ?? r.source ?? r.voice ?? r.agent_name ?? '-',
//           to: r.to ?? r.to_number ?? r.tonum ?? r.target ?? r.lead_name ?? '-',
//           startedAt: r.startedAt ?? r.started_at ?? r.created_at ?? r.createdAt ?? r.start_time ?? r.timestamp ?? '',
//           status: r.status ?? r.call_status ?? r.result ?? 'unknown',
//           recordingUrl: r.recordingUrl ?? r.call_recording_url ?? r.recording_url ?? undefined,
//         }));
//         setCalls(mapped);

//         const now = new Date();
//         const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
//         const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

//         const today = mapped.filter(i => new Date(i.startedAt) >= startOfToday).length;
//         const month = mapped.filter(i => new Date(i.startedAt) >= startOfMonth).length;
//         setCountToday(today);
//         setCountThisMonth(month);
//       } catch (e) {}
//     };
//     fetchLogs();
//   }, []);

//   useEffect(() => {
//     const loadNumbers = async () => {
//       try {
//         const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
//         const res = await fetch(`${apiBase}/api/voiceagents/numbers`);
//         if (!res.ok) return;
//         const data = await res.json();
//         setNumbers(data?.numbers || data?.items || []);
//       } catch (e) {}
//     };
//     loadNumbers();
//   }, []);

//   useEffect(() => {
//     const loadMetrics = async () => {
//       try {
//         const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';
//         const res = await fetch(`${apiBase}/api/metrics`);
//         if (!res.ok) return;
//         const data = await res.json();
//         if (typeof data?.answerRate === 'number') setAnswerRate(data.answerRate);
//         if (typeof data?.objectiveAchieved === 'number') setObjectiveAchieved(data.objectiveAchieved);
//       } catch (e) {}
//     };
//     loadMetrics();
//   }, []);

//   return (
//     <>
//       <SignedOut>
//         <RedirectToSignIn />
//       </SignedOut>
//       <SignedIn>
//         <div className="flex min-h-screen bg-background">
//           {/* Main Content */}
//           <main className="flex-1 p-6 space-y-6">
//             {/* Header */}
//             <Header />

//             {/* Metrics Cards */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Calls (today)</CardTitle>
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
//                 <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{countToday}</div>
//               <p className="text-xs text-muted-foreground">0% compared to yesterday</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Answer rate (this week)</CardTitle>
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
//                 <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
//                 <polyline points="22,4 12,14.01 9,11.01" />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{answerRate}%</div>
//               <p className="text-xs text-muted-foreground">-3% compared to previous week</p>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">Calls made (this month)</CardTitle>
//               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground">
//                 <path d="M12 2v20M2 12h20"  />
//               </svg>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{countThisMonth}</div>
//               <p className="text-xs text-muted-foreground">100% compared to same period last mo.</p>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Chart and Next Steps */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader>
//               <CardTitle>Calls made</CardTitle>
//               <CardDescription>{chartRangeLabel || 'No data yet'}</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <ResponsiveContainer width="100%" height={300}>
//                 <LineChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" />
//                   <XAxis dataKey="date" />
//                   <YAxis />
//                   <Tooltip />
//                   <Legend />
//                   <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} />
//                 </LineChart>
//               </ResponsiveContainer>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Next steps</CardTitle>
//               <CardDescription>Follow these steps to get started with your new account.</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex items-center space-x-2">
//                 <Badge variant="default">✓</Badge>
//                 <span>Take platform tour</span>
//                 <Button variant="outline" size="sm" className="ml-auto">Click here</Button>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <Badge variant="outline">📞+</Badge>
//                 <span>Rent phone number</span>
//                 <p className="text-sm text-muted-foreground ml-6">You will assign this phone number to your agents to start making calls.</p>
//                 <Button variant="outline" size="sm" className="ml-auto">Next</Button>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         {/* Objective and Latest Calls */}
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           <Card>
//             <CardHeader>
//               <CardTitle>Objective achieved</CardTitle>
//               <CardDescription>From 04/08/2023 to 10/08/2023</CardDescription>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="flex items-center justify-between">
//                 <span className="text-sm font-medium">{objectiveAchieved}%</span>
//                 <Progress value={objectiveAchieved} className="w-1/2" />
//               </div>
//               <div className="flex items-center justify-between text-sm">
//                 <span>Minutes left</span>
//                 <span className="font-medium">3h 13m 59s</span>
//               </div>
//               <div className="flex space-x-2">
//                 <Button variant="outline" size="sm">Change plan</Button>
//                 <Button variant="outline" size="sm">Add credits</Button>
//               </div>
//             </CardContent>
//           </Card>

//           <Card>
//             <CardHeader>
//               <CardTitle>Latest calls</CardTitle>
//               <CardDescription>Here are the latest calls AI assistants has made</CardDescription>
//             </CardHeader>
//             <CardContent>
//               <div className="border rounded-md p-1 mb-4">
//                 <div className="flex space-x-1">
//                   <Button variant="ghost" size="sm" className="h-8 px-2">Status</Button>
//                   <Button variant="ghost" size="sm" className="h-8 px-2">Client phone number</Button>
//                   <Button variant="ghost" size="sm" className="h-8 px-2">Duration</Button>
//                   <Button variant="ghost" size="sm" className="h-8 px-2">Assistant</Button>
//                   <Button variant="ghost" size="sm" className="h-8 px-2">Date</Button>
//                 </div>
//               </div>
//               <Table>
//                 <TableHeader>
//                   <TableRow>
//                     <TableHead>Status</TableHead>
//                     <TableHead>Client phone number</TableHead>
//                     <TableHead>Duration</TableHead>
//                     <TableHead>Assistant</TableHead>
//                     <TableHead>Date</TableHead>
//                   </TableRow>
//                 </TableHeader>
//                 <TableBody>
//                   {calls.map((call) => {
//                     const started = new Date(call.startedAt);
//                     const dateStr = isNaN(started.getTime()) ? '-' : started.toLocaleString();
//                     let duration = '-';
//                     if (call.timeline && call.timeline.length >= 2) {
//                       const start = new Date(call.timeline[0].t).getTime();
//                       const end = new Date(call.timeline[call.timeline.length - 1].t).getTime();
//                       const secs = Math.max(0, Math.round((end - start) / 1000));
//                       duration = secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
//                     }
//                     return (
//                       <TableRow key={call.id}>
//                         <TableCell>
//                           <Badge variant={call.status === 'completed' ? 'default' : 'secondary'}>
//                             {call.status}
//                           </Badge>
//                         </TableCell>
//                         <TableCell>{call.to}</TableCell>
//                         <TableCell>{duration}</TableCell>
//                         <TableCell>{(() => { const pn = resolvePhoneNumber(call.from); return pn?.label || pn?.e164 || call.from || '—'; })()}</TableCell>
//                         <TableCell>{dateStr}</TableCell>
//                       </TableRow>
//                     );
//                   })}
//                 </TableBody>
//               </Table>
//             </CardContent>
//           </Card>
//           </div>
//           </main>
//         </div>
//       </SignedIn>
//     </>
//   );
// }



"use client";

// External libraries
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Custom Components
import { VoiceAgentHighlights } from "@/components/settings/VoiceAgentHighlights";
import { CreditsHighlightCard } from "@/components/settings/CreditsHighlightCard";

// Utilities
import { apiGet } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { safeStorage } from "@/utils/storage";
import { getApiBaseUrl } from "@/lib/api-utils";

  
  
  type BackendCallLog = {
  id: string;
  from: string;
  to: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  recordingUrl?: string;
  timeline?: Array<{ t: string; title: string; desc?: string }>;
  agentName?: string;
  leadName?: string;
};

type PhoneNumber = {
  id: string;
  e164: string;
  label?: string;
  provider?: string;
  sid?: string;
  account?: string;
};

const DAYS_RANGE = 30;

interface CreditsData {
  balance: number;
  usageThisMonth: number;
  usageTrend: number[];
  lastUpdated: string;
  totalMinutes: number;
  remainingMinutes: number;
}

export default function DashboardPage() {
  const [minutesLeft] = useState(193);
  const [calls, setCalls] = useState<BackendCallLog[]>([]);
  const [countToday, setCountToday] = useState(0);
  const [countThisMonth, setCountThisMonth] = useState(0);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [answerRate, setAnswerRate] = useState<number>(0);
  const [objectiveAchieved, setObjectiveAchieved] = useState<number>(0);
  const [chartMode, setChartMode] = useState<"month" | "year">("month");
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);
  const router = useRouter();

  // Fetch credits data from the API
  const fetchCredits = useCallback(async () => {
    try {
      setIsLoadingCredits(true);
      const token = safeStorage.getItem('auth_token') || safeStorage.getItem('token');
      if (!token) {
        // No token available, skip fetch
        return;
      }

      // Use apiGet utility which handles auth headers and error handling
      const userData = await apiGet<{
        balance?: number;
        credit_balance?: number;
        credits?: number;
        monthly_usage?: number;
        [key: string]: any;
      }>('/api/auth/me');
      
      // Get the balance from the user data (adjust these property names based on your API response)
      const balance = userData.balance || userData.credit_balance || userData.credits || 0;
      const usageThisMonth = userData.monthly_usage || 0;
      
      // Calculate derived values
      const totalMinutes = balance * 3.7; // 1 credit = 3.7 minutes (adjust as needed)
      const remainingMinutes = totalMinutes * (1 - (usageThisMonth / 100));
      
      // Generate a usage trend (you can replace this with actual data if available)
      const usageTrend = [
        Math.max(0, usageThisMonth - 30),
        Math.max(0, usageThisMonth - 20),
        Math.max(0, usageThisMonth - 10),
        usageThisMonth
      ];

      setCreditsData({
        balance,
        usageThisMonth,
        usageTrend,
        lastUpdated: new Date().toISOString(),
        totalMinutes,
        remainingMinutes,
      });
    } catch (error: any) {
      // Set to zero if API fails - error is already logged by apiGet utility
      setCreditsData({
        balance: 0,
        usageThisMonth: 0,
        usageTrend: [0, 0, 0, 0],
        lastUpdated: new Date().toISOString(),
        totalMinutes: 0,
        remainingMinutes: 0,
      });
    } finally {
      setIsLoadingCredits(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // local auth: redirect to /login if not authenticated
  useEffect(() => {
    const check = async () => {
      try {
        // Small delay to allow localStorage to be set from login
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Get token from storage
        const token = safeStorage.getItem('token');
        
        if (!token) {
          router.push('/login');
          return;
        }
        
        // Verify token with backend using apiGet utility
        try {
          await apiGet('/api/auth/me');
          // Token is valid, user is authenticated
        } catch (error: any) {
          // Token invalid or network error
          if (error?.message?.includes('401') || error?.message?.includes('403')) {
            safeStorage.removeItem('auth_token');
            safeStorage.removeItem('token');
            router.push('/login');
          }
          // For network errors, keep user on dashboard (don't redirect)
        }
      } catch (error) {
        // Don't redirect on unexpected errors, let user stay on dashboard
      }
    };
    check();
  }, [router]);

  // NEW: control how many calls are visible in the table
  const [showAllCalls, setShowAllCalls] = useState(false);
  const VISIBLE_DEFAULT = 5;
  const visibleCalls = useMemo(
    () => (showAllCalls ? calls : calls.slice(0, VISIBLE_DEFAULT)),
    [calls, showAllCalls]
  );

  const normalizeE164 = (v?: string) =>
    typeof v === "string" ? v.replace(/[\s\-()]/g, "") : undefined;

  // removed Clerk sync

  // maps for resolving numbers
  const numbersByE164 = useMemo(() => {
    const m = new Map<string, PhoneNumber>();
    for (const n of numbers) {
      const key = normalizeE164(n.e164);
      if (key) m.set(key, n);
    }
    return m;
  }, [numbers]);

  const numbersById = useMemo(() => {
    const m = new Map<string, PhoneNumber>();
    for (const n of numbers) m.set(String(n.id), n);
    return m;
  }, [numbers]);

  const resolvePhoneNumber = (value?: any): PhoneNumber | undefined => {
    if (value == null) return undefined;

    const valueStr = String(value);

    // 1) direct id lookup
    const direct = numbersById.get(valueStr);
    if (direct) return direct;

    // 2) normalized E.164 lookup
    const norm = normalizeE164(valueStr);
    if (norm) {
      const byE = numbersByE164.get(norm);
      if (byE) return byE;
    }

    // 3) pattern-based fallbacks
    const m1 = valueStr.match(/^mock_from_by_(.+)$/);
    const id1 = m1?.[1];
    if (id1) {
      const byId1 = numbersById.get(id1);
      if (byId1) return byId1;
    }

    const m2 = valueStr.match(/(pn_[a-zA-Z0-9]+)/);
    const id2 = m2?.[1];
    if (id2) {
      const byId2 = numbersById.get(id2);
      if (byId2) return byId2;
    }

    return undefined;
  };

  // fetch call logs for last 30 days
  // useEffect(() => {
  //   const fetchLogs = async () => {
  //     try {
  //       const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002";
  //       const since = new Date();
  //       since.setDate(since.getDate() - (DAYS_RANGE - 1));
  //       const res = await fetch(
  //         `${apiBase}/api/calllogs?since=${encodeURIComponent(since.toISOString())}&limit=1000`
  //       );
  //       if (!res.ok) return;
  //       const data = await res.json();
  //       const rows: any[] = data?.logs || data?.items || [];
  //       const mapped: BackendCallLog[] = rows.map((r: any) => ({
  //         id: String(r.id ?? r.call_id ?? r.uuid ?? crypto.randomUUID()),
  //         from:
  //           r.from ??
  //           r.from_number ??
  //           r.fromnum ??
  //           r.source ??
  //           r.from_number_id ??
  //           "-",
  //         to: r.to ?? r.to_number ?? r.tonum ?? r.target ?? r.lead_name ?? "-",
  //         startedAt:
  //           r.startedAt ?? r.started_at ?? r.created_at ?? r.createdAt ?? r.start_time ?? r.timestamp ?? "",
  //         endedAt: r.endedAt ?? r.ended_at ?? r.end_time ?? undefined,
  //         status: r.status ?? r.call_status ?? r.result ?? "unknown",
  //         recordingUrl: r.recordingUrl ?? r.call_recording_url ?? r.recording_url ?? undefined,
  //         timeline: r.timeline,
  //         agentName: r.agent_name ?? r.agent ?? r.voice ?? undefined,
  //         leadName: r.lead_name ?? r.client_name ?? r.customer_name ?? undefined,
  //       }));
  //       setCalls(mapped);

  //       const now = new Date();
  //       const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  //       const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  //       setCountToday(mapped.filter(i => new Date(i.startedAt) >= startOfToday).length);
  //       setCountThisMonth(mapped.filter(i => new Date(i.startedAt) >= startOfMonth).length);
  //     } catch {}
  //   };
  //   fetchLogs();
  // }, []);
  

// fetch call logs with the same role-based logic as CallLogsPage
useEffect(() => {
  async function loadDashboardCallLogs() {
    let qs = `?limit=100`;

    // 🔐 figure out role, org, userId (architecture-compliant: use user.id from core platform)
    try {
      const meAny: any = await getCurrentUser().catch(() => null);
      const role: string | undefined = meAny?.role || meAny?.user?.role;
      // Use user.id (UUID) from core platform response
      const userId = meAny?.user?.id || meAny?.id;
      const orgId: string | undefined =
        meAny?.tenantId || meAny?.user?.tenantId || meAny?.organizationId;

      if (role && /^dev$/i.test(role)) {
        // dev → see everything (no extra filters)
      } else if (role && /^admin$/i.test(role)) {
        // admin → filter by organization
        if (orgId)
          qs += `&organizationId=${encodeURIComponent(orgId)}`;
      } else {
        // co_admin / user → only their own calls
        if (userId) {
          qs += `&initiatedByIds=${encodeURIComponent(userId)}`;
        }
      }
    } catch {
      // ignore and just use ?limit=100
    }

    try {
      // Updated to use voice-agent feature route
      const res = await apiGet<{ success: boolean; logs: any[] }>(
        `/api/voice-agent/calls${qs}`
      );

      const rows: any[] = res.logs || [];
      const mapped: BackendCallLog[] = rows.map((r: any) => ({
        id: String(r.id ?? r.call_id ?? r.uuid ?? crypto.randomUUID()),
        from:
          r.agent ||
          r.initiated_by ||
          r.from ||
          r.from_number ||
          r.fromnum ||
          r.source ||
          r.from_number_id ||
          "-",
        to:
          r.target ||
          r.to ||
          r.to_number ||
          r.tonum ||
          r.lead_name ||
          "-",
        startedAt:
          r.startedAt ||
          r.started_at ||
          r.created_at ||
          r.createdAt ||
          r.start_time ||
          r.timestamp ||
          "",
        endedAt: r.endedAt ?? r.ended_at ?? r.end_time ?? undefined,
        status: r.status || r.call_status || r.result || "unknown",
        recordingUrl:
          r.recordingUrl ??
          r.call_recording_url ??
          r.recording_url ??
          undefined,
        timeline: r.timeline,
        agentName: r.agent_name ?? r.agent ?? r.voice ?? undefined,
        leadName:
          r.lead_name ?? r.client_name ?? r.customer_name ?? undefined,
      }));

      setCalls(mapped);

      // 📊 update today / this month counts from these logs
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setCountToday(
        mapped.filter((i) => new Date(i.startedAt) >= startOfToday).length
      );
      setCountThisMonth(
        mapped.filter((i) => new Date(i.startedAt) >= startOfMonth).length
      );
    } catch {
      // silently ignore errors for now
    }
  }

  loadDashboardCallLogs();
}, []);



  // load numbers
  useEffect(() => {
    const loadNumbers = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/voice-agent/numbers`);
        if (!res.ok) return;
        const data = await res.json();
        setNumbers(data?.numbers || data?.items || []);
      } catch {}
    };
    loadNumbers();
  }, []);

  // metrics
  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/metrics`);
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data?.answerRate === "number") setAnswerRate(data.answerRate);
        if (typeof data?.objectiveAchieved === "number") setObjectiveAchieved(data.objectiveAchieved);
      } catch {}
    };
    loadMetrics();
  }, []);

  // chart data: continuous last 30 days with zeros
  // const chartData = useMemo(() => {
  //   const counts = new Map<string, number>();
  //   for (const c of calls) {
  //     const d = new Date(c.startedAt);
  //     if (isNaN(d.getTime())) continue;
  //     const key = d.toISOString().slice(0, 10);
  //     counts.set(key, (counts.get(key) || 0) + 1);
  //   }
  //   const out: Array<{ dateKey: string; date: string; calls: number }> = [];
  //   const today = new Date();
  //   const start = new Date();
  //   start.setDate(today.getDate() - (DAYS_RANGE - 1));
  //   for (let dt = new Date(start); dt <= today; dt.setDate(dt.getDate() + 1)) {
  //     const key = dt.toISOString().slice(0, 10);
  //     out.push({ dateKey: key, date: dt.toLocaleDateString(), calls: counts.get(key) ?? 0 });
  //   }
  //   return out;
  // }, [calls]);

  const chartData = useMemo(() => {
  // --- MONTH MODE (last 30 days) ---
  if (chartMode === "month") {
    const counts = new Map<string, number>();
    for (const c of calls) {
      const d = new Date(c.startedAt);
      if (isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    const out: Array<{ dateKey: string; date: string; calls: number }> = [];
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - (DAYS_RANGE - 1));

    for (let dt = new Date(start); dt <= today; dt.setDate(dt.getDate() + 1)) {
      const key = dt.toISOString().slice(0, 10);
      out.push({
        dateKey: key,
        date: dt.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
        }), // → "24 Oct"
        calls: counts.get(key) ?? 0
      });
    }
    return out;
  }

  // --- YEAR MODE (group by month) ---
  const monthly = new Map<string, number>(); // key = "YYYY-MM"

  for (const c of calls) {
    const d = new Date(c.startedAt);
    if (isNaN(d.getTime())) continue;
    const key = d.toISOString().slice(0, 7);
    monthly.set(key, (monthly.get(key) || 0) + 1);
  }

  const out: Array<{ dateKey: string; date: string; calls: number }> = [];
  const now = new Date();
  const yearAgo = new Date();
  yearAgo.setFullYear(now.getFullYear() - 1);

  const cursor = new Date(yearAgo.getFullYear(), yearAgo.getMonth(), 1);

  while (cursor <= now) {
    const key = cursor.toISOString().slice(0, 7);
    out.push({
      dateKey: key,
      date: cursor.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      }), // → "Oct 2025"
      calls: monthly.get(key) ?? 0
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return out;
}, [calls, chartMode]);


  const chartRangeLabel = useMemo(() => {
    if (!chartData.length) return undefined;
    return `From ${chartData[0].date} to ${chartData[chartData.length - 1].date}`;
  }, [chartData]);

  // helper to compute duration if no timeline
  const formatDuration = (call: BackendCallLog) => {
    if (call.timeline && call.timeline.length >= 2) {
      const start = new Date(call.timeline[0].t).getTime();
      const end = new Date(call.timeline[call.timeline.length - 1].t).getTime();
      const secs = Math.max(0, Math.round((end - start) / 1000));
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
    if (call.startedAt && call.endedAt) {
      const secs = Math.max(
        0,
        Math.round((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
      );
      return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
    }
    return "-";
  };

  return (
    <>
        <div className="flex min-h-screen bg-background">
          <main className="flex-1 p-6 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Calls (today)</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{countToday}</div>
                  <p className="text-xs text-muted-foreground">0% compared to yesterday</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Answer rate (this week)</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{answerRate}%</div>
                  <p className="text-xs text-muted-foreground">-3% compared to previous week</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Calls made (this month)</CardTitle>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-muted-foreground"><path d="M12 2v20M2 12h20" /></svg>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{countThisMonth}</div>
                  <p className="text-xs text-muted-foreground">100% compared to same period last mo.</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart + Next steps */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
  <div>
    <CardTitle>Calls made</CardTitle>
    <CardDescription>{chartRangeLabel || "No data yet"}</CardDescription>
  </div>

  {/* Toggle buttons */}
  <div className="flex space-x-2">
    <Button
      size="sm"
      variant={chartMode === "month" ? "default" : "outline"}
      onClick={() => setChartMode("month")}
    >
      Month
    </Button>

    <Button
      size="sm"
      variant={chartMode === "year" ? "default" : "outline"}
      onClick={() => setChartMode("year")}
    >
      Year
    </Button>
  </div>
</CardHeader>

                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="calls" stroke="#3b82f6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <VoiceAgentHighlights />
            </div>

            {/* Objective + Latest calls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-to-br from-blue-600/20 via-blue-500/10 to-transparent">
                <CreditsHighlightCard 
                  balance={creditsData?.balance || 0}
                  totalMinutes={creditsData?.totalMinutes || 0}
                  remainingMinutes={creditsData?.remainingMinutes || 0}
                  usageThisMonth={creditsData?.usageThisMonth || 0}
                  onRefresh={fetchCredits}
                  isLoading={isLoadingCredits}
                />
              </Card>

              <Card>
                <CardHeader className="pb-0">
                  <CardTitle>Latest calls</CardTitle>
                  <CardDescription>Here are the latest calls AI assistants has made</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Lead Name</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Assistant</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleCalls.map((call) => {
                        const started = new Date(call.startedAt);
                        const dateStr = isNaN(started.getTime()) ? "-" : started.toLocaleString();
                        const duration = formatDuration(call);
                        return (
                          <TableRow key={call.id}>
                            <TableCell>
                              <Badge variant={call.status === "completed" || call.status === "ended" ? "default" : "secondary"}>
                                {call.status}
                              </Badge>
                            </TableCell>

                            {/* CLIENT NAME = lead_name */}
                            <TableCell>{call.leadName || "—"}</TableCell>

                            <TableCell>{duration}</TableCell>

                            {/* ASSISTANT NAME = agent_name */}
                            <TableCell>
                              {call.agentName ||
                                resolvePhoneNumber(call.from)?.label ||
                                resolvePhoneNumber(call.from)?.e164 ||
                                call.from ||
                                "—"}
                            </TableCell>

                            <TableCell>{dateStr}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Footer with View more / View less */}
                  {calls.length > VISIBLE_DEFAULT && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">
                        Showing {visibleCalls.length} of {calls.length}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAllCalls((v) => !v)}
                      >
                        {showAllCalls ? "View less" : `View more (${calls.length - VISIBLE_DEFAULT})`}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
    </>
  );
}
