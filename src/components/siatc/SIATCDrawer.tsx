import React, { useEffect } from 'react';
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
        xl: 'max-w-4xl',
    }[width];

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Backdrop con contraste premium y profundo blur */}
            <div 
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300"
                onClick={onClose}
            />
            
            {/* Contenedor del Panel */}
            <div 
                className={cn(
                    "relative h-full w-full bg-white dark:bg-slate-950 shadow-2xl border-l border-white/10 flex flex-col",
                    "animate-in slide-in-from-right duration-500 ease-out",
                    widthClass,
                    className
                )}
            >
                {/* Header Premium */}
                <div className="flex items-start justify-between p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 mb-2">
                    <div className="flex-1 pr-6">
                        <h2 className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_TITLE, "text-2xl")}>{title}</h2>
                        {subtitle && (
                            <p className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE, "mt-1.5 leading-relaxed")}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 -mr-2 -mt-2 text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cuerpo con Scroll Custom */}
                <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
                    <div className="space-y-8 pb-10">
                        {children}
                    </div>
                </div>

                {/* Footer si aplica */}
                {footer && (
                    <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
