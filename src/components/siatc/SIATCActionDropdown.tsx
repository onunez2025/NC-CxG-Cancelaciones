import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface Action {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'success';
  show?: boolean;
}

interface SIATCActionDropdownProps {
  actions: Action[];
  className?: string;
}

export const SIATCActionDropdown: React.FC<SIATCActionDropdownProps> = ({ actions, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleActions = actions.filter(a => a.show !== false);

  const toggleDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right
      });
    }
    setIsOpen(!isOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(event.target as Node);
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(event.target as Node);
      if (isOutsideDropdown && isOutsideButton) {
        setIsOpen(false);
      }
    };

    const handleScroll = () => {
      if (isOpen) setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // true for capturing phase
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  if (visibleActions.length === 0) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground focus:outline-none"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          style={{ top: dropdownPos.top, right: dropdownPos.right, position: 'fixed' }}
          className="w-48 bg-white dark:bg-slate-900 border border-border shadow-xl rounded-xl z-[99999] overflow-hidden py-1 animate-in fade-in zoom-in duration-100"
        >
          {visibleActions.map((action, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors hover:bg-muted text-left
                ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30' : 
                  action.variant === 'success' ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30' : 
                  'text-foreground'}
              `}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};
