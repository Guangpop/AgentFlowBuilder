import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  code: string;
}

let renderCounter = 0;

const MermaidPreview: React.FC<Props> = ({ code }) => {
  const { themeId } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const isDark = themeId !== 'minimal';
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'default',
      themeVariables: isDark ? {
        primaryColor: '#1e3a5f',
        primaryTextColor: '#e2e8f0',
        primaryBorderColor: '#3b82f6',
        lineColor: '#64748b',
        secondaryColor: '#1e293b',
        tertiaryColor: '#0f172a',
        background: '#0f172a',
        mainBkg: '#1e293b',
        nodeBorder: '#3b82f6',
        clusterBkg: '#1e293b',
        titleColor: '#e2e8f0',
        edgeLabelBackground: '#1e293b',
      } : {},
      flowchart: {
        htmlLabels: true,
        curve: 'basis',
        padding: 15,
      },
    });
  }, [themeId]);

  useEffect(() => {
    if (!code || !containerRef.current) return;

    const render = async () => {
      try {
        setError(null);
        const id = `mermaid-svg-${++renderCounter}`;
        const { svg } = await mermaid.render(id, code);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          // Make SVG responsive
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = '100%';
            svgEl.style.height = 'auto';
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to render Mermaid diagram');
      }
    };

    render();
  }, [code, themeId]);

  if (error) {
    return (
      <div className="p-4 text-xs text-red-400 font-mono whitespace-pre-wrap">
        Mermaid render error: {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex items-center justify-center p-6 overflow-auto w-full h-full"
    />
  );
};

export default MermaidPreview;
