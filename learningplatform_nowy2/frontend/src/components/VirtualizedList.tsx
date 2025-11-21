'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
}

export function VirtualizedList<T>({
  items,
  height,
  itemHeight,
  renderItem,
  overscan = 5
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Memoized calculations
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);
  const visibleItemCount = useMemo(() => Math.ceil(height / itemHeight), [height, itemHeight]);
  
  const startIndex = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    return Math.max(0, start - overscan);
  }, [scrollTop, itemHeight, overscan]);
  
  const endIndex = useMemo(() => {
    const end = startIndex + visibleItemCount + overscan * 2;
    return Math.min(items.length - 1, end);
  }, [startIndex, visibleItemCount, overscan, items.length]);

  // Memoized visible items
  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  // Memoized offset styles
  const offsetY = useMemo(() => startIndex * itemHeight, [startIndex, itemHeight]);

  // Scroll handler with throttling dla płynności
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollTop = useRef(0);
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const currentScrollTop = target.scrollTop;
    
    // Throttle scroll updates - aktualizuj tylko co 16ms (60fps)
    if (scrollTimeoutRef.current === null) {
      lastScrollTop.current = currentScrollTop;
      setScrollTop(currentScrollTop);
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
        // Final update jeśli scroll się zmienił
        if (Math.abs(target.scrollTop - lastScrollTop.current) > 1) {
          setScrollTop(target.scrollTop);
        }
      }, 16);
    }
  }, []);

  // Auto-scroll to top when items change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      style={{ height, overflow: 'auto' }}
      onScroll={handleScroll}
      className="virtualized-list"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="virtualized-item"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedList;

