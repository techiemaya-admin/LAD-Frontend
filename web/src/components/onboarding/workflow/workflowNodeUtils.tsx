import React from 'react';
import { Linkedin, Mail, MailPlus, MessageCircle, Phone, ArrowRight, Clock, Filter, Play, Square, Users, Search, Send, UserPlus, Eye, Zap, Wand2, ListOrdered, BarChart3, DatabaseZap, Split, Sparkles, Contact, Download, Megaphone, Globe, Telescope, Gauge, Shuffle, PenLine, Webhook, PenTool, ShieldCheck, LayoutTemplate, Instagram, UserCheck, FileText } from 'lucide-react';
import { StepType } from '@/types/campaign';

export interface NodeClasses {
  gradient: string;
  icon: string;
  shadow: string;
  glow: string;
  ring: string;
  bg: string;
  text: string;
}

export function getNodeClasses(type: StepType): NodeClasses {
  if (type === 'start') return {
    gradient: 'from-emerald-400 to-emerald-600',
    icon: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/40',
    glow: 'hover:shadow-emerald-400/60',
    ring: 'ring-emerald-400/30',
    bg: 'bg-emerald-500',
    text: 'text-emerald-400',
  };
  if (type === 'end') return {
    gradient: 'from-rose-400 to-rose-600',
    icon: 'bg-rose-500',
    shadow: 'shadow-rose-500/40',
    glow: 'hover:shadow-rose-400/60',
    ring: 'ring-rose-400/30',
    bg: 'bg-rose-500',
    text: 'text-rose-400',
  };
  if (type === 'lead_generation') return {
    gradient: 'from-amber-400 to-orange-500',
    icon: 'bg-amber-500',
    shadow: 'shadow-amber-500/40',
    glow: 'hover:shadow-amber-400/60',
    ring: 'ring-amber-400/30',
    bg: 'bg-amber-500',
    text: 'text-amber-400',
  };
  if (type === 'media_generation') return {
    gradient: 'from-fuchsia-400 to-fuchsia-600',
    icon: 'bg-fuchsia-500',
    shadow: 'shadow-fuchsia-500/40',
    glow: 'hover:shadow-fuchsia-400/60',
    ring: 'ring-fuchsia-400/30',
    bg: 'bg-fuchsia-500',
    text: 'text-fuchsia-400',
  };
  if (type.includes('linkedin')) return {
    gradient: 'from-blue-500 to-blue-700',
    icon: 'bg-blue-600',
    shadow: 'shadow-blue-500/40',
    glow: 'hover:shadow-blue-400/60',
    ring: 'ring-blue-400/30',
    bg: 'bg-blue-600',
    text: 'text-blue-400',
  };
  if (type.includes('email')) return {
    gradient: 'from-cyan-400 to-teal-600',
    icon: 'bg-teal-500',
    shadow: 'shadow-teal-500/40',
    glow: 'hover:shadow-teal-400/60',
    ring: 'ring-teal-400/30',
    bg: 'bg-teal-500',
    text: 'text-teal-400',
  };
  if (type.includes('whatsapp')) return {
    gradient: 'from-green-400 to-green-600',
    icon: 'bg-green-500',
    shadow: 'shadow-green-500/40',
    glow: 'hover:shadow-green-400/60',
    ring: 'ring-green-400/30',
    bg: 'bg-green-500',
    text: 'text-green-400',
  };
  if (type.includes('voice')) return {
    gradient: 'from-purple-400 to-purple-600',
    icon: 'bg-purple-500',
    shadow: 'shadow-purple-500/40',
    glow: 'hover:shadow-purple-400/60',
    ring: 'ring-purple-400/30',
    bg: 'bg-purple-500',
    text: 'text-purple-400',
  };
  if (type === 'delay') return {
    gradient: 'from-orange-400 to-orange-600',
    icon: 'bg-orange-500',
    shadow: 'shadow-orange-500/40',
    glow: 'hover:shadow-orange-400/60',
    ring: 'ring-orange-400/30',
    bg: 'bg-orange-500',
    text: 'text-orange-400',
  };
  if (type === 'condition') return {
    gradient: 'from-violet-400 to-violet-600',
    icon: 'bg-violet-500',
    shadow: 'shadow-violet-500/40',
    glow: 'hover:shadow-violet-400/60',
    ring: 'ring-violet-400/30',
    bg: 'bg-violet-500',
    text: 'text-violet-400',
  };
  return {
    gradient: 'from-indigo-400 to-indigo-600',
    icon: 'bg-indigo-500',
    shadow: 'shadow-indigo-500/40',
    glow: 'hover:shadow-indigo-400/60',
    ring: 'ring-indigo-400/30',
    bg: 'bg-indigo-500',
    text: 'text-indigo-400',
  };
}

export function getNodeIcon(type: StepType, size: string = 'w-5 h-5'): React.ReactNode {
  if (type === 'start') return <Play className={size} />;
  if (type === 'end') return <Square className={size} />;
  if (type === 'lead_generation') return <Search className={size} />;
  if (type === 'media_generation') return <Wand2 className={size} />;
  if (type === 'linkedin_connect') return <UserPlus className={size} />;
  if (type === 'linkedin_message') return <Send className={size} />;
  if (type === 'linkedin_inmail') return <MailPlus className={size} />;
  if (type === 'linkedin_visit') return <Eye className={size} />;
  if (type.includes('linkedin')) return <Linkedin className={size} />;
  if (type.includes('email')) return <Mail className={size} />;
  if (type.includes('whatsapp')) return <MessageCircle className={size} />;
  if (type.includes('voice')) return <Phone className={size} />;
  if (type === 'delay') return <Clock className={size} />;
  if (type === 'condition') return <Filter className={size} />;
  if (type === 'followup_sequence') return <ListOrdered className={size} />;
  if (type === 'analytics_report') return <BarChart3 className={size} />;
  if (type === 'export_results') return <Download className={size} />;
  if (type === 'landing_page') return <LayoutTemplate className={size} />;
  if (type === 'linkedin_content') return <PenTool className={size} />;
  if (type === 'post_approval') return <ShieldCheck className={size} />;
  if (type === 'linkedin_post') return <Megaphone className={size} />;
  if (type === 'instagram_post') return <Instagram className={size} />;
  if (type === 'human_task') return <UserCheck className={size} />;
  if (type === 'lead_report') return <FileText className={size} />;
  if (type === 'web_scrape') return <Globe className={size} />;
  if (type === 'web_research') return <Telescope className={size} />;
  if (type === 'lead_score') return <Gauge className={size} />;
  if (type === 'split_test') return <Shuffle className={size} />;
  if (type === 'set_field') return <PenLine className={size} />;
  if (type === 'http_request') return <Webhook className={size} />;
  if (type === 'zoho_update') return <DatabaseZap className={size} />;
  if (type === 'switch') return <Split className={size} />;
  if (type === 'ai_parse') return <Sparkles className={size} />;
  if (type === 'data_enrich') return <Contact className={size} />;
  return <Zap className={size} />;
}