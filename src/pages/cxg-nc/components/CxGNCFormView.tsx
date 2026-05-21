import React from 'react';
import { Loader2, Search } from 'lucide-react';
import { SIATC_THEME } from '../../../utils/siatc-theme';
import { SIATCButton } from '../../../components/siatc/SIATCButton';

interface CxGNCFormViewProps {
  formData: any;
  setFormData: (data: any) => void;
  isSubmitting: boolean;
  isLookingUp: boolean;
  isTicketValidated: boolean;
  setIsTicketValidated: (val: boolean) => void;
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
              
              {formData.cliente && (
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
