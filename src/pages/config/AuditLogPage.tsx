import { useState, useEffect } from 'react';
import { Search, RotateCcw, Clock, ChevronRight, Database, ShieldAlert, Terminal } from 'lucide-react';
import { cn } from '../../utils/cn';

interface AuditLog {
    Id: number;
    Fecha: string;
    UsuarioID: string;
    UsuarioNombre: string;
    Accion: string;
    Entidad: string;
    EntidadID: string;
    Detalle: string;
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/config/audit-logs', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            }
        } catch (error) {
            console.error('Error loading audit logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.UsuarioNombre?.toLowerCase().includes(search.toLowerCase()) ||
            log.Entidad?.toLowerCase().includes(search.toLowerCase()) ||
            log.EntidadID?.toLowerCase().includes(search.toLowerCase());
        
        if (filter === 'ALL') return matchesSearch;
        return matchesSearch && log.Accion === filter;
    });

    const formatAction = (action: string) => {
        return action
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Terminal className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Auditoría</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Bitácora de Seguridad</h1>
                    <p className="text-sm text-muted-foreground">Registro centralizado e inmutable de acciones críticas e intentos de acceso</p>
                </div>
                <button 
                    onClick={loadLogs}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-muted-foreground rounded-xl hover:bg-primary hover:text-primary-foreground transition-all active:scale-95 font-semibold text-sm border border-border shadow-sm group"
                >
                    <RotateCcw className={cn("w-4 h-4 transition-transform group-hover:rotate-180 duration-500", isLoading && "animate-spin")} />
                    Sincronizar Bitácora
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 min-h-0 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Search / Filters Toolbar */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Filtrar por usuario, entidad o referencia..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-background p-1 rounded-xl border border-border">
                        {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'ACCESO_DENEGADO'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-black rounded-lg transition-all tracking-widest",
                                    filter === f 
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                                        : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                {f === 'ALL' ? 'Todos' : formatAction(f)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Leyendo bitácora...</span>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md">
                                <tr className="border-b border-border">
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-48">Fecha y Hora</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-64">Usuario Responsable</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-40">Operación</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-56">Ref. Entidad</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground">Payload / Detalle Técnico</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldAlert className="w-12 h-12 text-muted-foreground/20" />
                                                <p className="text-sm font-medium text-muted-foreground italic">No existen registros para los filtros seleccionados</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log) => (
                                        <tr key={log.Id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-center gap-3 text-foreground font-black text-[11px]">
                                                    <div className="p-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-border/50">
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span>{new Date(log.Fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                        <span className="text-primary/70">{new Date(log.Fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shrink-0">
                                                        {log.UsuarioNombre?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-bold text-foreground truncate">{log.UsuarioNombre}</span>
                                                        <span className="text-[10px] text-muted-foreground font-mono truncate">ID: {log.UsuarioID}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <span className={cn(
                                                    "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black tracking-tighter border shadow-sm",
                                                    log.Accion === 'ACCESO_DENEGADO' 
                                                        ? "bg-rose-50 text-rose-700 border-rose-200/50" 
                                                        : log.Accion === 'DELETE' 
                                                            ? "bg-amber-50 text-amber-700 border-amber-200/50"
                                                            : log.Accion === 'CREATE'
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                                                                : "bg-blue-50 text-blue-700 border-blue-200/50"
                                                )}>
                                                    {formatAction(log.Accion)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Database className="w-3 h-3 text-muted-foreground opacity-50" />
                                                        <span className="text-foreground font-black text-[11px] tracking-tight">{log.Entidad}</span>
                                                    </div>
                                                    <span className="inline-flex py-0.5 px-2 bg-muted rounded-lg text-muted-foreground font-mono text-[10px] font-bold border border-border/50 self-start">
                                                        #{log.EntidadID}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 align-top">
                                                <div className="relative group/detail">
                                                    <div className="max-h-24 overflow-hidden rounded-xl bg-muted/40 p-3 border border-border/50 group-hover/detail:max-h-none transition-all duration-300">
                                                        <pre className="text-[10px] text-muted-foreground font-mono leading-relaxed whitespace-pre-wrap">
                                                            {log.Detalle}
                                                        </pre>
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-muted/40 to-transparent flex items-center justify-center group-hover/detail:hidden">
                                                        <span className="text-[9px] font-black text-muted-foreground/60 tracking-[0.2em]">Expandir detalle</span>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Footer Warning: SIATC Standard */}
                <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-sm">
                            <ShieldAlert className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-[11px] text-foreground font-black tracking-wider leading-none">Bitácora de Seguridad Certificada</p>
                            <p className="text-[10px] text-muted-foreground font-medium mt-1">Los registros son inalterables y cumplen con el Estándar SIATC v3.0 de Auditoría Centralizada.</p>
                        </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-background rounded-lg border border-border shadow-inner">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black text-muted-foreground tracking-widest">Sincronizado</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
