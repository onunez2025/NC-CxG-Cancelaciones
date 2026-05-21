import React from 'react';
import { Loader2, DollarSign, ShieldCheck, UserPlus, ClipboardCheck, CheckCircle2, XCircle, Clock, Search, ArrowLeft, MessageSquare } from 'lucide-react';
import { SIATCBadge } from '../../../components/siatc/SIATCBadge';
import { SIATCButton } from '../../../components/siatc/SIATCButton';
import type { CxGNC, HistorialEntry } from '../../../services/ncService';

interface CxGNCDetailViewProps {
  detailData: CxGNC;
  detailHistorial: HistorialEntry[];
  isLoadingDetail: boolean;
  onBack: () => void;
}

export const CxGNCDetailView: React.FC<CxGNCDetailViewProps> = ({ detailData, detailHistorial, isLoadingDetail, onBack }) => {
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
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <SIATCButton variant="ghost" size="sm" icon={ArrowLeft} onClick={onBack}>
          Volver
        </SIATCButton>
        <div>
          <h2 className="text-lg font-black text-foreground">{detailData.tipo} #{detailData.correlativo}</h2>
          <p className="text-xs text-muted-foreground">{detailData.cliente}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Process Timeline Steps */}
        <div className="grid grid-cols-5 gap-2 px-2 max-w-4xl mx-auto w-full">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto w-full">
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

            {/* FSM Ticket Context */}
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800">
              <h3 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" /> Contexto del Ticket FSM
              </h3>
              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-amber-600/70 uppercase">Cliente Original</span>
                  <span className="text-sm font-black text-amber-900 dark:text-amber-200">{detailData.fsm_cliente || detailData.cliente || 'No disponible'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-amber-600/70 uppercase">Lugar de Compra</span>
                  <span className="text-sm font-bold text-amber-800 dark:text-amber-300 italic">{detailData.lugar_compra || detailData.fsm_lugar_compra || 'No identificado'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-amber-600/70 uppercase">Supervisor FSM</span>
                  <span className="text-sm font-black text-amber-900 dark:text-amber-100">{detailData.supervisor_fsm || detailData.supervisor_asignado || 'No asignado'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-amber-600/70 uppercase">Motivo de Elevación</span>
                  <p className="text-sm text-amber-800/80 dark:text-amber-400/80 leading-tight italic">{detailData.motivo_elevacion || detailData.fsm_motivo_elevacion || 'Sin comentarios'}</p>
                </div>
              </div>
            </div>
            
            {/* Motivo Real Alert */}
            {detailData.vali_motivo_real && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                <div className="text-[10px] font-black uppercase text-rose-600 mb-1">⚠ Motivo Real Detectado</div>
                <p className="text-base font-bold text-rose-700 dark:text-rose-400">{detailData.vali_motivo_real}</p>
              </div>
            )}
          </div>

          {/* Right column: Dynamic History Timeline */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 h-full">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary mb-4">
                Historial de Acciones ({detailHistorial.length})
              </h3>
              
              {detailHistorial.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground italic">Sin registros de historial</p>
                </div>
              ) : (
                <div className="relative space-y-0">
                  {/* Timeline line */}
                  <div className="absolute left-[19px] top-4 bottom-4 w-[2px] bg-border/50" />
                  
                  {detailHistorial.map((entry, idx) => {
                    const Icon = getHistoryIcon(entry.tipo);
                    const colorClass = getHistoryColor(entry.tipo);
                    
                    return (
                      <div key={entry.id || idx} className="relative pl-12 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div className={`absolute left-[7px] top-1 w-[26px] h-[26px] rounded-full border-2 flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        
                        <div className="bg-white dark:bg-slate-900 border border-border/50 rounded-lg p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${colorClass}`}>
                              {entry.tipo}
                            </span>
                            <span className="text-[10px] text-muted-foreground italic">
                              {entry.fecha ? new Date(entry.fecha).toLocaleString() : ''}
                            </span>
                          </div>
                          {entry.usuario && (
                            <div className="text-xs font-bold text-foreground mb-1">
                              {entry.usuario}
                            </div>
                          )}
                          {entry.observacion && (
                            <p className="text-xs text-muted-foreground leading-relaxed">
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
      </div>
    </div>
  );
};
