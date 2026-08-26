/**
 * Per-template icon, shared by the builder's template gallery/overview drawer
 * and the chat "Roles" launcher - one visual identity for a template wherever
 * it appears.
 */
import React from 'react';

export function TemplateIcon({ tplKey, color, size = 16 }: { tplKey: string; color: string; size?: number }) {
  const p = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  // LinkedIn Accelerator - the LinkedIn glyph (filled, so it reads at 15px).
  if (tplKey === 'linkedin_accelerator') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM2.4 21.5h5.16V9.75H2.4V21.5zM9.9 9.75h4.95v1.6h.07c.69-1.24 2.37-2.55 4.88-2.55 5.22 0 6.18 3.3 6.18 7.6v5.1h-5.15v-4.52c0-1.08-.02-2.47-1.55-2.47-1.56 0-1.8 1.17-1.8 2.39v4.6H12.3V9.75z" transform="scale(0.86) translate(1.6, 1.2)" />
    </svg>
  );
  if (tplKey === 'cold_list_outreach') return (
    <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
  );
  if (tplKey === 'inmail_blitz') return (
    <svg {...p}><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h9" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /><circle cx="19" cy="18" r="3" fill={color} stroke="none" /></svg>
  );
  if (tplKey === 'signal_hunter') return (
    <svg {...p}><path d="M4.9 19.1A10 10 0 0 1 4.9 4.9" /><path d="M7.8 16.2a6 6 0 0 1 0-8.4" /><circle cx="12" cy="12" r="2" fill={color} stroke="none" /><path d="M16.2 7.8a6 6 0 0 1 0 8.4" /><path d="M19.1 4.9a10 10 0 0 1 0 14.2" /></svg>
  );
  if (tplKey === 'crm_reengage') return (
    <svg {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>
  );
  return (
    <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
  );
}

/** Human-readable category for a pipeline step (subtitle in the overview list). */
export function stepCategory(type: string, isSource = false): string {
  if (isSource) return 'Contact source';
  if (type.startsWith('linkedin')) return 'LinkedIn';
  if (type.startsWith('email')) return 'Email';
  if (type.startsWith('whatsapp')) return 'WhatsApp';
  if (type === 'voice_agent_call') return 'Voice';
  if (type.startsWith('instagram')) return 'Instagram';
  if (type === 'condition' || type === 'switch' || type === 'export_results') return 'Logic & export';
  if (type === 'ai_parse' || type === 'data_enrich' || type === 'media_generation') return 'AI & data';
  if (type === 'zoho_update') return 'CRM';
  if (type === 'followup_sequence') return 'Follow-ups';
  return 'Step';
}

export default TemplateIcon;
