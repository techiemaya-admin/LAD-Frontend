import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar, MessageCircle, Instagram, Mail, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Lead } from './types';

const timeToMinutes = (timeStr: string): number => {
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

type Touchpoint = {
  day: string;
  time: string;
  duration: string;
  value: number;
  messageCount?: number;
};


const whatsappTouchpoints: Touchpoint[] = [
  { day: 'Mar 1', time: '9:00 AM', duration: '30 min', value: timeToMinutes('9:00 AM') },
  { day: 'Mar 1', time: '2:00 PM', duration: '1 hr 30 min', value: timeToMinutes('2:00 PM') },
  { day: 'Mar 1', time: '9:00 PM', duration: '45 min', value: timeToMinutes('9:00 PM') },
  { day: 'Mar 2', time: '11:00 AM', duration: '20 min', value: timeToMinutes('11:00 AM') },
  { day: 'Mar 3', time: '10:00 AM', duration: '1 hr', value: timeToMinutes('10:00 AM') },
  { day: 'Mar 3', time: '9:00 PM', duration: '30 min', value: timeToMinutes('9:00 PM') },
  { day: 'Mar 4', time: '9:00 AM', duration: '50 min', value: timeToMinutes('9:00 AM') },
  { day: 'Mar 4', time: '9:00 PM', duration: '40 min', value: timeToMinutes('9:00 PM') },
  { day: 'Mar 5', time: '2:00 AM', duration: '45 min', value: timeToMinutes('2:00 AM') },
  { day: 'Mar 5', time: '11:30 PM', duration: '45 min', value: timeToMinutes('11:30 PM') },
  { day: 'Mar 6', time: '9:00 PM', duration: '45 min', value: timeToMinutes('9:00 PM') },
];

const instagramTouchpoints: Touchpoint[] = [
  { day: 'Mar 1', time: '8:30 AM', duration: '45 min', value: timeToMinutes('8:30 AM') },
  { day: 'Mar 1', time: '7:30 PM', duration: '45 min', value: timeToMinutes('7:30 PM') },
  { day: 'Mar 1', time: '9:30 PM', duration: '15 min', value: timeToMinutes('9:30 PM') },
  { day: 'Mar 2', time: '1:00 PM', duration: '10 min', value: timeToMinutes('1:00 PM') },
  { day: 'Mar 3', time: '8:00 AM', duration: '20 min', value: timeToMinutes('8:00 AM') },
  { day: 'Mar 4', time: '10:00 PM', duration: '1 hr', value: timeToMinutes('10:00 PM') },
  { day: 'Mar 5', time: '6:30 PM', duration: '55 min', value: timeToMinutes('6:30 PM') },
  { day: 'Mar 6', time: '8:45 AM', duration: '30 min', value: timeToMinutes('8:45 AM') },
];

const gmailTouchpoints: Touchpoint[] = [
  { day: 'Mar 1', time: '8:30 AM', duration: '15 min', value: timeToMinutes('8:30 AM') },
  { day: 'Mar 2', time: '5:00 PM', duration: '5 min', value: timeToMinutes('5:00 PM') },
  { day: 'Mar 3', time: '9:30 AM', duration: '25 min', value: timeToMinutes('9:30 AM') },
  { day: 'Mar 4', time: '12:00 PM', duration: '10 min', value: timeToMinutes('12:00 PM') },
  { day: 'Mar 5', time: '4:00 PM', duration: '40 min', value: timeToMinutes('4:00 PM') },
  { day: 'Mar 6', time: '10:00 AM', duration: '15 min', value: timeToMinutes('10:00 AM') },
];


const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload as Touchpoint;
  return (
    <div className="rounded-xl bg-[#162544] px-3 py-2 text-white shadow-lg">
      <p className="text-xs font-medium text-slate-200">{data.day}</p>
      <p className="text-xs font-semibold">{data.time} • {data.duration}</p>
    </div>
  );
};

const CustomDot: React.FC<{ cx?: number; cy?: number; color: string } & Record<string, unknown>> = ({ cx, cy, color }) => {
  if (cx === undefined || cy === undefined) return null;
  return <circle cx={cx} cy={cy} r={6} fill={color} stroke="white" strokeWidth={2} />;
};

const SingleLineChart: React.FC<{
  data: Touchpoint[];
  color: string;
  showXAxis?: boolean;
}> = ({ data, color, showXAxis }) => {
  const minTime = 0;
  const maxTime = 1440;
  return (
    <div className="h-36">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2ECF0" />
          <Tooltip content={<CustomTooltip />} />
          {showXAxis ? (
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
          ) : (
            <XAxis dataKey="day" hide />
          )}
          <YAxis
            orientation="right"
            domain={[minTime, maxTime]}
            tick={false}
            axisLine={false}
            tickLine={false}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={<CustomDot color={color} />}
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


type OutreachAnalysisProps = {
  lead?: Lead | null;
};

const OutreachAnalysis: React.FC<OutreachAnalysisProps> = ({ lead }) => {
  return (
    <Card className="w-full rounded-3xl border-0 bg-white shadow-[0px_10px_60px_0px_#E2ECF980]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white">
            <BarChart3 className="h-5 w-5 text-slate-700" />
          </div>
          Outreach Analysis
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400">
          <Calendar className="h-5 w-5" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {/* WhatsApp Chart */}
        <div className="relative mt-4 flex w-full">
          <div className="absolute left-2 top-12 flex items-center justify-center">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 pl-16">
            <SingleLineChart data={whatsappTouchpoints} color="#25D366" showXAxis={false} />
          </div>
        </div>

        {/* Instagram Chart */}
        <div className="relative mt-2 flex w-full">
          <div className="absolute left-2 top-12 flex items-center justify-center">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: '#E4405F' }}
            >
              <Instagram className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 pl-16">
            <SingleLineChart data={instagramTouchpoints} color="#E4405F" showXAxis={false} />
          </div>
        </div>

        {/* Gmail Chart */}
        <div className="relative mt-2 flex w-full">
          <div className="absolute left-2 top-12 flex items-center justify-center">
            <div 
              className="flex h-12 w-12 items-center justify-center rounded-full shadow-lg"
              style={{ backgroundColor: '#FBBC04' }}
            >
              <Mail className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 pl-16">
            <SingleLineChart data={gmailTouchpoints} color="#FBBC04" showXAxis />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OutreachAnalysis;