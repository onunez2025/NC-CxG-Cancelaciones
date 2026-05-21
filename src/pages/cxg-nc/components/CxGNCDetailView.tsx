import React, { useState, useEffect } from 'react';
import { Loader2, DollarSign, ShieldCheck, UserPlus, CheckCircle2, ArrowLeft, Wrench, XCircle } from 'lucide-react';
import { SIATCBadge } from '../../../components/siatc/SIATCBadge';
import { SIATCButton } from '../../../components/siatc/SIATCButton';
import { ncService, type CxGNC, type EquipmentHistoryEntry } from '../../../services/ncService';

interface CxGNCDetailViewProps {
  detailData: CxGNC;

  isLoadingDetail: boolean;
  onBack: () => void;
  actions?: {
    canApprove?: boolean;
    onApprove?: () => void;
    canAssign?: boolean;
    onAssign?: () => void;
    canManage?: boolean;
    onManage?: () => void;
  };
}

export const CxGNCDetailView: React.FC<CxGNCDetailViewProps> = ({ detailData, isLoadingDetail, onBack, actions }) => {
  const [equipmentHistory, setEquipmentHistory] = useState<EquipmentHistoryEntry[]>([]);
  const [isLoadingEquipment, setIsLoadingEquipment] = useState(false);

  useEffect(() => {
    const fetchEquipmentHistory = async () => {
      if (!detailData?.ticket) return;
      setIsLoadingEquipment(true);
      try {
        const history = await ncService.getEquipmentHistory(detailData.ticket);
        setEquipmentHistory(history);
      } catch (error) {
        console.error('Error fetching equipment history:', error);
      } finally {
        setIsLoadingEquipment(false);
      }
    };
    if (detailData && !isLoadingDetail) {
      fetchEquipmentHistory();
    }
  }, [detailData?.ticket, isLoadingDetail]);

  if (isLoadingDetail) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 w-full">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground font-bold">Cargando información...</p>
      </div>
    );
  }

  if (!detailData) {
     return (
      <div className="h-64 flex flex-col items-center justify-center gap-3 w-full">
         <p className="text-sm text-muted-foreground font-bold">No se pudo cargar el detalle.</p>
         <SIATCButton variant="secondary" onClick={onBack}>Volver a la tabla</SIATCButton>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <SIATCButton variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
          Volver
        </SIATCButton>
        <div>
          <h2 className="text-lg font-black text-foreground">{detailData.tipo} #{detailData.correlativo}</h2>
          <p className="text-xs text-muted-foreground">{detailData.cliente}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {actions?.canApprove && (
            <SIATCButton variant="info" size="sm" icon={ShieldCheck} onClick={actions.onApprove}>
              Evaluar Solicitud
            </SIATCButton>
          )}
          {actions?.canAssign && (
            <SIATCButton variant="primary" size="sm" icon={UserPlus} onClick={actions.onAssign}>
              Asignar Analista
            </SIATCButton>
          )}
          {actions?.canManage && (
            <SIATCButton variant="success" size="sm" icon={CheckCircle2} onClick={actions.onManage}>
              Gestionar Solicitud
            </SIATCButton>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Process Timeline Steps */}
        <div className="grid grid-cols-4 gap-2 px-2 max-w-3xl mx-auto w-full">
          {[
            { key: 'REGISTRADO', label: 'Registro', icon: DollarSign },
            { key: 'APROBADO_SUP', label: 'Aprobación', icon: ShieldCheck },
            { key: 'ASIGNADO', label: 'Asignación', icon: UserPlus },
            { key: 'CERRADO', label: 'Cierre', icon: CheckCircle2 }
          ].map((step, idx) => {
            const stepOrder = ['REGISTRADO', 'APROBADO_SUP', 'ASIGNADO', 'CERRADO'];
            const currentIdx = stepOrder.indexOf(detailData.estado === 'RECHAZADO' ? 'REGISTRADO' : detailData.estado);
            const isCompleted = currentIdx >= idx;
            const isActive = currentIdx === idx;
            const isRejected = detailData.estado === 'RECHAZADO' && idx === 1;

            return (
              <div key={step.key} className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isRejected ? 'bg-rose-500 border-rose-500 text-white' :
                  isCompleted ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 
                  'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                } ${isActive ? 'ring-4 ring-primary/10 scale-110' : ''}`}>
                  {isRejected ? <XCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-tighter text-center leading-none ${
                    isRejected ? 'text-rose-500' :
                    isCompleted ? 'text-primary' : 'text-slate-400'
                }`}>
                  {isRejected ? 'Rechazado' : (step.key === 'APROBADO_SUP' && detailData.estado === 'APROBADO_SUP' ? 'Pendiente ST' : step.label)}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto w-full">
          {/* Left column: Registration & Audit */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Datos del Registro</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Tipo</span>
                  <SIATCBadge variant={detailData.tipo === 'NC' ? 'warning' : 'info'}>{detailData.tipo}</SIATCBadge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Ticket Referencia</span>
                  <span className="text-sm font-black">#{detailData.ticket}</span>
                </div>
                {detailData.codigo_producto && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Cód. Producto</span>
                    <span className="text-sm font-mono text-muted-foreground">{detailData.codigo_producto}</span>
                  </div>
                )}
                {detailData.producto && (
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Producto</span>
                    <span className="text-sm font-semibold text-right max-w-[200px]">{detailData.producto}</span>
                  </div>
                )}
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Cliente</span>
                  <span className="text-sm font-bold text-right italic">{detailData.cliente}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Registrado por</span>
                  <span className="text-sm font-semibold">{detailData.creado_por || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Fecha Registro</span>
                  <span className="text-sm">{new Date(detailData.fecha).toLocaleString()}</span>
                </div>
                {detailData.ticket_desinstalacion && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Ticket Desinstalación</span>
                    <span className="text-sm font-black text-amber-600">#{detailData.ticket_desinstalacion}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Evaluation Data (Aprobación/Rechazo) */}
            {(detailData.aprobado === 'true' || detailData.aprobado === 'false') && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Datos de Evaluación</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Resultado</span>
                    <SIATCBadge variant={detailData.aprobado === 'true' ? 'success' : 'error'}>
                      {detailData.aprobado === 'true' ? 'APROBADO' : 'RECHAZADO'}
                    </SIATCBadge>
                  </div>
                  {detailData.aprobado_motivo && (
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Motivo</span>
                      <span className="text-sm font-semibold text-right max-w-[200px]">{detailData.aprobado_motivo}</span>
                    </div>
                  )}
                  {detailData.aprobado_observacion && (
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Observación</span>
                      <span className="text-sm text-right max-w-[250px] italic">{detailData.aprobado_observacion}</span>
                    </div>
                  )}
                  {detailData.aprobado_por && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Evaluado por</span>
                      <span className="text-sm font-semibold">{detailData.aprobado_por}</span>
                    </div>
                  )}
                  {detailData.aprobado_el && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Fecha Evaluación</span>
                      <span className="text-sm">{new Date(detailData.aprobado_el).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gestion Data (Procesado) */}
            {(detailData.procesado === 'true' || detailData.procesado === 'false') && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">Datos de Gestión</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-muted-foreground uppercase">Resultado</span>
                    <SIATCBadge variant={detailData.procesado === 'true' ? 'success' : 'error'}>
                      {detailData.procesado === 'true' ? 'GESTIONADO' : 'RECHAZADO (GESTIÓN)'}
                    </SIATCBadge>
                  </div>
                  {detailData.procesado_motivo && (
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Motivo</span>
                      <span className="text-sm font-semibold text-right max-w-[200px]">{detailData.procesado_motivo}</span>
                    </div>
                  )}
                  {detailData.procesado_observacion && (
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Observación</span>
                      <span className="text-sm text-right max-w-[250px] italic">{detailData.procesado_observacion}</span>
                    </div>
                  )}
                  {detailData.procesado_por && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Gestionado por</span>
                      <span className="text-sm font-semibold">{detailData.procesado_por}</span>
                    </div>
                  )}
                  {detailData.procesado_el && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-muted-foreground uppercase">Fecha Gestión</span>
                      <span className="text-sm">{new Date(detailData.procesado_el).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Equipment History */}
            <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-700 dark:text-cyan-400 mb-4 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Historial del Equipo
              </h3>
              {isLoadingEquipment ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-cyan-600 animate-spin" />
                </div>
              ) : equipmentHistory.length === 0 ? (
                <p className="text-xs text-cyan-800/60 italic text-center py-2">No hay historial registrado o no se pudo cargar.</p>
              ) : (
                <div className="space-y-4">
                  {equipmentHistory.map((eq, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-cyan-200 dark:border-cyan-800/50 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-[10px] font-bold text-cyan-600 uppercase bg-cyan-100 dark:bg-cyan-900 px-2 py-0.5 rounded mr-2">
                            Ticket: {eq.ticket}
                          </span>
                          <span className="text-xs font-semibold">{eq.tipo_servicio || 'Servicio'}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {eq.fecha_visita ? new Date(eq.fecha_visita).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="text-muted-foreground uppercase font-bold">Técnico</span>
                          <span className="font-semibold text-cyan-900 dark:text-cyan-100 truncate" title={eq.tecnico}>{eq.tecnico || 'No asignado'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground uppercase font-bold">Estado</span>
                          <span className="font-semibold text-cyan-900 dark:text-cyan-100">{eq.estado || '-'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-muted-foreground uppercase font-bold">Visita Realizada</span>
                          <span className="font-semibold text-cyan-900 dark:text-cyan-100">{String(eq.visita_realizada) === 'true' ? 'Sí' : 'No'}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-muted-foreground uppercase font-bold">Trabajo Realizado</span>
                          <span className="font-semibold text-cyan-900 dark:text-cyan-100">{String(eq.trabajo_realizado) === 'true' ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                      {eq.comentario && (
                        <div className="mt-2 p-2 bg-cyan-50/50 dark:bg-cyan-950/30 rounded border border-cyan-100 dark:border-cyan-900/50">
                          <p className="text-xs text-cyan-800 dark:text-cyan-300 italic leading-relaxed">
                            "{eq.comentario}"
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
};
