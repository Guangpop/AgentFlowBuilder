import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

export interface TocEntry {
  id: string;
  title: string;
}

interface Props {
  entries: TocEntry[];
  activeId: string | null;
  /**
   * When provided, render walk-mode three-state indicators:
   *  - visited: entry.id appears in trail (and is not current)
   *  - current: entry.id === currentTrailId
   *  - unvisited: otherwise
   */
  walkTrail?: string[];
  currentTrailId?: string | null;
  onJump: (id: string) => void;
  /** Used on mobile/tablet to overlay TOC. */
  mobileOpen?: boolean;
}

export function ViewerTOC({ entries, activeId, walkTrail, currentTrailId, onJump, mobileOpen }: Props) {
  const { theme } = useTheme();
  const trailSet = walkTrail ? new Set(walkTrail) : null;

  return (
    <aside
      className={`border-r ${theme.sidebarBorder} ${theme.sidebarBg} overflow-y-auto px-4 py-6
                  lg:block ${mobileOpen ? `absolute inset-x-0 top-12 z-40 max-h-[60vh] ${theme.sidebarBg} border-b ${theme.borderColor}` : 'hidden'}`}
      aria-label="Table of contents"
    >
      <div className={`text-[10px] font-bold ${theme.textMuted} uppercase tracking-widest mb-3`}>On this page</div>
      <nav className="space-y-0.5">
        {entries.map((s) => {
          const isActive = activeId === s.id;
          const isCurrent = trailSet && currentTrailId === s.id;
          const isVisited = trailSet && trailSet.has(s.id) && !isCurrent;
          const highlight = isCurrent || (!trailSet && isActive);

          let prefix: React.ReactNode = null;
          let className: string;
          if (trailSet) {
            if (isCurrent) {
              prefix = <span className={`mr-1.5 ${theme.accentColor}`}>▶</span>;
              className = `${theme.textPrimary} ${theme.accentBorder} font-medium`;
            } else if (isVisited) {
              prefix = <span className={`mr-1.5 ${theme.textMuted}`}>✓</span>;
              className = `${theme.textSecondary} border-transparent`;
            } else {
              prefix = <span className={`mr-1.5 ${theme.textMuted} opacity-50`}>·</span>;
              className = `${theme.textMuted} hover:${theme.textSecondary} border-transparent opacity-70`;
            }
          } else {
            className = highlight
              ? `${theme.textPrimary} ${theme.accentBorder} font-medium`
              : `${theme.textMuted} hover:${theme.textSecondary} border-transparent`;
          }

          return (
            <button
              key={s.id}
              onClick={() => onJump(s.id)}
              className={`block w-full text-left text-sm pl-3 py-1 -ml-[2px] border-l-2 transition-colors cursor-pointer ${className}`}
            >
              {prefix}{s.title}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
