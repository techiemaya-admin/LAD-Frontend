'use client';

import React from 'react';
import { GoogleAuthIntegration } from './GoogleAuthIntegration';
import { MicrosoftAuthIntegration } from './MicrosoftAuthIntegration';
import { WhatsAppIntegration } from './WhatsAppIntegration';
import { LinkedInIntegration } from './LinkedInIntegration';

export const IntegrationsSettings: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Email & Calendar Integrations */}
      <div>
        <h3 className="text-gray-900 text-lg font-semibold mb-4">Email & Calendar</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Google Integration */}
          <GoogleAuthIntegration />

          {/* Microsoft Integration */}
          <MicrosoftAuthIntegration />
        </div>
      </div>

      {/* Social Integrations */}
      <div>
        <h3 className="text-gray-900 text-lg font-semibold mb-4">Social Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* LinkedIn Integration */}
          <LinkedInIntegration />

          {/* Slack Integration Card */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 shadow-sm transition-colors">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                <svg viewBox="0 0 54 54" className="w-full h-full">
                  <g>
                    <path fill="#E01E5A" d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386"/>
                    <path fill="#36C5F0" d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387"/>
                    <path fill="#2EB67D" d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386"/>
                    <path fill="#ECB22E" d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.25m14.336 0v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387V34.25a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387"/>
                  </g>
                </svg>
              </div>
              <h4 className="text-gray-900 font-semibold text-lg">Slack</h4>
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Integrate FuseAI Agent to your Slack workspace to receive regular updates from different products about your business.
            </p>
            <button className="w-full bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>Connect</span>
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Integration */}
      <div>
        <h3 className="text-gray-900 text-lg font-semibold mb-4">Messaging</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WhatsAppIntegration />
        </div>
      </div>
    </div>
  );
};
