'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { UsageCalculator } from '@/components/UsageCalculator';
import { Shield, Zap, Users, Check } from 'lucide-react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PricingPage() {
  const router = useRouter();
  const handleGetStarted = () => {
    // Check if user is logged in by checking for token in localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      // User is logged in, go to settings with credits tab and open modal
      router.push('/settings?tab=credits&action=add');
    } else {
      // User not logged in, go to login page
      router.push('/login');
    }
  };
  return (
    <div className="min-h-screen bg-white dark:bg-[#0b1957]">

      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white dark:from-[#0b1957] dark:to-[#0b1957] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Simple, credit-based
            <span className="text-blue-600 ml-3">pricing</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Buy credits once, use them for any feature. No subscriptions, no monthly fees, no expiration.
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Credits Never Expire
            </div>
            <div className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Use Across All Features
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              No Hidden Fees
            </div>
          </div>
        </div>
      </div>
      {/* Pricing Plans - Subscription Tiers */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Flexible Pricing Plans
            </h2>
            <p className="text-xl text-gray-600">
              Choose the plan that fits your business needs. Credits included with every plan.
            </p>
          </div>

          {/* Non-Enterprise Plans */}
          <div className="mb-16">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Standard Plans</h3>
              <p className="text-gray-600">Perfect for individuals and new beginners</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {/* Starter Plan */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-xl flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Starter</h3>
                  <p className="text-sm text-gray-600 mt-1">Get started with essentials</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$99</span>
                  </div>
                  <div className="text-lg font-semibold text-blue-600 mt-2">1,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>LinkedIn outreach</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Lead Data Enrichment</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Google & Outlook integration</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Calendar management</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Unlimited users</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI powered chat-based campaign setup</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>CRM pipeline</span>
                  </li>
                </ul>
                <button 
                  onClick={handleGetStarted}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer mt-auto"
                >
                  Get Started
                </button>
              </div>

              {/* Professional Plan */}
              <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 relative hover:shadow-xl transition-all duration-200 transform scale-105 flex flex-col">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Professional</h3>
                  <p className="text-sm text-gray-600 mt-1">For small teams</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$199</span>
                  </div>
                  <div className="text-lg font-semibold text-blue-600 mt-2">3,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Everything in Starter</strong></span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>WhatsApp integration</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Inbound leads collection into pipeline</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Campaign analytics</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Recommendations for deal closure</span>
                  </li>
                </ul>
                <button 
                  onClick={handleGetStarted}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer mt-auto"
                >
                  Get Started
                </button>
              </div>

              {/* Business Plan */}
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-xl flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Business</h3>
                  <p className="text-sm text-gray-600 mt-1">For growing businesses</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$499</span>
                  </div>
                  <div className="text-lg font-semibold text-blue-600 mt-2">12,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Everything in Professional</strong></span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Voice Agent</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Chat Agent for LinkedIn, WhatsApp</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Priority Support</span>
                  </li>
                </ul>
                <button 
                  onClick={handleGetStarted}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer mt-auto"
                >
                  Get Started
                </button>
              </div>
            </div>
          </div>

          {/* Enterprise Plans */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 border-2 border-purple-300">
            <div className="text-center mb-8">
              <div className="inline-block bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4">
                ENTERPRISE
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">Complete Sales Pipeline Automation with Customizations</h3>
              <p className="text-gray-600">One-time agent setup and training: <span className="font-bold text-purple-600">$3,000</span></p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Enterprise Starter */}
              <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 hover:border-purple-500 transition-all duration-200 hover:shadow-xl flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Enterprise Starter</h3>
                  <p className="text-sm text-gray-600 mt-1">Foundation for enterprises</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$49</span>
                  </div>
                  <div className="text-lg font-semibold text-purple-600 mt-2">1,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Chat Agent</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>LinkedIn outreach</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Lead Data Enrichment</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Google & Outlook integration</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Calendar management</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Unlimited users</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI powered chat-based campaign setup</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>CRM pipeline</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Dedicated Support</span>
                  </li>
                </ul>
                <button 
                  onClick={() => window.location.href = '/contact'}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer mt-auto"
                >
                  Contact Sales
                </button>
              </div>

              {/* Enterprise Professional */}
              <div className="bg-white rounded-2xl border-2 border-purple-400 p-6 relative hover:shadow-xl transition-all duration-200 transform scale-105 flex flex-col">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Recommended
                  </span>
                </div>
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Enterprise Professional</h3>
                  <p className="text-sm text-gray-600 mt-1">Advanced capabilities</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$149</span>
                  </div>
                  <div className="text-lg font-semibold text-purple-600 mt-2">3,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Everything in Enterprise Starter</strong></span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Voice Agent</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Chat Agent</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>WhatsApp integration</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Inbound leads collection into pipeline</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Campaign analytics</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Recommendations for deal closure</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Dedicated Support</span>
                  </li>
                </ul>
                <button 
                  onClick={() => window.location.href = '/contact'}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer mt-auto"
                >
                  Contact Sales
                </button>
              </div>

              {/* Enterprise Business */}
              <div className="bg-white rounded-2xl border-2 border-purple-200 p-6 hover:border-purple-500 transition-all duration-200 hover:shadow-xl flex flex-col">
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Enterprise Business</h3>
                  <p className="text-sm text-gray-600 mt-1">Full automation & customization</p>
                </div>
                <div className="mb-6">
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold text-gray-900">$399</span>
                  </div>
                  <div className="text-lg font-semibold text-purple-600 mt-2">12,000 credits included</div>
                </div>
                <ul className="space-y-3 mb-6 flex-grow">
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span><strong>Everything in Enterprise Professional</strong></span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Voice Agent</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>AI Chat Agent for LinkedIn, WhatsApp</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Custom CRM integrations</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Third-party app integrations</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>App customization</span>
                  </li>
                  <li className="flex items-start text-sm">
                    <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span>Dedicated Support</span>
                  </li>
                </ul>
                <button 
                  onClick={() => window.location.href = '/contact'}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer mt-auto"
                >
                  Contact Sales
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Pricing Breakdown */}
      <div className="py-16 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Feature Pricing Details
            </h2>
            <p className="text-xl text-gray-600">
              Transparent credit costs for each feature
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Voice Calls - Cartesia */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Voice Calls</h3>
                <div className="text-2xl">📞</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-blue-600">3</div>
                <div className="text-sm text-gray-600">credits per minute</div>
                <div className="text-xs text-gray-500 mt-1">(Cartesia TTS)</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>5 mins</span>
                  <span className="font-medium">15 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>10 mins</span>
                  <span className="font-medium">30 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>20 mins</span>
                  <span className="font-medium">60 cr</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="text-xs text-gray-600">
                  Includes analytics report
                </div>
              </div>
            </div>
            {/* Voice Calls - ElevenLabs */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Premium Voice</h3>
                <div className="text-2xl">🎙️</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-purple-600">4</div>
                <div className="text-sm text-gray-600">credits per minute</div>
                <div className="text-xs text-gray-500 mt-1">(ElevenLabs TTS)</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>5 mins</span>
                  <span className="font-medium">20 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>10 mins</span>
                  <span className="font-medium">40 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>20 mins</span>
                  <span className="font-medium">80 cr</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="text-xs text-gray-600">
                  Higher quality voice + analytics
                </div>
              </div>
            </div>
            {/* Lead Enrichment Data */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Lead Enrichment</h3>
                <div className="text-2xl">🎯</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-orange-600">1-10</div>
                <div className="text-sm text-gray-600">credits per lead</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Email + LinkedIn URL</span>
                  <span className="font-medium">2 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>LinkedIn Connection</span>
                  <span className="font-medium">1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Template Message</span>
                  <span className="font-medium">5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone Reveal</span>
                  <span className="font-medium">10 credits</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-orange-200">
                <div className="text-xs text-gray-600">
                  100 leads with phones ≈ 1,000 credits
                </div>
              </div>
            </div>
            {/* LinkedIn & Social */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
                <div className="text-2xl">💼</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-green-600">20-50</div>
                <div className="text-sm text-gray-600">credits per month</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>LinkedIn</span>
                  <span className="font-medium">50 cr/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Google</span>
                  <span className="font-medium">20 cr/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Outlook</span>
                  <span className="font-medium">20 cr/mo</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="text-xs text-gray-600">
                  Monthly connection fees
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Usage Calculator */}
      <UsageCalculator />
      {/* FAQ Section */}
      <div className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-600">
              Everything you need to know about our pricing and features
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What are credits and how do they work?
              </h3>
              <p className="text-gray-600">
                Credits are our unified currency for all platform features. Each action (voice calls, data scraping, 
                AI queries) costs a specific number of credits. You buy credits once and use them across any feature.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do credits expire?
              </h3>
              <p className="text-gray-600">
                No! Credits never expire. Buy once and use them whenever you need, at your own pace. There are no 
                monthly subscriptions or recurring fees.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I buy more credits anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can purchase additional credit packages anytime. Your new credits are added to your existing 
                balance immediately, and they all work together as one pool.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I get a refund on credits?
              </h3>
              <p className="text-gray-600">
                We offer a 7-day money-back guarantee on credit purchases if you're not satisfied with our service 
                and have used less than 10% of your purchased credits.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards (Visa, MasterCard, American Express) and debit cards 
                through our secure Stripe payment processor.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How much do specific features cost?
              </h3>
              <p className="text-gray-600">
                Voice calls: 3 cr/min (Cartesia) or 4 cr/min (ElevenLabs) • Email + LinkedIn URL: 2 credits • 
                LinkedIn Connection: 1 credit • Template Message: 5 credits • Phone reveal: 10 credits • 
                Platform connections: LinkedIn 50 cr/mo, Google/Outlook 20 cr/mo. See detailed pricing above.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I get started?
              </h3>
              <p className="text-gray-600">
                Choose a plan that fits your needs, sign up, and start using all features immediately. 
                Credits are added to your account upon purchase and never expire.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* CTA Section */}
      <div className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start with Starter plan today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get started with 1,000 credits for just $99. No subscriptions. Credits never expire.
          </p>
          <div className="flex flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
            >
              Get Started
            </button>
            <button
              onClick={() => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) {
                  router.push('/settings?tab=credits');
                } else {
                  router.push('/login');
                }
              }}
              className="px-8 py-3 border border-blue-300 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              View All Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}