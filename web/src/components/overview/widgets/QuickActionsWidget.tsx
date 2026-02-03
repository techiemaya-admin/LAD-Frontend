"use client";
import React from 'react';
import { Phone, Upload, Users, Bot, ArrowRight } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { Button } from '@/components/ui/button';
interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}
const quickActions: QuickAction[] = [
  { id: 'call', label: 'New Call', icon: Phone, color: 'bg-blue-500' },
  { id: 'upload', label: 'Upload Leads', icon: Upload, color: 'bg-green-500' },
  { id: 'contacts', label: 'View Contacts', icon: Users, color: 'bg-purple-500' },
  { id: 'agents', label: 'Manage Agents', icon: Bot, color: 'bg-amber-500' },
];
interface QuickActionsWidgetProps {
  id: string;
}
export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ id }) => {
  return (
    <WidgetWrapper id={id} title="Quick Actions">
      <div className="grid grid-cols-2 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              className="h-auto py-3 px-3 flex flex-col items-center gap-2 hover:bg-secondary/50 transition-all"
            >
              <div className={`p-2 rounded-lg ${action.color} text-white`}>
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </WidgetWrapper>
  );
};