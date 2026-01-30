'use client';

import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCompanyName, setCompanyLogo } from '../../store/slices/settingsSlice';
import { IntegrationsSettings } from '../../components/settings/IntegrationsSettings';
import { VoiceAgentSettings } from '../../components/voice-agent/VoiceAgentSettings';
import { BillingSettings } from '../../components/settings/BillingSettings';
import { CreditsSettings } from '../../components/settings/CreditsSettings';
import { CompanySettings } from '../../components/settings/CompanySettings';
import { TeamManagement } from '../../components/settings/TeamManagement';
import { Building2, Users, Upload, Plug, Terminal, CreditCard, Coins } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

type ActiveTab = 'company' | 'team' | 'accounts' | 'website' | 'integrations' | 'api' | 'billing' | 'credits';

export default function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();

    const companyName = useSelector((state: any) => state.settings.companyName);
    const companyLogo = useSelector((state: any) => state.settings.companyLogo);

    const [activeTab, setActiveTab] = useState<ActiveTab>('integrations');
    const [renewalDate, setRenewalDate] = useState<string>('');

    useEffect(() => {
        // Initialize active tab from URL query param if present
        const tabParam = (searchParams.get('tab') || '').toLowerCase();
        const allowed: ActiveTab[] = ['company', 'team', 'accounts', 'website', 'integrations', 'api', 'billing', 'credits'];
        if (allowed.includes(tabParam as ActiveTab)) {
            setActiveTab(tabParam as ActiveTab);
        }

        // Fetch subscription data to get renewal date
        const fetchRenewalDate = async () => {
            try {
                const periodEnd = Date.now() + 86400 * 15 * 1000;
                const date = new Date(periodEnd);
                const formattedDate = date.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                });
                setRenewalDate(formattedDate);
            } catch (error) {
                console.error('Error fetching renewal date:', error);
                setRenewalDate('November 29th, 2025');
            }
        };
        fetchRenewalDate();
    }, [searchParams]);

    const tabs = [
        { id: 'company' as ActiveTab, label: 'Company', icon: Building2 },
        { id: 'team' as ActiveTab, label: 'Team', icon: Users },
        { id: 'integrations' as ActiveTab, label: 'Integrations', icon: Plug },
        { id: 'api' as ActiveTab, label: 'Voice Settings', icon: Terminal },
        { id: 'billing' as ActiveTab, label: 'Billing', icon: CreditCard },
        { id: 'credits' as ActiveTab, label: 'Credits', icon: Coins },
    ];

    return (
        <div className="space-y-6">
            {/* Combined Header with Logo, Company Name, Renewal Date, and Tabs */}
            <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Top Section: Logo, Company Name, and Renewal */}
                <div className="p-6 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                            <div className="relative group">
                                <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center border-2 border-white">
                                    <img
                                        src={companyLogo}
                                        alt="Company Logo"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <label
                                    htmlFor="header-logo-upload"
                                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-full cursor-pointer hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg opacity-0 group-hover:opacity-100"
                                >
                                    <Upload className="w-3 h-3" />
                                    <input
                                        id="header-logo-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    dispatch(setCompanyLogo(reader.result as string));
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <div>
                                <h1 className="text-gray-900 font-semibold text-xl">{companyName}</h1>
                                <p className="text-gray-600 text-sm">
                                    Renews on {renewalDate || 'Loading...'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Bottom Section: Tabs Navigation */}
                <div className="border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
                    <div className="flex space-x-1 overflow-x-auto p-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    const sp = new URLSearchParams(Array.from(searchParams.entries()));
                                    sp.set('tab', tab.id);
                                    router.replace(`/settings?${sp.toString()}`);
                                }}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? 'bg-white text-blue-700 shadow-md font-semibold'
                                        : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            {/* Content */}
            <div className="space-y-6">
                {activeTab === 'company' && (
                    <CompanySettings
                        companyName={companyName}
                        setCompanyName={(name: string) => dispatch(setCompanyName(name))}
                        companyLogo={companyLogo}
                        setCompanyLogo={(logo: string) => dispatch(setCompanyLogo(logo))}
                    />
                )}
                {activeTab === 'integrations' && <IntegrationsSettings />}
                {activeTab === 'api' && <VoiceAgentSettings />}
                {activeTab === 'team' && <TeamManagement />}
                {activeTab === 'billing' && <BillingSettings />}
                {activeTab === 'credits' && <CreditsSettings />}
            </div>
        </div>
    );
}
