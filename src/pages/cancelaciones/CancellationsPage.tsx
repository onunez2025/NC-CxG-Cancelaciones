import { useState, useEffect, useRef } from 'react';
import { 
  Plus,
  Search, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  MoreVertical,
  Calendar,
  Loader2,
  FileSpreadsheet,
  Eye,
  UserCheck,
  ClipboardCheck,
  User,
  Clock,
  MessageSquare,
  AlertTriangle,
  UserPlus
} from 'lucide-react';
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
import { UsersService } from '../../services/usersService';
import type { User as SystemUser } from '../../types';

// ---- Dropdown Menu Component ----
const ActionsMenu = ({ 
  onViewDetail, 
  onGestionar, 
  onAsignar,
  estado,
  canAssign,
  canGestionar
}: { 
  onViewDetail: () => void; 
  onGestionar: () => void; 
  onAsignar: () => void;
  estado: string;
  canAssign: boolean;
  canGestionar: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <SIATCButton 
        variant="ghost" 
        size="sm" 
        icon={MoreVertical} 
        onClick={() => setOpen(!open)} 
      />
      {open && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl z-50 py-1 animate-in fade-in zoom-in-95 duration-150">
          <button 
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => { onViewDetail(); setOpen(false); }}
          >
            <Eye className="w-4 h-4 text-blue-500" />
            Ver Detalle
          </button>
          {canAssign && (estado === 'PENDIENTE') && (
            <button 
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => { onAsignar(); setOpen(false); }}
            >
              <UserPlus className="w-4 h-4 text-violet-500" />
              Asignar
            </button>
          )}
          {canGestionar && (estado === 'EN GESTIÓN') && (
            <button 
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              onClick={() => { onGestionar(); setOpen(false); }}
            >
              <ClipboardCheck className="w-4 h-4 text-amber-500" />
              Gestionar
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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

  // RBAC permission checks
  const canCreate = hasPermission('cxg.cancelaciones.create');
  const canAssign = hasPermission('cxg.cancelaciones.assign');
  const canGestionar = hasPermission('cxg.cancelaciones.gestionar');
  const canProcess = hasPermission('cxg.cancelaciones.process');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [motivos, setMotivos] = useState<{ id: string; motivo: string }[]>([]);
  
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
  const [isAssigning, setIsAssigning] = useState(false);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);

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
        estado: statusFilter !== 'TODOS' ? statusFilter : undefined
      });
      setCancellations(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching cancellations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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
    // Load system users for assignment dropdown
    UsersService.getUsers().then(users => setSystemUsers(users.filter(u => u.is_active))).catch(console.error);
  }, []);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await ncService.createCancellation({
        cliente: formData.tienda,
        motive: formData.motivo,
        ticket: formData.ticket,
        observacion: formData.observacion,
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
    setIsAssignOpen(true);
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
    } catch (error) {
      console.error('Error assigning:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleQuickApprove = async (item: Cancellation) => {
    try {
      await ncService.approveCancellation(item.id);
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'APPROVE',
        Entidad: 'CANCELACIONES',
        EntidadID: item.id,
        Detalle: `Aprobación rápida por ${user?.username}`
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleQuickReject = async (item: Cancellation) => {
    try {
      await ncService.rejectCancellation(item.id);
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'REJECT',
        Entidad: 'CANCELACIONES',
        EntidadID: item.id,
        Detalle: `Rechazo rápido por ${user?.username}`
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'APROBADO': return 'success';
      case 'RECHAZADO': return 'danger';
      case 'EN GESTIÓN': return 'info';
      case 'PENDIENTE': 
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
            icon={FileSpreadsheet}
            onClick={() => {
              const headers = ['TICKET', 'CLIENTE', 'MOTIVO', 'AUTORIZADOR', 'FECHA', 'ESTADO', 'GESTIONADO POR', 'OBSERVACIÓN'];
              const csvContent = [
                headers.join(','),
                ...displayedCancellations.map(item => [
                  item.ticket,
                  `"${item.cliente}"`,
                  `"${item.motivo}"`,
                  `"${item.autorizador || ''}"`,
                  new Date(item.fecha_generado).toLocaleDateString(),
                  item.estado,
                  `"${item.gestionado_por || ''}"`,
                  `"${(item.observacion || '').replace(/"/g, '""')}"`
                ].join(','))
              ].join('\n');
              
              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.setAttribute('download', `Cancelaciones_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
          >
            Exportar
          </SIATCButton>
          {canCreate && (
            <SIATCButton 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsCreateModalOpen(true)}
            >
              Nueva Cancelación
            </SIATCButton>
          )}
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar por ticket, cliente, motivo o autorizador..."
              className={`${SIATC_THEME.COMPONENTS.INPUT} pl-10`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Estado:</span>
              <select 
                className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="EN GESTION">EN GESTIÓN</option>
                <option value="APROBADO">APROBADO</option>
                <option value="RECHAZADO">RECHAZADO</option>
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
              <p className="text-sm text-muted-foreground font-medium">Cargando registros...</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  <SIATCTableHeader>TICKET</SIATCTableHeader>
                  <SIATCTableHeader>CLIENTE</SIATCTableHeader>
                  <SIATCTableHeader>MOTIVO</SIATCTableHeader>
                  <SIATCTableHeader>AUTORIZADOR</SIATCTableHeader>
                  <SIATCTableHeader>FECHA</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO</SIATCTableHeader>
                  <SIATCTableHeader>ASIGNADO A</SIATCTableHeader>
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {displayedCancellations.map((item) => (
                  <SIATCTableRow 
                    key={item.id}
                    onClick={() => handleViewDetail(item.id)}
                    className="cursor-pointer"
                  >
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="font-bold text-foreground italic max-w-[200px] truncate">{item.cliente}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-muted-foreground text-xs">{item.motivo}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs text-muted-foreground">{item.autorizador || '—'}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{new Date(item.fecha_generado).toLocaleDateString()}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={getEstadoBadgeVariant(item.estado)}>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-xs text-muted-foreground">{item.asignado_a || '—'}</span>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        {canProcess && item.estado === 'EN GESTIÓN' && (
                          <>
                            <SIATCButton 
                              variant="ghost" 
                              size="sm" 
                              icon={CheckCircle2} 
                              className="text-emerald-500 hover:bg-emerald-50"
                              onClick={() => handleQuickApprove(item)}
                              title="Aprobar rápido"
                            />
                            <SIATCButton 
                              variant="ghost" 
                              size="sm" 
                              icon={XCircle} 
                              className="text-rose-500 hover:bg-rose-50"
                              onClick={() => handleQuickReject(item)}
                              title="Rechazar rápido"
                            />
                          </>
                        )}
                        <ActionsMenu 
                          estado={item.estado}
                          canAssign={canAssign}
                          canGestionar={canGestionar}
                          onViewDetail={() => handleViewDetail(item.id)}
                          onAsignar={() => handleOpenAssign(item)}
                          onGestionar={() => handleOpenGestionar(item)}
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
          <div className="space-y-1">
            {/* Status Banner */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              detailData.estado === 'APROBADO' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/20' :
              detailData.estado === 'RECHAZADO' ? 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/20' :
              detailData.estado === 'EN GESTIÓN' ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/20' :
              'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/20'
            }`}>
              <div className="flex items-center gap-3">
                {detailData.estado === 'APROBADO' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> :
                 detailData.estado === 'RECHAZADO' ? <XCircle className="w-5 h-5 text-rose-500" /> :
                 detailData.estado === 'EN GESTIÓN' ? <Loader2 className="w-5 h-5 text-blue-500" /> :
                 <AlertTriangle className="w-5 h-5 text-amber-500" />}
                <div>
                  <p className="text-sm font-bold">{detailData.estado}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {detailData.cancelacion_correcta === 'Si' ? 'Cancelación validada como correcta' : 
                     detailData.cancelacion_correcta === 'No' ? 'Cancelación marcada como incorrecta' :
                     'Pendiente de revisión'}
                  </p>
                </div>
              </div>
              <SIATCBadge variant={getEstadoBadgeVariant(detailData.estado)}>{detailData.estado}</SIATCBadge>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 divide-y md:divide-y-0 divide-border/50">
              <div className="space-y-0 divide-y divide-border/30">
                <DetailRow icon={Search} label="Ticket FSM" value={detailData.ticket} />
                <DetailRow icon={User} label="Cliente" value={detailData.cliente} />
                <DetailRow icon={AlertTriangle} label="Motivo de Cancelación" value={detailData.motivo_cancelacion_texto} />
                <DetailRow icon={UserCheck} label="Autorizador" value={detailData.autorizador} />
                <DetailRow icon={Clock} label="Fecha de Creación" value={detailData.fecha_generado ? new Date(detailData.fecha_generado).toLocaleString() : null} />
              </div>
              <div className="space-y-0 divide-y divide-border/30">
                <DetailRow icon={User} label="Asignado a" value={detailData.asignado_a} />
                <DetailRow icon={UserCheck} label="Asignado por" value={detailData.asignado_por} />
                <DetailRow icon={Clock} label="Fecha Asignación" value={detailData.fecha_asignado ? new Date(detailData.fecha_asignado).toLocaleString() : null} />
                <DetailRow icon={User} label="Gestionado por" value={detailData.gestionado_por} />
                <DetailRow icon={Clock} label="Fecha Gestión" value={detailData.fecha_gestionado ? new Date(detailData.fecha_gestionado).toLocaleString() : null} />
              </div>
            </div>

            {/* Motivo Correcto (si fue rechazado) */}
            {detailData.motivo_correcto_texto && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Motivo Correcto (Corrección)</p>
                <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">{detailData.motivo_correcto_texto}</p>
              </div>
            )}

            {/* Observación */}
            {detailData.observacion && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Observación de Gestión</p>
                </div>
                <p className="text-sm font-medium text-foreground whitespace-pre-wrap">{detailData.observacion}</p>
              </div>
            )}

            {/* Producto / Asunto del Ticket */}
            {(detailData.producto || detailData.asunto) && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">Información del Ticket FSM</p>
                {detailData.producto && <p className="text-sm font-medium text-foreground">Producto: {detailData.producto}</p>}
                {detailData.asunto && <p className="text-sm font-medium text-muted-foreground mt-1">Asunto: {detailData.asunto}</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No se pudo cargar la información.</p>
          </div>
        )}
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
              disabled={!gestionForm.cancelacion_correcta}
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

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
              Asignar a
            </label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={assignTo}
              onChange={(e) => setAssignTo(e.target.value)}
            >
              <option value="">Seleccione un analista...</option>
              {systemUsers.map(u => (
                <option key={u.id} value={u.full_name}>{u.full_name} ({u.username})</option>
              ))}
            </select>
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
