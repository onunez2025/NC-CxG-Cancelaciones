import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { X } from 'lucide-react';

interface SIATCDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    width?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export const SIATCDrawer: React.FC<SIATCDrawerProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    width = 'md',
    className,
}) => {
    // Bloquear scroll del body cuando el panel está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // Cerrar con Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const widthClass = {
        sm: 'max-w-md',
        md: 'max-w-xl',
        lg: 'max-w-2xl',
        xl: 'max-w-5xl',
    }[width];

    const content = (
        <div className="fixed inset-0 z-[9999] flex justify-end overflow-hidden focus:outline-none">
            {/* Backdrop con contraste premium y profundo blur - Cubre TODO el viewport */}
            <div 
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-500 ease-out"
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Contenedor del Panel */}
            <div 
                role="dialog"
                aria-modal="true"
                className={cn(
                    "relative h-full w-full bg-white dark:bg-slate-950 shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-white/10 flex flex-col",
                    "animate-in slide-in-from-right duration-700 cubic-bezier(0.16, 1, 0.3, 1)",
                    widthClass,
                    className
                )}
            >
                {/* Accent line for depth */}
                <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />

                {/* Header Premium - Con más aire arriba */}
                <div className="flex items-start justify-between p-10 pb-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 shrink-0">
                    <div className="flex-1 pr-6 pt-2">
                        <h2 className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_TITLE, "text-3xl tracking-tight leading-tight uppercase font-black")}>
                          {title}
                        </h2>
                        {subtitle && (
                            <p className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE, "mt-2 leading-relaxed text-slate-500 max-w-lg font-medium")}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 -mr-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Cuerpo con Scroll Custom */}
                <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
                    <div className="space-y-10 pb-12">
                        {children}
                    </div>
                </div>

                {/* Footer si aplica */}
                {footer && (
                    <div className="p-10 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};
