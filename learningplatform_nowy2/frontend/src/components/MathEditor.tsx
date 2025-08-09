'use client';

import { useEffect, useRef } from 'react';
import 'mathlive';
import type { MathfieldElement } from 'mathlive';

// Declare the custom element type
// JSX IntrinsicElements for 'math-field' are declared in src/types/mathlive.d.ts

interface MathEditorProps {
  initialValue?: string;
  onChange?: (latex: string) => void;
  readOnly?: boolean;
}

export const MathEditor: React.FC<MathEditorProps> = ({
  initialValue = '',
  onChange,
  readOnly = false,
}) => {
  const mathfieldRef = useRef<MathfieldElement>(null);

  useEffect(() => {
    if (!mathfieldRef.current) return;

    // Configure MathLive options using runtime-safe access
    // Using a loose-typed handle to avoid private API typing issues
    const mf = mathfieldRef.current as unknown as Record<string, unknown> & { setOptions?: (opts: Record<string, unknown>) => void };
    if (typeof mf.setOptions === 'function') {
      mf.setOptions({
        virtualKeyboardMode: 'manual',
        virtualKeyboards: 'all',
        smartMode: true,
        letterShapeStyle: 'tex',
        readOnly,
      });
    } else {
      mf.virtualKeyboardMode = 'manual';
      mf.virtualKeyboards = 'all';
      mf.smartMode = true;
      mf.letterShapeStyle = 'tex';
      mf.readOnly = readOnly;
    }

    // Set initial value
    mathfieldRef.current.value = initialValue;

    // Add event listeners
    const handleInput = () => {
      if (mathfieldRef.current) {
        onChange?.(mathfieldRef.current.value);
      }
    };

    mathfieldRef.current.addEventListener('input', handleInput);

    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const mathfield = mathfieldRef.current;
      if (mathfield) {
        mathfield.removeEventListener('input', handleInput);
      }
    };
  }, [initialValue, onChange, readOnly]);

  // @ts-expect-error math-field is a custom element provided by mathlive
  return <math-field ref={mathfieldRef as unknown as React.Ref<MathfieldElement>} />;
}; 