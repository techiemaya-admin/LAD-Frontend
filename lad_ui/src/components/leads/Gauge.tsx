import React, { useMemo } from 'react';

interface GaugeProps {
  value?: number;
  color?: string;
  gradient?: boolean;
  label?: string;
  fontSize?: number;
  size?: number;
  strokeWidth?: number;
  semicircle?: boolean;
}

const clamp = (val: number, min = 0, max = 100) => Math.min(Math.max(val, min), max);

const Gauge: React.FC<GaugeProps> = ({
  value = 0,
  color = '#312e81',
  gradient = false,
  label,
  fontSize = 16,
  size = 70,
  strokeWidth = 6,
  semicircle = false,
}) => {
  const normalized = clamp(value);

  const gradientId = useMemo(
    () => `gauge-gradient-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  // For semicircle gauge (engagement score)
  if (semicircle) {
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = (size - strokeWidth) / 2 - 5;
    const startAngle = -180;
    const endAngle = 0;
    const angleRange = endAngle - startAngle;
    const needleAngle = startAngle + (normalized / 100) * angleRange;

    const polarToCartesian = (angle: number, r: number) => {
      const angleInRadians = (angle * Math.PI) / 180;
      return {
        x: centerX + r * Math.cos(angleInRadians),
        y: centerY + r * Math.sin(angleInRadians),
      };
    };

    const startPoint = polarToCartesian(startAngle, radius);
    const endPoint = polarToCartesian(endAngle, radius);
    const needleEnd = polarToCartesian(needleAngle, radius - strokeWidth / 2);
    
    // Calculate needle base points for triangle pointer
    const needleBaseLeft = polarToCartesian(needleAngle - 2, 8);
    const needleBaseRight = polarToCartesian(needleAngle + 2, 8);

    const arcPath = `
      M ${startPoint.x} ${startPoint.y}
      A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y}
    `;
    
    // Sharp triangle pointer path
    const needlePath = `
      M ${needleBaseLeft.x} ${needleBaseLeft.y}
      L ${needleEnd.x} ${needleEnd.y}
      L ${needleBaseRight.x} ${needleBaseRight.y}
      Z
    `;

    // Generate tick marks
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + (i / 10) * angleRange;
      const tickStart = polarToCartesian(angle, radius - strokeWidth / 2);
      const tickEnd = polarToCartesian(angle, radius - strokeWidth / 2 - 4);
      ticks.push(
        <line
          key={i}
          x1={tickStart.x}
          y1={tickStart.y}
          x2={tickEnd.x}
          y2={tickEnd.y}
          stroke="#475569"
          strokeWidth="2"
          strokeLinecap="round"
        />
      );
    }

    return (
      <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
        <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="15%" stopColor="#ef4444" />
              <stop offset="30%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="70%" stopColor="#84cc16" />
              <stop offset="85%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path
            d={arcPath}
            fill="transparent"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Gradient arc */}
          <path
            d={arcPath}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Tick marks */}
          {ticks}
          {/* Sharp triangle needle pointer */}
          <path
            d={needlePath}
            fill="#1f2937"
            stroke="#1f2937"
            strokeWidth="0.5"
            strokeLinejoin="miter"
          />
          {/* Center dot with subtle shadow */}
          <circle cx={centerX} cy={centerY} r="4" fill="#1f2937" />
          <circle cx={centerX} cy={centerY} r="2" fill="#374151" />
        </svg>
      </div>
    );
  }

  // For circular gauge (conversion score)
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;
  const displayLabel = label ?? `${Math.round(normalized)}%`;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {gradient && (
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
          </defs>
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-semibold text-slate-700"
          style={{ fontSize }}
        >
          {displayLabel}
        </span>
      </div>
    </div>
  );
};

export default Gauge;







