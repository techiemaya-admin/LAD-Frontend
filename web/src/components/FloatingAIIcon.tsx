'use client';
import React from 'react';
import { Bot } from 'lucide-react';

interface FloatingAIIconProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onClick?: () => void;
}

const positionClasses = {
  'bottom-right': 'bottom-[120px] right-6',
  'bottom-left': 'bottom-[120px] left-6',
  'top-right': 'top-[120px] right-6',
  'top-left': 'top-[120px] left-6',
};

export const FloatingAIIcon: React.FC<FloatingAIIconProps> = ({ 
  position = 'bottom-right',
  onClick 
}) => {
  return (
    <div 
      className={`fixed z-[1000] cursor-pointer flex items-center justify-center ${positionClasses[position]}`}
      onClick={onClick}
    >
      <div className="relative w-16 h-16 flex items-center justify-center animate-float">
        <div className="relative w-16 h-16 rounded-full bg-white border-2 border-[#0b1957] shadow-md flex items-center justify-center transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#0b1957]/20 hover:border-[#1a2d7a] group">
          <Bot className="w-8 h-8 text-[#0b1957] transition-colors group-hover:text-[#1a2d7a]" />
        </div>
      </div>
    </div>
  );
};

// Add to your globals.css:
// @keyframes float {
//   0%, 100% { transform: translateY(0px); }
//   50% { transform: translateY(-12px); }
// }
// .animate-float {
//   animation: float 3s ease-in-out infinite;
// }
