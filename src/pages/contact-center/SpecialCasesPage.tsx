import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  Calendar,
  User
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
import { specialCasesService } from '../../services/specialCasesService';
import type { SpecialCase, SpecialCaseMotivo } from '../../types';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { ncService } from '../../services/ncService';

export const SpecialCasesPage = () => {
  const { user, hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [data, setData] = useState<SpecialCase[]>([]);
  const [motivos, setMotivos] = useState<SpecialCaseMotivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Detail state
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SpecialCase | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    ticket: '',
    motivo: '',
    comentario: '',
    cliente_temp: '', // For lookup feedback
    fecha_visita_temp: '' // For lookup feedback
  });

  // Approval state
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({
    estado: '' as 'APROBADO' | 'RECHAZADO' | '',
    motivo_rechazo: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await specialCasesService.getSpecialCases({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm 
      });
      setData(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching special cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMotivos = async () => {
    try {
      const m = await specialCasesService.getMotivos();
      setMotivos(m);
    } catch (error) {
      console.error('Error fetching motives:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchMotivos();
  }, []);

  const handleLookupTicket = async () => {
    if (!formData.ticket) return;
    setIsLookingUp(true);
    try {
      const ticketInfo = await ncService.getTicketDetails(formData.ticket);
      setFormData(prev => ({
        ...prev,
        cliente_temp: ticketInfo.cliente,
        fecha_visita_temp: ticketInfo.fecha_visita || ''
      }));
    } catch (error: any) {
      console.error("Lookup error:", error);
      setFormData(prev => ({ ...prev, cliente_temp: 'Ticket no encontrado' }));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.ticket || !formData.motivo) return;

    // Regla de Negocio:
    // 1. Antes de las 10:30 AM: Solo permite fecha de visita de Mañana (Hoy + 1) en adelante.
    // 2. Después de las 10:30 AM: Solo permite fecha de visita de Pasado Mañana (Hoy + 2) en adelante.
    if (formData.fecha_visita_temp) {
      const now = new Date();
      // Obtener hora actual en formato de Lima para comparar el punto de corte
      const limaTimeStr = now.toLocaleString("en-US", { timeZone: "America/Lima", hour12: false });
      const timePart = limaTimeStr.split(', ')[1];
      const currentLimaHour = parseInt(timePart.split(':')[0]);
      const currentLimaMinute = parseInt(timePart.split(':')[1]);
      
      const isAfterCutoff = currentLimaHour > 10 || (currentLimaHour === 10 && currentLimaMinute >= 30);

      // Normalizar fechas a medianoche para comparar días calendario
      const todayLima = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
      todayLima.setHours(0, 0, 0, 0);

      // Parsear la fecha de visita asegurando que se trate como fecha local (no UTC)
      // Si la fecha viene como ISO "YYYY-MM-DD...", extraemos solo la parte de la fecha
      const visitDateStr = formData.fecha_visita_temp.split('T')[0]; 
      const [year, month, day] = visitDateStr.split(/[-/]/).map(Number);
      const visitDate = new Date(year, month - 1, day);
      visitDate.setHours(0, 0, 0, 0);

      // Calcular diferencia en días exactos
      const diffTime = visitDate.getTime() - todayLima.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (isAfterCutoff) {
        // Después de las 10:30 AM: Mínimo Hoy + 2
        if (diffDays < 2) {
          alert('Después de las 10:30 AM, solo se permiten registros con fecha de visita a partir de PASADO MAÑANA (Hoy + 2).');
          return;
        }
      } else {
        // Antes de las 10:30 AM: Mínimo Hoy + 1
        if (diffDays < 1) {
          alert('Solo se permiten registros con fecha de visita a partir de MAÑANA (Hoy + 1).');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      await specialCasesService.createSpecialCase({
        ticket: formData.ticket,
        motivo: formData.motivo,
        comentario: formData.comentario,
        usuario: user?.full_name || user?.username || 'Sistema'
      });
      
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'CREATE',
        Entidad: 'CASOS_ESPECIALES',
        EntidadID: 'NEW',
        Detalle: `Caso especial creado para Ticket: ${formData.ticket}. Motivo: ${formData.motivo}`
      });

      setIsModalOpen(false);
      fetchData();
      setFormData({ 
        ticket: '', 
        motivo: '', 
        comentario: '',
        cliente_temp: '',
        fecha_visita_temp: ''
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedCase || !approveForm.estado) return;
    setIsSubmitting(true);
    try {
      await specialCasesService.updateStatus(selectedCase.id, {
        estado: approveForm.estado as 'APROBADO' | 'RECHAZADO',
        revisado_por: user?.full_name || user?.username || 'Sistema',
        motivo_rechazo: approveForm.estado === 'RECHAZADO' ? approveForm.motivo_rechazo : undefined
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: approveForm.estado === 'APROBADO' ? 'APPROVE' : 'REJECT',
        Entidad: 'CASOS_ESPECIALES',
        EntidadID: selectedCase.id,
        Detalle: `Caso especial ${selectedCase.ticket} marcado como ${approveForm.estado}`
      });

      setIsApproveModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Casos Especiales</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Registro y seguimiento de tickets que requieren atención especial del Contact Center.
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
          {hasPermission('cxg.casos_especiales.create') && (
            <SIATCButton 
              variant="primary" 
              icon={Plus}
              onClick={() => setIsModalOpen(true)}
            >
              Registrar
            </SIATCButton>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="shrink-0 flex flex-col gap-2 mb-2">
        <div className="bg-white dark:bg-cb-bg border border-cb-border rounded-cb-card p-2 flex items-center flex-wrap gap-2 shadow-cb-level-1">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cb-text-secondary/55" />
            <input 
              type="text"
              placeholder="Buscar por ticket, motivo o comentario..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm text-cb-text-primary placeholder:text-cb-neutral/40 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Table Area */}
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Cargando casos...</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  <SIATCTableHeader>TICKET</SIATCTableHeader>
                  <SIATCTableHeader>PRODUCTO</SIATCTableHeader>
                  <SIATCTableHeader>MOTIVO</SIATCTableHeader>
                  <SIATCTableHeader>CREADO POR</SIATCTableHeader>
                  <SIATCTableHeader>FECHA REGISTRO</SIATCTableHeader>
                  <SIATCTableHeader>FECHA VISITA</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO SOLICITUD</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO SERVICIO</SIATCTableHeader>
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <SIATCTableRow key={item.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-xs font-bold text-cb-text-primary truncate" title={item.codigo_producto}>{item.codigo_producto || 'N/A'}</span>
                        <span className="text-[10px] text-cb-text-secondary truncate" title={item.producto}>{item.producto || 'Sin descripción'}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="text-xs font-medium text-cb-text-primary max-w-[150px] truncate" title={item.motivo}>{item.motivo}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cb-text-secondary" />
                        <span className="text-xs text-cb-text-secondary">{item.creado_por}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-cb-text-secondary">
                        <Calendar className="w-3.5 h-3.5 text-cb-text-secondary" />
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{new Date(item.fecha).toLocaleDateString('es-PE')}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-cb-text-primary">
                        <Calendar className="w-3.5 h-3.5 text-cb-text-secondary" />
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>
                          {item.fecha_visita ? new Date(item.fecha_visita).toLocaleDateString('es-PE') : '—'}
                        </span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={
                        item.estado === 'APROBADO' ? 'success' : 
                        item.estado === 'PENDIENTE' ? 'warning' :
                        'danger'
                      }>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={
                        item.service_status === 'Cancelled' ? 'danger' :
                        item.service_status === 'Ready to plan' ? 'primary' :
                        item.service_status === 'Closed' ? 'success' :
                        'info'
                      }>
                        {item.service_status === 'Cancelled' ? 'CANCELADO' :
                         item.service_status === 'Ready to plan' ? 'POR PLANIFICAR' :
                         item.service_status === 'Closed' ? 'CERRADO' :
                         item.service_status?.toUpperCase() || 'N/A'}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <SIATCActionDropdown 
                        actions={[
                          {
                            label: 'Ver Detalle',
                            icon: Eye,
                            onClick: () => {
                              setSelectedCase(item);
                              setIsDetailOpen(true);
                            }
                          },
                          {
                            label: 'Gestionar Caso',
                            icon: CheckCircle2,
                            onClick: () => {
                              setSelectedCase(item);
                              setApproveForm({ estado: '', motivo_rechazo: '' });
                              setIsApproveModalOpen(true);
                            },
                            show: item.estado === 'PENDIENTE' && 
                                   hasPermission('cxg.casos_especiales.gestionar') && 
                                   user?.role_name !== 'Contact Center'
                          }
                        ]}
                      />
                    </SIATCTableCell>
                  </SIATCTableRow>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-cb-text-secondary italic text-xs">
                      No se encontraron casos especiales.
                    </td>
                  </tr>
                )}
              </tbody>
            </SIATCTable>
          )}
        </div>

        {/* Footer */}
        <div className={SIATC_THEME.TABLE.FOOTER}>
          <div className={SIATC_THEME.TYPOGRAPHY.FOOTER_STATS}>
            MOSTRANDO {data.length} DE {totalRecords} REGISTROS
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
              PÁGINA {currentPage}
            </span>
            <SIATCButton 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={data.length < pageSize || isLoading}
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
        title="Nuevo Caso Especial"
        subtitle="Registre los detalles del ticket con atención especial."
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleCreate} 
              isLoading={isSubmitting}
              disabled={!formData.ticket || !formData.motivo}
            >
              Registrar Caso
            </SIATCButton>
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
                onBlur={handleLookupTicket}
              />
              <SIATCButton 
                variant="secondary" 
                icon={isLookingUp ? Loader2 : Search}
                onClick={handleLookupTicket}
                isLoading={isLookingUp}
                className="w-12 h-10 flex-shrink-0"
              />
            </div>
            {formData.cliente_temp && (
              <div className="mt-1.5 pl-4 space-y-1">
                <p className={`text-[10px] font-bold ${formData.cliente_temp === 'Ticket no encontrado' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {formData.cliente_temp === 'Ticket no encontrado' ? '⚠' : '✔'} Cliente: {formData.cliente_temp}
                </p>
                {formData.fecha_visita_temp && (
                  <p className="text-[10px] font-bold text-primary">
                    📅 Fecha Visita: {new Date(formData.fecha_visita_temp).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo de la Solicitud</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={formData.motivo}
              onChange={(e) => setFormData({...formData, motivo: e.target.value})}
            >
              <option value="">Seleccione un motivo...</option>
              {motivos.map(m => (
                <option key={m.id} value={m.motivo}>{m.motivo}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Comentario / Observación</label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder="Detalle el caso..."
              value={formData.comentario}
              onChange={(e) => setFormData({...formData, comentario: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* ─────────────────────────────────────────── */}
      {/* Detail Modal */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalle del Caso"
        subtitle={`Ticket #${selectedCase?.ticket}`}
      >
        {selectedCase && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estado Actual</p>
                <SIATCBadge variant={selectedCase.estado === 'APROBADO' ? 'success' : selectedCase.estado === 'PENDIENTE' ? 'warning' : 'danger'}>
                  {selectedCase.estado}
                </SIATCBadge>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fecha de Registro</p>
                <p className="text-sm font-bold">{new Date(selectedCase.fecha).toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 pl-4">Motivo de Solicitud</p>
                <div className="p-4 bg-background rounded-xl border border-border/50 font-bold text-sm">
                  {selectedCase.motivo}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 pl-4">Comentario de Asesor</p>
                <div className="p-4 bg-background rounded-xl border border-border/50 text-sm italic">
                  {selectedCase.comentario || 'Sin comentarios.'}
                </div>
              </div>

              {selectedCase.estado !== 'PENDIENTE' && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Información de Revisión</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{new Date(selectedCase.revisado_el!).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{selectedCase.revisado_por}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Revisor</p>
                    </div>
                  </div>
                  {selectedCase.motivo_rechazo && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
                      <span className="font-black uppercase text-[9px] block mb-1">Motivo de Rechazo:</span>
                      {selectedCase.motivo_rechazo}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SIATCModalWrapper>

      {/* ─────────────────────────────────────────── */}
      {/* Management Modal */}
      {/* ─────────────────────────────────────────── */}
      <SIATCModalWrapper
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Gestionar Caso Especial"
        subtitle={`Evaluando ticket #${selectedCase?.ticket}`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsApproveModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton 
              variant="primary" 
              onClick={handleUpdateStatus} 
              isLoading={isSubmitting}
              disabled={!approveForm.estado || (approveForm.estado === 'RECHAZADO' && !approveForm.motivo_rechazo)}
            >
              Confirmar Gestión
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿Cuál es el resultado de la gestión?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setApproveForm({ ...approveForm, estado: 'APROBADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  approveForm.estado === 'APROBADO'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <CheckCircle2 className="w-5 h-5" />
                APROBAR
              </button>
              <button
                onClick={() => setApproveForm({ ...approveForm, estado: 'RECHAZADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  approveForm.estado === 'RECHAZADO'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <XCircle className="w-5 h-5" />
                RECHAZAR
              </button>
            </div>
          </div>

          {approveForm.estado === 'RECHAZADO' && (
            <div>
              <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4 text-rose-500">Motivo del Rechazo</label>
              <textarea 
                className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 border-rose-200 focus:ring-rose-500`}
                placeholder="Indique por qué se rechaza este caso especial..."
                value={approveForm.motivo_rechazo}
                onChange={(e) => setApproveForm({...approveForm, motivo_rechazo: e.target.value})}
              />
            </div>
          )}
        </div>
      </SIATCModalWrapper>
    </div>
  );
};
