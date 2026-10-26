import React, { useLayoutEffect, useRef } from 'react';

/**
 * Text box that grows with what is written (all the text stays visible, no inner scroll), from `rows` lines up to
 * `maxHeight` pixels.
 */
export const AutoTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { maxHeight?: number }> = ({
  maxHeight = 480,
  style,
  ...props
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight + 2 > maxHeight ? 'auto' : 'hidden';
  }, [props.value, maxHeight]);
  return <textarea ref={ref} style={{ resize: 'vertical', ...style }} {...props} />;
};
