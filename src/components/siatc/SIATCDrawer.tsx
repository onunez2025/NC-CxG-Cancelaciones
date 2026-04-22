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
            {/* Backdrop Ultra-Traslúcido con Blur Profundo */}
            <div 
                className="absolute inset-0 bg-slate-950/25 backdrop-blur-[2px] animate-in fade-in duration-500 ease-out"
                onClick={onClose}
                aria-hidden="true"
            />
            
            {/* Contenedor del Panel - Glassmorphism Extremo */}
            <div 
                role="dialog"
                aria-modal="true"
                className={cn(
                    "relative h-full w-full bg-white/70 dark:bg-slate-900/40 backdrop-blur-[40px] shadow-[0_0_50px_rgba(0,0,0,0.5)] border-l border-white/20 flex flex-col",
                    "animate-in slide-in-from-right duration-700 cubic-bezier(0.16, 1, 0.3, 1)",
                    widthClass,
                    className
                )}
            >
                {/* Glow Perimetral sutil en el borde izquierdo */}
                <div className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-primary/0 via-primary/50 to-primary/0 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />

                {/* Header Premium - Glassy & Airy */}
                <div className="flex items-start justify-between p-10 pb-8 border-b border-white/10 bg-white/10 dark:bg-black/20 shrink-0 backdrop-blur-md">
                    <div className="flex-1 pr-6 pt-2">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-1 bg-primary rounded-full" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Detalle de Gestión</span>
                        </div>
                        <h2 className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_TITLE, "text-4xl tracking-tighter leading-none uppercase font-black bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent")}>
                          {title}
                        </h2>
                        {subtitle && (
                            <p className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE, "mt-3 leading-relaxed text-slate-500 dark:text-slate-400 max-w-lg font-bold opacity-80")}>
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 -mr-2 text-muted-foreground hover:text-foreground hover:bg-white/20 dark:hover:bg-white/5 rounded-2xl transition-all shadow-sm bg-white/40 dark:bg-slate-800/40 border border-white/20 dark:border-white/10 active:scale-90 backdrop-blur-xl"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Cuerpo con Scroll Custom */}
                <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar bg-white/5 dark:bg-black/5">
                    <div className="space-y-12 pb-16">
                        {children}
                    </div>
                </div>

                {/* Footer si aplica */}
                {footer && (
                    <div className="p-10 border-t border-white/10 bg-white/20 dark:bg-black/40 shrink-0 backdrop-blur-xl">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};
