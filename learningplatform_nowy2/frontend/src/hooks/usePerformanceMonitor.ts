import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  componentName: string;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

export const usePerformanceMonitor = (
  componentName: string,
  options: UsePerformanceMonitorOptions = {}
) => {
  const { enabled = true, logToConsole = false, onMetrics } = options;
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  // Start measuring render time
  const startRender = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  // End measuring render time
  const endRender = useCallback(() => {
    if (!enabled) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    renderCount.current += 1;

    const metrics: PerformanceMetrics = {
      renderTime,
      componentName,
      timestamp: Date.now(),
      memoryUsage: (performance as any).memory?.usedJSHeapSize
    };

    if (logToConsole) {
      console.log(`🚀 ${componentName} Performance:`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        renderCount: renderCount.current,
        memoryUsage: metrics.memoryUsage ? `${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
      });
    }

    onMetrics?.(metrics);
  }, [enabled, componentName, logToConsole, onMetrics]);

  // Measure effect execution time
  const measureEffect = useCallback((effectName: string, effectFn: () => void) => {
    if (!enabled) {
      effectFn();
      return;
    }

    const startTime = performance.now();
    effectFn();
    const executionTime = performance.now() - startTime;

    if (logToConsole) {
      console.log(`⚡ ${componentName} Effect ${effectName}: ${executionTime.toFixed(2)}ms`);
    }
  }, [enabled, componentName, logToConsole]);

  // Measure async operation
  const measureAsync = useCallback(async <T>(
    operationName: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    if (!enabled) {
      return await asyncFn();
    }

    const startTime = performance.now();
    try {
      const result = await asyncFn();
      const executionTime = performance.now() - startTime;

      if (logToConsole) {
        console.log(`🔄 ${componentName} Async ${operationName}: ${executionTime.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      if (logToConsole) {
        console.error(`❌ ${componentName} Async ${operationName} failed after ${executionTime.toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }, [enabled, componentName, logToConsole]);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => ({
    componentName,
    renderCount: renderCount.current,
    averageRenderTime: renderCount.current > 0 ? 
      (performance.now() - renderStartTime.current) / renderCount.current : 0
  }), [componentName]);

  // Auto-measure on mount/unmount
  useEffect(() => {
    if (enabled) {
      startRender();
      return () => {
        endRender();
      };
    }
  }, [enabled, startRender, endRender]);

  return {
    startRender,
    endRender,
    measureEffect,
    measureAsync,
    getPerformanceSummary,
    renderCount: renderCount.current
  };
};

export default usePerformanceMonitor;

