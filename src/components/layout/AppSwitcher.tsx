import React, { useState, useRef, useEffect } from 'react';
import { Grid } from 'lucide-react';

const apps = [
    { id: 's-project', name: 'S-Project', url: 'http://localhost:5173', logo: '/ecosystem-logos/s-project.png' },
    { id: 'gestor-fsm', name: 'Gestor FSM', url: 'http://localhost:5174', logo: '/ecosystem-logos/gestor-fsm.png' },
    { id: 'liquidaciones', name: 'Liquidaciones', url: 'http://localhost:5175', logo: '/ecosystem-logos/liquidaciones.png' },
    { id: 'tablero-control', name: 'Tablero Control', url: 'http://localhost:5176', logo: '/ecosystem-logos/tablero-control.png' },
    { id: 'ebm', name: 'EBM', url: 'http://localhost:5177', logo: '/ecosystem-logos/ebm.png' }
];

interface AppSwitcherProps {
    currentAppId: string;
}

export function AppSwitcher({ currentAppId }: AppSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const otherApps = apps.filter(app => app.id !== currentAppId);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative inline-block" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 flex items-center justify-center"
                title="Ecosistema de Aplicaciones"
                type="button"
            >
                <Grid className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-[#0F172A]/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-slate-700/50 bg-[#1E293B]/50">
                        <h3 className="text-sm font-semibold text-slate-200">Más aplicaciones</h3>
                    </div>
                    <div className="p-3 grid grid-cols-2 gap-2">
                        {otherApps.map(app => (
                            <a 
                                key={app.id} 
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex flex-col items-center justify-center p-3 rounded-lg hover:bg-slate-800 hover:shadow-inner transition-all duration-300 border border-transparent hover:border-slate-600/50"
                            >
                                <div className="w-12 h-12 mb-2 flex items-center justify-center overflow-hidden drop-shadow-md group-hover:scale-110 group-hover:drop-shadow-xl transition-transform duration-300">
                                    <img src={app.logo} alt={`${app.name} logo`} className="w-full h-full object-contain" />
                                </div>
                                <span className="text-xs font-medium text-slate-300 group-hover:text-blue-400 transition-colors text-center">
                                    {app.name}
                                </span>
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
