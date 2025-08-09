'use client';

import { useEffect, useRef } from 'react';
import type { MathfieldElement } from 'mathlive';

interface MathViewProps {
  content: string;
}

export default function MathView({ content }: MathViewProps) {
  const mathFieldRef = useRef<MathfieldElement | null>(null);

  useEffect(() => {
    if (mathFieldRef.current) {
      const mathField = mathFieldRef.current;
      mathField.value = content;
    }
  }, [content]);

  return (
    // @ts-expect-error math-field is a custom element provided by mathlive
    <math-field
      ref={mathFieldRef as unknown as React.Ref<MathfieldElement>}
      read-only
      style={{ minWidth: '200px', padding: '8px', border: 'none' }}
    />
  );
}