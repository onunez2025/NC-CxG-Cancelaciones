import React from 'react';
import { 
  User, 
  MapPin, 
  Settings, 
  MessageSquare, 
  Clock, 
  Calendar,
  Phone,
  Mail,
  Box,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Truck,
  Hash,
  UserCheck
} from 'lucide-react';
import { SIATCDrawer } from '../../../components/siatc/SIATCDrawer';
import { SIATCBadge } from '../../../components/siatc/SIATCBadge';
import { SIATC_THEME } from '../../../utils/siatc-theme';
import type { FSMTracking } from '../../../services/fsmService';
import { cn } from '../../../utils/cn';

interface FSMDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: FSMTracking | null;
}

export const FSMDetailModal: React.FC<FSMDetailModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  if (!ticket) return null;

  const DetailSection = ({ icon: Icon, title, children, variant = 'default' }: { icon: any, title: string, children: React.ReactNode, variant?: 'default' | 'accent' | 'highlight' }) => (
    <div className={cn(
      "rounded-[1.5rem] border transition-all duration-300",
      variant === 'default' && "bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800",
      variant === 'accent' && "bg-slate-50/80 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 shadow-inner",
      variant === 'highlight' && "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-500/20 shadow-sm"
    )}>
      <div className="flex items-center gap-3 p-5 border-b border-inherit bg-inherit rounded-t-[1.5rem]">
        <div className={cn(
          "p-2.5 rounded-xl",
          variant === 'default' && "bg-primary/10 text-primary",
          variant === 'accent' && "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
          variant === 'highlight' && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
          {title}
        </h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6">
          {children}
        </div>
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon, fullWidth = false }: { label: string, value: string | null | undefined, icon?: any, fullWidth?: boolean }) => (
    <div className={cn("flex flex-col", fullWidth && "col-span-full")}>
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1.5 opacity-70">{label}</span>
      <div className="flex items-start gap-2.5">
        {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />}
        <span className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-tight">
          {value || <span className="opacity-30 italic font-medium">No disponible</span>}
        </span>
      </div>
    </div>
  );

  return (
    <SIATCDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Ticket #${ticket.ticket}`}
      subtitle="Examen detallado de programación técnica, cliente y estado de servicio FSM."
      width="lg"
    >
      {/* Header Info Overlay */}
      <div className="flex items-center justify-between gap-4 p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center shadow-sm border border-primary/20">
             <Truck className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Estado Actual</span>
            <SIATCBadge variant={
              ticket.estado === 'CERRADO' || ticket.estado === 'Finalizado' ? 'success' : 
              ticket.estado === 'EN CURSO' || ticket.estado === 'En Ruta' ? 'info' :
              ticket.estado === 'PENDIENTE' ? 'warning' :
              'secondary'
            }>
              {ticket.estado}
            </SIATCBadge>
          </div>
        </div>
        <div className="text-right flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Fecha de Visita</span>
          <span className="text-lg font-black text-slate-900 dark:text-slate-100">
            {new Date(ticket.fecha_visita).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Cliente */}
        <DetailSection icon={User} title="Información del Cliente">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InfoItem label="Titular / Razón Social" value={ticket.cliente} fullWidth />
            <InfoItem label="DNI / RUC" value={ticket.doc_cliente} icon={Hash} />
            <InfoItem label="Email" value={ticket.email} icon={Mail} />
            <div className="col-span-full h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <InfoItem label="Celular 1" value={ticket.celular1} icon={Phone} />
            <InfoItem label="Celular 2" value={ticket.celular2} icon={Phone} />
          </div>
        </DetailSection>

        {/* Section 2: Ubicación */}
        <DetailSection icon={MapPin} title="Dirección de Atención" variant="accent">
          <div className="grid grid-cols-1 gap-6">
            <InfoItem 
              label="Dirección Completa" 
              value={`${ticket.calle || ''} ${ticket.numero_calle || ''}`.trim() || 'No especificada'} 
              fullWidth 
            />
            <div className="grid grid-cols-2 gap-6">
              <InfoItem label="Distrito" value={ticket.distrito} />
              <InfoItem label="Ciudad / Provincia" value={ticket.ciudad} />
            </div>
            <InfoItem label="Referencia de Visita" value={ticket.referencia} fullWidth />
          </div>
        </DetailSection>

        {/* Section 3: Equipo */}
        <DetailSection icon={Box} title="Equipo y Tipo de Servicio">
          <div className="grid grid-cols-1 gap-6">
             <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-start gap-4">
               <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <Settings className="w-6 h-6 text-primary" />
               </div>
               <div className="flex-1 min-w-0">
                 <span className="text-[10px] font-black text-muted-foreground uppercase mb-1 block">Producto</span>
                 <p className="text-sm font-black text-slate-800 dark:text-slate-100 truncate leading-tight">
                   {ticket.equipo}
                 </p>
                 <div className="flex items-center gap-3 mt-2">
                   <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-500">ID:</span>
                      <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{ticket.id_equipo}</span>
                   </div>
                   <div className="flex items-center gap-1">
                      <span className="text-[9px] font-bold text-slate-500">COD:</span>
                      <span className="text-[10px] font-mono font-bold bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">{ticket.cod_equipo}</span>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                   <span className="text-[10px] font-black text-primary/60 uppercase mb-1 block">Servicio</span>
                   <p className="text-base font-black text-primary">{ticket.tipo_servicio || 'SERVICIO ESTÁNDAR'}</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                   <span className="text-[10px] font-black text-muted-foreground uppercase mb-1 block">Bloque FSM</span>
                   <p className="text-base font-black text-slate-700 dark:text-slate-300">{ticket.bloque_original || '—'}</p>
                </div>
             </div>
          </div>
        </DetailSection>

        {/* Section 4: Horarios */}
        <DetailSection icon={Clock} title="Rango de Atención" variant="highlight">
           <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-950 shadow-sm relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                 
                 <div className="flex-1">
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-2 block">Ventana Asignada</span>
                    <div className="flex items-center gap-3">
                       <Clock className="w-8 h-8 text-emerald-500" />
                       <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 tracking-tighter">
                         {ticket.rango_asignado || 'NO ASIGNADO'}
                       </span>
                    </div>
                 </div>
                 
                 <div className="text-right">
                    <span className="text-[10px] font-black text-muted-foreground uppercase block mb-1">Orden de Turno</span>
                    <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500 text-white rounded-2xl text-xl font-black shadow-lg shadow-emerald-500/30">
                       {ticket.orden || '?'}
                    </div>
                 </div>
              </div>

              {ticket.comentario_horario && (
                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-3">
                   <AlertCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                   <p className="text-xs font-bold italic text-emerald-700 dark:text-emerald-400">
                     "{ticket.comentario_horario}"
                   </p>
                </div>
              )}

              <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                <UserCheck className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Técnico de Campo</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase">{ticket.tecnico || 'PENDIENTE'}</span>
                </div>
              </div>
           </div>
        </DetailSection>

        {/* Section 5: Comentarios */}
        <DetailSection icon={MessageSquare} title="Observaciones de Gestión" variant="accent">
          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Feedback Programador</span>
              </div>
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[100px] relative">
                <div className="absolute top-4 right-4 opacity-5">
                  <MessageSquare className="w-12 h-12" />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic">
                  {ticket.coment_prog ? `"${ticket.coment_prog}"` : 'No hay comentarios registrados por el área de programación.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Feedback Técnico (FSM)</span>
              </div>
              <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm min-h-[100px] relative">
                <div className="absolute top-4 right-4 opacity-5">
                  <Settings className="w-12 h-12" />
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic">
                  {ticket.coment_tecnico ? `"${ticket.coment_tecnico}"` : 'El técnico aún no ha registrado comentarios de campo para este ticket.'}
                </p>
              </div>
            </div>
          </div>
        </DetailSection>
      </div>
    </SIATCDrawer>
  );
};
