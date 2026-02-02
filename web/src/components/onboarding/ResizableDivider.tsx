'use client';
import React, { useState, useRef, useEffect } from 'react';
import { GripVertical } from 'lucide-react';
interface ResizableDividerProps {
  onResize: (newWidth: number) => void;
  minWidth?: number; // Percentage (e.g., 15 for 15%)
  maxWidth?: number; // Percentage (e.g., 70 for 70%)
}
export default function ResizableDivider({ 
  onResize, 
  minWidth = 15, 
  maxWidth = 70
}: ResizableDividerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dividerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (!dividerRef.current) return;
      const container = dividerRef.current.parentElement;
      if (!container) return;
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const percentage = (mouseX / containerRect.width) * 100;
      // Clamp between min and max percentages
      const clampedPercentage = Math.max(minWidth, Math.min(maxWidth, percentage));
      onResize(clampedPercentage);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection while dragging
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, onResize, minWidth, maxWidth]);
  return (
    <div
      ref={dividerRef}
      onMouseDown={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      className={`
        w-1 cursor-col-resize bg-gray-200 hover:bg-blue-500 transition-colors
        flex items-center justify-center group relative
        ${isDragging ? 'bg-blue-500' : ''}
      `}
      style={{ userSelect: 'none' }}
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute">
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}