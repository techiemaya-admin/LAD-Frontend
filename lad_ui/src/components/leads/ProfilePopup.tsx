import React from 'react';
import Image from 'next/image';
import {
  CalendarDays,
  MapPin,
  Phone,
  Mail,
  X,
  UserCircle2,
} from 'lucide-react';
import { Lead, PopupProps } from './types';

// Mock data for profile details
export const profileMockData: Lead = {
  id: "24",
  name: "Prem Kumar",
  role: "Team Manager",
  avatar: null,
  age: 32,
  address: "123 Business Park, Sector 15, Gurgaon, Haryana 122001",
  location: "Gurgaon, India",
  phoneNumber: "+91 98765 43210",
  email: "prem.kumar@company.com",
  lastActivity: "10/5/2025",
  stage: "Qualified",
  bio: "Prem Kumar is an avid gamer and remote worker, seeking a best laptop to fuel his personal and professional interests.",
  socialMedia: {
    linkedin: "https://linkedin.com/in/premkumar",
    whatsapp: "+91 98765 43210",
    instagram: "@premkumar",
    facebook: "Prem Kumar"
  }
};

const ProfilePopup: React.FC<PopupProps> = ({ open, onClose, lead = profileMockData }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-8">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-100 bg-white shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <UserCircle2 className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Customer Profile Details</h2>
        </div>

        <div className="space-y-6 px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {lead.avatar ? (
                <Image
                  src={lead.avatar}
                  alt={lead.name ?? 'Customer avatar'}
                  width={80}
                  height={80}
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-100 text-xl font-semibold text-indigo-600">
                  {lead.name?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{lead.name}</h3>
                <p className="text-sm text-slate-500">{lead.role}</p>
                <p className="mt-2 text-xs text-slate-400">
                  ID: {lead.id} • Last activity: {lead.lastActivity} • Stage: {lead.stage}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Personal Information</h4>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <CalendarDays className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Age</p>
                  <p className="text-sm font-medium text-slate-800">{lead.age ? `${lead.age} years` : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <MapPin className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Location</p>
                  <p className="text-sm font-medium text-slate-800">{lead.location ?? '—'}</p>
                </div>
              </div>
              <div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <MapPin className="mt-1 h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Address</p>
                  <p className="text-sm font-medium text-slate-800">{lead.address ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <Phone className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-800">{lead.phoneNumber ?? '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4">
                <Mail className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-800">{lead.email ?? '—'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">About</h4>
            <p className="text-sm leading-relaxed text-slate-600">{lead.bio ?? 'Bio not available.'}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePopup;
