import React, { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { useTheme } from '../contexts/ThemeContext';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

interface Props {
  code: string;
}

let renderCounter = 0;

const MermaidPreview: React.FC<Props> = ({ code }) => {
  const { theme, themeId } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Pan & zoom state
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const isLight = themeId === 'minimal' || themeId === 'warm';
    const isWarm = themeId === 'warm';
    mermaid.initialize({
      startOnLoad: false,
      theme: isLight ? 'default' : 'dark',
      themeVariables: isWarm ? {
        primaryColor: '#f5f0eb',
        primaryTextColor: '#44403c',
        primaryBorderColor: '#d6d3d1',
        lineColor: '#a8a29e',
        secondaryColor: '#fafaf9',
        tertiaryColor: '#f5f5f4',
        background: '#fafaf9',
        mainBkg: '#ffffff',
        nodeBorder: '#d6d3d1',
        clusterBkg: '#fafaf9',
        titleColor: '#44403c',
        edgeLabelBackground: '#fafaf9',
      } : !isLight ? {
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
        padding: 20,
        nodeSpacing: 50,
        rankSpacing: 60,
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
          const svgEl = containerRef.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.maxWidth = 'none';
            svgEl.style.height = 'auto';
            svgEl.style.minHeight = '300px';
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to render Mermaid diagram');
      }
    };

    // Reset pan/zoom when code changes
    setScale(1);
    setOffset({ x: 0, y: 0 });
    render();
  }, [code, themeId]);

  // Wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.min(Math.max(prev * delta, 0.2), 5));
  }, []);

  // Pan start
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  }, [offset]);

  // Pan move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    });
  }, [isPanning]);

  // Pan end
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  if (error) {
    return (
      <div className="p-4 text-xs text-red-400 font-mono whitespace-pre-wrap">
        Mermaid render error: {error}
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full h-full overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        ref={containerRef}
        className="flex items-start justify-center p-6 origin-top-left transition-transform duration-75"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
        }}
      />

      {/* Zoom controls */}
      <div className={`absolute bottom-4 right-4 flex items-center gap-1.5 ${theme.bgTertiary} border ${theme.borderColor} p-1.5 ${theme.borderRadiusLg} ${theme.shadow}`}>
        <button
          onClick={() => setScale(s => Math.min(s + 0.2, 5))}
          className={`w-7 h-7 flex items-center justify-center ${theme.bgCardHover} ${theme.borderRadius} ${theme.textSecondary} transition-colors`}
          title="Zoom in"
        >
          <ZoomIn size={14} />
        </button>
        <span className={`text-[10px] font-mono ${theme.textMuted} w-10 text-center`}>
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale(s => Math.max(s - 0.2, 0.2))}
          className={`w-7 h-7 flex items-center justify-center ${theme.bgCardHover} ${theme.borderRadius} ${theme.textSecondary} transition-colors`}
          title="Zoom out"
        >
          <ZoomOut size={14} />
        </button>
        <div className={`w-px h-5 ${theme.borderColor} opacity-30`} />
        <button
          onClick={handleReset}
          className={`w-7 h-7 flex items-center justify-center ${theme.bgCardHover} ${theme.borderRadius} ${theme.textSecondary} transition-colors`}
          title="Reset view"
        >
          <Maximize size={14} />
        </button>
      </div>
    </div>
  );
};

export default MermaidPreview;
