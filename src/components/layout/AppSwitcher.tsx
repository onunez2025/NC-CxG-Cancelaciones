import { useState, useRef, useEffect } from 'react';
import { Grid } from 'lucide-react';

const apps = [
    { id: 's-project', name: 'S-Project', url: 'https://gac-sole-sproject.jppsfv.easypanel.host/', logo: '/ecosystem-logos/s-project.png' },
    { id: 'gestor-fsm', name: 'Gestor FSM', url: 'https://gac-sole-gestor-de-tickets-fsm.jppsfv.easypanel.host/', logo: '/ecosystem-logos/gestor-fsm.png' },
    { id: 'liquidaciones', name: 'Liquidaciones', url: 'https://gac-sole-liquidaciones.jppsfv.easypanel.host/', logo: '/ecosystem-logos/liquidaciones.png' },
    { id: 'tablero-control', name: 'Tablero Control', url: 'https://gac-sole-tablero-control.jppsfv.easypanel.host/', logo: '/ecosystem-logos/tablero-control.png' },
    { id: 'ebm', name: 'EBM', url: 'https://gac-sole-ebm.jppsfv.easypanel.host/', logo: '/ecosystem-logos/ebm.png' }
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
                <div className="absolute right-0 mt-2 w-[432px] bg-[#FFFFFF] dark:bg-[#111827] backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/50">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Más aplicaciones</h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                        {otherApps.map(app => (
                            <a 
                                key={app.id} 
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative flex flex-col items-center justify-center p-6 rounded-xl hover:bg-white dark:hover:bg-slate-800/50 transition-all duration-500 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-600/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
                            >
                                {/* Glow Effect Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl" />
                                
                                <div className="relative w-20 h-20 mb-3 flex items-center justify-center overflow-hidden drop-shadow-md group-hover:scale-110 group-hover:drop-shadow-[0_10px_20px_rgba(59,130,246,0.3)] transition-all duration-500 ease-out">
                                    <img src={app.logo} alt={`${app.name} logo`} className="w-full h-full object-contain" />
                                </div>
                                <span className="relative text-sm font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary dark:group-hover:text-primary-foreground transition-colors text-center">
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
