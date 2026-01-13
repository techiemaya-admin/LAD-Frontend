import React from 'react';
import { Linkedin, Mail, MessageCircle, Phone, ArrowRight, Clock, Filter, Play, Square, PersonStanding } from 'lucide-react';
import { StepType } from '@/types/campaign';

export interface NodeClasses {
  gradient: string;
  icon: string;
  shadow: string;
  glow: string;
}

export function getNodeClasses(type: StepType): NodeClasses {
  if (type === 'start') return { 
    gradient: 'from-emerald-500 to-emerald-600',
    icon: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/50',
    glow: 'hover:shadow-emerald-500/60'
  };
  if (type === 'end') return { 
    gradient: 'from-red-500 to-red-600',
    icon: 'bg-red-500',
    shadow: 'shadow-red-500/50',
    glow: 'hover:shadow-red-500/60'
  };
  if (type === 'lead_generation') return { 
    gradient: 'from-amber-500 to-amber-600',
    icon: 'bg-amber-500',
    shadow: 'shadow-amber-500/50',
    glow: 'hover:shadow-amber-500/60'
  };
  if (type.includes('linkedin')) return { 
    gradient: 'from-blue-600 to-blue-700',
    icon: 'bg-blue-600',
    shadow: 'shadow-blue-500/50',
    glow: 'hover:shadow-blue-500/60'
  };
  if (type.includes('email')) return { 
    gradient: 'from-teal-500 to-teal-600',
    icon: 'bg-teal-500',
    shadow: 'shadow-teal-500/50',
    glow: 'hover:shadow-teal-500/60'
  };
  if (type.includes('whatsapp')) return { 
    gradient: 'from-green-500 to-green-600',
    icon: 'bg-green-500',
    shadow: 'shadow-green-500/50',
    glow: 'hover:shadow-green-500/60'
  };
  if (type.includes('voice')) return { 
    gradient: 'from-purple-500 to-purple-600',
    icon: 'bg-purple-500',
    shadow: 'shadow-purple-500/50',
    glow: 'hover:shadow-purple-500/60'
  };
  if (type === 'delay') return { 
    gradient: 'from-orange-500 to-orange-600',
    icon: 'bg-orange-500',
    shadow: 'shadow-orange-500/50',
    glow: 'hover:shadow-orange-500/60'
  };
  if (type === 'condition') return { 
    gradient: 'from-violet-500 to-violet-600',
    icon: 'bg-violet-500',
    shadow: 'shadow-violet-500/50',
    glow: 'hover:shadow-violet-500/60'
  };
  return { 
    gradient: 'from-indigo-500 to-indigo-600',
    icon: 'bg-indigo-500',
    shadow: 'shadow-indigo-500/50',
    glow: 'hover:shadow-indigo-500/60'
  };
}

export function getNodeIcon(type: StepType): React.ReactNode {
  if (type === 'start') return <Play className="w-4 h-4" />;
  if (type === 'end') return <Square className="w-4 h-4" />;
  if (type === 'lead_generation') return <PersonStanding className="w-4 h-4" />;
  if (type.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
  if (type.includes('email')) return <Mail className="w-4 h-4" />;
  if (type.includes('whatsapp')) return <MessageCircle className="w-4 h-4" />;
  if (type.includes('voice')) return <Phone className="w-4 h-4" />;
  if (type === 'delay') return <Clock className="w-4 h-4" />;
  if (type === 'condition') return <Filter className="w-4 h-4" />;
  return <ArrowRight className="w-4 h-4" />;
}
