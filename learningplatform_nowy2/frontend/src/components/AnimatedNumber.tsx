'use client';

import { useEffect, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatter?: (value: number) => string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1000,
  className = '',
  formatter = (val) => val.toString()
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = displayValue;
    
    const animate = () => {
      const currentTime = performance.now();
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Funkcja easing dla płynniejszej animacji
      const easeOutQuad = (t: number) => t * (2 - t);
      const currentValue = startValue + (value - startValue) * easeOutQuad(progress);
      
      setDisplayValue(Math.round(currentValue));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, displayValue]);

  return (
    <span className={`number-animation ${className}`}>
      {formatter(displayValue)}
    </span>
  );
};
