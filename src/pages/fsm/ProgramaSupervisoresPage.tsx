import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { 
    Download, Search, X, Plus, Edit, Trash2,
    User, SlidersHorizontal, ChevronUp, ChevronDown, 
    Calendar as CalendarIcon, Table as TableIcon, Eye
} from 'lucide-react';
import { LaborColorService, type LaborColor } from '../../services/laborColorService';
import { useTableResizer } from '../../hooks/useTableResizer';
import { ResizableHeader } from '../../components/common/ResizableHeader';
import { apiClient, API_BASE_URL } from '../../services/apiClient';
import { cn } from '../../utils/cn';
import { Combobox } from '../../components/common/Combobox';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Modal } from '../../components/common/Modal';
import { 
    format, eachDayOfInterval, 
    addWeeks, subWeeks, 
    startOfWeek, endOfWeek, 
    addDays, subDays, startOfDay, isSameDay
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ProgramaSupervisoresService } from '../../services/programaSupervisoresService';
import { PreferencesService } from '../../services/preferencesService';
import { toTitleCase } from '../../utils/formatters';
import type { ProgramaSupervisor } from '../../types';
import { SIATC_THEME } from '../../utils/siatc-theme';

interface Empleado {
    id: string;
    name: string;
    role: string;
    subarea: string;
}

const LABORES_OPCIONES = [
    'Atención Emergencias',
    'Atención en Puerta',
    'Atención VIP',
    'Charla de 5min',
    'Atención Presencial',
    'Atención Festivo',
    'Aprobaciones C4C',
    'Atención 6 a 9 pm',
    'Encargado de Flota'
];

export default function ProgramaSupervisoresPage() {
    const { user } = useAuth();
    const isAdmin = (user?.role_name || '').trim().toLowerCase() === 'administrador';

    // RBAC Permissions
    const canView = user?.permissions?.includes('cxg.programa_supervisores.view') || isAdmin;
    const canCreate = user?.permissions?.includes('cxg.programa_supervisores.create') || isAdmin;
    const canEdit = user?.permissions?.includes('cxg.programa_supervisores.edit') || isAdmin;
    const canDelete = user?.permissions?.includes('cxg.programa_supervisores.delete') || isAdmin;

    // View Mode
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
    const [calendarView, setCalendarView] = useState<'day' | 'week' | 'workWeek'>('day');

    // Data States
    const [programa, setPrograma] = useState<ProgramaSupervisor[]>([]);
    const [laborColors, setLaborColors] = useState<LaborColor[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [totalItems, setTotalItems] = useState(0);

    // Form / Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        empleado_id: '',
        fecha_labor: new Date().toISOString().split('T')[0],
        labor: ''
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Confirm Dialog State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'info' | 'warning';
    }>({
        isOpen: false, title: '', message: '', onConfirm: () => {},
    });
    
    // Resizing logic
    const { widths, onResizeStart } = useTableResizer('prog_sup_column_widths', {
        empleado: 320,
        labor: 280,
        fecha: 180
    });

    const [loading, setLoading] = useState(true);

    // Pagination & Search States
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchInput, setSearchInput] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    // Advanced Filters
    const [showFilters, setShowFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        empleadoId: '',
        startDate: '',
        endDate: ''
    });
    const [appliedFilters, setAppliedFilters] = useState({
        empleadoId: '',
        startDate: '',
        endDate: ''
    });

    // Sorting
    const [sortBy, setSortBy] = useState('fecha_labor');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

    // Calendar States
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [viewSwitcherOpen, setViewSwitcherOpen] = useState(false);

    // Modals & Details View States
    const [selectedDetails, setSelectedDetails] = useState<ProgramaSupervisor | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Fetch initial parameters & dropdowns
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [empRes, prefs, colors] = await Promise.all([
                    apiClient(`${API_BASE_URL}/programa-supervisores/empleados`),
                    PreferencesService.getPreferences(),
                    LaborColorService.getColors().catch(() => [] as LaborColor[])
                ]);

                if (empRes.ok) {
                    const empData = await empRes.json();
                    setEmpleados(empData);
                }

                if (colors) {
                    setLaborColors(colors);
                }

                if (prefs?.prog_sup_view_mode) {
                    setViewMode(prefs.prog_sup_view_mode);
                }
                if (prefs?.prog_sup_calendar_view) {
                    setCalendarView(prefs.prog_sup_calendar_view);
                }
            } catch (err) {
                console.error('Error loading initial filters or preferences', err);
            }
        };

        if (canView) {
            loadInitialData();
        }
    }, [canView]);

    const toggleViewMode = async (mode: 'table' | 'calendar') => {
        setViewMode(mode);
        setPage(1);
        await PreferencesService.savePreference('prog_sup_view_mode', mode);
    };

    const changeCalendarView = async (view: 'day' | 'week' | 'workWeek') => {
        setCalendarView(view);
        setViewSwitcherOpen(false);
        await PreferencesService.savePreference('prog_sup_calendar_view', view);
    };

    const calendarDays = useMemo(() => {
        let start = currentDate;
        if (calendarView === 'week') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start, end: endOfWeek(currentDate, { weekStartsOn: 1 }) });
        } else if (calendarView === 'workWeek') {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            return eachDayOfInterval({ start, end: addDays(start, 4) }); // Lunes a Viernes
        } else {
            return [startOfDay(currentDate)];
        }
    }, [currentDate, calendarView]);

    // Main data fetching
    const fetchData = useCallback(async (customRange?: { start: string, end: string }) => {
        if (!canView) return;
        setLoading(true);
        try {
            const limit = viewMode === 'calendar' ? 500 : 50;
            const start = customRange?.start || appliedFilters.startDate;
            const end = customRange?.end || appliedFilters.endDate;

            const { data, metadata } = await ProgramaSupervisoresService.getPrograma(
                page, 
                limit, 
                appliedSearch, 
                sortBy, 
                sortOrder,
                appliedFilters.empleadoId,
                start,
                end
            );
            
            setPrograma(data);
            setTotalPages(metadata.totalPages);
            setTotalItems(metadata.total || 0);
            setPage(metadata.page);
        } catch (error) {
            console.error('Error fetching programa', error);
        } finally {
            setLoading(false);
        }
    }, [page, appliedSearch, appliedFilters, sortBy, sortOrder, viewMode, canView]);

    useEffect(() => {
        if (viewMode === 'calendar' && calendarDays.length > 0) {
            const start = format(calendarDays[0], 'yyyy-MM-dd');
            const end = format(calendarDays[calendarDays.length - 1], 'yyyy-MM-dd');
            fetchData({ start, end });
        } else {
            fetchData();
        }
    }, [page, appliedSearch, appliedFilters, sortBy, sortOrder, viewMode, currentDate, calendarView, fetchData]);

    const handleSearchClick = () => {
        setPage(1);
        setAppliedSearch(searchInput);
        setAppliedFilters(advancedFilters);
    };

    const handleClearFilters = () => {
        setSearchInput('');
        setAppliedSearch('');
        setAdvancedFilters({
            empleadoId: '',
            startDate: '',
            endDate: ''
        });
        setAppliedFilters({
            empleadoId: '',
            startDate: '',
            endDate: ''
        });
        setPage(1);
    };

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(column);
            setSortOrder('ASC');
        }
        setPage(1);
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <ChevronUp className="w-3.5 h-3.5 opacity-20 group-hover/header:opacity-50" />;
        return sortOrder === 'ASC' 
            ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> 
            : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
    };

    const getLaborStyle = (name: string) => {
        const lower = (name || '').toLowerCase();
        const config = laborColors.find(lc => lc.labor.toLowerCase() === lower);
        if (config) {
            return {
                backgroundColor: config.color_fondo,
                color: config.color_text,
                borderColor: `${config.color_text}33`
            };
        }

        // Fallback predeterminado si no se han cargado las paletas
        let preset = { bg: 'var(--muted)', text: 'var(--foreground)' };
        if (lower.includes('emergencias')) preset = { bg: '#ffe4e6', text: '#be123c' };
        else if (lower.includes('puerta')) preset = { bg: '#fef3c7', text: '#b45309' };
        else if (lower.includes('vip')) preset = { bg: '#e0e7ff', text: '#4338ca' };
        else if (lower.includes('charla')) preset = { bg: '#d1fae5', text: '#047857' };
        else if (lower.includes('presencial')) preset = { bg: '#dbeafe', text: '#1d4ed8' };
        else if (lower.includes('festivo')) preset = { bg: '#ffedd5', text: '#c2410c' };
        else if (lower.includes('c4c')) preset = { bg: '#ede9fe', text: '#6d28d9' };
        else if (lower.includes('6 a 9')) preset = { bg: '#ecfeff', text: '#0e7490' };
        else if (lower.includes('flota')) preset = { bg: '#f1f5f9', text: '#334155' };

        return {
            backgroundColor: preset.bg,
            color: preset.text,
            borderColor: `${preset.text}33`
        };
    };

    const handleOpenModal = (item?: ProgramaSupervisor) => {
        setErrorMsg(null);
        if (item) {
            setEditingId(item.id);
            setFormData({
                empleado_id: item.empleado_id,
                fecha_labor: item.fecha_labor ? (item.fecha_labor.includes('T') ? item.fecha_labor.split('T')[0] : item.fecha_labor) : '',
                labor: item.labor
            });
        } else {
            setEditingId(null);
            setFormData({
                empleado_id: '',
                fecha_labor: new Date().toISOString().split('T')[0],
                labor: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleEditFromDetails = () => {
        if (selectedDetails) {
            const item = selectedDetails;
            setIsDetailsOpen(false);
            handleOpenModal(item);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!formData.empleado_id || !formData.fecha_labor || !formData.labor) {
            setErrorMsg("Todos los campos son obligatorios.");
            return;
        }

        setActionLoading(true);
        try {
            await ProgramaSupervisoresService.savePrograma({
                id: editingId || undefined,
                ...formData
            });
            await fetchData();
            setIsModalOpen(false);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Confirmar eliminación',
            message: '¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer.',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    await ProgramaSupervisoresService.deletePrograma(id);
                    fetchData();
                } catch (error) {
                    console.error(error);
                }
            }
        });
    };

    const handleOpenDetails = (item: ProgramaSupervisor) => {
        setSelectedDetails(item);
        setIsDetailsOpen(true);
    };

    const renderEmployeeVisual = (name: string, estado?: string | null, subarea?: string | null) => {
        if (!name) return <span className="text-muted-foreground italic">Sin nombre</span>;
        
        if (estado === 'I') {
            return (
                <div className="flex items-center gap-1.5 text-red-600 overflow-hidden" title={name}>
                    <X className="w-3.5 h-3.5 stroke-[3] shrink-0" />
                    <span className="truncate">{name}</span>
                </div>
            );
        }
        
        if (subarea === 'Canal Institucional') {
            return (
                <div className="flex items-center gap-1.5 text-primary overflow-hidden group-hover:text-primary transition-colors" title={name}>
                    <User className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span className="truncate">{name}</span>
                </div>
            );
        }

        return (
            <div className="text-foreground overflow-hidden" title={name}>
                <p className="truncate">{name}</p>
            </div>
        );
    };

    const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setCurrentDate(new Date());
            return;
        }

        const sign = direction === 'next' ? 1 : -1;
        if (calendarView === 'week' || calendarView === 'workWeek') {
            setCurrentDate(sign > 0 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        } else {
            setCurrentDate(sign > 0 ? addDays(currentDate, 1) : subDays(currentDate, 1));
        }
    };

    const getProgramaForDate = (date: Date) => {
        const targetStr = format(date, 'yyyy-MM-dd');
        return programa.filter(p => p.fecha_labor === targetStr);
    };

    if (!canView) {
        return (
            <div className="flex h-full items-center justify-center bg-background">
                <div className="text-center space-y-4">
                    <div className="bg-destructive/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                        <X className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold">Acceso Denegado</h3>
                    <p className="text-muted-foreground">No tienes permisos para ver este módulo.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header Area */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Programa Supervisores</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Visualización diaria del calendario y programación de labores.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-muted/50 p-1 rounded-lg border border-border/50 bg-card">
                        <button
                            onClick={() => toggleViewMode('table')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'table' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Vista Tabla"
                        >
                            <TableIcon className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => toggleViewMode('calendar')}
                            className={cn(
                                "p-1.5 rounded-md transition-all",
                                viewMode === 'calendar' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Vista Calendario"
                        >
                            <CalendarIcon className="w-4 h-4" />
                        </button>
                    </div>
                    
                    {/* Export as CSV capability on read-only platform */}
                    <button
                        onClick={() => {
                            const headers = ['EMPLEADO', 'LABOR', 'FECHA', 'CREADO POR'];
                            const csvContent = [
                                headers.join(','),
                                ...programa.map(row => [
                                    `"${row.empleado_name}"`,
                                    `"${row.labor}"`,
                                    row.fecha_labor ? row.fecha_labor.split('-').reverse().join('/') : '',
                                    `"${row.creado_por || 'Sistema'}"`
                                ].join(','))
                            ].join('\n');
                            
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.setAttribute('download', `Programa_Supervisores_${new Date().toISOString().split('T')[0]}.csv`);
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-muted/80 rounded-md shadow-sm text-sm border border-border font-bold text-foreground transition-colors"
                    >
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-sm text-sm font-bold hover:opacity-95 transition-all"
                        >
                            <Plus className="w-4 h-4" /> Nuevo Registro
                        </button>
                    )}
                </div>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col gap-3">
                <div className={cn(SIATC_THEME.COMPONENTS.CARD_CONTAINER, "p-3 flex flex-col sm:flex-row items-center gap-3")}>
                    <div className="relative w-full max-w-md flex items-center">
                        <div className="absolute left-3.5 text-muted-foreground">
                            <Search className="w-4 h-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Buscar por empleado o labor..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm outline-none focus:ring-1 focus:ring-primary shadow-sm transition-all"
                        />
                    </div>
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all border",
                            showFilters ? "bg-primary/10 border-primary text-primary font-bold" : "bg-background border-border text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        <span>Filtros</span>
                        {(appliedFilters.empleadoId || appliedFilters.startDate || appliedFilters.endDate) && (
                            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                    </button>
                    <button 
                        onClick={handleSearchClick}
                        className="px-4 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-md hover:opacity-90 transition-all shadow-sm flex items-center gap-2 animate-none"
                    >
                        <Search className="w-4 h-4" />
                        <span>Buscar</span>
                    </button>
                    {(searchInput || appliedFilters.empleadoId || appliedFilters.startDate || appliedFilters.endDate) && (
                        <button 
                            onClick={handleClearFilters}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                            title="Limpiar filtros"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {showFilters && (
                    <div className={cn(SIATC_THEME.COMPONENTS.CARD_CONTAINER, "p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 shadow-sm")}>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-cb-text-secondary tracking-wider uppercase">Desde</label>
                            <input 
                                type="date" 
                                value={advancedFilters.startDate}
                                onChange={e => setAdvancedFilters({...advancedFilters, startDate: e.target.value})}
                                className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-cb-text-secondary tracking-wider uppercase">Hasta</label>
                            <input 
                                type="date" 
                                value={advancedFilters.endDate}
                                onChange={e => setAdvancedFilters({...advancedFilters, endDate: e.target.value})}
                                className="w-full px-3 py-1.5 bg-background border border-input rounded-md text-xs focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-cb-text-secondary tracking-wider uppercase">Empleado</label>
                            <Combobox 
                                options={empleados.map(e => ({ id: e.id, name: e.name }))}
                                value={advancedFilters.empleadoId}
                                onChange={val => setAdvancedFilters({...advancedFilters, empleadoId: val})}
                                placeholder="Todos"
                                noneLabel="-- Todos --"
                                className="h-[36px]"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {viewMode === 'table' ? (
                    <div className="flex flex-col h-full justify-between flex-1">
                        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
                            <table className={SIATC_THEME.TABLE.TABLE_ELEMENT}>
                                <thead className={SIATC_THEME.TABLE.HEADER_ROW}>
                                    <tr>
                                        <ResizableHeader columnId="empleado" width={widths.empleado} onResizeStart={onResizeStart} className="px-4 py-3 border-r border-border group/header">
                                            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Empleado</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleSort('empleado_name'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0">
                                                    <SortIcon column="empleado_name" />
                                                </button>
                                            </div>
                                        </ResizableHeader>
                                        <ResizableHeader columnId="labor" width={widths.labor} onResizeStart={onResizeStart} className="px-4 py-3 border-r border-border group/header">
                                            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Labor</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleSort('labor'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0">
                                                    <SortIcon column="labor" />
                                                </button>
                                            </div>
                                        </ResizableHeader>
                                        <ResizableHeader columnId="fecha" width={widths.fecha} onResizeStart={onResizeStart} className="px-4 py-3 border-r border-border group/header">
                                            <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Fecha</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleSort('fecha_labor'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0">
                                                    <SortIcon column="fecha_labor" />
                                                </button>
                                            </div>
                                        </ResizableHeader>
                                        <th className={cn(SIATC_THEME.TABLE.HEADER_TH, "text-center w-28")}>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-card divide-y divide-border">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground italic">
                                                <div className="flex flex-col items-center gap-2 justify-center">
                                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                    <span>Cargando programación de supervisores...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : programa.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-16 text-center text-muted-foreground text-xs">No se encontraron registros de programación.</td>
                                        </tr>
                                    ) : (
                                        programa.map((row) => (
                                            <tr key={row.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                                                <td className={cn(SIATC_THEME.TABLE.CELL, "border-r border-border/40 truncate")}>{renderEmployeeVisual(row.empleado_name, row.empleado_estado, row.empleado_subarea)}</td>
                                                <td className={cn(SIATC_THEME.TABLE.CELL, "border-r border-border/40 truncate")}>
                                                    <span className="px-2 py-0.5 rounded border text-[11px] font-bold shadow-sm" style={getLaborStyle(row.labor)}>{row.labor}</span>
                                                </td>
                                                <td className={cn(SIATC_THEME.TABLE.CELL, "border-r border-border/40 text-foreground truncate")}>
                                                    <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>
                                                        {row.fecha_labor ? row.fecha_labor.split('-').reverse().join('/') : '-'}
                                                    </span>
                                                </td>
                                                <td className={cn(SIATC_THEME.TABLE.CELL, "text-center")}>
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button onClick={() => handleOpenDetails(row)} className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors inline-flex items-center gap-1" title="Ver Detalles">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        {canEdit && (
                                                            <button onClick={() => handleOpenModal(row)} className="p-1.5 text-blue-600 hover:bg-blue-500/10 rounded transition-colors inline-flex items-center gap-1" title="Editar">
                                                                <Edit className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {canDelete && (
                                                            <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 hover:bg-red-500/10 rounded transition-colors inline-flex items-center gap-1" title="Eliminar">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {!loading && (
                            <div className="px-4 py-3 border-t border-border flex items-center justify-between bg-muted/20">
                                <div className="text-[12px] text-muted-foreground font-medium">
                                    Total registros: <span className="font-bold text-foreground">{totalItems}</span> | Página <span className="font-bold text-foreground">{page}</span> de <span className="font-bold text-foreground">{totalPages}</span>
                                </div>
                                {totalPages > 1 && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-4 py-1.5 bg-background border border-border rounded-md text-[12px] font-bold disabled:opacity-30 hover:bg-muted transition-all shadow-sm">Anterior</button>
                                        <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-4 py-1.5 bg-background border border-border rounded-md text-[12px] font-bold disabled:opacity-30 hover:bg-muted transition-all shadow-sm">Siguiente</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-card p-4 overflow-hidden flex-1">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-lg font-bold text-foreground">
                                    {calendarView === 'day' ? format(currentDate, "EEEE d 'de' MMMM", { locale: es }) : 
                                     `${format(calendarDays[0], 'd MMM', { locale: es })} - ${format(calendarDays[calendarDays.length - 1], 'd MMM yyyy', { locale: es })}`}
                                </h3>
                                <div className="relative">
                                    <button onClick={() => setViewSwitcherOpen(!viewSwitcherOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 hover:bg-muted border border-border rounded-md text-sm font-bold text-foreground transition-all">
                                        <CalendarIcon className="w-4 h-4 text-primary" />
                                        <span>{calendarView === 'week' ? 'Semana' : calendarView === 'workWeek' ? 'Semana laboral' : 'Día'}</span>
                                        <ChevronDown className={cn("w-4 h-4 transition-transform", viewSwitcherOpen && "rotate-180")} />
                                    </button>
                                    {viewSwitcherOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setViewSwitcherOpen(false)} />
                                            <div className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                                                {[{ id: 'day', label: 'Día' }, { id: 'workWeek', label: 'Semana laboral' }, { id: 'week', label: 'Semana' }].map((opt) => (
                                                    <button key={opt.id} onClick={() => changeCalendarView(opt.id as any)} className={cn("w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-muted text-left", calendarView === opt.id ? "text-primary font-bold bg-primary/5" : "text-muted-foreground")}>
                                                        <span>{opt.label}</span>
                                                        {calendarView === opt.id && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 text-muted-foreground items-center">
                                <button onClick={() => handleNavigate('prev')} className="p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors"><ChevronUp className="-rotate-90 w-5 h-5" /></button>
                                <button onClick={() => handleNavigate('today')} className="px-4 py-1.5 text-xs font-bold bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-90 transition-all">Hoy</button>
                                <button onClick={() => handleNavigate('next')} className="p-2 hover:bg-muted hover:text-foreground rounded-full transition-colors"><ChevronDown className="-rotate-90 w-5 h-5" /></button>
                            </div>
                        </div>

                        {calendarView === 'day' ? (
                            <div className="flex-1 flex flex-col gap-4 overflow-hidden bg-muted/10 rounded-xl border border-border p-6 shadow-inner">
                                <div className="flex items-center justify-between border-b border-border pb-4">
                                    <h4 className="text-lg font-bold text-foreground">Labores para hoy</h4>
                                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">{getProgramaForDate(currentDate).length} registros</span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                                    {getProgramaForDate(currentDate).length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-16"><CalendarIcon className="w-12 h-12 mb-3 text-muted-foreground" /><p className="font-medium italic">No hay labores programadas.</p></div>
                                    ) : (
                                        getProgramaForDate(currentDate).map(item => (
                                            <div key={item.id} onClick={() => handleOpenDetails(item)} className="bg-card border border-border rounded-lg px-4 py-3 hover:border-primary/50 transition-all group/row cursor-pointer flex items-center justify-between shadow-sm">
                                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                                    <div className="p-2 bg-muted rounded-full shrink-0"><User className="w-4 h-4 text-muted-foreground" /></div>
                                                    <p className="font-bold text-foreground text-sm truncate group-hover/row:text-primary transition-colors">{item.empleado_name}</p>
                                                    <div className="px-3 py-0.5 rounded-full text-sm font-bold tracking-normal border shrink-0 shadow-sm" style={getLaborStyle(item.labor)}>{item.labor}</div>
                                                </div>
                                                <ChevronUp className="w-4 h-4 text-muted-foreground opacity-0 group-hover/row:opacity-100 rotate-90 transition-all" />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid gap-px bg-border flex-1 border border-border rounded-lg overflow-y-auto custom-scrollbar shadow-inner" style={{ gridTemplateColumns: `repeat(${calendarDays.length}, minmax(0, 1fr))` }}>
                                {calendarDays.map(day => {
                                    const items = getProgramaForDate(day);
                                    return (
                                        <div key={day.toISOString()} className={cn("bg-card flex flex-col min-h-[350px] min-w-0", isSameDay(day, new Date()) && "bg-primary/5")}>
                                            <div className="p-3 border-b border-border sticky top-0 bg-inherit z-10 flex justify-between items-baseline">
                                                <div>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">{format(day, 'EEEE', { locale: es })}</p>
                                                    <p className="text-xl font-bold text-foreground leading-none mt-1">{format(day, 'd')}</p>
                                                </div>
                                                {items.length > 0 && <span className="text-[10px] font-bold text-primary px-1.5 py-0.5 bg-primary/10 rounded">{items.length}</span>}
                                            </div>
                                            <div className="p-2 space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
                                                {items.map(item => (
                                                    <div key={item.id} onClick={() => handleOpenDetails(item)} className="p-2 rounded-md border border-border bg-background hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group/item">
                                                        <p className="text-[10px] font-bold text-foreground truncate group-hover/item:text-primary leading-tight">{item.empleado_name}</p>
                                                        <div className="mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase inline-block border shadow-sm" style={getLaborStyle(item.labor)}>{item.labor}</div>
                                                    </div>
                                                ))}
                                                {items.length === 0 && <div className="h-full flex items-center justify-center opacity-10 py-16"><CalendarIcon className="w-8 h-8 text-muted-foreground" /></div>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {isDetailsOpen && selectedDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-border flex flex-col">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/20">
                            <h3 className="text-lg font-bold flex items-center gap-2 text-primary uppercase"><CalendarIcon className="w-5 h-5" />Detalles de Labor</h3>
                            <button onClick={() => setIsDetailsOpen(false)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground transition-all"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-muted rounded-full"><User className="w-8 h-8 text-muted-foreground" /></div>
                                <div className="min-w-0">
                                    <p className="text-lg font-bold text-foreground truncate">{selectedDetails.empleado_name}</p>
                                    <p className="text-sm font-medium text-muted-foreground">{toTitleCase(selectedDetails.empleado_role || 'Personal')}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-6 bg-muted/10 p-4 rounded-xl border border-border/50">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">Labor</p>
                                    <p className="text-xs font-bold px-2.5 py-0.5 rounded border inline-block shadow-sm" style={getLaborStyle(selectedDetails.labor)}>{selectedDetails.labor}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-muted-foreground opacity-50 uppercase tracking-widest">Fecha</p>
                                    <p className="text-sm font-bold text-foreground">
                                        {selectedDetails.fecha_labor ? format(new Date(selectedDetails.fecha_labor + 'T12:00:00'), "d 'de' MMMM yyyy", { locale: es }) : '-'}
                                    </p>
                                </div>
                            </div>
                            {/* Audit */}
                            <div className="space-y-3 pt-4 border-t border-border/50">
                                <p className="text-[10px] font-black text-muted-foreground opacity-50 tracking-widest uppercase">Seguimiento</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-0.5">
                                        <p className="text-[9px] font-bold text-muted-foreground italic">Creado por</p>
                                        <p className="text-xs font-bold text-foreground/80">{selectedDetails.creado_por || 'Sistema'}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {selectedDetails.creado_el ? format(new Date(selectedDetails.creado_el), "d MMM yyyy HH:mm", { locale: es }) : '-'}
                                        </p>
                                    </div>
                                    {selectedDetails.modificado_por && (
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-bold text-muted-foreground italic">Modificado por</p>
                                            <p className="text-xs font-bold text-foreground/80">{selectedDetails.modificado_por}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {selectedDetails.modificado_el ? format(new Date(selectedDetails.modificado_el), "d MMM yyyy HH:mm", { locale: es }) : '-'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                                <button onClick={() => setIsDetailsOpen(false)} className="px-5 py-2 text-sm font-bold bg-muted hover:bg-muted/80 text-foreground rounded-md transition-all">Cerrar</button>
                                {canEdit && (
                                    <button onClick={handleEditFromDetails} className="flex items-center gap-2 px-5 py-2 text-sm font-bold bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-95 transition-all">
                                        <Edit className="w-4 h-4" /><span>Editar</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Form Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingId ? 'Editar Programación' : 'Nueva Programación'}
                size="md"
            >
                <form onSubmit={handleSave} className="space-y-4">
                    {errorMsg && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md">
                            {errorMsg}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Empleado</label>
                        <Combobox 
                            options={empleados.map(e => ({ id: e.id, name: e.name }))} 
                            value={formData.empleado_id} 
                            onChange={val => setFormData({...formData, empleado_id: val})} 
                            placeholder="Seleccionar empleado..." 
                            className="w-full" 
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Fecha Labor</label>
                            <input 
                                type="date" 
                                value={formData.fecha_labor} 
                                onChange={e => setFormData({...formData, fecha_labor: e.target.value})} 
                                className="w-full h-[38px] px-3 bg-background border border-input rounded-md text-sm outline-none focus:ring-1 focus:ring-primary shadow-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Labor</label>
                            <Combobox 
                                options={LABORES_OPCIONES.map(l => ({ id: l, name: l }))} 
                                value={formData.labor} 
                                onChange={val => setFormData({...formData, labor: val})} 
                                placeholder="Seleccionar labor..." 
                                className="w-full" 
                            />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-border flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="px-4 py-2 text-sm font-medium bg-muted hover:bg-muted/80 text-foreground rounded-md transition-all border border-border"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            disabled={actionLoading} 
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-95 transition-all flex items-center gap-2"
                        >
                            {actionLoading && <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>}
                            {editingId ? 'Actualizar' : 'Crear Registro'}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog 
                isOpen={confirmConfig.isOpen} 
                onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title} 
                message={confirmConfig.message} 
                variant={confirmConfig.variant} 
            />
        </div>
    );
}
