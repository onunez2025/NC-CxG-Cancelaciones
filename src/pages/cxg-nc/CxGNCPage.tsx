import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  FileText,
  Loader2,
  FileSpreadsheet,
  UserPlus,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  MessageSquare,
  Eye,
  MoreVertical,
  AlertTriangle,
  UserCheck,
  ClipboardCheck
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
import type { CxGNC } from '../../services/ncService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { UsersService } from '../../services/usersService';
import type { User } from '../../types';

export const CxGNCPage = () => {
  const { user } = useAuth();
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
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'EN GESTIÓN' | 'PROCESADO'>('TODOS');

  // Analysts for assignment
  const [analysts, setAnalysts] = useState<User[]>([]);
  
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

  // Validation state
  const [isValidarClienteOpen, setIsValidarClienteOpen] = useState(false);
  const [validarForm, setValidarForm] = useState({ resultado: '' as 'REAL' | 'FALSA' | '', observacion: '' });
  const [isValidarSubmitting, setIsValidarSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tipo: 'NC' as 'NC' | 'CXG',
    cliente: '',
    ticket: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await ncService.getCxGNC({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm 
      });
      setData(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching CxG/NC data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, activeTab, statusFilter]);

  useEffect(() => {
    const fetchAnalysts = async () => {
      try {
        const users = await UsersService.getUsers();
        setAnalysts(users.filter((u: User) => u.is_active));
      } catch (error) {
        console.error('Error fetching analysts:', error);
      }
    };
    fetchAnalysts();
  }, []);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await ncService.createCxGNC({
        tipo: formData.tipo,
        cliente: formData.cliente,
        estado: 'PENDIENTE',
        ticket: formData.ticket
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
        tipo: 'NC', 
        cliente: '', 
        ticket: ''
      });
    } catch (error) {
      console.error(error);
      setIsModalOpen(false);
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
        cliente: ticketInfo.cliente
      }));
    } catch (error: any) {
      console.error("Lookup error:", error);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleAsignar = async () => {
    if (!selectedRecord || !targetAnalystId) return;
    setIsSubmitting(true);
    try {
      await ncService.asignarCxGNC(selectedRecord.id, {
        asignado_a: targetAnalystId,
        asignado_por: user?.id || '0'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'ASSIGN',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} asignada a ${analysts.find(a => a.id === targetAnalystId)?.full_name}`
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
        usuario: user?.full_name || user?.username || 'Sistema'
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
    try {
      const resp = await ncService.getCxGNCDetail(id);
      setDetailData(resp);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const hasPermission = (perm: string) => {
    return user?.permissions?.includes(perm as any) || false;
  };

  // No longer needed due to server-side filtering
  const displayedData = data;

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Cargos y Notas de Crédito</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Gestión y procesamiento de documentos financieros (CxG / NC).
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
              const headers = ['TIPO', 'DOCUMENTO', 'CLIENTE', 'FECHA', 'ESTADO'];
              const csvContent = [
                headers.join(','),
                ...displayedData.map(item => [
                  item.tipo,
                  item.correlativo,
                  `"${item.cliente}"`,
                  new Date(item.fecha).toLocaleDateString(),
                  item.estado
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.setAttribute('download', `Cargos_NotasCredito_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Exportar
          </SIATCButton>
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
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4">
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
                Cargos x Generar
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
                  <SIATCTableHeader>TIPO</SIATCTableHeader>
                  <SIATCTableHeader>DOCUMENTO</SIATCTableHeader>
                  <SIATCTableHeader>CLIENTE</SIATCTableHeader>
                  <SIATCTableHeader>FECHA</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO</SIATCTableHeader>
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {displayedData.map((item) => (
                  <SIATCTableRow key={item.id}>
                    <SIATCTableCell>
                      <SIATCBadge variant={item.tipo === 'NC' ? 'warning' : 'info'}>
                        {item.tipo}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.correlativo}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="font-bold text-foreground italic">{item.cliente}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{new Date(item.fecha).toLocaleDateString()}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={
                        item.estado === 'CERRADO' || item.estado === 'PROCESADO' ? 'success' : 
                        item.estado === 'RECHAZADO' ? 'danger' :
                        item.estado === 'REGISTRADO' ? 'warning' :
                        'info'
                      }>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <div className="flex justify-end">
                        <SIATCActionDropdown 
                          actions={[
                            {
                              label: 'Ver Detalle',
                              icon: Eye,
                              onClick: () => handleViewDetail(item.id)
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
                                setValidarForm({ resultado: '', observacion: '' });
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
                ))}
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

      {/* Create Modal */}
      <SIATCModalWrapper
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Solicitud CxG / NC"
        subtitle="Complete los datos para registrar el documento."
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleCreate} isLoading={isSubmitting}>Registrar</SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Tipo de Documento</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={formData.tipo}
              onChange={(e) => setFormData({...formData, tipo: e.target.value as 'NC' | 'CXG'})}
            >
              <option value="NC">Nota de Crédito</option>
              <option value="CXG">Cargo x Generar</option>
            </select>
          </div>
          
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
            {formData.cliente && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 pl-4">
                ✔ {formData.cliente}
              </p>
            )}
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Asignar Modal */}
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

      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => { setIsDetailOpen(false); setDetailData(null); }}
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
             {/* Process Timeline */}
             <div className="grid grid-cols-5 gap-2 px-2">
              {[
                { key: 'REGISTRADO', label: 'Registro', icon: DollarSign },
                { key: 'APROBADO_SUP', label: 'Aprobación', icon: UserCheck },
                { key: 'ASIGNADO', label: 'Asignación', icon: UserPlus },
                { key: 'VALIDADO', label: 'Validación', icon: ClipboardCheck },
                { key: 'CERRADO', label: 'Cierre', icon: CheckCircle2 }
              ].map((step, idx) => {
                const stepOrder = ['REGISTRADO', 'APROBADO_SUP', 'ASIGNADO', 'VALIDADO', 'CERRADO', 'PROCESADO'];
                const currentIdx = stepOrder.indexOf(detailData.estado === 'PROCESADO' ? 'CERRADO' : detailData.estado);
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">1. Registro & Ticket</h3>
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
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Fecha Registro</span>
                      <span className="text-xs">{new Date(detailData.fecha).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">2. Auditoría de Proceso</h3>
                  <div className="space-y-2">
                    <div className="text-[10px] uppercase text-muted-foreground font-bold">Estado Actual</div>
                    <SIATCBadge className="w-full justify-center" variant={detailData.estado === 'PROCESADO' ? 'success' : 'info'}>{detailData.estado}</SIATCBadge>
                    
                    <div className="mt-4 space-y-2">
                      <AuditStep label="Aprobación Sup." user={detailData.apro_por} date={detailData.apro_el} status={detailData.apro_solicitud} />
                      <AuditStep label="Validación Cliente" user={detailData.vali_por} date={detailData.vali_el} status={detailData.vali_cliente} />
                      <AuditStep label="Cierre Final" user={detailData.gestionado_por} date={detailData.fecha_gestionado} status={detailData.resultado === 'Si' ? 'PROCESADO' : detailData.resultado === 'No' ? 'RECHAZADO' : null} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 h-full">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-primary mb-4">3. Observaciones de Gestión</h3>
                  <div className="space-y-4">
                    {detailData.apro_obs && (
                      <div>
                        <div className="text-[9px] font-black uppercase text-amber-600 mb-1">Obs. Aprobación</div>
                        <p className="text-xs p-3 bg-amber-50 rounded-lg border border-amber-100 italic">"{detailData.apro_obs}"</p>
                      </div>
                    )}
                    {detailData.vali_obs && (
                      <div>
                        <div className="text-[9px] font-black uppercase text-blue-600 mb-1">Obs. Validación Cliente</div>
                        <p className="text-xs p-3 bg-blue-50 rounded-lg border border-blue-100 italic">"{detailData.vali_obs}"</p>
                      </div>
                    )}
                    {detailData.observacion && (
                      <div>
                        <div className="text-[9px] font-black uppercase text-emerald-600 mb-1">Obs. Cierre</div>
                        <p className="text-xs p-3 bg-emerald-50 rounded-lg border border-emerald-100 italic">"{detailData.observacion}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground font-bold">No se pudo cargar el detalle.</p>
          </div>
        )}
      </SIATCModalWrapper>

       {/* Validar Cliente Modal */}
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
              disabled={!validarForm.resultado}
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

      {/* Gestionar Modal */}
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

const AuditStep = ({ label, user, date, status }: { label: string, user?: string | null, date?: string | null, status?: string | null }) => {
  if (!user && !status) return <div className="p-2 rounded border border-dashed border-border/50 text-[10px] text-muted-foreground text-center font-bold">{label} - Pendiente</div>;
  
  return (
    <div className="p-2 bg-white dark:bg-slate-900 border border-border shadow-sm rounded-lg flex items-center justify-between">
      <div>
        <div className="text-[9px] font-black uppercase text-primary leading-none mb-1">{label}</div>
        <div className="text-[10px] font-bold text-foreground">{user || '—'}</div>
        <div className="text-[9px] text-muted-foreground italic">{date ? new Date(date).toLocaleString() : ''}</div>
      </div>
      <SIATCBadge variant={status === 'RECHAZADO' || status === 'FALSA' ? 'danger' : 'success'} className="text-[8px] h-5 px-1.5">{status}</SIATCBadge>
    </div>
  );
};

export default CxGNCPage;
