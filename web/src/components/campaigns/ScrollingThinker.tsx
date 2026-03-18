'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Activity {
  type: string;
  message: string;
  timestamp: number;
  elapsed: number;
  metadata?: Record<string, any>;
}

interface ScrollingThinkerProps {
  activities: Activity[];
  isLoading?: boolean;
  onClose?: () => void;
}

export default function ScrollingThinker({ activities, isLoading = false, onClose }: ScrollingThinkerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new activities arrive
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activities, autoScroll]);

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-[#0b1957] text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 hover:bg-[#0a1540] transition-colors"
        >
          <span className="text-sm font-medium">🧠 Thinking... ({activities.length})</span>
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white border border-[#E2E8F0] rounded-xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0b1957] to-[#1a3a7a] text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🧠</span>
          <div>
            <h3 className="font-bold text-sm">Analyzing Leads</h3>
            <p className="text-xs opacity-90">{activities.length} step{activities.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          )}
          <button
            onClick={() => setIsExpanded(false)}
            className="hover:bg-white/20 p-1 rounded transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div
        ref={containerRef}
        className="overflow-y-auto max-h-72 bg-[#F8F9FE]"
        onScroll={(e) => {
          const element = e.currentTarget;
          const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 10;
          setAutoScroll(isAtBottom);
        }}
      >
        <div className="p-4 space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#64748B]">Waiting for activities...</p>
            </div>
          ) : (
            activities.map((activity, idx) => (
              <div
                key={idx}
                className="animate-slideIn"
                style={{
                  animation: `slideIn 0.4s ease-out`,
                  animationDelay: `${idx * 0.05}s`,
                }}
              >
                <div className="flex gap-3 items-start">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center pt-1">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        idx === activities.length - 1 && isLoading
                          ? 'bg-green-500 animate-pulse'
                          : 'bg-[#0b1957]'
                      }`}
                    />
                    {idx !== activities.length - 1 && (
                      <div className="w-0.5 h-8 bg-[#E2E8F0] mt-1" />
                    )}
                  </div>

                  {/* Activity content */}
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm text-[#1E293B] font-medium">{activity.message}</p>
                    <p className="text-xs text-[#64748B] mt-1">
                      {(activity.elapsed / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}

          {isLoading && activities.length > 0 && (
            <div className="flex gap-3 items-start animate-pulse">
              <div className="flex flex-col items-center pt-1">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <div className="flex-1 pt-0.5">
                <div className="h-4 bg-[#E2E8F0] rounded w-48" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-between">
        <p className="text-xs text-[#64748B]">
          {isLoading ? 'Processing...' : `Completed in ${activities.length > 0 ? (activities[activities.length - 1].elapsed / 1000).toFixed(1) : '0'}s`}
        </p>
        {onClose && (
          <button
            onClick={onClose}
            className="text-xs text-[#0b1957] hover:text-[#1a3a7a] font-medium transition-colors"
          >
            ✕ Close
          </button>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-slideIn {
          animation: slideIn 0.4s ease-out forwards;
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
