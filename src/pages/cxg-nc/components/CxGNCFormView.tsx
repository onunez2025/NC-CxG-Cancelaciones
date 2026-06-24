import React from 'react';
import { Loader2, Search, AlertTriangle } from 'lucide-react';
import { SIATC_THEME } from '../../../utils/siatc-theme';
import { SIATCButton } from '../../../components/siatc/SIATCButton';
import type { CxGNC } from '../../../services/ncService';

const ESTADO_CONFIG: Record<string, { label: string; className: string }> = {
  REGISTRADO:   { label: 'Pendiente de aprobación',          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  APROBADO_SUP: { label: 'Aprobada — pendiente de asignación', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  ASIGNADO:     { label: 'Asignada a analista',               className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
};

interface CxGNCFormViewProps {
  formData: Partial<CxGNC>;
  setFormData: (data: Partial<CxGNC>) => void;
  isSubmitting: boolean;
  isLookingUp: boolean;
  isTicketValidated: boolean;
  setIsTicketValidated: (val: boolean) => void;
  existingTicketRequests: CxGNC[];
  setExistingTicketRequests: (r: CxGNC[]) => void;
  handleLookupTicket: () => void;
  handleCreate: () => void;
  onCancel: () => void;
}

export const CxGNCFormView: React.FC<CxGNCFormViewProps> = ({
  formData,
  setFormData,
  isSubmitting,
  isLookingUp,
  isTicketValidated,
  setIsTicketValidated,
  existingTicketRequests,
  setExistingTicketRequests,
  handleLookupTicket,
  handleCreate,
  onCancel
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card sticky top-0 z-10">
        <h2 className="text-lg font-black text-foreground flex-1">Nueva Solicitud Cambio por Garantía / NC</h2>
        <SIATCButton variant="ghost" onClick={onCancel}>Cancelar</SIATCButton>
        <SIATCButton variant="primary" onClick={handleCreate} isLoading={isSubmitting} disabled={!isTicketValidated}>Registrar Solicitud</SIATCButton>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-6">
            <div>
              <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Tipo de Solicitud</label>
              <select
                className={`${SIATC_THEME.COMPONENTS.INPUT} h-12 text-sm`}
                value={formData.tipo}
                onChange={(e) => setFormData({...formData, tipo: e.target.value as 'NC' | 'CXG'})}
              >
                <option value="CXG">Cambio por garantía</option>
                <option value="NC">Nota de Crédito</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Ticket de Referencia</label>
              <div className="flex gap-2">
                <input
                  className={`${SIATC_THEME.COMPONENTS.INPUT} h-12 text-sm`}
                  value={formData.ticket}
                  onChange={(e) => {
                    setFormData({...formData, ticket: e.target.value});
                    setIsTicketValidated(false);
                    setExistingTicketRequests([]);
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
                  className="w-12 h-12 flex-shrink-0 rounded-xl"
                />
              </div>

              {/* Aviso de solicitudes existentes */}
              {existingTicketRequests.length > 0 && (
                <div className="mt-4 p-5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-black text-amber-800 dark:text-amber-300">
                        Este ticket ya tiene {existingTicketRequests.length === 1 ? 'una solicitud activa' : `${existingTicketRequests.length} solicitudes activas`}
                      </p>
                      <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                        No se puede registrar una nueva solicitud mientras existan solicitudes en proceso.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {existingTicketRequests.map((r) => {
                      const cfg = ESTADO_CONFIG[r.estado] ?? { label: r.estado, className: 'bg-gray-100 text-gray-700' };
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-3 bg-white dark:bg-amber-900/10 rounded-lg px-4 py-3 border border-amber-100 dark:border-amber-800">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider flex-shrink-0">
                              {r.tipo === 'CXG' ? 'CxG' : 'NC'}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.className}`}>
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {r.creado_por && (
                              <p className="text-[10px] text-amber-700/70 dark:text-amber-400/60 truncate max-w-[140px]">
                                {r.creado_por}
                              </p>
                            )}
                            {r.fecha && (
                              <p className="text-[10px] text-amber-600/60 dark:text-amber-500/50">
                                {new Date(r.fecha).toLocaleDateString('es-PE')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info del ticket validado */}
              {formData.cliente && existingTicketRequests.length === 0 && (
                <div className="mt-4 p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">Información Capturada</p>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-600/70 uppercase block">Cliente</span>
                      <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">{formData.cliente}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo de la Solicitud / Observaciones</label>
              <textarea
                className={`${SIATC_THEME.COMPONENTS.INPUT} min-h-[120px] p-4 text-sm resize-none`}
                value={formData.observacion}
                onChange={(e) => setFormData({...formData, observacion: e.target.value})}
                placeholder="Describa el motivo o detalles de la solicitud..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
