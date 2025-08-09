'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface TimePoint {
  date: string; // ISO string
  minutes: number;
}

interface TimeSeriesChartProps {
  data: TimePoint[];
  height?: number;
  className?: string;
  range: 'day' | 'week' | 'month' | 'year' | 'all';
  labels?: string[]; // optional precomputed x labels (not used yet visually)
  yMax?: number; // optional maximum for Y to keep axis and plot scales consistent
}

// Lekki wykres liniowy z gradientem, crosshair i animacją przejść
export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, height = 320, className = '', range, yMax }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const processed = useMemo(() => {
    const points = data
      .map(d => ({ x: new Date(d.date).getTime(), y: d.minutes }))
      .sort((a, b) => a.x - b.x);
    const minX = points.length ? points[0].x : 0;
    const maxX = points.length ? points[points.length - 1].x : 1;
    const computedMaxY = Math.max(1, ...points.map(p => p.y));
    const maxY = Math.max(1, yMax ?? computedMaxY);
    return { points, minX, maxX, maxY };
  }, [data, yMax]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    // Margins
    const margin = { top: 12, right: 8, bottom: 28, left: 8 };
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;

    const { points, minX, maxX, maxY } = processed;
    if (points.length === 0) {
      ctx.clearRect(0, 0, width, height);
      return;
    }

    const xScale = (x: number) => margin.left + ((x - minX) / (maxX - minX || 1)) * w;
    const yScale = (y: number) => margin.top + h - (y / maxY) * h;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, margin.top, 0, margin.top + h);
    grad.addColorStop(0, 'rgba(64, 103, 236, 0.35)');
    grad.addColorStop(1, 'rgba(64, 103, 236, 0.00)');

    // Animated path
    const path = new Path2D();
    points.forEach((p, i) => {
      const px = xScale(p.x);
      const py = yScale(p.y);
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    });

    // stroke
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#4067EC';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke(path);

    // fill under curve
    const fillPath = new Path2D(path);
    const last = points[points.length - 1];
    const first = points[0];
    fillPath.lineTo(xScale(last.x), yScale(0));
    fillPath.lineTo(xScale(first.x), yScale(0));
    fillPath.closePath();
    ctx.fillStyle = grad;
    ctx.fill(fillPath);

    // x-axis labels
    const tickCount = 6;
    const ticks: number[] = [];
    for (let i = 0; i < tickCount; i += 1) {
      ticks.push(minX + (i / (tickCount - 1)) * (maxX - minX));
    }

    const formatTick = (t: number): string => {
      const dt = new Date(t);
      if (range === 'day') return dt.toLocaleTimeString('pl-PL', { hour: '2-digit' });
      if (range === 'week' || range === 'month') return dt.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit' });
      return dt.toLocaleDateString('pl-PL', { month: 'short' });
    };

    ctx.fillStyle = '#6b7280';
    ctx.font = '11px Inter, system-ui, sans-serif';
    ticks.forEach((t) => {
      const tx = xScale(t);
      const label = formatTick(t);
      const tw = ctx.measureText(label).width;
      ctx.fillText(label, Math.min(Math.max(tx - tw / 2, margin.left), width - margin.right - tw), margin.top + h + 16);
    });

    // hover crosshair
    if (hoverX !== null) {
      // find nearest point by x
      // const px = hoverX * dpr; // not used, keep ratio math below
      const rel = hoverX - margin.left;
      const ratio = Math.max(0, Math.min(1, rel / (w || 1)));
      const targetX = minX + ratio * (maxX - minX);
      const nearest = points.reduce((prev, curr) => Math.abs(curr.x - targetX) < Math.abs(prev.x - targetX) ? curr : prev);
      const nx = xScale(nearest.x);
      const ny = yScale(nearest.y);

      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(nx, margin.top);
      ctx.lineTo(nx, margin.top + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(nx, ny, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#4067EC';
      ctx.fill();
      ctx.restore();

      // tooltip
      const tip = `${nearest.y} min`;
      ctx.save();
      ctx.font = '12px Inter, system-ui, sans-serif';
      const tw = ctx.measureText(tip).width + 10;
      const th = 22;
      const tx = Math.min(Math.max(nx - tw / 2, 6), width - tw - 6);
      const ty = Math.max(ny - 28, 6);
      ctx.fillStyle = 'rgba(17,24,39,0.9)';
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, tw, th, 6);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillText(tip, tx + 5, ty + 15);
      ctx.restore();
    }

  }, [data, height, processed, hoverX, range]);

  // mouse handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      setHoverX(e.clientX - rect.left);
    };
    const onLeave = () => setHoverX(null);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div className={className}>
      <canvas ref={canvasRef} />
    </div>
  );
};

export default TimeSeriesChart;


