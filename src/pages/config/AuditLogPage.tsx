import { useState, useEffect } from 'react';
import { Terminal, ShieldAlert, User, Clock, AlertCircle, Search, Filter } from 'lucide-react';
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col shadow-sm rounded-lg border border-border bg-card overflow-hidden">
                <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card">
                    <div>
                        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                            <Terminal className="w-5 h-5 text-primary" /> Auditoría de Seguridad
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 text-balance">Registro forense de intentos de acceso denegados y acciones críticas</p>
                    </div>
                    <button 
                        onClick={loadLogs}
                        className="text-xs font-medium px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-md transition-colors"
                    >
                        Actualizar Logs
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por usuario o entidad..."
                                className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary outline-none text-sm transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                            <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="flex bg-muted p-1 rounded-lg">
                                {['ALL', 'ACCESO_DENEGADO', 'CREATE', 'UPDATE', 'DELETE'].map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={cn(
                                            "px-3 py-1 text-[10px] font-bold rounded-md transition-all uppercase tracking-wider",
                                            filter === f 
                                                ? "bg-primary text-primary-foreground shadow-sm" 
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        {f === 'ALL' ? 'Todos' : f.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="bg-card rounded-lg border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                                    <tr>
                                        <th className="px-6 py-3">Fecha y Hora</th>
                                        <th className="px-6 py-3">Usuario</th>
                                        <th className="px-6 py-3">Acción</th>
                                        <th className="px-6 py-3">Entidad / Permiso</th>
                                        <th className="px-6 py-3">Detalles Técnicos</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {isLoading ? (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">Cargando registros de auditoría...</td></tr>
                                    ) : filteredLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                                    <ShieldAlert className="w-10 h-10 opacity-20" />
                                                    <p>No se han registrado incidentes de seguridad.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLogs.map(log => (
                                            <tr key={log.Id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-foreground font-medium">
                                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                                        {new Date(log.Fecha).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                            {log.UsuarioNombre?.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <span className="text-foreground">{log.UsuarioNombre}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                                                        log.Accion === 'ACCESO_DENEGADO' 
                                                            ? "bg-red-50 text-red-700 border-red-100" 
                                                            : "bg-blue-50 text-blue-700 border-blue-100"
                                                    )}>
                                                        {log.Accion}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-foreground font-mono text-[11px] font-bold">{log.EntidadID}</span>
                                                        <span className="text-muted-foreground text-[10px]">{log.Entidad}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <pre className="text-[10px] bg-muted/50 p-2 rounded border border-border max-w-xs overflow-hidden text-ellipsis whitespace-pre-wrap font-mono text-muted-foreground group-hover:text-foreground">
                                                        {log.Detalle}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/10 rounded-lg text-primary text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Este log es inalterable y se genera automáticamente ante cualquier denegación de permiso por el middleware de seguridad.</p>
            </div>
        </div>
    );
}
