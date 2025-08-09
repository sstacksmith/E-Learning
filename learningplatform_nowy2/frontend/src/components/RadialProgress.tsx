'use client';

interface RadialProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  animate?: boolean;
}

export const RadialProgress: React.FC<RadialProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className = '',
  showPercentage = true,
  animate = true
}) => {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        className={animate ? 'progress-ring transform -rotate-90' : 'transform -rotate-90'}
        width={size}
        height={size}
      >
        {/* Tło */}
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Postęp */}
        <circle
          className="text-[#4067EC] transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold">{Math.round(normalizedProgress)}%</span>
        </div>
      )}
    </div>
  );
};
