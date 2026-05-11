import React from 'react';
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface Props {
  trail: string[];
  titleById: Map<string, string>;
  currentId: string | null;
  /** Click a segment → rewind to that node (slice trail up to and including it). */
  onRewindTo: (nodeId: string) => void;
  onReset: () => void;
}

export function WalkBreadcrumb({ trail, titleById, currentId, onRewindTo, onReset }: Props) {
  const { theme } = useTheme();
  if (trail.length === 0) return null;

  return (
    <div
      className={`shrink-0 border-t ${theme.borderColor} ${theme.bgSecondary} px-4 py-2`}
      aria-label="Walk trail"
    >
      <div className="flex items-center gap-2">
        <span className={`text-[9px] font-bold uppercase tracking-widest ${theme.textMuted} font-mono shrink-0`}>
          Trail
        </span>
        <div className="flex-1 min-w-0 overflow-x-auto">
          <ol className="flex items-center gap-1 whitespace-nowrap">
            {trail.map((id, idx) => {
              const isCurrent = id === currentId;
              const title = titleById.get(id) || id;
              return (
                <li key={`${id}-${idx}`} className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onRewindTo(id)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer focus:outline-none focus:ring-2 ${theme.accentRing}
                      ${isCurrent
                        ? `${theme.accentBgLight} ${theme.accentColor} font-semibold`
                        : `${theme.textSecondary} hover:${theme.textPrimary} ${theme.bgCardHover}`}`}
                    aria-current={isCurrent ? 'step' : undefined}
                  >
                    {title}
                  </button>
                  {idx < trail.length - 1 && (
                    <ChevronRight size={10} className={theme.textMuted} />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
        <button
          onClick={onReset}
          className={`shrink-0 inline-flex items-center gap-1 text-[10px] ${theme.textMuted} hover:${theme.textSecondary} cursor-pointer`}
          aria-label="Reset walk"
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>
    </div>
  );
}
