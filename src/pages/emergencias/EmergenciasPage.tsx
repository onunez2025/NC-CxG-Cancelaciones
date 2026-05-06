import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  Plus,
  Calendar,
  CheckCircle2,
  Eye,
  UserPlus,
  ClipboardCheck,
  Settings,
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Package,
  Wrench
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
import { emergenciasService } from '../../services/emergenciasService';
import { type Emergency, type EmergencyMotive, type EmergencySparePart } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useTranslation } from 'react-i18next';

export const EmergenciasPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [data, setData] = useState<Emergency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [isProcessOpen, setIsProcessOpen] = useState(false);
  const [isSparePartsOpen, setIsSparePartsOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [selectedEmergency, setSelectedEmergency] = useState<Emergency | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Catalogs
  const [verificationCatalogs, setVerificationCatalogs] = useState<{ statuses: any[], motives: EmergencyMotive[] }>({ statuses: [], motives: [] });
  const [processingCatalogs, setProcessingCatalogs] = useState<{ statuses: any[], motives: EmergencyMotive[] }>({ statuses: [], motives: [] });
  
  // Form States
  const [registerForm, setRegisterForm] = useState({
    ticket: '', tipo: '', producto: '', asesor_cc: '', cliente: '',
    telefono_1: '', telefono_2: '', direccion: '', direccion_referencia: '',
    observacion: ''
  });
  
  const [assignForm, setAssignForm] = useState({ tecnico: '' });
  const [verifyForm, setVerifyForm] = useState({ verificacion: '', motivo: '' });
  const [processForm, setProcessForm] = useState({ procesado: '', motivo: '' });
  const [sparePartForm, setSparePartForm] = useState({ material_id: '', cantidad: 1 });
  const [spareParts, setSpareParts] = useState<EmergencySparePart[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await emergenciasService.getEmergencies(currentPage, pageSize, searchTerm);
      setData(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCatalogs = async () => {
    try {
      const [verif, proc] = await Promise.all([
        emergenciasService.getVerificationCatalogs(),
        emergenciasService.getProcessingCatalogs()
      ]);
      setVerificationCatalogs(verif);
      setProcessingCatalogs(proc);
    } catch (error) {
      console.error('Error fetching catalogs:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const handleRegister = async () => {
    setIsSubmitting(true);
    try {
      await emergenciasService.createEmergency({
        ...registerForm,
        creado_por: user?.username || 'Sistema'
      });
      setIsRegisterOpen(false);
      fetchData();
      setRegisterForm({
        ticket: '', tipo: '', producto: '', asesor_cc: '', cliente: '',
        telefono_1: '', telefono_2: '', direccion: '', direccion_referencia: '',
        observacion: ''
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedEmergency) return;
    setIsSubmitting(true);
    try {
      await emergenciasService.assignTechnician(selectedEmergency.id, assignForm.tecnico);
      setIsAssignOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (!selectedEmergency) return;
    setIsSubmitting(true);
    try {
      await emergenciasService.verifyEmergency(selectedEmergency.id, {
        ...verifyForm,
        usuario: user?.username || 'Sistema'
      });
      setIsVerifyOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedEmergency) return;
    setIsSubmitting(true);
    try {
      await emergenciasService.processEmergency(selectedEmergency.id, {
        ...processForm,
        usuario: user?.username || 'Sistema'
      });
      setIsProcessOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSparePart = async () => {
    if (!selectedEmergency) return;
    setIsSubmitting(true);
    try {
      await emergenciasService.addSparePart(selectedEmergency.id, sparePartForm.material_id, sparePartForm.cantidad);
      const updatedParts = await emergenciasService.getSpareParts(selectedEmergency.id);
      setSpareParts(updatedParts);
      setSparePartForm({ material_id: '', cantidad: 1 });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSpareParts = async (emergency: Emergency) => {
    setSelectedEmergency(emergency);
    try {
      const parts = await emergenciasService.getSpareParts(emergency.id);
      setSpareParts(parts);
      setIsSparePartsOpen(true);
    } catch (error) {
      console.error(error);
    }
  };

  const hasPermission = (perm: string) => {
    return user?.permissions?.includes(perm as any) || false;
  };

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>{t('emergencias.title')}</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>{t('emergencias.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <SIATCButton variant="secondary" icon={RefreshCw} onClick={fetchData} isLoading={isLoading}>
            {t('common.sync')}
          </SIATCButton>
            {hasPermission('cxg.emergencias.create') && (
              <SIATCButton 
                variant="primary" 
                icon={Plus} 
                onClick={() => setIsRegisterOpen(true)}
              >
                {t('emergencias.new')}
              </SIATCButton>
            )}
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Search & Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder={t('emergencias.search_placeholder')}
              className={`${SIATC_THEME.COMPONENTS.INPUT} pl-10`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table Area */}
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">{t('common.loading')}</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  <SIATCTableHeader>{t('emergencias.table.ticket')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.tipo')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.cliente')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.tecnico')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.verificacion')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.procesado')}</SIATCTableHeader>
                  <SIATCTableHeader>{t('emergencias.table.fecha')}</SIATCTableHeader>
                  <SIATCTableHeader className="text-right">{t('common.actions')}</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <SIATCTableRow key={item.id}>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant="info">{item.tipo}</SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="font-bold text-foreground">{item.cliente}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {item.telefono_1}
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      {item.tecnico_asignado ? (
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-semibold">{item.tecnico_asignado}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No asignado</span>
                      )}
                    </SIATCTableCell>
                    <SIATCTableCell>
                      {item.verificacion ? (
                        <SIATCBadge variant="success">{item.verificacion}</SIATCBadge>
                      ) : (
                        <SIATCBadge variant="warning">Pendiente</SIATCBadge>
                      )}
                    </SIATCTableCell>
                    <SIATCTableCell>
                      {item.procesado ? (
                        <SIATCBadge variant="success">{item.procesado}</SIATCBadge>
                      ) : (
                        <SIATCBadge variant="warning">Pendiente</SIATCBadge>
                      )}
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-xs">{new Date(item.creado_el).toLocaleDateString()}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <SIATCActionDropdown 
                        actions={[
                          {
                            label: t('common.view_details'),
                            icon: Eye,
                            onClick: () => { setSelectedEmergency(item); setIsDetailOpen(true); }
                          },
                          ...(hasPermission('cxg.emergencias.create') ? [{
                            label: t('emergencias.modals.assign_tech'),
                            icon: UserPlus,
                            onClick: () => { setSelectedEmergency(item); setAssignForm({ tecnico: item.tecnico_asignado || '' }); setIsAssignOpen(true); }
                          }] : []),
                          ...(hasPermission('cxg.emergencias.verify') && item.tecnico_asignado ? [{
                            label: t('emergencias.modals.verify'),
                            icon: ClipboardCheck,
                            onClick: () => { setSelectedEmergency(item); setIsVerifyOpen(true); }
                          }] : []),
                          ...(hasPermission('cxg.emergencias.verify') ? [{
                            label: t('emergencias.modals.spare_parts'),
                            icon: Package,
                            onClick: () => openSpareParts(item)
                          }] : []),
                          ...(hasPermission('cxg.emergencias.process') && item.verificacion ? [{
                            label: t('emergencias.modals.process'),
                            icon: CheckCircle2,
                            onClick: () => { setSelectedEmergency(item); setIsProcessOpen(true); }
                          }] : [])
                        ]}
                      />
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
      {/* MODALS */}
      {/* ─────────────────────────────────────────── */}

      {/* Register Modal */}
      <SIATCModalWrapper
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title={t('emergencias.modals.register')}
        footer={
          <div className="flex gap-2">
            <SIATCButton variant="ghost" onClick={() => setIsRegisterOpen(false)}>{t('common.cancel')}</SIATCButton>
            <SIATCButton variant="primary" onClick={handleRegister} isLoading={isSubmitting}>{t('common.save')}</SIATCButton>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.ticket')}</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.ticket}
              onChange={(e) => setRegisterForm({...registerForm, ticket: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.tipo')}</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.tipo}
              onChange={(e) => setRegisterForm({...registerForm, tipo: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.producto')}</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.producto}
              onChange={(e) => setRegisterForm({...registerForm, producto: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.cliente')}</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.cliente}
              onChange={(e) => setRegisterForm({...registerForm, cliente: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.telefono')} 1</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.telefono_1}
              onChange={(e) => setRegisterForm({...registerForm, telefono_1: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.telefono')} 2</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.telefono_2}
              onChange={(e) => setRegisterForm({...registerForm, telefono_2: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.direccion')}</label>
            <input 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={registerForm.direccion}
              onChange={(e) => setRegisterForm({...registerForm, direccion: e.target.value})}
            />
          </div>
          <div className="col-span-2">
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.observacion')}</label>
            <textarea 
              className={`${SIATC_THEME.COMPONENTS.INPUT} h-20 pt-2`}
              value={registerForm.observacion}
              onChange={(e) => setRegisterForm({...registerForm, observacion: e.target.value})}
            />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Assign Tech Modal */}
      <SIATCModalWrapper
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={t('emergencias.modals.assign_tech')}
        footer={
          <div className="flex gap-2">
            <SIATCButton variant="ghost" onClick={() => setIsAssignOpen(false)}>{t('common.cancel')}</SIATCButton>
            <SIATCButton variant="primary" onClick={handleAssign} isLoading={isSubmitting}>{t('common.save')}</SIATCButton>
          </div>
        }
      >
        <div>
          <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.table.tecnico')}</label>
          <input 
            className={SIATC_THEME.COMPONENTS.INPUT}
            value={assignForm.tecnico}
            onChange={(e) => setAssignForm({tecnico: e.target.value})}
            placeholder="Nombre del técnico..."
          />
        </div>
      </SIATCModalWrapper>

      {/* Verify Modal */}
      <SIATCModalWrapper
        isOpen={isVerifyOpen}
        onClose={() => setIsVerifyOpen(false)}
        title={t('emergencias.modals.verify')}
        footer={
          <div className="flex gap-2">
            <SIATCButton variant="ghost" onClick={() => setIsVerifyOpen(false)}>{t('common.cancel')}</SIATCButton>
            <SIATCButton variant="primary" onClick={handleVerify} isLoading={isSubmitting}>{t('common.save')}</SIATCButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('common.status')}</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={verifyForm.verificacion}
              onChange={(e) => setVerifyForm({...verifyForm, verificacion: e.target.value, motivo: ''})}
            >
              <option value="">Seleccione estado...</option>
              {verificationCatalogs.statuses.map(s => (
                <option key={s.id} value={s.label}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.motivo')}</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={verifyForm.motivo}
              onChange={(e) => setVerifyForm({...verifyForm, motivo: e.target.value})}
              disabled={!verifyForm.verificacion}
            >
              <option value="">Seleccione motivo...</option>
              {verificationCatalogs.motives
                .filter(m => m.ref_id === verificationCatalogs.statuses.find(s => s.label === verifyForm.verificacion)?.id)
                .map(m => (
                  <option key={m.id} value={m.motivo}>{m.motivo}</option>
                ))}
            </select>
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Spare Parts Modal */}
      <SIATCModalWrapper
        isOpen={isSparePartsOpen}
        onClose={() => setIsSparePartsOpen(false)}
        title={t('emergencias.modals.spare_parts')}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3 items-end p-4 bg-muted/30 rounded-xl border border-border/50">
            <div className="col-span-2">
              <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.material')}</label>
              <input 
                className={SIATC_THEME.COMPONENTS.INPUT}
                value={sparePartForm.material_id}
                onChange={(e) => setSparePartForm({...sparePartForm, material_id: e.target.value})}
                placeholder="ID de Material"
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.cantidad')}</label>
              <div className="flex gap-2">
                <input 
                  type="number"
                  className={SIATC_THEME.COMPONENTS.INPUT}
                  value={sparePartForm.cantidad}
                  onChange={(e) => setSparePartForm({...sparePartForm, cantidad: parseInt(e.target.value)})}
                />
                <SIATCButton variant="primary" onClick={handleAddSparePart} isLoading={isSubmitting} icon={Plus} />
              </div>
            </div>
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-black uppercase text-[10px] text-muted-foreground">Material</th>
                  <th className="px-4 py-2 text-center font-black uppercase text-[10px] text-muted-foreground">Cant.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {spareParts.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground italic">No hay repuestos solicitados</td>
                  </tr>
                ) : (
                  spareParts.map((part) => (
                    <tr key={part.id}>
                      <td className="px-4 py-2 font-medium">{part.material_nombre || part.material_id}</td>
                      <td className="px-4 py-2 text-center font-bold">{part.cantidad}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Process Modal */}
      <SIATCModalWrapper
        isOpen={isProcessOpen}
        onClose={() => setIsProcessOpen(false)}
        title={t('emergencias.modals.process')}
        footer={
          <div className="flex gap-2">
            <SIATCButton variant="ghost" onClick={() => setIsProcessOpen(false)}>{t('common.cancel')}</SIATCButton>
            <SIATCButton variant="primary" onClick={handleProcess} isLoading={isSubmitting}>{t('common.save')}</SIATCButton>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('common.status')}</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={processForm.procesado}
              onChange={(e) => setProcessForm({...processForm, procesado: e.target.value, motivo: ''})}
            >
              <option value="">Seleccione estado...</option>
              {processingCatalogs.statuses.map(s => (
                <option key={s.id} value={s.label}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1 block pl-4">{t('emergencias.fields.motivo')}</label>
            <select 
              className={SIATC_THEME.COMPONENTS.INPUT}
              value={processForm.motivo}
              onChange={(e) => setProcessForm({...processForm, motivo: e.target.value})}
              disabled={!processForm.procesado}
            >
              <option value="">Seleccione motivo...</option>
              {processingCatalogs.motives
                .filter(m => m.ref_id === processingCatalogs.statuses.find(s => s.label === processForm.procesado)?.id)
                .map(m => (
                  <option key={m.id} value={m.motivo}>{m.motivo}</option>
                ))}
            </select>
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Detail Modal */}
      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalle de Emergencia"
        size="xl"
      >
        {selectedEmergency && (
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2 p-4 bg-primary/5 rounded-2xl border border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-primary/60 tracking-widest block">TICKET REFERENCIA</span>
                <span className="text-2xl font-black text-primary">#{selectedEmergency.ticket}</span>
              </div>
              <SIATCBadge variant={selectedEmergency.procesado ? 'success' : 'warning'} className="h-8 px-4 text-xs">
                {selectedEmergency.procesado || 'EN PROCESO'}
              </SIATCBadge>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><Clock className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-muted-foreground block">REGISTRO</span>
                  <span className="text-xs font-bold">{new Date(selectedEmergency.creado_el).toLocaleString()}</span>
                  <p className="text-[10px] text-muted-foreground">por {selectedEmergency.creado_por}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><MapPin className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-muted-foreground block">DIRECCIÓN</span>
                  <span className="text-xs font-bold">{selectedEmergency.direccion}</span>
                  {selectedEmergency.direccion_referencia && (
                    <p className="text-[10px] text-muted-foreground">{selectedEmergency.direccion_referencia}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><Settings className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-muted-foreground block">PRODUCTO / TIPO</span>
                  <span className="text-xs font-bold">{selectedEmergency.producto}</span>
                  <p className="text-[10px] text-muted-foreground">{selectedEmergency.tipo}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-muted rounded-lg"><AlertTriangle className="w-4 h-4 text-muted-foreground" /></div>
                <div>
                  <span className="text-[10px] font-black uppercase text-muted-foreground block">VERIFICACIÓN</span>
                  <span className="text-xs font-bold">{selectedEmergency.verificacion || 'Pendiente'}</span>
                  {selectedEmergency.verificacion_motivo && (
                    <p className="text-[10px] text-muted-foreground">{selectedEmergency.verificacion_motivo}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-2 pt-4 border-t border-border">
              <span className="text-[10px] font-black uppercase text-muted-foreground block mb-2">OBSERVACIONES DE CAMPO</span>
              <div className="p-4 bg-muted/20 rounded-xl italic text-sm text-foreground/80">
                {selectedEmergency.observacion || 'Sin observaciones registradas.'}
              </div>
            </div>
          </div>
        )}
      </SIATCModalWrapper>
    </div>
  );
};
