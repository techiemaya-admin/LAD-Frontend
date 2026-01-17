'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { SubscriptionPlans } from '../../components/SubscriptionPlans';
import { UsageCalculator } from '../../components/UsageCalculator';
import { Shield, Zap, Users, Check } from 'lucide-react';

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
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-gray-50 to-white py-16">
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

      {/* Pricing Plans - Credit Packages */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Credit Package
            </h2>
            <p className="text-xl text-gray-600">
              One-time purchase, lifetime access. Buy more credits anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Starter Pack */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-xl">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Starter Pack</h3>
                <p className="text-sm text-gray-600 mt-1">Perfect for trying out</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$29</span>
                </div>
                <div className="text-2xl font-semibold text-blue-600 mt-2">1,000 credits</div>
                <div className="text-sm text-gray-500 mt-1">$0.029 per credit</div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~4 mins voice calls (Cartesia)</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~2 Apollo lead searches with contacts</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~200 LinkedIn profile searches</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>Credits never expire</span>
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>

            {/* Professional */}
            <div className="bg-white rounded-2xl border-2 border-blue-500 p-6 relative hover:shadow-xl transition-all duration-200 transform scale-105">
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
                  <span className="text-4xl font-bold text-gray-900">$129</span>
                </div>
                <div className="text-2xl font-semibold text-blue-600 mt-2">5,000 credits</div>
                <div className="text-sm text-gray-500 mt-1">$0.0258 per credit</div>
                <div className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded mt-2">
                  Save 11%
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~20 mins voice calls (Cartesia)</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~10 Apollo lead searches with contacts</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~1,000 LinkedIn profile searches</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>

            {/* Business */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 hover:border-blue-500 transition-all duration-200 hover:shadow-xl">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Business</h3>
                <p className="text-sm text-gray-600 mt-1">For growing businesses</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$349</span>
                </div>
                <div className="text-2xl font-semibold text-blue-600 mt-2">15,000 credits</div>
                <div className="text-sm text-gray-500 mt-1">$0.0233 per credit</div>
                <div className="inline-block bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded mt-2">
                  Save 20%
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~60 mins voice calls (Cartesia)</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~30 Apollo lead searches with contacts</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~3,000 LinkedIn profile searches</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl border-2 border-purple-300 p-6 hover:border-purple-500 transition-all duration-200 hover:shadow-xl">
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Enterprise</h3>
                <p className="text-sm text-gray-600 mt-1">Maximum value</p>
              </div>
              <div className="mb-6">
                <div className="flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">$999</span>
                </div>
                <div className="text-2xl font-semibold text-purple-600 mt-2">50,000 credits</div>
                <div className="text-sm text-gray-500 mt-1">$0.020 per credit</div>
                <div className="inline-block bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded mt-2">
                  Save 31%
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~200 mins voice calls (Cartesia)</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~100 Apollo lead searches with contacts</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>~10,000 LinkedIn profile searches</span>
                </li>
                <li className="flex items-start text-sm">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span>White-glove support</span>
                </li>
              </ul>
              <button 
                onClick={handleGetStarted}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-colors cursor-pointer"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Plans */}
      <SubscriptionPlans />

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
                <div className="text-3xl font-bold text-blue-600">250</div>
                <div className="text-sm text-gray-600">credits per minute</div>
                <div className="text-xs text-gray-500 mt-1">(Cartesia TTS)</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>5 mins</span>
                  <span className="font-medium">1,250 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>10 mins</span>
                  <span className="font-medium">2,500 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>20 mins</span>
                  <span className="font-medium">5,000 cr</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="text-xs text-gray-600">
                  <div>+ 0.92 cr/min transcription</div>
                  <div>+ 50 cr/min LiveKit</div>
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
                <div className="text-3xl font-bold text-purple-600">500</div>
                <div className="text-sm text-gray-600">credits per minute</div>
                <div className="text-xs text-gray-500 mt-1">(ElevenLabs TTS)</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>5 mins</span>
                  <span className="font-medium">2,500 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>10 mins</span>
                  <span className="font-medium">5,000 cr</span>
                </div>
                <div className="flex justify-between">
                  <span>20 mins</span>
                  <span className="font-medium">10,000 cr</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-purple-200">
                <div className="text-xs text-gray-600">
                  Higher quality voice synthesis
                </div>
              </div>
            </div>

            {/* Apollo Data */}
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Apollo Search</h3>
                <div className="text-2xl">🎯</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-orange-600">1-8</div>
                <div className="text-sm text-gray-600">credits per action</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Search</span>
                  <span className="font-medium">1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Email</span>
                  <span className="font-medium">1 credit</span>
                </div>
                <div className="flex justify-between">
                  <span>Phone Unlock</span>
                  <span className="font-medium">8 credits</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-orange-200">
                <div className="text-xs text-gray-600">
                  100 leads ≈ 501 credits
                </div>
              </div>
            </div>

            {/* LinkedIn & Social */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Social Data</h3>
                <div className="text-2xl">💼</div>
              </div>
              <div className="mb-4">
                <div className="text-3xl font-bold text-green-600">2-5</div>
                <div className="text-sm text-gray-600">credits per search</div>
              </div>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>LinkedIn</span>
                  <span className="font-medium">5 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>Google</span>
                  <span className="font-medium">2 credits</span>
                </div>
                <div className="flex justify-between">
                  <span>50 profiles</span>
                  <span className="font-medium">250 credits</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-green-200">
                <div className="text-xs text-gray-600">
                  Includes profile data & posts
                </div>
              </div>
            </div>
          </div>

          {/* Lead Generation & AI Details */}
          <div className="mt-8 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Credit Usage Examples</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <div className="flex items-start">
                  <div className="bg-orange-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    1
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Apollo Lead Search</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>100 leads</strong> with emails and phones:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• 1 search = 1 credit</li>
                      <li>• 100 emails = 100 credits</li>
                      <li>• 50 phones = 400 credits</li>
                      <li className="font-medium pt-1">Total: ~501 credits</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start">
                  <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    2
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900 mb-2">LinkedIn Scraping</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>50 LinkedIn profiles</strong> with data:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Profile data</li>
                      <li>• Social media posts</li>
                      <li>• Professional background</li>
                      <li className="font-medium pt-1">Total: 250 credits</li>
                    </ul>
                  </div>
                </div>
              </div>
              <div>
                <div className="flex items-start">
                  <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                    3
                  </div>
                  <div className="ml-4">
                    <h4 className="font-semibold text-gray-900 mb-2">AI Queries</h4>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>1,000 AI queries</strong> for:
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1 ml-4">
                      <li>• Lead enrichment</li>
                      <li>• Content generation</li>
                      <li>• Data analysis</li>
                      <li className="font-medium pt-1">Total: 10 credits</li>
                    </ul>
                  </div>
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
                Voice calls (Cartesia): 250 credits/min • Apollo search: 1 credit • Email: 1 credit • 
                Phone unlock: 8 credits • LinkedIn: 5 credits • Transcription: 0.92 credits/min. 
                See detailed pricing above.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! All new accounts receive $5 worth of free credits to test the platform. No credit card required 
                to start. Try all features before committing to a purchase.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Start with free credits today
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Get $5 in free credits to explore all features. No credit card required. No subscriptions. No expiration.
          </p>
          <div className="flex flex-row gap-4 justify-center">
            <button
              onClick={() => {
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) {
                  router.push('/settings?tab=credits');
                } else {
                  router.push('/login');
                }
              }}
              className="px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
            >
              Claim Free Credits
            </button>
            <button
              onClick={handleGetStarted}
              className="px-8 py-3 border border-blue-300 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer"
            >
              Buy Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}