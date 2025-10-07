"use client";
import React from 'react';

interface DropZoneIndicatorProps {
  isVisible: boolean;
  text?: string;
}

export const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({
  isVisible,
  text = "Upuść tutaj"
}) => {
  if (!isVisible) return null;

  return (
    <div className="flex items-center justify-center py-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 transition-all duration-200">
      <div className="flex items-center gap-2 text-blue-600">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">{text}</span>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};
