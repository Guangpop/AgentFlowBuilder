import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Workflow, WorkflowNode } from '../../types';
import { generateMermaid } from '@shared/export';
import { useTheme } from '../../contexts/ThemeContext';
import MermaidPreview from '../MermaidPreview';
import { ArrowLeft, Menu, X, Eye, BookOpen, Play } from 'lucide-react';
import { ViewerTOC } from './ViewerTOC';
import { ReadModeContent } from './ReadModeContent';
import { WalkModeContent } from './WalkModeContent';
import { WalkBreadcrumb } from './WalkBreadcrumb';
import { splitNodeForViewer, ViewerSectionData, findEntryNodeId } from './viewerUtils';

interface Props {
  workflowName: string;
  onExit: () => void;
}

type ViewMode = 'read' | 'walk';

const ViewerPage: React.FC<Props> = ({ workflowName, onExit }) => {
  const { theme, themeId } = useTheme();
  const isLight = themeId === 'warm' || themeId === 'minimal';

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [tocOpenMobile, setTocOpenMobile] = useState(false);
  const [activeBack, setActiveBack] = useState<{ source: string; target: string } | null>(null);
  const [mode, setMode] = useState<ViewMode>('read');
  const [walkTrail, setWalkTrail] = useState<string[]>([]);

  const sectionRefs = useRef(new Map<string, HTMLElement>());
  const mainScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setWorkflow(null);
    setError(null);
    setActiveBack(null);
    setWalkTrail([]);
    fetch(`/api/load/${encodeURIComponent(workflowName)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load workflow (${res.status})`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setWorkflow(data.workflow);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message || 'Failed to load workflow');
      });
    return () => { cancelled = true; };
  }, [workflowName]);

  const nodeIndex = useMemo(() => {
    const map = new Map<string, WorkflowNode>();
    if (!workflow) return map;
    for (const node of workflow.nodes) map.set(node.node_id, node);
    return map;
  }, [workflow]);

  const sections: ViewerSectionData[] = useMemo(() => {
    if (!workflow) return [];
    return workflow.nodes.map((node) => splitNodeForViewer(node, nodeIndex));
  }, [workflow, nodeIndex]);

  const mermaidCode = useMemo(() => {
    if (!workflow) return '';
    return generateMermaid(workflow);
  }, [workflow]);

  const entryNodeId = useMemo(
    () => (workflow ? findEntryNodeId(workflow.nodes) : null),
    [workflow]
  );

  const currentWalkId = walkTrail.length > 0 ? walkTrail[walkTrail.length - 1] : entryNodeId;

  // Initialize walkTrail when entering walk mode and workflow available.
  useEffect(() => {
    if (mode !== 'walk') return;
    if (walkTrail.length === 0 && entryNodeId) {
      setWalkTrail([entryNodeId]);
    }
  }, [mode, entryNodeId, walkTrail.length]);

  // Walk mode actions
  const walkAdvance = useCallback((targetId: string) => {
    setWalkTrail((prev) => [...prev, targetId]);
  }, []);

  const walkPrev = useCallback(() => {
    setWalkTrail((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const walkReset = useCallback(() => {
    setWalkTrail(entryNodeId ? [entryNodeId] : []);
  }, [entryNodeId]);

  const walkRewindTo = useCallback((nodeId: string) => {
    setWalkTrail((prev) => {
      const idx = prev.indexOf(nodeId);
      if (idx < 0) return prev;
      return prev.slice(0, idx + 1);
    });
  }, []);

  // Active-section tracking via IntersectionObserver (Read mode only)
  useEffect(() => {
    if (mode !== 'read') return;
    if (sections.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    sectionRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections, mode]);

  const registerSectionRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el);
  }, []);

  const jumpTo = useCallback((id: string) => {
    const el = sectionRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlightId(id);
    window.setTimeout(() => setHighlightId(null), 1000);
    setTocOpenMobile(false);
  }, []);

  const jumpFromCondition = useCallback((source: string, target: string) => {
    setActiveBack({ source, target });
    jumpTo(target);
  }, [jumpTo]);

  const jumpFromToc = useCallback((id: string) => {
    if (mode === 'walk') {
      walkRewindTo(id);
      return;
    }
    setActiveBack(null);
    jumpTo(id);
  }, [jumpTo, mode, walkRewindTo]);

  const jumpFromMermaid = useCallback((id: string) => {
    if (mode === 'walk') {
      walkRewindTo(id);
      return;
    }
    setActiveBack(null);
    jumpTo(id);
  }, [jumpTo, mode, walkRewindTo]);

  const jumpBack = useCallback(() => {
    if (!activeBack) return;
    const source = activeBack.source;
    setActiveBack(null);
    jumpTo(source);
  }, [activeBack, jumpTo]);

  // Mermaid click → jump to section / rewind trail
  const mermaidWrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const wrapper = mermaidWrapperRef.current;
    if (!wrapper) return;
    const handler = (e: MouseEvent) => {
      let target = e.target as SVGElement | null;
      while (target && target.tagName !== 'svg') {
        if (target.classList?.contains('node')) {
          const idAttr = target.id || target.getAttribute('id') || '';
          const m = idAttr.match(/^flowchart-(.+?)-\d+$/);
          if (m) {
            jumpFromMermaid(m[1]);
            return;
          }
        }
        target = target.parentElement as SVGElement | null;
      }
    };
    wrapper.addEventListener('click', handler);
    return () => wrapper.removeEventListener('click', handler);
  }, [jumpFromMermaid, mermaidCode]);

  // Walk-mode Mermaid 三態 class injection
  useEffect(() => {
    const wrapper = mermaidWrapperRef.current;
    if (!wrapper) return;
    if (mode !== 'walk') {
      wrapper.classList.remove('mermaid-walk');
      wrapper.querySelectorAll<SVGElement>('.node.walked-current, .node.walked-visited, .node.walked-faded')
        .forEach((el) => {
          el.classList.remove('walked-current', 'walked-visited', 'walked-faded');
        });
      return;
    }
    wrapper.classList.add('mermaid-walk');

    const apply = () => {
      const trailSet = new Set(walkTrail);
      const cur = currentWalkId;
      wrapper.querySelectorAll<SVGElement>('.node').forEach((el) => {
        const idAttr = el.id || el.getAttribute('id') || '';
        const m = idAttr.match(/^flowchart-(.+?)-\d+$/);
        const nodeId = m ? m[1] : null;
        el.classList.remove('walked-current', 'walked-visited', 'walked-faded');
        if (!nodeId) {
          el.classList.add('walked-faded');
          return;
        }
        if (nodeId === cur) {
          el.classList.add('walked-current');
        } else if (trailSet.has(nodeId)) {
          el.classList.add('walked-visited');
        } else {
          el.classList.add('walked-faded');
        }
      });
    };

    apply();
    // Mermaid re-renders may occur after our effect fires; observe DOM for changes.
    const observer = new MutationObserver(() => apply());
    observer.observe(wrapper, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mode, walkTrail, currentWalkId, mermaidCode]);

  const titleById = useMemo(() => {
    const m = new Map<string, string>();
    if (!workflow) return m;
    for (const n of workflow.nodes) m.set(n.node_id, (n.title && n.title.trim()) || n.node_id);
    return m;
  }, [workflow]);

  if (error) {
    return (
      <div className={`flex-1 flex items-center justify-center ${theme.bgPrimary}`}>
        <div className="text-center space-y-4">
          <div className="text-rose-400 font-mono text-sm">{error}</div>
          <button
            onClick={onExit}
            className={`px-4 py-2 rounded-lg ${theme.accentBg} text-white text-sm font-medium transition-colors cursor-pointer hover:opacity-90`}
          >
            Back to canvas
          </button>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className={`flex-1 flex items-center justify-center ${theme.bgPrimary}`}>
        <div className={`${theme.textMuted} text-sm`}>Loading viewer…</div>
      </div>
    );
  }

  const inWalk = mode === 'walk';

  return (
    <div className={`flex-1 flex flex-col ${theme.bgPrimary} ${theme.textSecondary} overflow-hidden`}>
      <a
        href="#viewer-content"
        className={`sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 ${theme.accentBg} text-white focus:px-3 focus:py-2 focus:rounded`}
      >
        Skip to content
      </a>

      <header className={`h-12 shrink-0 border-b ${theme.borderColor} ${theme.headerBg} flex items-center justify-between px-4`}>
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onExit}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${theme.textMuted} hover:${theme.textPrimary} ${theme.bgCardHover} transition-colors text-xs font-medium cursor-pointer`}
            aria-label="Back to canvas"
          >
            <ArrowLeft size={14} />
            Canvas
          </button>
          <span className={theme.textMuted}>/</span>
          <Eye size={14} className={theme.accentColor} />
          <span className={`text-xs uppercase tracking-widest ${theme.textMuted} font-semibold`}>Viewer</span>
          <span className={theme.textMuted}>/</span>
          <span className={`text-sm ${theme.textPrimary} font-medium truncate max-w-[260px]`}>{workflow.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <ModeToggle mode={mode} onChange={setMode} theme={theme} />
          <button
            onClick={() => setTocOpenMobile((v) => !v)}
            className={`lg:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-md ${theme.textMuted} hover:${theme.textPrimary} ${theme.bgCardHover} transition-colors text-xs cursor-pointer`}
            aria-label="Toggle sections menu"
          >
            {tocOpenMobile ? <X size={14} /> : <Menu size={14} />}
            Sections
          </button>
        </div>
      </header>

      <div className="flex-1 grid lg:grid-cols-[240px_minmax(0,1fr)_360px] grid-cols-1 grid-rows-[minmax(0,1fr)] overflow-hidden min-h-0">
        <ViewerTOC
          entries={sections.map((s) => ({ id: s.id, title: s.title }))}
          activeId={activeId}
          walkTrail={inWalk ? walkTrail : undefined}
          currentTrailId={inWalk ? currentWalkId : undefined}
          onJump={jumpFromToc}
          mobileOpen={tocOpenMobile}
        />

        <main
          id="viewer-content"
          ref={mainScrollRef}
          className={inWalk ? 'flex flex-col overflow-hidden min-h-0' : 'overflow-y-auto'}
        >
          {inWalk ? (
            <>
              <div className="flex-1 overflow-y-auto min-h-0">
                <WalkModeContent
                  workflow={workflow}
                  nodeIndex={nodeIndex}
                  currentId={currentWalkId}
                  trail={walkTrail}
                  isLight={isLight}
                  onAdvance={walkAdvance}
                  onPrev={walkPrev}
                  onReset={walkReset}
                />
              </div>
              <WalkBreadcrumb
                trail={walkTrail}
                titleById={titleById}
                currentId={currentWalkId}
                onRewindTo={walkRewindTo}
                onReset={walkReset}
              />
            </>
          ) : (
            <ReadModeContent
              workflow={workflow}
              nodeIndex={nodeIndex}
              sections={sections}
              highlightId={highlightId}
              activeBack={activeBack}
              jumpBack={jumpBack}
              jumpFromCondition={jumpFromCondition}
              registerSectionRef={registerSectionRef}
            />
          )}
        </main>

        <aside
          ref={mermaidWrapperRef}
          className={`hidden lg:flex border-l ${theme.borderColor} ${theme.bgPrimary} flex-col`}
          aria-label="Workflow diagram"
        >
          <div className="sticky top-0 h-full p-4">
            <div className={`h-full rounded-xl border ${theme.borderColor} ${theme.bgSecondary} overflow-hidden`}>
              <MermaidPreview code={mermaidCode} />
            </div>
            <div className={`text-[10px] ${theme.textMuted} mt-2 px-1`}>
              {inWalk ? 'Click a node to rewind walk.' : 'Click a node to jump to its section.'}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

function ModeToggle({
  mode,
  onChange,
  theme,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  theme: ReturnType<typeof useTheme>['theme'];
}) {
  return (
    <div
      role="tablist"
      aria-label="Viewer mode"
      className={`inline-flex p-0.5 rounded-full border ${theme.borderColor} ${theme.bgSecondary}`}
    >
      <ModeTab
        active={mode === 'read'}
        onClick={() => onChange('read')}
        theme={theme}
        icon={<BookOpen size={12} />}
        label="Read"
      />
      <ModeTab
        active={mode === 'walk'}
        onClick={() => onChange('walk')}
        theme={theme}
        icon={<Play size={12} />}
        label="Walk"
      />
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  theme,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  theme: ReturnType<typeof useTheme>['theme'];
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer
        ${active
          ? `${theme.bgCard} ${theme.accentColor} shadow-sm`
          : `bg-transparent ${theme.textMuted} hover:${theme.textSecondary}`}`}
    >
      {icon}
      {label}
    </button>
  );
}

export default ViewerPage;
