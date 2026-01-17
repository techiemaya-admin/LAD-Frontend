'use client';

import React, { useState } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { logger } from '@/lib/logger';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';

export default function Screen2OutboundQuestions() {
  const { setOutboundRequirements, setCurrentScreen } = useOnboardingStore();
  
  const [requirements, setRequirements] = useState({
    industry: '',
    jobTitles: [''],
    locations: [''],
    companySize: { min: '', max: '' },
    needLinkedInUrl: false,
    needEmails: false,
    needPhones: false,
    volume: 100,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    const outboundData = {
      ...requirements,
      jobTitles: requirements.jobTitles.filter((t) => t.trim()),
      locations: requirements.locations.filter((l) => l.trim()),
      companySize: {
        min: requirements.companySize.min ? parseInt(requirements.companySize.min) : undefined,
        max: requirements.companySize.max ? parseInt(requirements.companySize.max) : undefined,
      },
    };

    setOutboundRequirements(outboundData);

    try {
      await apiPost('/api/onboarding/outbound/requirements', outboundData);
    } catch (error) {
      logger.error('Failed to save requirements', error);
    }

    setCurrentScreen(5); // Move to workflow setup
  };

  const addJobTitle = () => {
    setRequirements({
      ...requirements,
      jobTitles: [...requirements.jobTitles, ''],
    });
  };

  const removeJobTitle = (index: number) => {
    setRequirements({
      ...requirements,
      jobTitles: requirements.jobTitles.filter((_, i) => i !== index),
    });
  };

  const updateJobTitle = (index: number, value: string) => {
    const newTitles = [...requirements.jobTitles];
    newTitles[index] = value;
    setRequirements({ ...requirements, jobTitles: newTitles });
  };

  const addLocation = () => {
    setRequirements({
      ...requirements,
      locations: [...requirements.locations, ''],
    });
  };

  const removeLocation = (index: number) => {
    setRequirements({
      ...requirements,
      locations: requirements.locations.filter((_, i) => i !== index),
    });
  };

  const updateLocation = (index: number, value: string) => {
    const newLocations = [...requirements.locations];
    newLocations[index] = value;
    setRequirements({ ...requirements, locations: newLocations });
  };

  return (
    <div className="relative w-full h-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="w-full max-w-3xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => setCurrentScreen(2)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-lg">
            {/* Step 1: Industry & Job Titles */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Industry & Job Titles
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry *
                  </label>
                  <input
                    type="text"
                    value={requirements.industry}
                    onChange={(e) =>
                      setRequirements({ ...requirements, industry: e.target.value })
                    }
                    placeholder="e.g., SaaS, Healthcare, Finance"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Titles *
                  </label>
                  {requirements.jobTitles.map((title, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => updateJobTitle(index, e.target.value)}
                        placeholder="e.g., CEO, Marketing Director"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {requirements.jobTitles.length > 1 && (
                        <button
                          onClick={() => removeJobTitle(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addJobTitle}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add another job title</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Locations */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Target Locations
                </h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Locations *
                  </label>
                  {requirements.locations.map((location, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => updateLocation(index, e.target.value)}
                        placeholder="e.g., United States, New York, San Francisco"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {requirements.locations.length > 1 && (
                        <button
                          onClick={() => removeLocation(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addLocation}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mt-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add another location</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Company Size */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Company Size
                </h2>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Employees
                    </label>
                    <input
                      type="number"
                      value={requirements.companySize.min}
                      onChange={(e) =>
                        setRequirements({
                          ...requirements,
                          companySize: {
                            ...requirements.companySize,
                            min: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 10"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Employees
                    </label>
                    <input
                      type="number"
                      value={requirements.companySize.max}
                      onChange={(e) =>
                        setRequirements({
                          ...requirements,
                          companySize: {
                            ...requirements.companySize,
                            max: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 1000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Data Requirements & Volume */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Data Requirements & Volume
                </h2>

                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirements.needLinkedInUrl}
                      onChange={(e) =>
                        setRequirements({
                          ...requirements,
                          needLinkedInUrl: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Need LinkedIn URLs</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirements.needEmails}
                      onChange={(e) =>
                        setRequirements({
                          ...requirements,
                          needEmails: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Need Email Addresses</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requirements.needPhones}
                      onChange={(e) =>
                        setRequirements({
                          ...requirements,
                          needPhones: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Need Phone Numbers</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Volume Required *
                  </label>
                  <select
                    value={requirements.volume}
                    onChange={(e) =>
                      setRequirements({
                        ...requirements,
                        volume: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={100}>100 leads</option>
                    <option value={500}>500 leads</option>
                    <option value={1000}>1,000 leads</option>
                    <option value={5000}>5,000 leads</option>
                    <option value={10000}>10,000 leads</option>
                  </select>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                disabled={currentStep === 1}
                className="flex items-center gap-2 px-6 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
              >
                <span>{currentStep === totalSteps ? 'Complete Setup' : 'Next'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

