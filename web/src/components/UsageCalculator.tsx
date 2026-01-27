'use client';
import React, { useState } from 'react';
import { Calculator } from 'lucide-react';

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  helperText?: string;
}

const SliderRow: React.FC<SliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
  helperText
}) => {
  const getSliderBackground = (val: number, minVal: number, maxVal: number) => {
    const percentage = ((val - minVal) / (maxVal - minVal)) * 100;
    return `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`;
  };

  const displayValue = formatValue ? formatValue(value) : value.toLocaleString();

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
          style={{ background: getSliderBackground(value, min, max) }}
        />
        <span className="text-lg font-semibold text-gray-900 min-w-[5rem] text-right tabular-nums">
          {displayValue}
        </span>
      </div>
      {helperText && (
        <p className="text-xs text-gray-500 leading-tight mb-4">
          {helperText}
        </p>
      )}
    </div>
  );
};

interface CheckboxRowProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  credits: number;
  helperText?: string;
}

const CheckboxRow: React.FC<CheckboxRowProps> = ({
  label,
  checked,
  onChange,
  credits,
  helperText
}) => {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        <div className="ml-3">
          <label className="text-sm font-medium text-gray-700 cursor-pointer">
            {label}
          </label>
          {helperText && (
            <p className="text-xs text-gray-500">{helperText}</p>
          )}
        </div>
      </div>
      <span className="text-sm font-semibold text-gray-900">
        {credits} cr/mo
      </span>
    </div>
  );
};

export const UsageCalculator: React.FC = () => {
  const [voiceCalls, setVoiceCalls] = useState(100);
  const [callLength, setCallLength] = useState(5);
  const [premiumVoice, setPremiumVoice] = useState(false);
  const [leads, setLeads] = useState(50);
  const [phoneReveals, setPhoneReveals] = useState(25);
  const [profileSummaries, setProfileSummaries] = useState(25);
  const [linkedinConnection, setLinkedinConnection] = useState(true);
  const [googleConnection, setGoogleConnection] = useState(true);
  const [outlookConnection, setOutlookConnection] = useState(false);

  // Credit calculations
  const calculateCredits = () => {
    // Voice calls (3 credits/min for Cartesia, 4 credits/min for ElevenLabs)
    const totalMinutes = voiceCalls * callLength;
    const voiceCredits = totalMinutes * (premiumVoice ? 4 : 3);

    // Lead search (5 credits per lead with email)
    const leadCredits = leads * 5;

    // Phone reveals (10 credits per reveal)
    const phoneCredits = phoneReveals * 10;

    // Profile summaries (5 credits each)
    const summaryCredits = profileSummaries * 5;

    // Platform connections (monthly)
    const connectionCredits = 
      (linkedinConnection ? 50 : 0) + 
      (googleConnection ? 20 : 0) + 
      (outlookConnection ? 20 : 0);

    const totalCredits = voiceCredits + leadCredits + phoneCredits + summaryCredits + connectionCredits;

    return {
      voiceCredits,
      leadCredits,
      phoneCredits,
      summaryCredits,
      connectionCredits,
      totalCredits,
      totalMinutes
    };
  };

  const credits = calculateCredits();

  return (
    <div className="py-16 bg-white">
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #3B82F6;
          cursor: pointer;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }
        .slider::-webkit-slider-thumb:hover {
          background: #2563EB;
          transform: scale(1.1);
        }
        .slider::-moz-range-thumb:hover {
          background: #2563EB;
          transform: scale(1.1);
        }
        .slider::-webkit-slider-runnable-track {
          height: 8px;
          border-radius: 4px;
        }
        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
        }
      `}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-4">
            <Calculator className="h-4 w-4 mr-2" />
            USAGE CALCULATOR
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Calculate your monthly credits
          </h2>
          <p className="text-xl text-gray-600">
            Adjust the sliders to estimate your credit usage
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Controls */}
          <div className="space-y-6">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Voice Calls</h3>
              <SliderRow
                label="Number of calls per month"
                value={voiceCalls}
                min={0}
                max={1000}
                step={10}
                onChange={setVoiceCalls}
              />
              <SliderRow
                label="Average call length (minutes)"
                value={callLength}
                min={1}
                max={30}
                step={1}
                onChange={setCallLength}
              />
              <div className="mt-4 flex items-center">
                <input
                  type="checkbox"
                  checked={premiumVoice}
                  onChange={(e) => setPremiumVoice(e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <label className="ml-3 text-sm font-medium text-gray-700">
                  Use Premium Voice (ElevenLabs TTS)
                </label>
              </div>
            </div>

            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Search</h3>
              <SliderRow
                label="Leads with email"
                value={leads}
                min={0}
                max={500}
                step={10}
                onChange={setLeads}
                helperText="5 credits per lead"
              />
              <SliderRow
                label="Phone number reveals"
                value={phoneReveals}
                min={0}
                max={500}
                step={10}
                onChange={setPhoneReveals}
                helperText="10 credits per phone reveal"
              />
              <SliderRow
                label="AI Profile summaries"
                value={profileSummaries}
                min={0}
                max={500}
                step={10}
                onChange={setProfileSummaries}
                helperText="5 credits per summary"
              />
            </div>

            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Connections</h3>
              <div className="space-y-3">
                <CheckboxRow
                  label="LinkedIn"
                  checked={linkedinConnection}
                  onChange={setLinkedinConnection}
                  credits={50}
                  helperText="Monthly connection fee"
                />
                <CheckboxRow
                  label="Google"
                  checked={googleConnection}
                  onChange={setGoogleConnection}
                  credits={20}
                  helperText="Monthly connection fee"
                />
                <CheckboxRow
                  label="Outlook"
                  checked={outlookConnection}
                  onChange={setOutlookConnection}
                  credits={20}
                  helperText="Monthly connection fee"
                />
              </div>
            </div>
          </div>

          {/* Credit Breakdown */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Credit Breakdown</h3>
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>

            <div className="space-y-4 mb-6">
              {credits.voiceCredits > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      {premiumVoice ? 'Premium Voice Calls' : 'Voice Calls'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {credits.totalMinutes} mins × {premiumVoice ? '4' : '3'} cr/min
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {credits.voiceCredits.toLocaleString()} cr
                  </span>
                </div>
              )}

              {credits.leadCredits > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Lead Search</p>
                    <p className="text-xs text-gray-500">
                      {leads} leads × 5 cr
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {credits.leadCredits.toLocaleString()} cr
                  </span>
                </div>
              )}

              {credits.phoneCredits > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Phone Reveals</p>
                    <p className="text-xs text-gray-500">
                      {phoneReveals} reveals × 10 cr
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {credits.phoneCredits.toLocaleString()} cr
                  </span>
                </div>
              )}

              {credits.summaryCredits > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Profile Summaries</p>
                    <p className="text-xs text-gray-500">
                      {profileSummaries} summaries × 5 cr
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {credits.summaryCredits.toLocaleString()} cr
                  </span>
                </div>
              )}

              {credits.connectionCredits > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Platform Connections</p>
                    <p className="text-xs text-gray-500">
                      {[
                        linkedinConnection && 'LinkedIn (50)',
                        googleConnection && 'Google (20)',
                        outlookConnection && 'Outlook (20)'
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    {credits.connectionCredits.toLocaleString()} cr
                  </span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold text-gray-900">Total Credits Needed</span>
                <span className="text-3xl font-bold text-blue-600">
                  {credits.totalCredits.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">
                Monthly credit usage estimate
              </p>
              
              {/* Recommended Plan */}
              <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                <p className="text-sm font-medium text-gray-700 mb-1">Recommended Plan:</p>
                <p className="text-lg font-bold text-blue-600">
                  {credits.totalCredits <= 1000 ? 'Starter ($99)' :
                   credits.totalCredits <= 3000 ? 'Professional ($199)' :
                   credits.totalCredits <= 12000 ? 'Business ($499)' :
                   'Contact sales for Enterprise'}
                </p>
              </div>
            </div>

            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">
              Get Started
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            This calculator provides estimates based on current pricing. All Standard plans include credits that never expire.
          </p>
        </div>
      </div>
    </div>
  );
};
