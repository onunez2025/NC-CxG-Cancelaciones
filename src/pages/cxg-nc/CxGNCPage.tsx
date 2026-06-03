import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  FileSpreadsheet,
  UserPlus,
  Plus,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldCheck,
  Eraser,
  Columns,
  FileText,
  BarChart3,
  Inbox,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Filter,
  LayoutGrid
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { SIATCModalWrapper } from '../../components/siatc/SIATCModalWrapper';
import { SIATCActionDropdown } from '../../components/siatc/SIATCActionDropdown';
import { SIATCTooltip } from '../../components/siatc/SIATCTooltip';
import { SIATCTableSkeleton } from '../../components/siatc/SIATCSkeleton';
import { 
  SIATCTable, 
  SIATCTableHeader, 
  SIATCTableRow, 
  SIATCTableCell 
} from '../../components/siatc/table/SIATCTable';
import { 
  ncService, 
  type CxGNC
} from '../../services/ncService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { UsersService } from '../../services/usersService';
import type { User as SystemUser } from '../../types';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { relativeDate, fullDate } from '../../utils/relativeDate';
import { CxGNCDetailView } from './components/CxGNCDetailView';
import { CxGNCFormView } from './components/CxGNCFormView';

export const CxGNCPage = () => {
  const { user, hasPermission } = useAuth();
  const dialog = useDialog();
  const toast = useToast();
  const columnDropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [globalStats, setGlobalStats] = useState({ registrado: 0, aprobado: 0, asignado: 0, validado: 0, cerrado: 0 });
  const [showKpiCards, setShowKpiCards] = useState(false);
  const pageSize = 20;
  const [data, setData] = useState<CxGNC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'TODOS' | 'NC' | 'CXG'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'REGISTRADO' | 'APROBADO_SUP' | 'ASIGNADO' | 'VALIDADO' | 'CERRADO'>('TODOS');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  // Sorting & Filtering State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [filterSuggestions, setFilterSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  // Column Visibility
  const AVAILABLE_COLUMNS = [
    { id: 'tipo', label: 'TIPO' },
    { id: 'documento', label: 'DOCUMENTO CLIENTE' },
    { id: 'ticket', label: 'TICKET' },
    { id: 'tienda', label: 'TIENDA' },
    { id: 'cliente', label: 'CLIENTE' },
    { id: 'codigo_producto', label: 'CÓDIGO PRODUCTO' },
    { id: 'producto', label: 'PRODUCTO' },
    { id: 'creado_por', label: 'ASESOR CREADOR' },
    { id: 'supervisor', label: 'SUPERVISOR' },
    { id: 'fecha_creacion', label: 'FECHA CREACIÓN' },
    { id: 'aprobado', label: 'APROBACIÓN' },
    { id: 'procesado', label: 'PROCESADO' },
    { id: 'estado', label: 'ESTADO' }
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    const saved = localStorage.getItem(`cxg_nc_columns_${user?.id || 'default'}`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved columns', e);
      }
    }
    return [
      'tipo', 'documento', 'ticket', 'tienda', 'cliente', 'codigo_producto', 'producto', 'creado_por', 'supervisor', 'fecha_creacion', 'aprobado', 'procesado', 'estado'
    ];
  });
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`cxg_nc_columns_${user.id}`, JSON.stringify(visibleColumns));
    }
  }, [visibleColumns, user?.id]);

  const toggleColumn = (colId: string) => {
    setVisibleColumns(prev => 
      prev.includes(colId) ? prev.filter(c => c !== colId) : [...prev, colId]
    );
  };

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newCols = [...visibleColumns];
      [newCols[index - 1], newCols[index]] = [newCols[index], newCols[index - 1]];
      setVisibleColumns(newCols);
    } else if (direction === 'down' && index < visibleColumns.length - 1) {
      const newCols = [...visibleColumns];
      [newCols[index + 1], newCols[index]] = [newCols[index], newCols[index + 1]];
      setVisibleColumns(newCols);
    }
  };

  // Analysts for assignment
  const [analysts, setAnalysts] = useState<SystemUser[]>([]);
  
  // Assignment state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CxGNC | null>(null);
  const [targetAnalystId, setTargetAnalystId] = useState('');

  // Gestión state
  const [isGestionModalOpen, setIsGestionModalOpen] = useState(false);
  const [gestiónObs, setGestiónObs] = useState('');
  const [gestiónResultado, setGestiónResultado] = useState<'true' | 'false' | ''>('');

  // Detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<CxGNC | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);


  // Validation state removed

  // Approval state (Supervisor)
  const [isAprobarOpen, setIsAprobarOpen] = useState(false);
  const [aprobarForm, setAprobarForm] = useState({ aprobado: '' as 'true' | 'false' | '', motivo: '', observacion: '' });
  const [isAprobarSubmitting, setIsAprobarSubmitting] = useState(false);

  const MOTIVOS_APROBADO = [
    "FALLAS REITERATIVAS",
    "FALLA REINCIDENTE",
    "FALLA DE FABRICA",
    "MALA INSTALACIÓN SOLE",
    "MALA REVISIÓN SOLE",
    "NO HAY STOCK DE REPUESTOS",
    "FALTA DE ACCESORIOS",
    "ACUERDO COMERCIAL",
    "PRODUCTO MAL ETIQUETADO",
    "OTROS"
  ];

  const MOTIVOS_RECHAZADO = [
    "CORRESPONDE REPARACION",
    "FUERA DE GARANTÍA",
    "REQUIERE MANTENIMIENTO",
    "MANIPULACION DE TERCEROS",
    "MALA INSTALACIÓN DEL CLIENTE",
    "FALLA NO ATRIBUIBLE A CALIDAD DE PRODUCTO",
    "DAÑOS EN TRANSPORTE DE TERCEROS",
    "AREA NO HABILITADA",
    "HAY REPUESTOS ALTERNATIVOS",
    "INSATISFACCIÓN CON EL PRODUCTO",
    "INSATISFACCIÓN CON LA ATENCIÓN",
    "PRODUCTO NO PRESENTA FALLAS DE FABRICA",
    "AMERITA NOTA DE CREDITO",
    "OTROS"
  ];

  // Ticket Validation State
  const [isTicketValidated, setIsTicketValidated] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CxGNC>>({
    tipo: 'CXG',
    ticket: '',
    cliente: '',
    observacion: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await ncService.getCxGNC({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm,
        tipo: activeTab,
        estado: statusFilter,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction,
        filters: columnFilters
      });
      setData(response.data);
      setTotalRecords(response.total);
      if (response.stats) setGlobalStats(response.stats);
    } catch (error) {
      console.error('Error fetching CxG/NC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAnalysts = async () => {
    try {
      const users = await UsersService.getUsers();
      setAnalysts(users);
    } catch (error) {
      console.error('Error fetching analysts:', error);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setActiveTab('TODOS');
    setStatusFilter('TODOS');
    setSortConfig(null);
    setColumnFilters({});
    setCurrentPage(1);
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
    if (colId === 'aprobado' || colId === 'procesado') {
      setFilterSuggestions(['Aprobado', 'Rechazado', 'Pendiente'].filter(s => s.toLowerCase().includes(search.toLowerCase())));
      return;
    }

    setIsFetchingSuggestions(true);
    try {
      const suggestions = await ncService.getUniqueColumnValues(colId, search);
      setFilterSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setFilterSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  useEffect(() => {
    if (activeFilterCol) {
      const timer = setTimeout(() => {
        fetchSuggestions(activeFilterCol, filterSearchTerm);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [filterSearchTerm, activeFilterCol]);

  const applyFilter = (colId: string, value: string) => {
    setColumnFilters(prev => {
      const next = { ...prev };
      if (value) {
        next[colId] = value;
      } else {
        delete next[colId];
      }
      return next;
    });
    setActiveFilterCol(null);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, activeTab, statusFilter, sortConfig, columnFilters]);

  useEffect(() => {
    if (hasPermission('cxg.cxg_nc.assign')) {
      fetchAnalysts();
    }
  }, []);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, sortConfig, columnFilters]);

  useEffect(() => {
    if (!isModalOpen) {
      setIsTicketValidated(false);
    }
  }, [isModalOpen]);

  const handleCreate = async () => {
    if (!isTicketValidated) {
      toast.warning('Validación Requerida', 'Debe buscar y validar el ticket con la lupa antes de poder registrar la solicitud.');
      return;
    }
    setIsSubmitting(true);
    try {
      await ncService.createCxGNC({
        tipo: formData.tipo,
        cliente: formData.cliente,
        estado: 'REGISTRADO',
        ticket: formData.ticket,
        observacion: formData.observacion,
        ...(formData.parent_id ? { parent_id: formData.parent_id } : {})
      });
      
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'CREATE',
        Entidad: 'CXG_NC',
        EntidadID: 'NEW',
        Detalle: `Solicitud de ${formData.tipo} creada para ${formData.cliente} (Ticket: ${formData.ticket})${formData.parent_id ? ` (Reintento de ${formData.parent_id})` : ''}`
      });

      setIsModalOpen(false);
      fetchData();
      setFormData({ 
        tipo: 'CXG', 
        cliente: '', 
        ticket: '',
        observacion: '',
        parent_id: undefined
      });
    } catch (error: any) {
      console.error(error);
      toast.error('Error al Registrar', error.response?.data?.error || 'No se pudo registrar la solicitud. Verifique que el ticket no haya sido registrado previamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLookupTicket = async () => {
    if (!formData.ticket) return;
    setIsLookingUp(true);
    try {
      const ticketInfo = await ncService.getTicketDetails(formData.ticket);
      if (ticketInfo.estado !== 'Closed') {
        setIsTicketValidated(false);
        toast.error('Ticket No Válido', `El ticket #${formData.ticket} no está CERRADO. Estado actual: ${ticketInfo.estado || 'Desconocido'}`);
        return;
      }

      // Check for existing requests for this ticket
      const existingRequests = await ncService.getCxGNC({ search: formData.ticket, pageSize: 50 });
      const ticketRequests = existingRequests.data.filter(r => r.ticket === formData.ticket);
      
      const hasActiveRequest = ticketRequests.some(r => r.estado !== 'RECHAZADO');
      if (hasActiveRequest) {
        setIsTicketValidated(false);
        toast.error('Solicitud Existente', 'Este ticket ya cuenta con una solicitud de CxG/NC en proceso o aprobada.');
        return;
      }

      setFormData({
        ...formData,
        cliente: ticketInfo.cliente
      });
      setIsTicketValidated(true);
      toast.success('Éxito', 'Ticket encontrado y válido para nueva solicitud');
    } catch (error: any) {
      console.error("Lookup error:", error);
      setIsTicketValidated(false);
      toast.error('Error de Búsqueda', 'El ticket es incorrecto o no existe');
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAprobar = async () => {
    if (!selectedRecord || !aprobarForm.aprobado) return;
    setIsAprobarSubmitting(true);
    try {
      await ncService.aprobarSolicitudCxGNC(selectedRecord.id, {
        aprobado: aprobarForm.aprobado,
        motivo: aprobarForm.motivo,
        observacion: aprobarForm.observacion,
        usuario: user?.full_name || user?.username || 'Sistema'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: aprobarForm.aprobado === 'true' ? 'APPROVE' : 'REJECT',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} ${aprobarForm.aprobado}. Motivo: ${aprobarForm.motivo || 'N/A'}`
      });

      setIsAprobarOpen(false);
      setAprobarForm({ aprobado: '', motivo: '', observacion: '' });
      fetchData();
      if (isDetailOpen && selectedRecord) {
        handleViewDetail(selectedRecord.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAprobarSubmitting(false);
    }
  };

  const handleAsignar = async () => {
    if (!selectedRecord || !targetAnalystId) return;
    setIsSubmitting(true);
    try {
      const targetAnalyst = analysts.find(a => a.id === targetAnalystId);
      await ncService.asignarCxGNC(selectedRecord.id, {
        asignado_a: targetAnalystId,
        asignado_por: user?.id || '0',
        asignado_nombre: targetAnalyst?.full_name || targetAnalystId
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'ASSIGN',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} asignada a ${targetAnalyst?.full_name}`
      });

      setIsAssignModalOpen(false);
      fetchData();
      if (isDetailOpen && selectedRecord) {
        handleViewDetail(selectedRecord.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGestionar = async () => {
    if (!selectedRecord || !gestiónResultado) return;
    setIsSubmitting(true);
    try {
      await ncService.gestionarCxGNC(selectedRecord.id, {
        observacion: gestiónObs,
        gestionado_por: user?.full_name || user?.username || 'Unknown',
        resultado: gestiónResultado as 'true' | 'false'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: gestiónResultado === 'true' ? 'PROCESS' : 'REJECT',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} ${gestiónResultado === 'true' ? 'procesada' : 'rechazada'} en SAP/Sistema. Obs: ${gestiónObs}`
      });

      setIsGestionModalOpen(false);
      setGestiónObs('');
      setGestiónResultado('');
      fetchData();
      if (isDetailOpen && selectedRecord) {
        handleViewDetail(selectedRecord.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setIsDetailOpen(true);
    setIsLoadingDetail(true);

    setDetailData(null);
    try {
      const detail = await ncService.getCxGNCDetail(id);
      setDetailData(detail);
    } catch (error) {
      console.error('Error fetching detail:', error);
      dialog.alert({
        title: 'Error de Conexión',
        message: 'No se pudo cargar la información detallada de la solicitud.',
        type: 'error'
      });
      setIsDetailOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const displayedData = data;

  // KPI stats from backend
  const kpiStats = {
    total: totalRecords,
    registrado: globalStats.registrado,
    aprobado: globalStats.aprobado,
    asignado: globalStats.asignado,
    validado: globalStats.validado,
    cerrado: globalStats.cerrado,
  };

  // Click outside to close column dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnDropdownRef.current && !columnDropdownRef.current.contains(event.target as Node)) {
        setIsColumnDropdownOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setActiveFilterCol(null);
      }
    };
    if (isColumnDropdownOpen || activeFilterCol) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnDropdownOpen, activeFilterCol]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDetailOpen) { setIsDetailOpen(false); setDetailData(null); }
        else if (isModalOpen) setIsModalOpen(false);
        else if (isColumnDropdownOpen) setIsColumnDropdownOpen(false);
        else if (activeFilterCol) setActiveFilterCol(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        setIsModalOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDetailOpen, isModalOpen, isColumnDropdownOpen, activeFilterCol]);



  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {isDetailOpen && detailData ? (
        <CxGNCDetailView 
          detailData={detailData}

          isLoadingDetail={isLoadingDetail}
          onBack={() => { setIsDetailOpen(false); setDetailData(null); }}
          actions={{
            canApprove: detailData?.estado === 'REGISTRADO' && hasPermission('cxg.cxg_nc.approve'),
            onApprove: () => {
              setSelectedRecord(detailData);
              setAprobarForm({ aprobado: '', motivo: '', observacion: '' });
              setIsAprobarOpen(true);
            },
            canAssign: detailData?.estado === 'APROBADO_SUP' && hasPermission('cxg.cxg_nc.assign'),
            onAssign: () => {
              setSelectedRecord(detailData);
              setIsAssignModalOpen(true);
            },
            canManage: detailData?.estado === 'ASIGNADO' && hasPermission('cxg.cxg_nc.gestionar'),
            onManage: () => {
              setSelectedRecord(detailData);
              setIsGestionModalOpen(true);
            },
            canClone: detailData?.estado === 'RECHAZADO' && !detailData?.child_id && hasPermission('cxg.cxg_nc.create'),
            onClone: () => {
              setFormData({
                tipo: detailData.tipo || 'CXG',
                ticket: detailData.ticket || '',
                cliente: detailData.cliente || '',
                observacion: detailData.observacion || '',
                parent_id: detailData.id
              });
              setIsTicketValidated(true);
              setIsDetailOpen(false);
              setDetailData(null);
              setIsModalOpen(true);
            }
          }}
        />
      ) : isModalOpen ? (
        <CxGNCFormView
          formData={formData}
          setFormData={setFormData}
          isSubmitting={isSubmitting}
          isLookingUp={isLookingUp}
          isTicketValidated={isTicketValidated}
          setIsTicketValidated={setIsTicketValidated}
          handleLookupTicket={handleLookupTicket}
          handleCreate={handleCreate}
          onCancel={() => setIsModalOpen(false)}
        />
      ) : (
        <>
          {/* Header */}
          <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
            <div>
              <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Cambios por Garantía y Notas de Crédito</h1>
              <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
                Gestión de Cambios por Garantía y Notas de Crédito.
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
            icon={FileSpreadsheet}
            isLoading={isExporting}
            onClick={async () => {
              setIsExporting(true);
              try {
                const response = await ncService.getCxGNC({ 
                  page: 1, 
                  pageSize: 1000000, 
                  search: searchTerm,
                  tipo: activeTab,
                  estado: statusFilter,
                  sortBy: sortConfig?.key,
                  sortOrder: sortConfig?.direction,
                  filters: columnFilters
                });
                const exportData = response.data;
                const exportColumns = AVAILABLE_COLUMNS.filter(c => visibleColumns.includes(c.id));
                const headers = [...exportColumns.map(c => c.label), 'ESTADO'];
                const csvContent = [
                  headers.join(','),
                  ...exportData.map(item => {
                    const row = exportColumns.map(col => {
                      switch (col.id) {
                        case 'tipo': return item.tipo || '';
                        case 'documento': return `"${item.documento_cliente || ''}"`;  
                        case 'ticket': return item.correlativo || '';
                        case 'tienda': return `"${item.tienda || ''}"`;  
                        case 'cliente': return `"${item.cliente || ''}"`;  
                        case 'codigo_producto': return `"${item.codigo_producto || ''}"`;
                        case 'producto': return `"${item.producto || ''}"`;
                        case 'creado_por': return `"${item.creado_por || ''}"`;  
                        case 'supervisor': return `"${item.supervisor || ''}"`;  
                        case 'fecha_creacion': return item.fecha ? new Date(item.fecha).toLocaleDateString() : '';
                        case 'aprobado': return `"${item.aprobado === 'true' ? 'SÍ' : item.aprobado === 'false' ? 'NO' : 'PENDIENTE'} ${item.aprobado_el ? `(${new Date(item.aprobado_el).toLocaleDateString()})` : ''}"`;
                        case 'procesado': return `"${item.procesado || 'PENDIENTE'} ${item.procesado_el ? `(${new Date(item.procesado_el).toLocaleDateString()})` : ''}"`;
                        case 'estado': return item.estado || '';
                        default: return '';
                      }
                    });
                    return [...row, item.estado || ''].join(',');
                  })
                ].join('\n');
                
                const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.setAttribute('download', `CambiosGarantia_NotasCredito_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Exportación exitosa', `Se exportaron ${exportData.length} registros con ${exportColumns.length} columnas.`);
              } catch (error) {
                console.error('Error exporting CxG/NC data:', error);
                toast.error('Error al exportar', 'No se pudo obtener la data para la exportación.');
              } finally {
                setIsExporting(false);
              }
            }}
          >
            Exportar
          </SIATCButton>
          <SIATCButton 
            variant="primary" 
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Registrar
          </SIATCButton>
          <div className="relative" ref={columnDropdownRef}>
            <SIATCButton 
              variant="secondary" 
              icon={Columns}
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className="!px-2.5"
              title="Columnas"
            />
            
            {isColumnDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-xl shadow-lg z-50 p-2 flex flex-col gap-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1 mb-1 border-b border-border">
                  Columnas Visibles (Arrastra o haz clic)
                </div>
                {visibleColumns.map((colId, index) => {
                  const colDef = AVAILABLE_COLUMNS.find(c => c.id === colId);
                  if (!colDef) return null;
                  return (
                    <div key={colId} className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded-lg group">
                      <label className="flex items-center gap-2 cursor-pointer flex-1">
                        <input 
                          type="checkbox" 
                          className="rounded border-border text-primary focus:ring-primary"
                          checked={true}
                          onChange={() => toggleColumn(colId)}
                        />
                        <span className="text-xs font-semibold text-foreground">{colDef.label}</span>
                      </label>
                      <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveColumn(index, 'up')} disabled={index === 0} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0 m-0 leading-none" style={{fontSize: '8px'}}>▲</button>
                        <button onClick={() => moveColumn(index, 'down')} disabled={index === visibleColumns.length - 1} className="text-muted-foreground hover:text-primary disabled:opacity-30 p-0 m-0 leading-none" style={{fontSize: '8px'}}>▼</button>
                      </div>
                    </div>
                  );
                })}
                {AVAILABLE_COLUMNS.filter(c => !visibleColumns.includes(c.id)).map(col => (
                  <div key={col.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-muted/50 rounded-lg opacity-60 hover:opacity-100 transition-opacity">
                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                      <input 
                        type="checkbox" 
                        className="rounded border-border text-primary focus:ring-primary"
                        checked={false}
                        onChange={() => toggleColumn(col.id)}
                      />
                      <span className="text-xs font-semibold text-foreground">{col.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </div>
          <SIATCButton 
            variant="secondary" 
            icon={LayoutGrid}
            onClick={() => setShowKpiCards(!showKpiCards)}
            className={cn("!px-2.5", showKpiCards && "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20")}
            title={showKpiCards ? "Ocultar Tarjetas" : "Mostrar Tarjetas"}
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className={cn(
        "shrink-0 overflow-hidden transition-all duration-300 ease-in-out",
        showKpiCards ? "max-h-[110px] pt-1 pl-2 mb-2 opacity-100" : "max-h-0 mb-0 opacity-0"
      )}>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pb-1">
          {[
            { label: 'Total', value: kpiStats.total, icon: BarChart3, color: 'text-cb-neutral', bg: 'bg-white dark:bg-cb-bg', border: 'border-cb-border', filter: 'TODOS' as const },
            { label: 'Registrado', value: kpiStats.registrado, icon: FileText, color: 'text-[#DF2935]', bg: 'bg-white dark:bg-cb-bg', border: 'border-cb-border', filter: 'REGISTRADO' as const },
            { label: 'Aprobado', value: kpiStats.aprobado, icon: ShieldCheck, color: 'text-cb-blue', bg: 'bg-white dark:bg-cb-bg', border: 'border-cb-border', filter: 'APROBADO_SUP' as const },
            { label: 'Asignado', value: kpiStats.asignado, icon: UserPlus, color: 'text-primary', bg: 'bg-white dark:bg-cb-bg', border: 'border-cb-border', filter: 'ASIGNADO' as const },
            { label: 'Cerrado', value: kpiStats.cerrado, icon: CheckCircle2, color: 'text-[#05B169]', bg: 'bg-white dark:bg-cb-bg', border: 'border-cb-border', filter: 'CERRADO' as const },
          ].map((kpi) => {
            const active = statusFilter === kpi.filter;
            return (
              <div
                key={kpi.label}
                onClick={() => setStatusFilter(kpi.filter)}
                className={cn(
                  "py-1.5 px-4 h-[60px] cursor-pointer select-none flex items-center justify-between gap-3 transition-all",
                  SIATC_THEME.TOKENS.RADIUS.CARD,
                  SIATC_THEME.TOKENS.ELEVATION.LEVEL_1,
                  kpi.bg,
                  active ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background border-primary/50 shadow-md transform scale-[1.02]" : "hover:border-cb-border-hover"
                )}
              >
                <div className="space-y-0.5">
                  <p className={cn("text-[10px] font-bold uppercase tracking-tighter opacity-80", kpi.color)}>{kpi.label}</p>
                  <p className="text-base font-bold text-cb-text-primary leading-none">{kpi.value}</p>
                </div>
                <div className={cn("p-1.5 rounded-lg bg-white/50 dark:bg-black/20", kpi.color)}>
                  <kpi.icon className="w-4.5 h-4.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Tabs, Search & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4 sticky top-0 z-20 bg-card/95 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-muted/50 p-1 rounded-lg w-fit border border-border/50">
              <button 
                onClick={() => setActiveTab('TODOS')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2 ${activeTab === 'TODOS' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todos
                <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-black ${activeTab === 'TODOS' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{totalRecords}</span>
              </button>
              <button 
                onClick={() => setActiveTab('NC')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2 ${activeTab === 'NC' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Notas de Crédito
                <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-black ${activeTab === 'NC' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{data.filter(d => (d.tipo as string) === 'NC' || (d.tipo as string) === 'Nota de Credito').length}</span>
              </button>
              <button 
                onClick={() => setActiveTab('CXG')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all flex items-center gap-2 ${activeTab === 'CXG' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Cambio por Garantía
                <span className={`px-1.5 py-0.5 text-[9px] rounded-md font-black ${activeTab === 'CXG' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{data.filter(d => (d.tipo as string) === 'CXG' || (d.tipo as string) === 'Cambio por Garantia').length}</span>
              </button>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Buscar por cliente o N°..."
                className={`${SIATC_THEME.COMPONENTS.INPUT} pl-10`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Estado:</span>
              <select 
                className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="REGISTRADO">REGISTRADO</option>
                <option value="APROBADO_SUP">APROBADO POR SUP.</option>
                <option value="ASIGNADO">ASIGNADO</option>
                <option value="VALIDADO">VALIDADO CLIENTE</option>
                <option value="CERRADO">CERRADO</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Desde:</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
                value={columnFilters['fecha_creacion_start'] || ''}
                onChange={(e) => setColumnFilters(prev => ({...prev, fecha_creacion_start: e.target.value}))}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Hasta:</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
                value={columnFilters['fecha_creacion_end'] || ''}
                onChange={(e) => setColumnFilters(prev => ({...prev, fecha_creacion_end: e.target.value}))}
              />
            </div>

            {(searchTerm !== '' || activeTab !== 'TODOS' || columnFilters['fecha_creacion_start'] || columnFilters['fecha_creacion_end'] || statusFilter !== 'TODOS' || Object.keys(columnFilters).length > 0) && (
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

        {/* Table Area */}
        <div className="flex-1 flex flex-col min-h-0 relative">
          {isLoading ? (
            <SIATCTableSkeleton rows={8} columns={Math.min(visibleColumns.length, 7)} />
          ) : displayedData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 py-12">
              <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
                <Inbox className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-foreground">Sin resultados</p>
                <p className="text-xs text-muted-foreground mt-1">No se encontraron solicitudes con los filtros actuales.</p>
              </div>
              <SIATCButton variant="ghost" size="sm" icon={Eraser} onClick={handleClearFilters}>Limpiar Filtros</SIATCButton>
            </div>
          ) : (
            <SIATCTable className="min-w-[1600px]" containerClassName="flex-initial shrink min-h-0">
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  {visibleColumns.map(colId => {
                    const label = AVAILABLE_COLUMNS.find(c => c.id === colId)?.label;
                    return (
                      <SIATCTableHeader key={colId} className="relative group p-0">
                        <div className="flex items-center justify-between gap-1 px-3 py-2 w-full h-full">
                           <div 
                             className="flex items-center gap-1 cursor-pointer hover:text-primary transition-colors flex-1 min-w-0"
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
                             className={`p-1 rounded shrink-0 hover:bg-muted/50 transition-colors ${columnFilters[colId] || columnFilters[`${colId}_start`] || columnFilters[`${colId}_end`] ? 'text-primary bg-primary/10' : 'text-muted-foreground opacity-30 hover:opacity-100'}`}
                             onClick={(e) => { e.stopPropagation(); toggleFilter(colId); }}
                           >
                             <Filter className="w-3 h-3" />
                           </button>
                           {activeFilterCol === colId && (
                             <div 
                               ref={filterDropdownRef}
                               className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg z-50 p-2 font-normal"
                               onClick={e => e.stopPropagation()}
                             >
                               <div className="flex flex-col gap-2">
                                 {colId === 'fecha_creacion' ? (
                                    <div className="flex flex-col gap-2 p-1">
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground">Desde</span>
                                        <input 
                                          type="date"
                                          className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                          value={columnFilters[`${colId}_start`] || ''}
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             setColumnFilters(prev => ({ ...prev, [`${colId}_start`]: val }));
                                          }}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-black uppercase text-muted-foreground">Hasta</span>
                                        <input 
                                          type="date"
                                          className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                          value={columnFilters[`${colId}_end`] || ''}
                                          onChange={(e) => {
                                             const val = e.target.value;
                                             setColumnFilters(prev => ({ ...prev, [`${colId}_end`]: val }));
                                          }}
                                        />
                                      </div>
                                      <SIATCButton 
                                        variant="primary" 
                                        size="sm" 
                                        className="mt-2"
                                        onClick={() => setActiveFilterCol(null)}
                                      >
                                        Aplicar Rango
                                      </SIATCButton>
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
                                       <div className="max-h-56 overflow-y-auto flex flex-col gap-1 pr-1 custom-scrollbar">
                                         {isFetchingSuggestions ? (
                                            <div className="text-xs text-muted-foreground p-2 text-center flex items-center justify-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Cargando...</div>
                                         ) : filterSuggestions.length === 0 ? (
                                            <div className="text-xs text-muted-foreground p-2 text-center">Sin resultados</div>
                                         ) : (
                                            <>
                                              <button 
                                                className={`text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50 leading-tight ${!columnFilters[colId] ? 'bg-primary/5 text-primary' : 'text-muted-foreground'}`}
                                                onClick={() => applyFilter(colId, '')}
                                              >
                                                (Todos los valores)
                                              </button>
                                              {filterSuggestions.map(val => (
                                                <button 
                                                  key={val}
                                                  className={`text-left px-2 py-1.5 text-xs rounded hover:bg-muted/50 break-words leading-tight ${columnFilters[colId] === val ? 'bg-primary/10 text-primary font-bold' : 'text-foreground'}`}
                                                  onClick={() => applyFilter(colId, val)}
                                                >
                                                  {val}
                                                </button>
                                              ))}
                                            </>
                                         )}
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
                {displayedData.map((item, rowIndex) => {
                  const renderCellContent = (colId: string) => {
                    switch (colId) {
                      case 'tipo': return (
                        <SIATCBadge variant={((item.tipo as string) === 'NC' || (item.tipo as string) === 'Nota de Credito') ? 'warning' : 'info'}>
                          {((item.tipo as string) === 'Cambio por Garantia' || (item.tipo as string) === 'CXG') ? 'CXG' : 'NC'}
                        </SIATCBadge>
                      );
                      case 'documento': return <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{item.documento_cliente || '—'}</span>;
                      case 'ticket': return <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.correlativo}</span>;
                      case 'tienda': return (
                        <SIATCTooltip content={item.tienda || ''} position="bottom">
                          <div className="text-xs text-cb-text-secondary truncate max-w-[120px]">{item.tienda || '—'}</div>
                        </SIATCTooltip>
                      );
                      case 'cliente': return (
                        <SIATCTooltip content={item.cliente || ''} position="bottom">
                          <div className="text-xs font-medium text-foreground truncate max-w-[140px]">{item.cliente}</div>
                        </SIATCTooltip>
                      );
                      case 'codigo_producto': return <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{item.codigo_producto || '—'}</span>;
                      case 'producto': return (
                        <SIATCTooltip content={item.producto || ''} position="bottom">
                          <div className="text-xs text-foreground truncate max-w-[150px]">{item.producto || '—'}</div>
                        </SIATCTooltip>
                      );
                      case 'creado_por': return (
                        <SIATCTooltip content={item.creado_por || ''} position="bottom">
                          <div className="text-xs text-cb-text-secondary truncate max-w-[120px]">{item.creado_por || '—'}</div>
                        </SIATCTooltip>
                      );
                      case 'supervisor': return (
                        <SIATCTooltip content={item.supervisor || ''} position="bottom">
                          <div className="text-xs text-cb-text-secondary truncate max-w-[120px]">{item.supervisor || '—'}</div>
                        </SIATCTooltip>
                      );
                      case 'fecha_creacion': return (
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>
                          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-PE') : '—'}
                        </span>
                      );
                      case 'aprobado': return (
                        <div className="flex flex-col gap-1">
                          <SIATCTooltip content={item.aprobado_el ? fullDate(item.aprobado_el) : 'Sin fecha'} position="bottom">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs">{item.aprobado_el ? relativeDate(item.aprobado_el) : '—'}</span>
                            </div>
                          </SIATCTooltip>
                          <div className="flex flex-col gap-0.5">
                            <SIATCBadge variant={item.aprobado === 'true' ? 'success' : item.aprobado === 'false' ? 'danger' : 'warning'}>
                              {item.aprobado === 'true' ? 'SÍ' : item.aprobado === 'false' ? 'NO' : 'PENDIENTE'}
                            </SIATCBadge>
                            {item.aprobado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.aprobado_por}</span>}
                          </div>
                        </div>
                      );
                      case 'procesado': return (
                        <div className="flex flex-col gap-1">
                          <SIATCTooltip content={item.procesado_el ? fullDate(item.procesado_el) : 'Sin fecha'} position="bottom">
                            <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="text-xs">{item.procesado_el ? relativeDate(item.procesado_el) : '—'}</span>
                            </div>
                          </SIATCTooltip>
                          <div className="flex flex-col gap-0.5">
                            <SIATCBadge variant={item.procesado === 'true' ? 'success' : 'warning'}>
                              {item.procesado === 'true' ? 'SÍ' : 'PENDIENTE'}
                            </SIATCBadge>
                            {item.procesado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.procesado_por}</span>}
                          </div>
                        </div>
                      );
                      case 'estado': return (
                        <SIATCBadge variant={
                          item.estado === 'CERRADO' ? 'success' : 
                          item.estado === 'REGISTRADO' ? 'warning' :
                          item.estado === 'APROBADO_SUP' ? 'secondary' :
                          item.estado === 'RECHAZADO' ? 'danger' :
                          'info'
                        }>
                          {item.estado}
                        </SIATCBadge>
                      );
                      default: return null;
                    }
                  };

                  return (
                    <SIATCTableRow 
                      key={item.id} 
                      isActive={selectedRowId === item.id}
                      onClick={() => { setSelectedRowId(item.id); handleViewDetail(item.id); }}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${rowIndex * 30}ms` }}
                    >
                      {visibleColumns.map(colId => {
                        const colDef = AVAILABLE_COLUMNS.find(c => c.id === colId);
                        return (
                        <SIATCTableCell key={colId} data-label={colDef?.label}>
                          {renderCellContent(colId)}
                        </SIATCTableCell>
                        );
                      })}
                      <SIATCTableCell className="text-right" onClick={(e) => e.stopPropagation()} data-label="Acciones">
                        <div className="flex justify-end">
                        <SIATCActionDropdown 
                          actions={[
                            {
                              label: 'Ver Detalle',
                              icon: Eye,
                              onClick: () => handleViewDetail(item.id)
                            },
                            {
                              label: 'Evaluar Solicitud',
                              icon: ShieldCheck,
                              onClick: () => {
                                setSelectedRecord(item);
                                setAprobarForm({ aprobado: '', motivo: '', observacion: '' });
                                setIsAprobarOpen(true);
                              },
                              show: item.estado === 'REGISTRADO' && hasPermission('cxg.cxg_nc.approve')
                            },
                            {
                              label: 'Asignar Analista',
                              icon: UserPlus,
                              onClick: () => {
                                setSelectedRecord(item);
                                setIsAssignModalOpen(true);
                              },
                              show: item.estado === 'APROBADO_SUP' && hasPermission('cxg.cxg_nc.assign')
                            },
                            {
                              label: 'Gestionar Solicitud',
                              icon: CheckCircle2,
                              onClick: () => {
                                setSelectedRecord(item);
                                setIsGestionModalOpen(true);
                              },
                              show: item.estado === 'ASIGNADO' && hasPermission('cxg.cxg_nc.gestionar')
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
            MOSTRANDO {displayedData.length} DE {totalRecords} REGISTROS
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
        </>
      )}
      {/* ─────────────────────────────────────────── */}
      {/* Evaluar Solicitud Modal (Supervisor) */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isAprobarOpen}
        onClose={() => setIsAprobarOpen(false)}
        title="Evaluar Solicitud"
        subtitle={selectedRecord ? `${selectedRecord.tipo} #${selectedRecord.correlativo} — ${selectedRecord.cliente}` : ''}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsAprobarOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleAprobar} 
              isLoading={isAprobarSubmitting}
              disabled={!aprobarForm.aprobado || !aprobarForm.motivo || (aprobarForm.aprobado === 'false' && !aprobarForm.observacion)}
            >
              Confirmar Evaluación
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Resumen del Documento</p>
            <p className="text-sm font-bold">{selectedRecord?.tipo} #{selectedRecord?.correlativo}</p>
            <p className="text-xs text-muted-foreground">Cliente: {selectedRecord?.cliente}</p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿Aprueba esta solicitud?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'true', motivo: '' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  aprobarForm.aprobado === 'true'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                APROBAR
              </button>
              <button
                type="button"
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'false', motivo: '' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  aprobarForm.aprobado === 'false'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <XCircle className="w-5 h-5" />
                RECHAZAR
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo</label>
            <select
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={aprobarForm.motivo}
              onChange={(e) => setAprobarForm({ ...aprobarForm, motivo: e.target.value })}
              disabled={!aprobarForm.aprobado}
            >
              <option value="">Seleccione un motivo...</option>
              {aprobarForm.aprobado === 'true' && MOTIVOS_APROBADO.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
              {aprobarForm.aprobado === 'false' && MOTIVOS_RECHAZADO.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Observaciones {aprobarForm.aprobado === 'false' && <span className="text-rose-500 font-bold ml-1">(REQUERIDO)</span>}
            </label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder={aprobarForm.aprobado === 'false' ? 'Explique el motivo del rechazo...' : 'Observaciones adicionales...'}
              value={aprobarForm.observacion}
              onChange={(e) => setAprobarForm({...aprobarForm, observacion: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ─────────────────────────────────────────── */}
      {/* Asignar Modal */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Asignar Solicitud"
        subtitle={`Asigne un analista para procesar el ${selectedRecord?.tipo} de ${selectedRecord?.cliente}.`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsAssignModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleAsignar} isLoading={isSubmitting}>Confirmar Asignación</SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Analista Responsable</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={targetAnalystId}
              onChange={(e) => setTargetAnalystId(e.target.value)}
            >
              <option value="">Seleccione analista...</option>
              {analysts.map(a => (
                <option key={a.id} value={a.id}>{a.full_name}</option>
              ))}
            </select>
          </div>
        </div>
      </SIATCModalWrapper>



      {/* ─────────────────────────────────────────── */}
      {/* Gestionar Modal */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isGestionModalOpen}
        onClose={() => setIsGestionModalOpen(false)}
        title="Gestionar Solicitud CxG / NC"
        subtitle={`Finalice el procesamiento de este documento.`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsGestionModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleGestionar} 
              isLoading={isSubmitting}
              disabled={!gestiónResultado || (gestiónResultado === 'false' && !gestiónObs)}
            >
              Confirmar Gestión
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Resumen del Documento</p>
            <p className="text-sm font-bold">{selectedRecord?.tipo} #{selectedRecord?.correlativo}</p>
            <p className="text-xs text-muted-foreground">Cliente: {selectedRecord?.cliente}</p>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4 font-bold">¿El documento es correcto?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGestiónResultado('true')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestiónResultado === 'true'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Sí, Procesar
              </button>
              <button
                type="button"
                onClick={() => setGestiónResultado('false')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestiónResultado === 'false'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <XCircle className="w-5 h-5" />
                No, Rechazar
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Observaciones de Gestión {gestiónResultado === 'false' && <span className="text-rose-500 font-bold ml-1">(REQUERIDO)</span>}
            </label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder={gestiónResultado === 'false' ? 'Explique el motivo del rechazo...' : 'Detalle el resultado del proceso (ej: N° de Nota SAP...)'}
              value={gestiónObs}
              onChange={(e) => setGestiónObs(e.target.value)}
            />
          </div>
        </div>
      </SIATCModalWrapper>
      {/* ─────────────────────────────────────────── */}
    </div>
  );
};


export default CxGNCPage;
