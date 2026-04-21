import React, { useState, useRef, useEffect } from 'react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const visibleActions = actions.filter(a => a.show !== false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (visibleActions.length === 0) return null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-border shadow-lg rounded-xl z-50 overflow-hidden py-1 animate-in fade-in zoom-in duration-100">
          {visibleActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium transition-colors hover:bg-muted text-left
                ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50' : 
                  action.variant === 'success' ? 'text-emerald-600 hover:bg-emerald-50' : 
                  'text-foreground'}
              `}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
