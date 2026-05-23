import { useState, useEffect } from 'react';
import { Search, RotateCcw, Clock, ChevronRight, Database, ShieldAlert, Terminal } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toTitleCase } from '../../utils/formatters';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { 
    SIATCTable, 
    SIATCTableRow, 
    SIATCTableCell, 
    SIATCTableFooter 
} from '../../components/siatc/table/SIATCTable';

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

    // Pagination State (SIATC Standard)
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 15;

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

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / recordsPerPage);
    const paginatedRecords = filteredLogs.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

    const formatAction = (action: string) => {
        return action
            .toLowerCase()
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    const getActionVariant = (action: string): 'success' | 'warning' | 'error' | 'info' => {
        if (action === 'ACCESO_DENEGADO') return 'error';
        if (action === 'DELETE') return 'warning';
        if (action === 'CREATE') return 'success';
        return 'info';
    };

    return (
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Terminal className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Auditoría</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Bitácora de Seguridad</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Registro centralizado e inmutable de acciones críticas e intentos de acceso</p>
                </div>
                <SIATCButton 
                    variant="secondary"
                    onClick={() => { loadLogs(); setCurrentPage(1); }}
                    isLoading={isLoading}
                    icon={RotateCcw}
                >
                    Sincronizar Bitácora
                </SIATCButton>
            </div>

            {/* Content Container */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {/* Search / Filters Toolbar */}
                <div className="p-4 border-b border-cb-border bg-cb-bg/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-text-secondary/55" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Filtrar por usuario, entidad o referencia..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-cb-border rounded-cb-btn focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium placeholder:text-cb-neutral/40"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2 bg-white dark:bg-cb-bg p-1 rounded-cb-btn border border-cb-border shadow-cb-level-1">
                        {['ALL', 'CREATE', 'UPDATE', 'DELETE', 'ACCESO_DENEGADO'].map((f) => (
                            <button
                                key={f}
                                onClick={() => { setFilter(f); setCurrentPage(1); }}
                                className={cn(
                                    "px-3 py-1.5 text-[10px] font-bold rounded-cb-chip transition-all tracking-wider uppercase",
                                    filter === f 
                                        ? "bg-primary text-primary-foreground shadow-sm" 
                                        : "text-cb-text-secondary hover:bg-cb-bg"
                                )}
                            >
                                {f === 'ALL' ? 'Todos' : formatAction(f)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Area */}
                <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Leyendo bitácora...</span>
                        </div>
                    ) : (
                        <SIATCTable>
                            <thead>
                                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-48">Fecha y Hora</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-64">Usuario Responsable</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-40">Operación</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-56">Ref. Entidad</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left">Payload / Detalle Técnico</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <ShieldAlert className="w-12 h-12 text-cb-text-secondary opacity-40" />
                                                <p className="text-sm font-medium text-cb-text-secondary italic">No existen registros para los filtros seleccionados</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((log) => (
                                        <SIATCTableRow key={log.Id} className={SIATC_THEME.TABLE.BODY_ROW}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3 text-cb-text-primary font-medium text-xs">
                                                    <div className="p-1.5 rounded-cb-btn bg-cb-bg text-cb-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-colors border border-cb-border">
                                                        <Clock className="w-3.5 h-3.5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{new Date(log.Fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO + " text-primary/70"}>{new Date(log.Fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shrink-0">
                                                        {log.UsuarioNombre?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-xs font-medium text-cb-text-primary truncate">{toTitleCase(log.UsuarioNombre)}</span>
                                                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO + " opacity-60"}>ID: {log.UsuarioID}</span>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <SIATCBadge variant={getActionVariant(log.Accion)}>
                                                    {formatAction(log.Accion)}
                                                </SIATCBadge>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Database className="w-3 h-3 text-cb-text-secondary opacity-50" />
                                                        <span className="text-cb-text-primary font-bold text-xs tracking-tight">{log.Entidad}</span>
                                                    </div>
                                                    <span className="inline-flex py-0.5 px-2 bg-cb-bg rounded-cb-chip text-cb-text-secondary font-mono text-[10px] font-bold border border-cb-border self-start">
                                                        #{log.EntidadID}
                                                    </span>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="relative group/detail">
                                                    <div className="max-h-24 overflow-hidden rounded-cb-card bg-cb-bg/40 p-3 border border-cb-border group-hover/detail:max-h-none transition-all duration-300 shadow-inner">
                                                        <pre className="text-[10px] text-cb-text-secondary font-mono leading-relaxed whitespace-pre-wrap">
                                                            {log.Detalle}
                                                        </pre>
                                                    </div>
                                                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-cb-bg/40 to-transparent flex items-center justify-center group-hover/detail:hidden pointer-events-none">
                                                        <span className="text-[9px] font-black text-cb-neutral/60 tracking-[0.2em] uppercase">Expandir Detalle</span>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                        </SIATCTableRow>
                                    ))
                                )}
                            </tbody>
                        </SIATCTable>
                    )}
                </div>

                {/* Footer SIATC Standard */}
                <SIATCTableFooter 
                    totalRecords={filteredLogs.length} 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
