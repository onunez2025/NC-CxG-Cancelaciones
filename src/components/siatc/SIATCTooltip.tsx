import { useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface SIATCTooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const SIATCTooltip = ({ content, children, className, position = 'top' }: SIATCTooltipProps) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          className={cn(
            "absolute z-[200] px-3 py-2 text-[11px] font-semibold text-white bg-slate-900 dark:bg-slate-700 rounded-xl shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in duration-150",
            positionClasses[position]
          )}
        >
          {content}
          <div
            className={cn(
              "absolute w-2 h-2 bg-slate-900 dark:bg-slate-700 rotate-45",
              position === 'top' && "top-full left-1/2 -translate-x-1/2 -mt-1",
              position === 'bottom' && "bottom-full left-1/2 -translate-x-1/2 -mb-1",
              position === 'left' && "left-full top-1/2 -translate-y-1/2 -ml-1",
              position === 'right' && "right-full top-1/2 -translate-y-1/2 -mr-1"
            )}
          />
        </div>
      )}
    </div>
  );
};
