import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  FileText,
  Loader2,
  FileSpreadsheet,
  UserPlus
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
import { userService } from '../../services/userService';
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
        const users = await userService.getUsers();
        setAnalysts(users.filter(u => u.is_active));
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
        ticket: formData.ticket,
        observacion: formData.observacion
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
    if (!selectedRecord) return;
    setIsSubmitting(true);
    try {
      await ncService.gestionarCxGNC(selectedRecord.id, {
        observacion: gestiónObs,
        gestionado_por: user?.full_name || user?.username || 'Unknown'
      });

      await auditService.logAction({
        UsuarioID: user?.id || '0',
        UsuarioNombre: user?.username || 'Sistema',
        Accion: 'PROCESS',
        Entidad: 'CXG_NC',
        EntidadID: selectedRecord.id,
        Detalle: `Solicitud ${selectedRecord.correlativo} procesada en SAP/Sistema`
      });

      setIsGestionModalOpen(false);
      setGestiónObs('');
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
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
                <option value="PENDIENTE">PENDIENTE por Asignar</option>
                <option value="EN GESTIÓN">EN GESTIÓN (Analista)</option>
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
                        item.estado === 'PROCESADO' ? 'success' : 
                        item.estado === 'EN GESTIÓN' ? 'info' : 
                        'warning'
                      }>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <div className="flex justify-end">
                        <SIATCActionDropdown 
                          actions={[
                            {
                              label: 'Asignar Analista',
                              icon: UserPlus,
                              onClick: () => {
                                setSelectedRecord(item);
                                setIsAssignModalOpen(true);
                              },
                              show: item.estado === 'PENDIENTE' && hasPermission('cxg.cxg_nc.assign')
                            },
                            {
                              label: 'Gestionar Solicitud',
                              icon: CheckCircle2,
                              onClick: () => {
                                setSelectedRecord(item);
                                setIsGestionModalOpen(true);
                              },
                              show: item.estado === 'EN GESTIÓN' && hasPermission('cxg.cxg_nc.gestionar')
                            },
                            {
                              label: 'Ver Detalle',
                              icon: FileText,
                              onClick: () => {}
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

      {/* Gestionar Modal */}
      <SIATCModalWrapper
        isOpen={isGestionModalOpen}
        onClose={() => setIsGestionModalOpen(false)}
        title="Gestionar Solicitud CxG / NC"
        subtitle={`Finalice el procesamiento de este documento.`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsGestionModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleGestionar} isLoading={isSubmitting}>Marcar como Procesado</SIATCButton>
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
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Observaciones Finales</label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder="Detalle el resultado del proceso (ej: N° de Nota SAP, corrección aplicada...)"
              value={gestiónObs}
              onChange={(e) => setGestiónObs(e.target.value)}
            />
          </div>
        </div>
      </SIATCModalWrapper>
    </div>
  );
};

export default CxGNCPage;
