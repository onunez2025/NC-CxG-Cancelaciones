import { useState, useEffect, useRef } from 'react';
import { 
  Plus,
  Search, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  Loader2,
  FileSpreadsheet,
  Eye,
  UserCheck,
  ClipboardCheck,
  User,
  AlertTriangle,
  UserPlus,
  MapPin,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  Eraser,
  Inbox
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { SIATCModalWrapper } from '../../components/siatc/SIATCModalWrapper';
import { 
  SIATCTable, 
  SIATCTableHeader, 
  SIATCTableRow, 
  SIATCTableCell 
} from '../../components/siatc/table/SIATCTable';
import { ncService } from '../../services/ncService';
import type { Cancellation, CancellationDetail } from '../../services/ncService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import type { User as SystemUser } from '../../types';
import { useNavigate } from 'react-router-dom';
import { SIATCActionDropdown } from '../../components/siatc/SIATCActionDropdown';
import { useToast } from '../../context/ToastContext';

// ---- Detail Info Row ----
const DetailRow = ({ icon: Icon, label, value, className }: { icon: any; label: string; value: string | null | undefined; className?: string }) => (
  <div className={`flex items-start gap-3 py-3 ${className || ''}`}>
    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-slate-500" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground mt-0.5 break-words">{value || '—'}</p>
    </div>
  </div>
);

export const CancellationsPage = () => {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const canCreate = hasPermission('cxg.cancelaciones.create');
  const canAssign = hasPermission('cxg.cancelaciones.assign');
  const canGestionar = hasPermission('cxg.cancelaciones.gestionar');
  const canProcess = hasPermission('cxg.cancelaciones.process');
  
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [motivos, setMotivos] = useState<{ id: string; motivo: string }[]>([]);

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [filterSuggestions, setFilterSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const AVAILABLE_COLUMNS = [
    { id: 'ticket', label: 'TICKET' },
    { id: 'cliente', label: 'CLIENTE' },
    { id: 'motivo', label: 'MOTIVO' },
    { id: 'autorizador', label: 'AUTORIZADOR' },
    { id: 'fecha_generado', label: 'FECHA' },
    { id: 'estado', label: 'ESTADO' },
    { id: 'vali_motivo_real', label: 'MOTIVO REAL' },
    { id: 'asignado_a', label: 'ASIGNADO A' }
  ];
  
  // Detail modal state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<CancellationDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Gestionar modal state
  const [isGestionarOpen, setIsGestionarOpen] = useState(false);
  const [gestionItem, setGestionItem] = useState<Cancellation | null>(null);
  const [gestionForm, setGestionForm] = useState({
    cancelacion_correcta: '' as 'Si' | 'No' | '',
    motivo_correcto: '',
    observacion: ''
  });
  const [isGestionSubmitting, setIsGestionSubmitting] = useState(false);

  // Assignment modal state
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignItem, setAssignItem] = useState<Cancellation | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [assignSearch, setAssignSearch] = useState('');
  const [isAssignDropdownOpen, setIsAssignDropdownOpen] = useState(false);
  const assignDropdownRef = useRef<HTMLDivElement>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

  // NEW MODALS
  const [isAprobarSolicitudOpen, setIsAprobarSolicitudOpen] = useState(false);
  const [aprobarSolicitudItem, setAprobarSolicitudItem] = useState<Cancellation | null>(null);
  const [aprobarForm, setAprobarForm] = useState({ aprobado: '' as 'APROBADO' | 'RECHAZADO' | '', observacion: '' });
  const [isAprobarSubmitting, setIsAprobarSubmitting] = useState(false);

  const [isValidarClienteOpen, setIsValidarClienteOpen] = useState(false);
  const [validarClienteItem, setValidarClienteItem] = useState<Cancellation | null>(null);
  const [validarForm, setValidarForm] = useState({ resultado: '' as 'REAL' | 'FALSA' | '', observacion: '', motivo_real: '' });
  const [isValidarSubmitting, setIsValidarSubmitting] = useState(false);

  // Bulk approval state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({ aprobado: '' as 'APROBADO' | 'RECHAZADO' | '', observacion: '' });
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Registration state
  const [formData, setFormData] = useState({
    tienda: '',
    ticket: '',
    motivo: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await ncService.getCancellations({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm,
        estado: statusFilter !== 'TODOS' ? statusFilter : undefined,
        asignado_a: showOnlyMine ? user?.full_name : undefined,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction,
        filters: columnFilters
      });
      setCancellations(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching cancellations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (colId: string) => {
    setSortConfig(current => {
      if (!current || current.key !== colId) return { key: colId, direction: 'asc' };
      if (current.direction === 'asc') return { key: colId, direction: 'desc' };
      return null;
    });
  };

  const toggleFilter = (colId: string) => {
    if (activeFilterCol === colId) {
      setActiveFilterCol(null);
    } else {
      setActiveFilterCol(colId);
      setFilterSearchTerm('');
      setFilterSuggestions([]);
    }
  };

  const fetchSuggestions = async (colId: string, search: string) => {
    if (colId === 'estado') {
      setFilterSuggestions(['REGISTRADO', 'APROBADO_SUP', 'ASIGNADO', 'VALIDADO', 'CERRADO'].filter(s => s.toLowerCase().includes(search.toLowerCase())));
      return;
    }
    setIsFetchingSuggestions(true);
    try {
      const suggestions = await ncService.getUniqueCancellationColumnValues(colId, search);
      setFilterSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setFilterSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  useEffect(() => {
    if (activeFilterCol && activeFilterCol !== 'fecha_generado') {
      const timer = setTimeout(() => {
        fetchSuggestions(activeFilterCol, filterSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filterSearchTerm, activeFilterCol]);

  const applyFilter = (colId: string, value: string) => {
    setColumnFilters(prev => {
      const current = (prev || {})[colId] || [];
      const next = { ...(prev || {}) };
      if (!value) {
        delete next[colId];
      } else if (current.includes(value)) {
        const remaining = current.filter(v => v !== value);
        if (remaining.length === 0) delete next[colId];
        else next[colId] = remaining;
      } else {
        next[colId] = [...current, value];
      }
      return next;
    });
    // keep dropdown open for multi-select
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('TODOS');
    setShowOnlyMine(false);
    setSortConfig(null);
    setColumnFilters({});
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, statusFilter, showOnlyMine, sortConfig, columnFilters]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
    setSelectedIds([]);
  }, [searchTerm, statusFilter, showOnlyMine, sortConfig, columnFilters]);

  // Click outside to close filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setActiveFilterCol(null);
      }
    };
    if (activeFilterCol) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeFilterCol]);

  // Click outside to close assign dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setIsAssignDropdownOpen(false);
      }
    };
    if (isAssignDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isAssignDropdownOpen]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) { setIsDetailOpen(false); setDetailData(null); }
        else if (isCreateModalOpen) setIsCreateModalOpen(false);
        else if (isGestionarOpen) setIsGestionarOpen(false);
        else if (isAssignOpen) setIsAssignOpen(false);
        else if (isAprobarSolicitudOpen) setIsAprobarSolicitudOpen(false);
        else if (isValidarClienteOpen) setIsValidarClienteOpen(false);
        else if (activeFilterCol) setActiveFilterCol(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen, isCreateModalOpen, isGestionarOpen, isAssignOpen, isAprobarSolicitudOpen, isValidarClienteOpen, activeFilterCol]);

  const fetchMotivos = async () => {
    try {
      const data = await ncService.getCancellationMotivos();
      setMotivos(data);
    } catch (error) {
      console.error('Error fetching motives:', error);
    }
  };

  useEffect(() => {
    fetchMotivos();
  }, []);

  useEffect(() => {
    // Only load system users for assignment dropdown if user has permission
    // Asesor CC users don't have 'ebm.config.users' so GET /api/users returns 403
    // We now use a supervisor-friendly endpoint inside ncService
    if (canAssign) {
      ncService.getAnalystsForCancellation().then(users => setSystemUsers(users.filter(u => u.is_active))).catch(console.error);
    }
  }, [canAssign]);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await ncService.createCancellation({
        cliente: formData.tienda,
        motive: formData.motivo,
        ticket: formData.ticket,
        usuario: user?.username || 'Sistema'
      });
      
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'CREATE',
        Entidad: 'CANCELACIONES',
        EntidadID: 'NEW',
        Detalle: `Nueva solicitud de cancelación para ${formData.tienda} (Ticket: ${formData.ticket})`
      });

      setIsCreateModalOpen(false);
      fetchData();
      setFormData({ tienda: '', ticket: '', motivo: '' });
    } catch (error) {
      console.error("Error creating cancellation", error);
      setIsCreateModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupTicket = async () => {
    if (!formData.ticket) return;
    setIsLookingUp(true);
    try {
      const ticketInfo = await ncService.getTicketDetails(formData.ticket);
      setFormData(prev => ({
        ...prev,
        tienda: ticketInfo.cliente
      }));
    } catch (error: any) {
      console.error("Lookup error:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    try {
      const detail = await ncService.getCancellationDetail(id);
      setDetailData(detail);
    } catch (error) {
      console.error('Error loading detail:', error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleOpenGestionar = (item: Cancellation) => {
    setGestionItem(item);
    setGestionForm({ cancelacion_correcta: '', motivo_correcto: '', observacion: '' });
    setIsGestionarOpen(true);
  };

  const handleGestionar = async () => {
    if (!gestionItem || !gestionForm.cancelacion_correcta) return;
    setIsGestionSubmitting(true);
    try {
      await ncService.gestionarCancellation(gestionItem.id, {
        cancelacion_correcta: gestionForm.cancelacion_correcta as 'Si' | 'No',
        motivo_correcto: gestionForm.cancelacion_correcta === 'No' ? gestionForm.motivo_correcto : undefined,
        observacion: gestionForm.observacion,
        gestionado_por: user?.username || 'Sistema'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: gestionForm.cancelacion_correcta === 'Si' ? 'APPROVE' : 'REJECT',
        Entidad: 'CANCELACIONES',
        EntidadID: gestionItem.id,
        Detalle: `Cancelación ${gestionForm.cancelacion_correcta === 'Si' ? 'aprobada' : 'rechazada'} por ${user?.username}. Obs: ${gestionForm.observacion}`
      });

      setIsGestionarOpen(false);
      fetchData();
      if (isDetailOpen && gestionItem) {
        handleViewDetail(gestionItem.id);
      }
    } catch (error) {
      console.error('Error gestionando:', error);
    } finally {
      setIsGestionSubmitting(false);
    }
  };

  // ---- Assignment Handler ----
  const handleOpenAssign = (item: Cancellation) => {
    setAssignItem(item);
    setAssignTo('');
    setAssignSearch('');
    setIsAssignDropdownOpen(false);
    setIsAssignOpen(true);
    
    // Fetch analysts dynamically when opening the modal to ensure fresh data and bypass any auth race conditions
    ncService.getAnalystsForCancellation()
      .then(users => setSystemUsers(users.filter(u => u.is_active)))
      .catch(console.error);
  };

  const handleAssign = async () => {
    if (!assignItem || !assignTo) return;
    setIsAssigning(true);
    try {
      await ncService.asignarCancellation(assignItem.id, {
        asignado_a: assignTo,
        asignado_por: user?.full_name || user?.username || 'Sistema'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'ASSIGN',
        Entidad: 'CANCELACIONES',
        EntidadID: assignItem.id,
        Detalle: `Cancelación asignada a ${assignTo} por ${user?.username}`
      });

      setIsAssignOpen(false);
      fetchData();
      if (isDetailOpen && assignItem) {
        handleViewDetail(assignItem.id);
      }
    } catch (error) {
      console.error('Error assigning:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAprobarSolicitud = async () => {
    if (!aprobarSolicitudItem || !aprobarForm.aprobado) return;
    setIsAprobarSubmitting(true);
    try {
      await ncService.aprobarSolicitudCancellation(aprobarSolicitudItem.id, {
        aprobado: aprobarForm.aprobado as 'APROBADO' | 'RECHAZADO',
        observacion: aprobarForm.observacion,
        usuario: user?.full_name || user?.username || 'Sistema'
      });
      
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: aprobarForm.aprobado === 'APROBADO' ? 'APPROVE' : 'REJECT',
        Entidad: 'CANCELACIONES',
        EntidadID: aprobarSolicitudItem.id,
        Detalle: `Solicitud ${aprobarForm.aprobado} por el supervisor. Obs: ${aprobarForm.observacion}`
      });

      setIsAprobarSolicitudOpen(false);
      fetchData();
      if (isDetailOpen && aprobarSolicitudItem) {
        handleViewDetail(aprobarSolicitudItem.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAprobarSubmitting(false);
    }
  };

  const handleAprobarMasivo = async () => {
    if (selectedIds.length === 0 || !bulkForm.aprobado) return;
    setIsBulkSubmitting(true);
    try {
      await ncService.aprobarMasivoCancellations({
        ids: selectedIds,
        aprobado: bulkForm.aprobado as 'APROBADO' | 'RECHAZADO',
        observacion: bulkForm.observacion,
        usuario: user?.full_name || user?.username || 'Sistema'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: bulkForm.aprobado === 'APROBADO' ? 'APPROVE' : 'REJECT',
        Entidad: 'CANCELACIONES',
        EntidadID: selectedIds.join(','),
        Detalle: `Aprobación en masivo (${selectedIds.length} registros) evaluada como ${bulkForm.aprobado} por el supervisor. Obs: ${bulkForm.observacion}`
      });

      setIsBulkModalOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      console.error('Error in bulk approval:', error);
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleValidarCliente = async () => {
    if (!validarClienteItem || !validarForm.resultado) return;
    setIsValidarSubmitting(true);
    try {
      await ncService.validarClienteCancellation(validarClienteItem.id, {
        resultado: validarForm.resultado as 'REAL' | 'FALSA',
        observacion: validarForm.observacion,
        usuario: user?.full_name || user?.username || 'Sistema',
        motivo_real: validarForm.resultado === 'FALSA' ? validarForm.motivo_real : undefined
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'VALIDATE',
        Entidad: 'CANCELACIONES',
        EntidadID: validarClienteItem.id,
        Detalle: `Validación con cliente completada: ${validarForm.resultado}. Obs: ${validarForm.observacion}`
      });

      setIsValidarClienteOpen(false);
      fetchData();
      if (isDetailOpen && validarClienteItem) {
        handleViewDetail(validarClienteItem.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsValidarSubmitting(false);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'CERRADO':
      case 'APROBADO': return 'success';
      case 'RECHAZADO': return 'danger';
      case 'APROBADO_SUP':
      case 'ASIGNADO':
      case 'VALIDADO':
      case 'EN GESTIÓN': return 'info';
      case 'REGISTRADO':
      default: return 'warning';
    }
  };

  const displayedCancellations = cancellations;

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Page Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Gestión de Cancelaciones</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Administración y seguimiento de solicitudes de cancelación y reversiones en tiempo real.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SIATCButton 
            variant="secondary" 
            icon={RefreshCw}
            onClick={fetchData}
            isLoading={isLoading}
          >
            Sincronizar
          </SIATCButton>
          <SIATCButton 
            variant="secondary" 
            icon={MapPin}
            onClick={() => navigate('/cancelaciones/mapa')}
          >
            Mapa
          </SIATCButton>
          <SIATCButton 
            variant="secondary" 
            icon={FileSpreadsheet}
            isLoading={isExporting}
            onClick={async () => {
              setIsExporting(true);
              try {
                const response = await ncService.getCancellations({ 
                  page: 1, 
                  pageSize: 1000000, 
                  search: searchTerm,
                  estado: statusFilter,
                  asignado_a: showOnlyMine ? (user?.full_name || '') : undefined,
                  sortBy: sortConfig?.key,
                  sortOrder: sortConfig?.direction,
                  filters: columnFilters
                });
                
                const exportData = response.data;
                const headers = ['TICKET', 'CLIENTE', 'MOTIVO', 'AUTORIZADOR', 'FECHA', 'ESTADO', 'GESTIONADO POR', 'OBSERVACIÓN'];
                const csvContent = [
                  headers.join(','),
                  ...exportData.map(item => [
                    item.ticket,
                    `"${item.cliente}"`,
                    `"${item.motivo}"`,
                    `"${item.autorizador || ''}"`,
                    item.fecha_generado ? new Date(item.fecha_generado).toLocaleDateString() : '',
                    item.estado,
                    `"${item.gestionado_por || ''}"`,
                    `"${(item.observacion || '').replace(/"/g, '""')}"`
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `Cancelaciones_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Exportación exitosa', `Se exportaron ${exportData.length} registros.`);
              } catch (error) {
                console.error('Error exporting cancellations:', error);
                toast.error('Error al exportar', 'No se pudo obtener la data para la exportación.');
              } finally {
                setIsExporting(false);
              }
            }}
          >
            Exportar
          </SIATCButton>
          {canGestionar && selectedIds.length > 0 && (
            <SIATCButton 
              variant="primary" 
              icon={CheckCircle2}
              onClick={() => {
                setBulkForm({ aprobado: '', observacion: '' });
                setIsBulkModalOpen(true);
              }}
            >
              Aprobar Masivo ({selectedIds.length})
            </SIATCButton>
          )}
          {canCreate && (
            <SIATCButton 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Registrar
            </SIATCButton>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="shrink-0 flex flex-col gap-2 mb-2">
        <div className={cn(SIATC_THEME.COMPONENTS.CARD_CONTAINER, "p-2 flex items-center flex-wrap gap-2")}>
          <div className="relative flex-1 min-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cb-text-secondary/55" />
            <input 
              type="text"
              placeholder="Buscar por ticket, cliente, motivo o autorizador..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm text-cb-text-primary placeholder:text-cb-neutral/40 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-px h-6 bg-cb-border mx-1 hidden sm:block" />

          {canProcess && (
            <>
              <label className="flex items-center gap-2 px-2.5 py-1 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none">
                <input 
                  type="checkbox"
                  checked={showOnlyMine}
                  onChange={(e) => setShowOnlyMine(e.target.checked)}
                  className="rounded border-slate-300 text-primary focus:ring-primary/20 focus:ring-offset-0 h-4 w-4 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-bold text-cb-text-primary whitespace-nowrap">Mis Asignados</span>
              </label>
              <div className="w-px h-6 bg-cb-border mx-1 hidden sm:block" />
            </>
          )}

          <select 
            className="bg-transparent border-none px-3 py-1.5 text-sm font-bold text-cb-text-primary focus:ring-0 outline-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="TODOS">Filtro Estado</option>
            <option value="REGISTRADO">REGISTRADO</option>
            <option value="APROBADO_SUP">APROBADO POR SUP.</option>
            <option value="ASIGNADO">ASIGNADO</option>
            <option value="VALIDADO">VALIDADO CLIENTE</option>
            <option value="CERRADO">CERRADO</option>
          </select>

          {(searchTerm !== '' || statusFilter !== 'TODOS' || showOnlyMine || Object.keys(columnFilters).length > 0 || sortConfig !== null) && (
            <SIATCButton 
              variant="ghost" 
              size="sm" 
              icon={Eraser}
              onClick={handleClearFilters}
              className="ml-auto h-7 text-[10px] uppercase font-black tracking-tighter"
            >
              Limpiar Filtros
            </SIATCButton>
          )}
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Table Area */}
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Cargando registros...</p>
            </div>
          ) : displayedCancellations.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Sin resultados</p>
                <p className="text-xs text-muted-foreground mt-1">No se encontraron cancelaciones con los filtros actuales.</p>
              </div>
              <SIATCButton variant="ghost" size="sm" icon={Eraser} onClick={handleClearFilters}>Limpiar Filtros</SIATCButton>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  {canGestionar && (
                    <SIATCTableHeader className="w-10 text-center p-0">
                      <div className="flex items-center justify-center h-full w-full py-2 pl-3">
                        <input 
                          type="checkbox"
                          className="rounded border-slate-300 text-primary focus:ring-primary/20 focus:ring-offset-0 h-4 w-4 bg-transparent cursor-pointer"
                          checked={
                            displayedCancellations.filter(item => item.estado === 'REGISTRADO').length > 0 &&
                            displayedCancellations.filter(item => item.estado === 'REGISTRADO').every(item => selectedIds.includes(item.id))
                          }
                          onChange={(e) => {
                            const selectableCancellations = displayedCancellations.filter(item => item.estado === 'REGISTRADO');
                            if (e.target.checked) {
                              setSelectedIds(prev => {
                                const newIds = selectableCancellations.map(item => item.id);
                                return [...new Set([...prev, ...newIds])];
                              });
                            } else {
                              setSelectedIds(prev => {
                                const newIds = selectableCancellations.map(item => item.id);
                                return prev.filter(id => !newIds.includes(id));
                              });
                            }
                          }}
                        />
                      </div>
                    </SIATCTableHeader>
                  )}
                  {AVAILABLE_COLUMNS.map(col => {
                    const colId = col.id;
                    const label = col.label;
                    return (
                      <SIATCTableHeader key={colId} className="relative group p-0">
                        <div className="flex items-center justify-between gap-1 px-3 py-2 w-full h-full">
                          <div 
                            className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0 font-bold"
                            onClick={() => handleSort(colId)}
                          >
                            <span className="truncate leading-tight">{label}</span>
                            {sortConfig?.key === colId ? (
                              sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 shrink-0" /> : <ArrowDown className="w-3 h-3 shrink-0" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                            )}
                          </div>
                          <button 
                            className={`p-1 rounded shrink-0 hover:bg-muted/50 transition-colors relative ${(columnFilters || {})[colId]?.length > 0 || (columnFilters || {})[`${colId}_start`] || (columnFilters || {})[`${colId}_end`] ? 'text-primary bg-primary/10' : 'text-muted-foreground opacity-30 hover:opacity-100'}`}
                            onClick={(e) => { e.stopPropagation(); toggleFilter(colId); }}
                          >
                            <Filter className="w-3 h-3" />
                            {((columnFilters || {})[colId]?.length || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                                {(columnFilters || {})[colId].length}
                              </span>
                            )}
                          </button>
                          {activeFilterCol === colId && (
                            <div 
                              ref={filterDropdownRef}
                              className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg z-50 p-2 font-normal text-left"
                              onClick={e => e.stopPropagation()}
                            >
                              <div className="flex flex-col gap-2">
                                {colId === 'fecha_generado' ? (
                                  <div className="flex flex-col gap-2 p-1">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground">Desde</span>
                                      <input 
                                        type="date"
                                        className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                        value={(columnFilters || {})[`${colId}_start`]?.[0] || ''}
                                        onChange={(e) => {
                                           const val = e.target.value;
                                           setColumnFilters(prev => ({ ...(prev || {}), [`${colId}_start`]: val ? [val] : [] }));
                                        }}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground">Hasta</span>
                                      <input 
                                        type="date"
                                        className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                        value={(columnFilters || {})[`${colId}_end`]?.[0] || ''}
                                        onChange={(e) => {
                                           const val = e.target.value;
                                           setColumnFilters(prev => ({ ...(prev || {}), [`${colId}_end`]: val ? [val] : [] }));
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/60">
                                       <button
                                         className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors px-1"
                                         onClick={() => {
                                           setColumnFilters(prev => { const n = {...(prev || {})}; delete n[`${colId}_start`]; delete n[`${colId}_end`]; return n; });
                                         }}
                                       >
                                         Limpiar
                                       </button>
                                       <button
                                         className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors px-1"
                                         onClick={() => setActiveFilterCol(null)}
                                       >
                                         Cerrar
                                       </button>
                                     </div>
                                  </div>
                                ) : (
                                  <>
                                    <input 
                                      type="text" 
                                      className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                      placeholder={`Buscar en ${label}...`}
                                      value={filterSearchTerm}
                                      onChange={(e) => setFilterSearchTerm(e.target.value)}
                                      autoFocus
                                    />
                                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pr-1 custom-scrollbar">
                                      {isFetchingSuggestions ? (
                                        <div className="text-xs text-muted-foreground p-2 text-center flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Cargando...</div>
                                      ) : filterSuggestions.length === 0 ? (
                                        <div className="text-xs text-muted-foreground p-2 text-center">Sin resultados</div>
                                      ) : (
                                        <>
                                          {filterSuggestions.map(val => {
                                            const isChecked = ((columnFilters || {})[colId] || []).includes(val);
                                            return (
                                              <label
                                                key={val}
                                                className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors ${
                                                  isChecked ? 'bg-primary/8 text-primary' : 'text-foreground'
                                                }`}
                                                onClick={() => applyFilter(colId, val)}
                                              >
                                                <input
                                                  type="checkbox"
                                                  className="w-3.5 h-3.5 rounded border-border accent-primary shrink-0 cursor-pointer"
                                                  checked={isChecked}
                                                  onChange={() => {}}
                                                />
                                                <span className={`text-xs leading-tight break-words ${isChecked ? 'font-bold' : ''}`}>{val}</span>
                                              </label>
                                            );
                                          })}
                                        </>
                                      )}
                                    </div>
                                    {/* Footer actions */}
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/60">
                                      <button
                                        className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors px-1"
                                        onClick={() => {
                                          setColumnFilters(prev => { const n = {...(prev || {})}; delete n[colId]; return n; });
                                        }}
                                      >
                                        Limpiar
                                      </button>
                                      <span className="text-[10px] text-muted-foreground">
                                        {((columnFilters || {})[colId]?.length || 0) > 0 ? `${(columnFilters || {})[colId].length} seleccionado(s)` : 'Ninguno'}
                                      </span>
                                      <button
                                        className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors px-1"
                                        onClick={() => setActiveFilterCol(null)}
                                      >
                                        Cerrar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </SIATCTableHeader>
                    );
                  })}
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {displayedCancellations.map((item) => {
                  const canSelect = item.estado === 'REGISTRADO';
                  return (
                    <SIATCTableRow 
                      key={item.id}
                      onClick={() => handleViewDetail(item.id)}
                      className="cursor-pointer"
                    >
                      {canGestionar && (
                        <SIATCTableCell className="text-center p-0" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                          <div className="flex items-center justify-center h-full w-full py-2 pl-3">
                            <input 
                              type="checkbox"
                              disabled={!canSelect}
                              className="rounded border-slate-300 text-primary focus:ring-primary/20 focus:ring-offset-0 h-4 w-4 bg-transparent cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                              checked={selectedIds.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedIds(prev => [...prev, item.id]);
                                } else {
                                  setSelectedIds(prev => prev.filter(id => id !== item.id));
                                }
                              }}
                            />
                          </div>
                        </SIATCTableCell>
                      )}
                      <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="text-xs font-medium text-foreground max-w-[200px] truncate">{item.cliente}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs text-cb-text-secondary">{item.motivo}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs text-cb-text-secondary">{item.autorizador || '—'}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>
                        {new Date(item.fecha_generado).toLocaleDateString('es-PE')}
                      </span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={getEstadoBadgeVariant(item.estado)}>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs font-semibold text-rose-500 whitespace-nowrap">{item.vali_motivo_real || '—'}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs text-cb-text-secondary">{item.asignado_a || '—'}</span>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <SIATCActionDropdown 
                          actions={[
                            {
                              label: 'Ver Detalle',
                              icon: Eye,
                              onClick: () => handleViewDetail(item.id)
                            },
                            {
                              label: 'Evaluar Solicitud',
                              icon: UserCheck,
                              variant: 'success',
                              show: canGestionar && item.estado === 'REGISTRADO',
                              onClick: () => {
                                setAprobarSolicitudItem(item);
                                setAprobarForm({ aprobado: '', observacion: '' });
                                setIsAprobarSolicitudOpen(true);
                              }
                            },
                            {
                              label: 'Asignar Analista',
                              icon: UserPlus,
                              show: canAssign && item.estado === 'APROBADO_SUP',
                              onClick: () => handleOpenAssign(item)
                            },
                            {
                              label: 'Validar Cliente',
                              icon: ClipboardCheck,
                              show: canProcess && item.estado === 'ASIGNADO' && (item.asignado_a === user?.full_name || canAssign || user?.role_name === 'Administrador'),
                              onClick: () => {
                                setValidarClienteItem(item);
                                setValidarForm({ resultado: '', observacion: '', motivo_real: '' });
                                setIsValidarClienteOpen(true);
                              }
                            },
                            {
                              label: 'Gestionar Cierre',
                              icon: CheckCircle2,
                              show: canProcess && item.estado === 'VALIDADO' && (item.asignado_a === user?.full_name || canAssign || user?.role_name === 'Administrador'),
                              onClick: () => handleOpenGestionar(item)
                            }
                          ]}
                        />
                      </div>
                    </SIATCTableCell>
                  </SIATCTableRow>
                  );
                })}
              </tbody>
            </SIATCTable>
          )}
        </div>

        {/* Footer */}
        <div className={SIATC_THEME.TABLE.FOOTER}>
          <div className={SIATC_THEME.TYPOGRAPHY.FOOTER_STATS}>
            MOSTRANDO {displayedCancellations.length} DE {totalRecords} REGISTROS
          </div>
          <div className="flex items-center gap-2">
            <SIATCButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}
            >
              Anterior
            </SIATCButton>
            <span className="text-[10px] font-black text-muted-foreground uppercase">
              PÁGINA {currentPage} DE {Math.ceil(totalRecords / pageSize) || 1}
            </span>
            <SIATCButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage >= Math.ceil(totalRecords / pageSize) || isLoading}
            >
              Siguiente
            </SIATCButton>
          </div>
        </div>
      </div>

      {/* ====== MODAL: Nueva Cancelación ====== */}
      <SIATCModalWrapper
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nueva Solicitud"
        subtitle="Complete los datos para procesar la cancelación."
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleCreate} isLoading={isSubmitting}>Registrar</SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Ticket de Referencia</label>
            <div className="flex gap-2">
              <input 
                className={SIATC_THEME.COMPONENTS.INPUT}
                value={formData.ticket}
                onChange={(e) => setFormData({...formData, ticket: e.target.value})}
                placeholder="N° de Ticket FSM"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLookupTicket();
                  }
                }}
              />
              <SIATCButton 
                variant="secondary" 
                icon={isLookingUp ? Loader2 : Search}
                onClick={handleLookupTicket}
                isLoading={isLookingUp}
                className="w-12 h-10 flex-shrink-0"
              />
            </div>
            {formData.tienda && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 pl-4">
                ✔ {formData.tienda}
              </p>
            )}
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={formData.motivo}
              onChange={(e) => setFormData({...formData, motivo: e.target.value})}
            >
              <option value="">Seleccione un motivo...</option>
              {motivos.map(m => (
                <option key={m.id} value={m.id}>{m.motivo}</option>
              ))}
            </select>
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ====== MODAL: Ver Detalle ====== */}
      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setDetailData(null); }}
        title="Detalle de Cancelación"
        subtitle={detailData ? `Ticket #${detailData.ticket}` : 'Cargando...'}
        size="lg"
      >
        {isLoadingDetail ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando información...</p>
          </div>
        ) : detailData ? (
          <div className="space-y-6">
            {/* Process Timeline / Status Banner */}
            <div className="grid grid-cols-5 gap-2 px-2">
              {[
                { key: 'REGISTRADO', label: 'Registro', icon: Plus },
                { key: 'APROBADO_SUP', label: 'Aprobación', icon: UserCheck },
                { key: 'ASIGNADO', label: 'Asignación', icon: UserPlus },
                { key: 'VALIDADO', label: 'Validación', icon: ClipboardCheck },
                { key: 'CERRADO', label: 'Cierre', icon: CheckCircle2 }
              ].map((step, idx) => {
                const stepOrder = ['REGISTRADO', 'APROBADO_SUP', 'ASIGNADO', 'VALIDADO', 'CERRADO'];
                const currentIdx = stepOrder.indexOf(detailData.estado);
                const isCompleted = currentIdx >= idx;
                const isActive = currentIdx === idx;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 
                      'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                    } ${isActive ? 'ring-4 ring-primary/10 scale-110' : ''}`}>
                      <step.icon className="w-4 h-4" />
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${
                       isCompleted ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Status Banner */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              detailData.estado === 'CERRADO' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
              detailData.estado === 'RECHAZADO' ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' :
              'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {detailData.estado === 'CERRADO' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                 detailData.estado === 'RECHAZADO' ? <XCircle className="w-5 h-5 text-rose-500" /> :
                 <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                <div>
                  <p className="text-sm font-bold">{detailData.estado}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {detailData.estado === 'CERRADO' ? 'Gestión finalizada correctamente' : 
                     detailData.estado === 'REGISTRADO' ? 'Pendiente de aprobación inicial' :
                     'En proceso de gestión operativa'}
                  </p>
                </div>
              </div>
              <SIATCBadge variant={getEstadoBadgeVariant(detailData.estado)}>{detailData.estado}</SIATCBadge>
            </div>

            {/* Info Grid - Modern 3 Columns for larger view */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sección: Datos de Solicitud */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">1. Registro & Aprobación</h3>
                  <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                    <DetailRow icon={Search} label="Ticket FSM" value={detailData.ticket} />
                    <DetailRow icon={User} label="Cliente" value={detailData.cliente} />
                    <DetailRow icon={AlertTriangle} label="Motivo Inicial" value={detailData.motivo_cancelacion_texto} />
                    <DetailRow icon={UserCheck} label="Registrado Por" value={`${detailData.autorizador} (${detailData.fecha_generado ? new Date(detailData.fecha_generado).toLocaleString() : ''})`} />
                    <DetailRow icon={CheckCircle2} label="Aprobación Sup." value={detailData.apro_solicitud} />
                    {detailData.apro_por && (
                      <DetailRow icon={User} label="Evaluado Por" value={`${detailData.apro_por} (${detailData.apro_el ? new Date(detailData.apro_el).toLocaleString() : ''})`} />
                    )}
                  </div>
                </div>

                {/* Sección: Asignación & Validación */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">2. Operación & Validación</h3>
                  <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                    <DetailRow icon={UserPlus} label="Asignado A" value={detailData.asignado_a} />
                    <DetailRow icon={UserCheck} label="Asignado Por" value={`${detailData.asignado_por} (${detailData.fecha_asignado ? new Date(detailData.fecha_asignado).toLocaleString() : ''})`} />
                    <DetailRow icon={ClipboardCheck} label="Validación Cliente" value={detailData.vali_cliente} />
                    {detailData.vali_por && (
                      <>
                        <DetailRow icon={User} label="Validado Por" value={`${detailData.vali_por} (${detailData.vali_el ? new Date(detailData.vali_el).toLocaleString() : ''})`} />
                        {detailData.vali_motivo_real && (
                          <DetailRow icon={AlertTriangle} label="Motivo Detectado" value={detailData.vali_motivo_real} className="text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-2 mt-1" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección: Cierre & Notas */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">3. Cierre & Resultado</h3>
                  <div className="space-y-1 divide-y divide-slate-100 dark:divide-slate-800">
                    <DetailRow icon={CheckCircle2} label="Resultado" value={detailData.cancelacion_correcta === 'Si' ? 'PROCEDE' : 'NO PROCEDE'} />
                    <DetailRow icon={User} label="Cerrado Por" value={`${detailData.gestionado_por || '—'} (${detailData.fecha_gestionado ? new Date(detailData.fecha_gestionado).toLocaleString() : ''})`} />
                    {detailData.motivo_correcto_texto && (
                      <DetailRow icon={AlertTriangle} label="Motivo Real" value={detailData.motivo_correcto_texto} className="text-rose-600" />
                    )}
                  </div>
                </div>

                {/* Observaciones Agrupadas */}
                <div className="space-y-3">
                  {detailData.apro_obs && (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200/50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-600 mb-1">OBS. APROBACIÓN</p>
                      <p className="text-xs font-medium">{detailData.apro_obs}</p>
                    </div>
                  )}
                  {detailData.vali_obs && (
                    <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200/50">
                      <p className="text-[9px] font-black uppercase tracking-wider text-blue-600 mb-1">OBS. VALIDACIÓN CLIENTE</p>
                      <p className="text-xs font-medium">{detailData.vali_obs}</p>
                    </div>
                  )}
                  {detailData.observacion && (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 mb-1">OBS. CIERRE FINAL</p>
                      <p className="text-xs font-medium">{detailData.observacion}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar la información.</p>
          </div>
        )}
      </SIATCModalWrapper>

      {/* ====== MODAL: Aprobar Solicitud (Supervisor) ====== */}
      <SIATCModalWrapper
        isOpen={isAprobarSolicitudOpen}
        onClose={() => setIsAprobarSolicitudOpen(false)}
        title="Evaluación de Solicitud"
        subtitle={aprobarSolicitudItem ? `Ticket #${aprobarSolicitudItem.ticket} — ${aprobarSolicitudItem.cliente}` : ''}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsAprobarSolicitudOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleAprobarSolicitud} 
              isLoading={isAprobarSubmitting}
              disabled={!aprobarForm.aprobado}
            >
              Confirmar Evaluación
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿La solicitud de cancelación procede?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'APROBADO' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  aprobarForm.aprobado === 'APROBADO'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-bold">APROBAR</span>
              </button>
              <button
                type="button"
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'RECHAZADO' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  aprobarForm.aprobado === 'RECHAZADO'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span className="text-xs font-bold">RECHAZAR</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Observaciones</label>
            <textarea 
              className={SIATC_THEME.COMPONENTS.INPUT}
              rows={3}
              placeholder="¿Por qué se aprueba o rechaza esta solicitud? (Temas varios, error humano, etc.)"
              value={aprobarForm.observacion}
              onChange={(e) => setAprobarForm({...aprobarForm, observacion: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ====== MODAL: Aprobación en Masivo ====== */}
      <SIATCModalWrapper
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        title="Evaluación Masiva de Solicitudes"
        subtitle={`Se evaluarán ${selectedIds.length} solicitudes seleccionadas`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsBulkModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleAprobarMasivo} 
              isLoading={isBulkSubmitting}
              disabled={!bulkForm.aprobado}
            >
              Confirmar Evaluación Masiva
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 rounded-xl text-xs text-amber-700 dark:text-amber-300">
            <strong>Atención:</strong> Esta acción se aplicará a las {selectedIds.length} solicitudes de cancelación en estado <strong>REGISTRADO</strong> que ha seleccionado.
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿Las solicitudes de cancelación proceden?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBulkForm({ ...bulkForm, aprobado: 'APROBADO' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  bulkForm.aprobado === 'APROBADO'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-bold">APROBAR</span>
              </button>
              <button
                type="button"
                onClick={() => setBulkForm({ ...bulkForm, aprobado: 'RECHAZADO' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  bulkForm.aprobado === 'RECHAZADO'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span className="text-xs font-bold">RECHAZAR</span>
              </button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Observaciones Masivas</label>
            <textarea 
              className={SIATC_THEME.COMPONENTS.INPUT}
              rows={3}
              placeholder="¿Por qué se aprueban o rechazan estas solicitudes en bloque? (Temas varios, error humano, etc.)"
              value={bulkForm.observacion}
              onChange={(e) => setBulkForm({...bulkForm, observacion: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ====== MODAL: Validar Cliente (Analista) ====== */}
      <SIATCModalWrapper
        isOpen={isValidarClienteOpen}
        onClose={() => setIsValidarClienteOpen(false)}
        title="Validación con Cliente"
        subtitle={validarClienteItem ? `Ticket #${validarClienteItem.ticket} — ${validarClienteItem.cliente}` : ''}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsValidarClienteOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleValidarCliente} 
              isLoading={isValidarSubmitting}
              disabled={!validarForm.resultado || (validarForm.resultado === 'FALSA' && !validarForm.motivo_real)}
            >
              Guardar Validación
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿El cliente confirma el motivo?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValidarForm({ ...validarForm, resultado: 'REAL' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  validarForm.resultado === 'REAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xs font-bold">MOTIVO REAL</span>
              </button>
              <button
                type="button"
                onClick={() => setValidarForm({ ...validarForm, resultado: 'FALSA' })}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  validarForm.resultado === 'FALSA'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10'
                    : 'border-slate-100 dark:border-slate-800 text-slate-400'
                }`}
              >
                <XCircle className="w-6 h-6" />
                <span className="text-xs font-bold">MOTIVO FALSO</span>
              </button>
            </div>
          </div>

          {validarForm.resultado === 'FALSA' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-black uppercase text-rose-500 mb-1.5 block tracking-widest pl-4">¿Cuál es el Motivo Real?</label>
              <select 
                className={`${SIATC_THEME.COMPONENTS.INPUT} border-rose-200 bg-rose-50/50 text-rose-700 font-bold`}
                value={validarForm.motivo_real}
                onChange={(e) => setValidarForm({ ...validarForm, motivo_real: e.target.value })}
              >
                <option value="">Seleccione el motivo real...</option>
                {motivos.map(m => (
                  <option key={m.id} value={m.motivo}>{m.motivo}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Notas de la llamada</label>
            <textarea 
              className={SIATC_THEME.COMPONENTS.INPUT}
              rows={3}
              placeholder="Detalle de lo conversado con el cliente..."
              value={validarForm.observacion}
              onChange={(e) => setValidarForm({...validarForm, observacion: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ====== MODAL: Gestionar Cancelación ====== */}
      <SIATCModalWrapper
        isOpen={isGestionarOpen}
        onClose={() => setIsGestionarOpen(false)}
        title="Gestionar Cancelación"
        subtitle={gestionItem ? `Ticket #${gestionItem.ticket} — ${gestionItem.cliente}` : ''}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsGestionarOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleGestionar} 
              isLoading={isGestionSubmitting}
              disabled={
                !gestionForm.cancelacion_correcta || 
                (gestionForm.cancelacion_correcta === 'No' && (!gestionForm.observacion || !gestionForm.motivo_correcto))
              }
            >
              Confirmar Gestión
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-5">
          {/* ¿Cancelación Correcta? */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">
              ¿La cancelación fue correcta?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGestionForm({ ...gestionForm, cancelacion_correcta: 'Si', motivo_correcto: '' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestionForm.cancelacion_correcta === 'Si'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-lg shadow-emerald-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Sí, Correcta
              </button>
              <button
                type="button"
                onClick={() => setGestionForm({ ...gestionForm, cancelacion_correcta: 'No' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestionForm.cancelacion_correcta === 'No'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 shadow-lg shadow-rose-500/20'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                }`}
              >
                <XCircle className="w-5 h-5" />
                No, Incorrecta
              </button>
            </div>
          </div>

          {/* Motivo Correcto (solo si marcó No) */}
          {gestionForm.cancelacion_correcta === 'No' && (
            <div className="animate-in slide-in-from-top-2 duration-200">
              <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
                ¿Cuál debió ser el motivo correcto?
              </label>
              <select 
                className={SIATC_THEME.COMPONENTS.INPUT}
                value={gestionForm.motivo_correcto}
                onChange={(e) => setGestionForm({ ...gestionForm, motivo_correcto: e.target.value })}
              >
                <option value="">Seleccione el motivo correcto...</option>
                {motivos.map(m => (
                  <option key={m.id} value={m.id}>{m.motivo}</option>
                ))}
              </select>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Observaciones de Gestión
            </label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-3 resize-none`}
              value={gestionForm.observacion}
              onChange={(e) => setGestionForm({ ...gestionForm, observacion: e.target.value })}
              placeholder="Detalle de las acciones realizadas (llamadas, reprogramaciones, etc.)"
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ====== MODAL: Asignar Cancelación ====== */}
      <SIATCModalWrapper
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Asignar Cancelación"
        subtitle={assignItem ? `Ticket #${assignItem.ticket} — ${assignItem.cliente}` : ''}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsAssignOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleAssign} 
              isLoading={isAssigning}
              disabled={!assignTo}
            >
              Asignar Analista
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-violet-500" />
              <div>
                <p className="text-sm font-bold text-violet-700 dark:text-violet-400">Asignación de Analista</p>
                <p className="text-[10px] text-muted-foreground">Seleccione al analista que revisará y validará esta cancelación.</p>
              </div>
            </div>
          </div>

          <div ref={assignDropdownRef} className="relative">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Asignar a
            </label>
            <div className="relative">
              <input 
                type="text"
                className={SIATC_THEME.COMPONENTS.INPUT}
                placeholder="Escribe para buscar un analista..."
                value={assignSearch}
                onFocus={() => setIsAssignDropdownOpen(true)}
                onChange={(e) => {
                  setAssignSearch(e.target.value);
                  setIsAssignDropdownOpen(true);
                  if (assignTo && e.target.value !== assignTo) {
                    setAssignTo('');
                  }
                }}
              />
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-cb-text-secondary/55 pointer-events-none" />
            </div>

            {isAssignDropdownOpen && (
              <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-card border border-cb-border rounded-cb-btn shadow-cb-level-2 custom-scrollbar">
                {systemUsers.filter(u => {
                  const q = assignSearch.toLowerCase().trim();
                  if (!q) return true;
                  return u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                }).length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    No se encontraron analistas
                  </div>
                ) : (
                  systemUsers.filter(u => {
                    const q = assignSearch.toLowerCase().trim();
                    if (!q) return true;
                    return u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q);
                  }).map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setAssignTo(u.full_name);
                        setAssignSearch(u.full_name);
                        setIsAssignDropdownOpen(false);
                      }}
                      className={`p-2.5 text-xs cursor-pointer transition-colors flex flex-col gap-0.5 ${
                        assignTo === u.full_name
                          ? 'bg-primary/10 text-primary font-bold'
                          : 'hover:bg-cb-bg text-cb-text-primary'
                      }`}
                    >
                      <span className="font-semibold">{u.full_name}</span>
                      <span className="text-[10px] text-cb-text-secondary">Usuario: {u.username}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {assignItem?.asignado_a && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Asignación Actual</p>
              <p className="text-sm font-semibold text-foreground">{assignItem.asignado_a}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">por {assignItem.asignado_por} — {assignItem.fecha_asignado ? new Date(assignItem.fecha_asignado).toLocaleString() : ''}</p>
            </div>
          )}
        </div>
      </SIATCModalWrapper>
    </div>
  );
};

export default CancellationsPage;
