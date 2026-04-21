import { useState, useEffect } from 'react';
import { 
  Plus,
  Search, 
  RefreshCw, 
  CheckCircle2,
  XCircle,
  MoreVertical,
  Calendar,
  Loader2,
  FileSpreadsheet
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
import type { Cancellation } from '../../services/ncService';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';

export const CancellationsPage = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDIENTE' | 'PROCESADO'>('TODOS');
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);
  
  // Registration state
  const [formData, setFormData] = useState({
    tienda: '',
    ticket: '',
    motivo: '',
    observacion: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await ncService.getCancellations({ 
        page: currentPage, 
        pageSize, 
        search: searchTerm 
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
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm]);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      await ncService.createCancellation({
        cliente: formData.tienda,
        motive: formData.motivo,
        estado: 'PENDIENTE',
        ticket: formData.ticket,
        observacion: formData.observacion
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
      setFormData({ 
        tienda: '', 
        ticket: '', 
        motivo: '', 
        observacion: '' 
      });
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
        tienda: ticketInfo.cliente,
        observacion: `Producto: ${ticketInfo.producto}\nAsunto: ${ticketInfo.asunto}\n${prev.observacion}`
      }));
    } catch (error: any) {
      console.error("Lookup error:", error);
      // Optional: highlight field or show toast
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await ncService.approveCancellation(id);
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'APPROVE',
        Entidad: 'CANCELACIONES',
        EntidadID: id,
        Detalle: `Cancelación aprobada por ${user?.username}`
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await ncService.rejectCancellation(id);
      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'REJECT',
        Entidad: 'CANCELACIONES',
        EntidadID: id,
        Detalle: `Cancelación rechazada por ${user?.username}`
      });
      fetchData();
    } catch (error) {
      console.error(error);
    }
  };

  // No longer needed due to server-side filtering
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
              const headers = ['ID SOLICITUD', 'CLIENTE / SEDE', 'MOTIVO', 'FECHA', 'ESTADO'];
              const csvContent = [
                headers.join(','),
                ...displayedCancellations.map(item => [
                  item.correlativo,
                  `"${item.cliente}"`,
                  `"${item.motive}"`,
                  new Date(item.fecha_solicitud).toLocaleDateString(),
                  item.estado
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
          <SIATCButton 
            variant="primary" 
            icon={Plus}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Nueva Cancelación
          </SIATCButton>
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar por ID, cliente o motivo..."
              className={SIATC_THEME.COMPONENTS.INPUT}
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
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="TODOS">TODOS LOS ESTADOS</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="PROCESADO">PROCESADO</option>
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
                  <SIATCTableHeader>ID SOLICITUD</SIATCTableHeader>
                  <SIATCTableHeader>CLIENTE / SEDE</SIATCTableHeader>
                  <SIATCTableHeader>MOTIVO</SIATCTableHeader>
                  <SIATCTableHeader>FECHA</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO</SIATCTableHeader>
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {displayedCancellations.map((item) => (
                  <SIATCTableRow key={item.id}>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.correlativo}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="font-bold text-foreground italic">{item.cliente}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <span className="text-muted-foreground">{item.motive}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{new Date(item.fecha_solicitud).toLocaleDateString()}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge 
                        variant={item.estado === 'APROBADO' ? 'success' : item.estado === 'PENDIENTE' ? 'warning' : 'danger'}
                      >
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {item.estado === 'PENDIENTE' && (
                          <>
                            <SIATCButton 
                              variant="ghost" 
                              size="sm" 
                              icon={CheckCircle2} 
                              className="text-emerald-500 hover:bg-emerald-50"
                              onClick={() => handleApprove(item.id)}
                            />
                            <SIATCButton 
                              variant="ghost" 
                              size="sm" 
                              icon={XCircle} 
                              className="text-rose-500 hover:bg-rose-50"
                              onClick={() => handleReject(item.id)}
                            />
                          </>
                        )}
                        <SIATCButton variant="ghost" size="sm" icon={MoreVertical} />
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

      {/* Modal Nueva Cancelación */}
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
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Cliente / Tienda</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={formData.tienda}
              onChange={(e) => setFormData({...formData, tienda: e.target.value})}
              placeholder="Nombre del cliente o tienda"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Ticket de Referencia (Opcional)</label>
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
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo</label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-3 resize-none`}
              value={formData.motivo}
              onChange={(e) => setFormData({...formData, motivo: e.target.value})}
              placeholder="Detalle el motivo de la cancelación..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Observaciones</label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-20 pt-2 resize-none`}
              value={formData.observacion}
              onChange={(e) => setFormData({...formData, observacion: e.target.value})}
              placeholder="Detalles adicionales opcionales..."
            />
          </div>
        </div>
      </SIATCModalWrapper>
    </div>
  );
};

export default CancellationsPage;
