'use client';

import React from 'react';
import { HeroSectionMacbook } from './HeroSectionMacbook';

export function MacbookScrollDemo() {
  return (
    <div className="w-full overflow-hidden bg-gradient-to-b from-white via-gray-50 to-white dark:from-[#0B0B0F] dark:via-gray-950 dark:to-[#0B0B0F] transition-colors duration-300">
      {/* Macbook component */}
      <HeroSectionMacbook />

      {/* Features below macbook */}
      <div className="relative w-full max-w-6xl mx-auto px-4 py-20 mt-12">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: 'Minimal Grid Design',
              description: 'Asymmetric grid lines with subtle parallax animation',
            },
            {
              title: 'Premium Typography',
              description: 'Refined minimalism with white/10 opacity text that fades on scroll',
            },
            {
              title: 'Dark & Light Modes',
              description: 'Full theme support with adaptive colors for both modes',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-6 rounded-lg border transition-all duration-300 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-950 border-gray-200 dark:border-gray-800 hover:border-purple-500/50 dark:hover:border-purple-400/50"
            >
              <h3 className="font-bold text-gray-900 dark:text-white mb-2 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
