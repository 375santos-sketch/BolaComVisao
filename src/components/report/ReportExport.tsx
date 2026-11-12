import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** A4 (210 mm) is 794 px wide at 96 dpi: the preview scales the pages to the space it has. */
const A4_PX = 794;

export const ScaledPreview: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ scale: 1, height: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const scale = Math.min(1, outer.current.clientWidth / A4_PX);
      setBox({ scale, height: inner.current.scrollHeight * scale });
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative overflow-hidden" style={{ height: box.height || undefined }}>
      <div ref={inner} style={{ width: A4_PX, transform: `scale(${box.scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  );
};

/**
 * While mounted, renders the pages once more at their real size off screen and saves them as a PDF file, then calls
 * onDone (true when the file was made).
 */
export const PdfExport: React.FC<{ filename: string; onDone: (ok: boolean) => void; children: React.ReactNode }> = ({
  filename,
  onDone,
  children
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { reportPagesToPdf } = await import('../../lib/pdf/reportPagesPdf');
        if (cancelled || !ref.current) return;
        await reportPagesToPdf(ref.current, filename);
        if (!cancelled) done.current(true);
      } catch {
        if (!cancelled) done.current(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filename]);
  return (
    <div className="mr-export" aria-hidden ref={ref}>
      {children}
    </div>
  );
};
