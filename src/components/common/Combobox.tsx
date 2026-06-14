import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

interface Option {
    id: string;
    name: string;
}

interface ComboboxProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    noneLabel?: string;
}

export function Combobox({
    options,
    value,
    onChange,
    placeholder = "Buscar...",
    disabled = false,
    className = "",
    noneLabel = "-- Ninguno --"
}: ComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(opt => opt.id === value);

    // Filter options based on search term
    const filteredOptions = options.filter(opt =>
        opt.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Update position and dimensions when opening
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Global events: close on click outside or scroll
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                const portal = document.getElementById('combobox-portal-root');
                if (portal && portal.contains(event.target as Node)) return;
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        const handleScroll = (e: Event) => {
            // Ignore scroll events originating inside the portal (the options list)
            const portal = document.getElementById('combobox-portal-root');
            if (portal && portal.contains(e.target as Node)) return;
            setIsOpen(false);
            setSearchTerm('');
        };

        // Use requestAnimationFrame to avoid capturing the micro-scroll caused by portal
        // rendering itself, which was causing the double-click bug.
        const rafId: number = requestAnimationFrame(() => {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('scroll', handleScroll, true);
        });

        return () => {
            cancelAnimationFrame(rafId);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isOpen]);

    const handleSelect = (optionId: string) => {
        onChange(optionId);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSearchTerm('');
    };

    return (
        <>
            <div className={cn("relative w-full", className)} ref={containerRef}>
                <div
                    className={cn(
                        "flex items-center w-full px-3 py-1.5 bg-background border rounded-md text-sm transition-all shadow-sm cursor-pointer",
                        disabled ? "opacity-50 cursor-not-allowed bg-muted" : "hover:border-primary/50",
                        isOpen ? "ring-1 ring-primary border-primary" : "border-input"
                    )}
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                >
                    <div className="flex-1 truncate min-w-0">
                        {selectedOption ? (
                            <span className="text-foreground capitalize">{selectedOption.name}</span>
                        ) : (
                            <span className="text-muted-foreground">{placeholder}</span>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-1 ml-2">
                        {value && !disabled && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-0.5 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </div>
                </div>
            </div>

            {isOpen && !disabled && createPortal(
                <div 
                    id="combobox-portal-root"
                    style={{ 
                        position: 'absolute', 
                        top: coords.top + 4, 
                        left: coords.left, 
                        width: coords.width,
                        zIndex: 9999
                    }}
                    className="bg-card border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                >
                    <div className="p-2 border-b border-border bg-muted/20">
                        <div className="relative flex items-center">
                            <Search className="absolute left-2.5 w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                ref={inputRef}
                                autoFocus
                                type="text"
                                className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Escribe para filtrar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    
                    <ul className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                        <li
                            className={cn(
                                "px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 transition-colors flex items-center justify-between",
                                !value && "bg-primary/5 text-primary"
                            )}
                            onClick={() => handleSelect('')}
                        >
                            <span>{noneLabel}</span>
                            {!value && <Check className="w-3.5 h-3.5" />}
                        </li>
                        
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.id}
                                    className={cn(
                                        "px-3 py-2 text-sm cursor-pointer hover:bg-primary/10 transition-colors flex items-center justify-between",
                                        value === option.id && "bg-primary/5 text-primary"
                                    )}
                                    onClick={() => handleSelect(option.id)}
                                >
                                    <span className="truncate capitalize">{option.name}</span>
                                    {value === option.id && <Check className="w-3.5 h-3.5" />}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">
                                No se encontraron resultados
                            </li>
                        )}
                    </ul>
                </div>,
                document.body
            )}
        </>
    );
}
