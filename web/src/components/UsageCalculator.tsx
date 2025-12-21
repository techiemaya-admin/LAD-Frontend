'use client';

import React, { useState } from 'react';
import { Calculator, DollarSign } from 'lucide-react';

export const UsageCalculator: React.FC = () => {
  const [callsPerMonth, setCallsPerMonth] = useState(1000);
  const [callLength, setCallLength] = useState(1);
  const [messagesPerMonth, setMessagesPerMonth] = useState(0);
  const [leadCredits, setLeadCredits] = useState(0);

  // Pricing calculations
  const calculateCosts = () => {
    const totalMinutes = callsPerMonth * callLength;
    const voagHostingCost = totalMinutes * 0.15;
    const smsCost = messagesPerMonth * 0.009;
    const leadCost = (leadCredits / 2500) * 79;
    
    // Additional lines (if more than 10 concurrent calls)
    const estimatedConcurrency = Math.ceil(callsPerMonth / (30 * 24 * 60 / callLength));
    const additionalLines = Math.max(0, estimatedConcurrency - 10);
    const concurrencyCost = additionalLines * 10;

    const totalCost = voagHostingCost + smsCost + concurrencyCost + leadCost;

    // Calculate what lead credits can get
    const companiesExtractable = Math.floor(leadCredits * 4); // 10,000 companies per 2500 credits = 4 per credit
    const decisionMakersExtractable = Math.floor(leadCredits / 10); // 250 decision makers per 2500 credits = 1 per 10 credits

    return {
      voagHostingCost,
      smsCost,
      concurrencyCost,
      leadCost,
      totalCost,
      totalMinutes,
      estimatedConcurrency,
      companiesExtractable,
      decisionMakersExtractable
    };
  };

  const costs = calculateCosts();

  // Calculate percentage for gradient fill
  const getSliderBackground = (value: number, min: number, max: number) => {
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${percentage}%, #E5E7EB ${percentage}%, #E5E7EB 100%)`;
  };

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
            Estimate your cost
          </h2>
          <p className="text-xl text-gray-600">
            Adjust the sliders to estimate your monthly costs
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Controls */}
          <div className="space-y-8">
            {/* Calls per month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Calls per month
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={callsPerMonth}
                  onChange={(e) => setCallsPerMonth(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider"
                  style={{ background: getSliderBackground(callsPerMonth, 0, 10000) }}
                />
                <span className="text-lg font-semibold text-gray-900 w-20 text-right">
                  {callsPerMonth.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Call length */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call length (mins)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="1"
                  value={callLength}
                  onChange={(e) => setCallLength(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider"
                  style={{ background: getSliderBackground(callLength, 1, 30) }}
                />
                <span className="text-lg font-semibold text-gray-900 w-20 text-right">
                  {callLength}
                </span>
              </div>
            </div>

            {/* Messages per month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp messages per month
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={messagesPerMonth}
                  onChange={(e) => setMessagesPerMonth(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider"
                  style={{ background: getSliderBackground(messagesPerMonth, 0, 10000) }}
                />
                <span className="text-lg font-semibold text-gray-900 w-20 text-right">
                  {messagesPerMonth.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Lead Credits */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lead Credits per month
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={leadCredits}
                  onChange={(e) => setLeadCredits(Number(e.target.value))}
                  className="flex-1 h-2 rounded-lg appearance-none cursor-pointer slider"
                  style={{ background: getSliderBackground(leadCredits, 0, 10000) }}
                />
                <span className="text-lg font-semibold text-gray-900 w-20 text-right">
                  {leadCredits.toLocaleString()}
                </span>
              </div>
              {leadCredits > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  Can extract up to {costs.companiesExtractable.toLocaleString()} companies or {costs.decisionMakersExtractable} decision makers
                </p>
              )}
            </div>
          </div>

          {/* Cost Breakdown */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Cost Breakdown</h3>
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-gray-700">VOAG Calling</p>
                  <p className="text-xs text-gray-500">
                    {costs.totalMinutes.toLocaleString()} mins × $0.15/min
                  </p>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  ${costs.voagHostingCost.toFixed(2)}
                </span>
              </div>

              {costs.smsCost > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">WhatsApp Chat</p>
                    <p className="text-xs text-gray-500">
                      {messagesPerMonth.toLocaleString()} msgs × $0.009/msg
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${costs.smsCost.toFixed(2)}
                  </span>
                </div>
              )}

              {costs.concurrencyCost > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Additional Concurrency</p>
                    <p className="text-xs text-gray-500">
                      ~{costs.estimatedConcurrency} lines needed ({Math.max(0, costs.estimatedConcurrency - 10)} extra × $10/line)
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${costs.concurrencyCost.toFixed(2)}
                  </span>
                </div>
              )}

              {costs.leadCost > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Lead Generation</p>
                    <p className="text-xs text-gray-500">
                      {leadCredits.toLocaleString()} credits × $79/2500 credits
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    ${costs.leadCost.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xl font-bold text-gray-900">Total Monthly Cost</span>
                <span className="text-3xl font-bold text-blue-600">
                  ${costs.totalCost.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                * Charges may vary based on the Model provider costs (STT, LLM, TTS)
              </p>
            </div>

            <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition-colors">
              Get Started with Pay As You Go
            </button>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-600">
            This calculator provides estimates. Actual costs may vary based on usage patterns and selected model providers.
          </p>
        </div>
      </div>
    </div>
  );
};
