'use client';

import { useEffect, useMemo, useRef } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

interface GradeData {
  grade: number;
  count: number;
  color: string;
}

interface GradesChartProps {
  grades: GradeData[];
  className?: string;
  subjects?: string[];
  selectedSubject?: string;
  onSubjectChange?: (s: string) => void;
}

// Kolory są przekazywane jako props w komponencie

export const GradesChart: React.FC<GradesChartProps> = ({ grades, className = '', subjects = [], selectedSubject, onSubjectChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const average = grades.length > 0
    ? grades.reduce((sum, grade) => sum + (grade.grade * grade.count), 0) / 
      grades.reduce((sum, grade) => sum + grade.count, 0)
    : 0;

  const total = useMemo(() => grades.reduce((s, g) => s + g.count, 0), [grades]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ustaw rozmiar canvas
    const size = 200;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.4;

    // Oblicz całkowitą sumę
    const total = grades.reduce((sum, grade) => sum + grade.count, 0);
    if (total === 0) return;

    // Rysuj wykres
    let startAngle = -Math.PI / 2;
    grades.forEach(grade => {
      const sliceAngle = (2 * Math.PI * grade.count) / total;

      // Animacja
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const currentAngle = 0;
        const startTime = performance.now();
  const duration = 1000; // 1 sekunda na animację

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = progress * (2 - progress); // Ease-out quad
    const currentAngle = sliceAngle * easedProgress;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + currentAngle);
    ctx.fillStyle = grade.color;
    ctx.fill();

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  };

  requestAnimationFrame(animate);
      startAngle += sliceAngle;
    });

    // Dodaj efekt 3D
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.7, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';

  }, [grades]);

  return (
    <div className={`relative ${className}`}>
      {subjects.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <select
            value={selectedSubject || ''}
            onChange={(e) => onSubjectChange?.(e.target.value)}
            className="px-3 py-1.5 border rounded-lg text-sm"
          >
            <option value="">Wszystkie przedmioty</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="text-sm text-gray-500">Łącznie ocen: {total}</div>
        </div>
      )}
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold text-gray-800">
          <AnimatedNumber 
            value={Math.round(average * 100)} 
            duration={1500}
            formatter={(val) => (val / 100).toFixed(2)}
          />
        </div>
        <div className="text-sm text-gray-500">Średnia ocen</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {grades.map((grade) => (
          <div 
            key={grade.grade}
            className="flex items-center gap-2 text-sm"
          >
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: grade.color }}
            />
            <span className="text-gray-600">
              {grade.grade}.0 ({grade.count})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
