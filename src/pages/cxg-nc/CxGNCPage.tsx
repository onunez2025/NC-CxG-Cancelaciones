import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  FileSpreadsheet,
  UserPlus,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Eye,
  ClipboardCheck,
  ShieldCheck,
  Clock,
  MessageSquare,
  Eraser,
  Columns
} from 'lucide-react';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { SIATCModalWrapper } from '../../components/siatc/SIATCModalWrapper';
import { SIATCActionDropdown } from '../../components/siatc/SIATCActionDropdown';
import { 
  SIATCTable, 
  SIATCTableHeader, 
  SIATCTableRow, 
  SIATCTableCell 
} from '../../components/siatc/table/SIATCTable';
import { ncService } from '../../services/ncService';
import type { CxGNC, HistorialEntry, CxGNCMotivo } from '../../services/ncService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { UsersService } from '../../services/usersService';
import type { User as SystemUser } from '../../types';
import { useDialog } from '../../context/DialogContext';

export const CxGNCPage = () => {
  const { user } = useAuth();
  const dialog = useDialog();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [data, setData] = useState<CxGNC[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'TODOS' | 'NC' | 'CXG'>('TODOS');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'REGISTRADO' | 'APROBADO_SUP' | 'ASIGNADO' | 'VALIDADO' | 'CERRADO'>('TODOS');

  // Column Visibility
  const AVAILABLE_COLUMNS = [
    { id: 'tipo', label: 'TIPO' },
    { id: 'documento', label: 'DOCUMENTO CLIENTE' },
    { id: 'ticket', label: 'TICKET' },
    { id: 'tienda', label: 'TIENDA' },
    { id: 'cliente', label: 'CLIENTE' },
    { id: 'creado_por', label: 'ASESOR CREADOR' },
    { id: 'supervisor', label: 'SUPERVISOR' },
    { id: 'fecha_creacion', label: 'FECHA CREACIÓN' },
    { id: 'fecha_aprobacion', label: 'FECHA APROBACIÓN' },
    { id: 'fecha_procesado', label: 'FECHA PROCESADO' },
    { id: 'aprobado', label: 'APROBADO' },
    { id: 'procesado', label: 'PROCESADO' },
    { id: 'motivo_real', label: 'MOTIVO REAL' },
    { id: 'estado', label: 'ESTADO' }
  ];

  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'tipo', 'documento', 'ticket', 'tienda', 'cliente', 'creado_por', 'supervisor', 'fecha_creacion', 'fecha_aprobacion', 'fecha_procesado', 'aprobado', 'procesado', 'motivo_real', 'estado'
  ]);
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);

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
  const [gestiónResultado, setGestiónResultado] = useState<'Si' | 'No' | ''>('');

  // Detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<CxGNC | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [detailHistorial, setDetailHistorial] = useState<HistorialEntry[]>([]);

  // Validation state
  const [isValidarClienteOpen, setIsValidarClienteOpen] = useState(false);
  const [validarForm, setValidarForm] = useState({ resultado: '' as 'REAL' | 'FALSA' | '', observacion: '', motivo_real: '' });
  const [isValidarSubmitting, setIsValidarSubmitting] = useState(false);
  const [motivos, setMotivos] = useState<{ id: string; motivo: string }[]>([]);

  // Approval state (Supervisor)
  const [isAprobarOpen, setIsAprobarOpen] = useState(false);
  const [aprobarForm, setAprobarForm] = useState({ aprobado: '' as 'APROBADO' | 'RECHAZADO' | '', motivo: '', observacion: '' });
  const [isAprobarSubmitting, setIsAprobarSubmitting] = useState(false);
  const [cxgMotivos, setCxgMotivos] = useState<CxGNCMotivo[]>([]);

  // Ticket Validation State
  const [isTicketValidated, setIsTicketValidated] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<CxGNC>>({
    tipo: 'CXG',
    ticket: '',
    cliente: '',
    observacion: '',
    motivo_elevacion: '',
    lugar_compra: '',
    supervisor_fsm: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await ncService.getCxGNC({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm,
        tipo: activeTab,
        estado: statusFilter
      });
      setData(response.data);
      setTotalRecords(response.total);
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
    setDateRange({ start: '', end: '' });
    setStatusFilter('TODOS');
    setCurrentPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, activeTab, statusFilter]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [cancelMotivos, cxgMot] = await Promise.all([
          ncService.getCancellationMotivos(),
          ncService.getCxGNCMotivos()
        ]);
        setMotivos(cancelMotivos);
        setCxgMotivos(cxgMot);
      } catch (error) {
        console.error('Error fetching motives:', error);
      }
    };
    // Only fetch users list if current user has permission to assign analysts
    // Asesor CC users don't have 'ebm.config.users' so GET /api/users returns 403
    if (hasPermission('cxg.cxg_nc.assign')) {
      fetchAnalysts();
    }
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (!isModalOpen) {
      setIsTicketValidated(false);
    }
  }, [isModalOpen]);

  const handleCreate = async () => {
    if (!isTicketValidated) {
      dialog.alert({
        title: 'Validación Requerida',
        message: 'Debe buscar y validar el ticket con la lupa antes de poder registrar la solicitud.',
        type: 'warning'
      });
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
        motivo_elevacion: formData.motivo_elevacion,
        lugar_compra: formData.lugar_compra,
        supervisor_fsm: formData.supervisor_fsm
      });
      
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'CREATE',
        Entidad: 'CXG_NC',
        EntidadID: 'NEW',
        Detalle: `Solicitud de ${formData.tipo} creada para ${formData.cliente} (Ticket: ${formData.ticket})`
      });

      setIsModalOpen(false);
      fetchData();
      setFormData({ 
        tipo: 'CXG', 
        cliente: '', 
        ticket: '',
        observacion: '',
        motivo_elevacion: '',
        lugar_compra: '',
        supervisor_fsm: ''
      });
    } catch (error: any) {
      console.error(error);
      dialog.alert({
        title: 'Error al Registrar',
        message: error.response?.data?.error || 'No se pudo registrar la solicitud. Verifique que el ticket no haya sido registrado previamente.',
        type: 'error'
      });
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
        dialog.alert({ 
          title: 'Ticket No Válido',
          message: `El ticket #${formData.ticket} no está CERRADO. Estado actual: ${ticketInfo.estado || 'Desconocido'}`,
          type: 'error'
        });
        return;
      }

      setFormData({
        ...formData,
        cliente: ticketInfo.cliente,
        motivo_elevacion: ticketInfo.motivo_elevacion,
        lugar_compra: ticketInfo.lugar_compra,
        supervisor_fsm: ticketInfo.supervisor_nombre
      });
      setIsTicketValidated(true);
      dialog.alert({ 
        title: 'Éxito',
        message: "Ticket encontrado y válido",
        type: 'success'
      });
    } catch (error: any) {
      console.error("Lookup error:", error);
      setIsTicketValidated(false);
      dialog.alert({ 
        title: 'Error de Búsqueda',
        message: "El ticket es incorrecto o no existe",
        type: 'error'
      });
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
        Accion: aprobarForm.aprobado === 'APROBADO' ? 'APPROVE' : 'REJECT',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} ${aprobarForm.aprobado}. Motivo: ${aprobarForm.motivo || 'N/A'}`
      });

      setIsAprobarOpen(false);
      setAprobarForm({ aprobado: '', motivo: '', observacion: '' });
      fetchData();
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
        resultado: gestiónResultado as 'Si' | 'No'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: gestiónResultado === 'Si' ? 'PROCESS' : 'REJECT',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} ${gestiónResultado === 'Si' ? 'procesada' : 'rechazada'} en SAP/Sistema. Obs: ${gestiónObs}`
      });

      setIsGestionModalOpen(false);
      setGestiónObs('');
      setGestiónResultado('');
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValidarCliente = async () => {
    if (!selectedRecord || !validarForm.resultado) return;
    setIsValidarSubmitting(true);
    try {
      await ncService.validarClienteCxGNC(selectedRecord.id, {
        resultado: validarForm.resultado as 'REAL' | 'FALSA',
        observacion: validarForm.observacion,
        usuario: user?.full_name || user?.username || 'Sistema',
        motivo_real: validarForm.resultado === 'FALSA' ? validarForm.motivo_real : undefined
      });
      setIsValidarClienteOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsValidarSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    setIsDetailOpen(true);
    setIsLoadingDetail(true);
    setDetailHistorial([]);
    setDetailData(null);
    try {
      const [detail, historial] = await Promise.all([
        ncService.getCxGNCDetail(id),
        ncService.getCxGNCHistorial(id)
      ]);
      setDetailData(detail);
      setDetailHistorial(historial);
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

  const hasPermission = (perm: string) => {
    return user?.permissions?.includes(perm as any) || false;
  };

  const displayedData = data;

  // Helper: icon for history type
  const getHistoryIcon = (tipo: string) => {
    switch (tipo) {
      case 'Registro': return DollarSign;
      case 'Aprobación': return ShieldCheck;
      case 'Asignación': return UserPlus;
      case 'Validación': return ClipboardCheck;
      case 'Gestión': return CheckCircle2;
      case 'Llamada': return MessageSquare;
      default: return Clock;
    }
  };

  const getHistoryColor = (tipo: string) => {
    switch (tipo) {
      case 'Registro': return 'text-slate-500 bg-slate-100 border-slate-200';
      case 'Aprobación': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Asignación': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Validación': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'Gestión': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Llamada': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
      default: return 'text-gray-500 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Cambios por Garantías y Notas de Crédito</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Gestión y procesamiento de documentos financieros (Cambios por Garantías y Notas de Crédito).
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
            onClick={() => {
              const headers = [
                'TIPO',
                'DOCUMENTO CLIENTE',
                'TICKET',
                'TIENDA',
                'CLIENTE',
                'ASESOR CREADOR',
                'SUPERVISOR',
                'FECHA DE CREACION',
                'FECHA APROBACION',
                'FECHA PROCESADO',
                'APROBADO',
                'PROCESADO',
                'ESTADO'
              ];
              const csvContent = [
                headers.join(','),
                ...displayedData.map(item => [
                  item.tipo || '',
                  `"${item.documento_cliente || ''}"`,
                  item.correlativo || '',
                  `"${item.tienda || ''}"`,
                  `"${item.cliente || ''}"`,
                  `"${item.creado_por || ''}"`,
                  `"${item.supervisor || ''}"`,
                  item.fecha ? new Date(item.fecha).toLocaleDateString() : '',
                  item.aprobado_el ? new Date(item.aprobado_el).toLocaleDateString() : '',
                  item.procesado_el ? new Date(item.procesado_el).toLocaleDateString() : '',
                  item.aprobado || 'PENDIENTE',
                  item.procesado || 'PENDIENTE',
                  item.estado || ''
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.setAttribute('download', `CambiosGarantia_NotasCredito_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Exportar
          </SIATCButton>
          <div className="relative">
            <SIATCButton 
              variant="secondary" 
              icon={Columns}
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
            >
              Columnas
            </SIATCButton>
            
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
            variant="primary" 
            icon={DollarSign}
            onClick={() => setIsModalOpen(true)}
          >
            Nueva Solicitud
          </SIATCButton>
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Tabs, Search & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4 sticky top-0 z-20 bg-card/95 backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex bg-muted/50 p-1 rounded-lg w-fit border border-border/50">
              <button 
                onClick={() => setActiveTab('TODOS')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'TODOS' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setActiveTab('NC')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'NC' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Notas de Crédito
              </button>
              <button 
                onClick={() => setActiveTab('CXG')}
                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'CXG' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Cambio por Garantía
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
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Hasta:</span>
              <input 
                type="date" 
                className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>

            {(searchTerm !== '' || activeTab !== 'TODOS' || dateRange.start !== '' || dateRange.end !== '' || statusFilter !== 'TODOS') && (
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
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Sincronizando con SAP...</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  {visibleColumns.map(colId => (
                    <SIATCTableHeader key={colId}>
                      {AVAILABLE_COLUMNS.find(c => c.id === colId)?.label}
                    </SIATCTableHeader>
                  ))}
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {displayedData.map((item) => {
                  const renderCellContent = (colId: string) => {
                    switch (colId) {
                      case 'tipo': return (
                        <SIATCBadge variant={((item.tipo as string) === 'NC' || (item.tipo as string) === 'Nota de Credito') ? 'warning' : 'info'}>
                          {item.tipo}
                        </SIATCBadge>
                      );
                      case 'documento': return <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{item.documento_cliente || '—'}</span>;
                      case 'ticket': return <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.correlativo}</span>;
                      case 'tienda': return <div className="text-xs font-semibold text-foreground truncate max-w-[120px]">{item.tienda || '—'}</div>;
                      case 'cliente': return <div className="font-bold text-foreground italic">{item.cliente}</div>;
                      case 'creado_por': return <div className="text-[10px] font-black uppercase text-muted-foreground truncate max-w-[120px]">{item.creado_por || '—'}</div>;
                      case 'supervisor': return <div className="text-[10px] font-black uppercase text-primary/80 truncate max-w-[120px]">{item.supervisor || '—'}</div>;
                      case 'fecha_creacion': return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">{item.fecha ? new Date(item.fecha).toLocaleDateString() : '—'}</span>
                        </div>
                      );
                      case 'fecha_aprobacion': return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">{item.aprobado_el ? new Date(item.aprobado_el).toLocaleDateString() : '—'}</span>
                        </div>
                      );
                      case 'fecha_procesado': return (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">{item.procesado_el ? new Date(item.procesado_el).toLocaleDateString() : '—'}</span>
                        </div>
                      );
                      case 'aprobado': return (
                        <div className="flex flex-col gap-0.5">
                          <SIATCBadge variant={item.aprobado === 'APROBADO' ? 'success' : item.aprobado === 'RECHAZADO' ? 'danger' : 'warning'}>
                            {item.aprobado === 'APROBADO' ? 'SÍ' : item.aprobado === 'RECHAZADO' ? 'NO' : 'PENDIENTE'}
                          </SIATCBadge>
                          {item.aprobado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.aprobado_por}</span>}
                        </div>
                      );
                      case 'procesado': return (
                        <div className="flex flex-col gap-0.5">
                          <SIATCBadge variant={item.procesado === 'SI' ? 'success' : 'warning'}>
                            {item.procesado === 'SI' ? 'SÍ' : 'PENDIENTE'}
                          </SIATCBadge>
                          {item.procesado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.procesado_por}</span>}
                        </div>
                      );
                      case 'motivo_real': return <span className="text-xs font-bold text-rose-500">{item.vali_motivo_real || '—'}</span>;
                      case 'estado': return (
                        <SIATCBadge variant={
                          item.estado === 'CERRADO' ? 'success' : 
                          item.estado === 'REGISTRADO' ? 'warning' :
                          item.estado === 'VALIDADO' ? 'info' :
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
                      onClick={() => handleViewDetail(item.id)}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      {visibleColumns.map(colId => (
                        <SIATCTableCell key={colId}>
                          {renderCellContent(colId)}
                        </SIATCTableCell>
                      ))}
                      <SIATCTableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                              label: 'Validar Cliente',
                              icon: ClipboardCheck,
                              onClick: () => {
                                setSelectedRecord(item);
                                setValidarForm({ resultado: '', observacion: '', motivo_real: '' });
                                setIsValidarClienteOpen(true);
                              },
                              show: item.estado === 'ASIGNADO' && hasPermission('cxg.cxg_nc.gestionar')
                            },
                            {
                              label: 'Gestionar Solicitud',
                              icon: CheckCircle2,
                              onClick: () => {
                                setSelectedRecord(item);
                                setIsGestionModalOpen(true);
                              },
                              show: item.estado === 'VALIDADO' && hasPermission('cxg.cxg_nc.gestionar')
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

      {/* ─────────────────────────────────────────── */}
      {/* Create Modal */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Solicitud Cambio por Garantía / NC"
        subtitle="Complete los datos para registrar el documento."
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleCreate} isLoading={isSubmitting} disabled={!isTicketValidated}>Registrar</SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Tipo de Solicitud</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value as 'NC' | 'CXG'})}
            >
              <option value="CXG">Cambio por garantía</option>
              <option value="NC">Nota de Crédito</option>
            </select>
          </div>
          
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Ticket de Referencia</label>
            <div className="flex gap-2">
              <input 
                className={SIATC_THEME.COMPONENTS.INPUT}
                value={formData.ticket}
                onChange={(e) => {
                  setFormData({...formData, ticket: e.target.value});
                  setIsTicketValidated(false);
                }}
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
            {formData.cliente && (
              <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Información Capturada</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600/70 uppercase block">Cliente</span>
                    <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">{formData.cliente}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600/70 uppercase block">Lugar de Compra</span>
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 italic">{formData.lugar_compra || 'No identificado'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-600/70 uppercase block">Supervisor FSM</span>
                  <span className="text-xs font-black text-emerald-900 dark:text-emerald-100">{formData.supervisor_fsm || 'No asignado'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-emerald-600/70 uppercase block">Motivo de Elevación</span>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-tight italic line-clamp-2">{formData.motivo_elevacion || 'Sin comentarios'}</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo de la Solicitud / Observaciones</label>
            <textarea
              className={SIATC_THEME.COMPONENTS.INPUT + " min-h-[80px] py-2 resize-none"}
              value={formData.observacion}
              onChange={(e) => setFormData({...formData, observacion: e.target.value})}
              placeholder="Describa el motivo o detalles de la solicitud..."
            />
          </div>
        </div>
      </SIATCModalWrapper>

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
              disabled={!aprobarForm.aprobado || (aprobarForm.aprobado === 'RECHAZADO' && !aprobarForm.observacion)}
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
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'APROBADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  aprobarForm.aprobado === 'APROBADO'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                APROBAR
              </button>
              <button
                type="button"
                onClick={() => setAprobarForm({ ...aprobarForm, aprobado: 'RECHAZADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  aprobarForm.aprobado === 'RECHAZADO'
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
            >
              <option value="">Seleccione un motivo...</option>
              {cxgMotivos.map(m => (
                <option key={m.id} value={m.motivo}>{m.motivo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Observaciones {aprobarForm.aprobado === 'RECHAZADO' && <span className="text-rose-500 font-bold ml-1">(REQUERIDO)</span>}
            </label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder={aprobarForm.aprobado === 'RECHAZADO' ? 'Explique el motivo del rechazo...' : 'Observaciones adicionales...'}
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
      {/* Detail Modal with Dynamic Timeline */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setDetailData(null); setDetailHistorial([]); }}
        title="Detalle de Solicitud"
        subtitle={detailData ? `${detailData.tipo} #${detailData.correlativo}` : 'Cargando...'}
        size="lg"
      >
        {isLoadingDetail ? (
          <div className="h-48 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Cargando información...</p>
          </div>
        ) : detailData ? (
          <div className="space-y-6">
             {/* Process Timeline Steps */}
             <div className="grid grid-cols-5 gap-2 px-2">
              {[
                { key: 'REGISTRADO', label: 'Registro', icon: DollarSign },
                { key: 'APROBADO_SUP', label: 'Aprobación', icon: ShieldCheck },
                { key: 'ASIGNADO', label: 'Asignación', icon: UserPlus },
                { key: 'VALIDADO', label: 'Validación', icon: ClipboardCheck },
                { key: 'CERRADO', label: 'Cierre', icon: CheckCircle2 }
              ].map((step, idx) => {
                const stepOrder = ['REGISTRADO', 'APROBADO_SUP', 'ASIGNADO', 'VALIDADO', 'CERRADO'];
                const currentIdx = stepOrder.indexOf(detailData.estado === 'RECHAZADO' ? 'REGISTRADO' : detailData.estado);
                const isCompleted = currentIdx >= idx;
                const isActive = currentIdx === idx;
                const isRejected = detailData.estado === 'RECHAZADO' && idx === 1;

                return (
                  <div key={step.key} className="flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isRejected ? 'bg-rose-500 border-rose-500 text-white' :
                      isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 
                      'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                    } ${isActive ? 'ring-4 ring-primary/10 scale-110' : ''}`}>
                      {isRejected ? <XCircle className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-tighter text-center leading-none ${
                       isRejected ? 'text-rose-500' :
                       isCompleted ? 'text-primary' : 'text-slate-400'
                    }`}>
                      {isRejected ? 'Rechazado' : (step.key === 'APROBADO_SUP' && detailData.estado === 'APROBADO_SUP' ? 'Pendiente ST' : step.label)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column: Registration & Audit */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Datos del Registro</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Tipo</span>
                      <SIATCBadge variant={detailData.tipo === 'NC' ? 'warning' : 'info'}>{detailData.tipo}</SIATCBadge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket Referencia</span>
                      <span className="text-xs font-black">#{detailData.ticket}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Cliente</span>
                      <span className="text-xs font-bold text-right italic">{detailData.cliente}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Registrado por</span>
                      <span className="text-xs font-semibold">{detailData.creado_por || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Fecha Registro</span>
                      <span className="text-xs">{new Date(detailData.fecha).toLocaleString()}</span>
                    </div>
                    {detailData.ticket_desinstalacion && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Ticket Desinstalación</span>
                        <span className="text-xs font-black text-amber-600">#{detailData.ticket_desinstalacion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* FSM Ticket Context */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                    <Search className="w-3 h-3" /> Contexto del Ticket FSM
                  </h3>
                  <div className="space-y-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-amber-600/70 uppercase">Cliente Original</span>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200">{detailData.fsm_cliente || detailData.cliente || 'No disponible'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-amber-600/70 uppercase">Lugar de Compra</span>
                      <span className="text-xs font-bold text-amber-800 dark:text-amber-300 italic">{detailData.lugar_compra || detailData.fsm_lugar_compra || 'No identificado'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-amber-600/70 uppercase">Supervisor FSM</span>
                      <span className="text-xs font-black text-amber-900 dark:text-amber-100">{detailData.supervisor_fsm || detailData.supervisor_asignado || 'No asignado'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-amber-600/70 uppercase">Motivo de Elevación</span>
                      <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-tight italic">{detailData.motivo_elevacion || detailData.fsm_motivo_elevacion || 'Sin comentarios'}</p>
                    </div>
                  </div>
                </div>

                {/* Audit Steps Summary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">Trazabilidad de Proceso</h3>
                  <div className="space-y-2">
                    <AuditStep 
                      label="Aprobación Supervisor" 
                      user={detailData.aprobado_por} 
                      date={detailData.aprobado_el} 
                      status={detailData.aprobado}
                      reason={detailData.aprobado_motivo}
                      obs={detailData.aprobado_observacion}
                    />
                    {detailData.asignado_a && (
                      <AuditStep 
                        label="Asignación" 
                        user={detailData.asignado_por} 
                        date={detailData.asignado_el} 
                        status="ASIGNADO" 
                      />
                    )}
                    <AuditStep 
                      label="Validación Cliente" 
                      user={detailData.vali_por} 
                      date={detailData.vali_el} 
                      status={detailData.vali_cliente} 
                    />
                    <AuditStep 
                      label="Cierre Final" 
                      user={detailData.procesado_por || detailData.gestionado_por} 
                      date={detailData.procesado_el || detailData.fecha_gestionado} 
                      status={detailData.gestionado === 'Si' ? 'CERRADO' : detailData.gestionado === 'No' ? 'RECHAZADO' : null} 
                    />
                  </div>
                </div>
              </div>

              {/* Right column: Dynamic History Timeline */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 h-full">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">
                    Historial de Acciones ({detailHistorial.length})
                  </h3>
                  
                  {detailHistorial.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground italic">Sin registros de historial</p>
                    </div>
                  ) : (
                    <div className="relative space-y-0">
                      {/* Timeline line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-[2px] bg-border/50" />
                      
                      {detailHistorial.map((entry, idx) => {
                        const Icon = getHistoryIcon(entry.tipo);
                        const colorClass = getHistoryColor(entry.tipo);
                        
                        return (
                          <div key={entry.id || idx} className="relative pl-10 pb-4 last:pb-0">
                            {/* Timeline dot */}
                            <div className={`absolute left-[7px] top-1 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                              <Icon className="w-2.5 h-2.5" />
                            </div>
                            
                            <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-lg p-3 shadow-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colorClass}`}>
                                  {entry.tipo}
                                </span>
                                <span className="text-[9px] text-muted-foreground italic">
                                  {entry.fecha ? new Date(entry.fecha).toLocaleString() : ''}
                                </span>
                              </div>
                              {entry.usuario && (
                                <div className="text-[10px] font-bold text-foreground mb-0.5">
                                  {entry.usuario}
                                </div>
                              )}
                              {entry.observacion && (
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                  {entry.observacion}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Motivo Real Alert */}
            {detailData.vali_motivo_real && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                <div className="text-[9px] font-black uppercase text-rose-600 mb-1">⚠ Motivo Real Detectado</div>
                <p className="text-sm font-bold text-rose-700 dark:text-rose-400">{detailData.vali_motivo_real}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-bold">No se pudo cargar el detalle.</p>
          </div>
        )}
      </SIATCModalWrapper>

      {/* ─────────────────────────────────────────── */}
      {/* Validar Cliente Modal */}
      {/* ─────────────────────────────────────────── */}
       <SIATCModalWrapper
        isOpen={isValidarClienteOpen}
        onClose={() => setIsValidarClienteOpen(false)}
        title="Validación con Cliente"
        subtitle={`Confirme si el motivo de la solicitud es real conversando con el cliente.`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsValidarClienteOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleValidarCliente} 
              isLoading={isValidarSubmitting}
              disabled={!validarForm.resultado || (validarForm.resultado === 'FALSA' && !validarForm.motivo_real)}
            >
              Confirmar Validación
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
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4 font-bold">¿El cliente confirma el motivo?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setValidarForm({ ...validarForm, resultado: 'REAL' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  validarForm.resultado === 'REAL'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg shadow-blue-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                SÍ, MOTIVO REAL
              </button>
              <button
                type="button"
                onClick={() => setValidarForm({ ...validarForm, resultado: 'FALSA' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  validarForm.resultado === 'FALSA'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <XCircle className="w-5 h-5" />
                MOTIVO NO REAL
              </button>
            </div>
          </div>

          {validarForm.resultado === 'FALSA' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="text-[10px] font-black uppercase text-rose-500 mb-1.5 block tracking-widest pl-4">¿Cuál es el Motivo Real?</label>
              <select
                className={`${SIATC_THEME.COMPONENTS.INPUT} font-bold text-rose-600 border-rose-200 bg-rose-50/30`}
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
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder="Detalle de lo conversado con el cliente..."
              value={validarForm.observacion}
              onChange={(e) => setValidarForm({...validarForm, observacion: e.target.value})}
            />
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
              disabled={!gestiónResultado || (gestiónResultado === 'No' && !gestiónObs)}
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
                onClick={() => setGestiónResultado('Si')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestiónResultado === 'Si'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                Sí, Procesar
              </button>
              <button
                type="button"
                onClick={() => setGestiónResultado('No')}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  gestiónResultado === 'No'
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
              Observaciones de Gestión {gestiónResultado === 'No' && <span className="text-rose-500 font-bold ml-1">(REQUERIDO)</span>}
            </label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder={gestiónResultado === 'No' ? 'Explique el motivo del rechazo...' : 'Detalle el resultado del proceso (ej: N° de Nota SAP...)'}
              value={gestiónObs}
              onChange={(e) => setGestiónObs(e.target.value)}
            />
          </div>
        </div>
      </SIATCModalWrapper>
    </div>
  );
};

const AuditStep = ({ label, user, date, status, reason, obs }: { label: string, user?: string | null, date?: string | null, status?: string | null, reason?: string | null, obs?: string | null }) => {
  if (!user && !status) return <div className="p-2 rounded border border-dashed border-border/50 text-[10px] text-muted-foreground text-center font-bold">{label} - Pendiente</div>;
  
  return (
    <div className="p-2 bg-white dark:bg-slate-900 border border-border shadow-sm rounded-lg flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9px] font-black uppercase text-primary leading-none mb-1">{label}</div>
          <div className="text-[10px] font-bold text-foreground">{user || '—'}</div>
          <div className="text-[9px] text-muted-foreground italic">{date ? new Date(date).toLocaleString() : ''}</div>
        </div>
        <SIATCBadge variant={status === 'RECHAZADO' || status === 'FALSA' ? 'danger' : 'success'} className="text-[8px] h-5 px-1.5">{status}</SIATCBadge>
      </div>
      {(reason || obs) && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
          {reason && <p className="text-[9px] font-black text-rose-500 uppercase leading-none mb-1">Motivo: <span className="text-foreground">{reason}</span></p>}
          {obs && <p className="text-[10px] text-muted-foreground leading-tight italic">"{obs}"</p>}
        </div>
      )}
    </div>
  );
};

export default CxGNCPage;
