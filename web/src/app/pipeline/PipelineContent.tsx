"use client";

import React, { JSX } from 'react';
import { PipelineBoard } from '@/features/deals-pipeline/components';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationCap, TrendingUp } from 'lucide-react';

export default function PipelineContent(): JSX.Element {
    const { hasFeature, user, isAuthenticated } = useAuth();

    // Determine if this is education vertical (only after user is loaded)
    const isEducation = isAuthenticated && user ? hasFeature('education_vertical') : false;

    // Dynamic labels based on vertical
    const labels = {
        title: isEducation ? 'Students Pipeline' : 'Deals Pipeline',
        subtitle: isEducation ? 'Manage student admissions and counseling' : 'Manage your leads and deals',
        icon: isEducation ? GraduationCap : TrendingUp
    };

    const IconComponent = labels.icon;

    return (
        <div className="p-4">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <IconComponent className="h-8 w-8 text-blue-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{labels.title}</h1>
                        <p className="text-gray-600">{labels.subtitle}</p>
                    </div>
                </div>
            </div>

            <PipelineBoard />
        </div>
    );
}
