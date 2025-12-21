'use client';

import React from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Upload, Search, ArrowLeft, ArrowRight } from 'lucide-react';

export default function Screen2InboundOrOutbound() {
  const { setLeadType, setCurrentScreen } = useOnboardingStore();

  const handleSelect = (type: 'inbound' | 'outbound') => {
    setLeadType(type);
    if (type === 'inbound') {
      setCurrentScreen(3); // Navigate to inbound upload
    } else {
      setCurrentScreen(4); // Navigate to outbound questions
    }
  };

  return (
    <div className="relative w-full h-screen bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Back Button */}
          <button
            onClick={() => setCurrentScreen(1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to options</span>
          </button>

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              How do you want to get started?
            </h1>
            <p className="text-xl text-gray-600">
              Choose how you'd like to work with leads
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Inbound Leads */}
            <div
              onClick={() => handleSelect('inbound')}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-blue-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Inbound Leads</h2>
                <p className="text-gray-600 mb-6">
                  You already have leads. Upload your Excel or CSV file and we'll help you map the fields.
                </p>
                <div className="flex items-center gap-2 text-blue-600 font-semibold group-hover:gap-4 transition-all">
                  <span>Upload your leads</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Outbound Leads */}
            <div
              onClick={() => handleSelect('outbound')}
              className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-green-500"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Outbound Leads</h2>
                <p className="text-gray-600 mb-6">
                  We'll generate leads for you based on your criteria. Just tell us what you're looking for.
                </p>
                <div className="flex items-center gap-2 text-green-600 font-semibold group-hover:gap-4 transition-all">
                  <span>Generate leads</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

