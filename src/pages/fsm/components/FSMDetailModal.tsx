import React from 'react';
import { 
  User, 
  MapPin, 
  Settings, 
  MessageSquare, 
  Clock, 
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

  const DetailSection = ({ icon: Icon, title, children, variant = 'default', index }: { icon: any, title: string, children: React.ReactNode, variant?: 'default' | 'accent' | 'highlight', index: number }) => (
    <div 
      className={cn(
        "rounded-[2rem] border transition-all duration-500",
        "animate-in fade-in slide-in-from-bottom-4 ease-out",
        variant === 'default' && "bg-white dark:bg-slate-900 shadow-sm border-slate-100 dark:border-slate-800",
        variant === 'accent' && "bg-slate-50/80 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700 shadow-inner",
        variant === 'highlight' && "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-100/50 dark:border-emerald-500/20 shadow-sm"
      )}
      style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center gap-4 p-6 border-b border-inherit bg-inherit rounded-t-[2rem]">
        <div className={cn(
          "p-3 rounded-2xl shadow-sm",
          variant === 'default' && "bg-primary/10 text-primary border border-primary/20",
          variant === 'accent' && "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600",
          variant === 'highlight' && "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800 dark:text-slate-200">
          {title}
        </h3>
      </div>
      <div className="p-8">
        <div className="grid grid-cols-1 gap-8">
          {children}
        </div>
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon, fullWidth = false }: { label: string, value: string | null | undefined, icon?: any, fullWidth?: boolean }) => (
    <div className={cn("flex flex-col group", fullWidth && "col-span-full")}>
      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 opacity-50 group-hover:opacity-100 transition-opacity">{label}</span>
      <div className="flex items-start gap-3">
        {Icon && <Icon className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 transition-colors group-hover:text-primary" />}
        <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-snug">
          {value || <span className="opacity-20 italic font-medium">No disponible</span>}
        </span>
      </div>
    </div>
  );

  return (
    <SIATCDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`TICKET #${ticket.ticket}`}
      subtitle="Examen detallado de programación técnica, cliente y estado de servicio FSM."
      width="lg"
    >
      {/* Header Info Overlay - More Premium */}
      <div className="flex items-center justify-between gap-6 p-8 bg-slate-950 text-white rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32 transition-opacity group-hover:opacity-50" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-16 h-16 rounded-[1.25rem] bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl">
             <Truck className="w-8 h-8 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/80 mb-1">Estado de Gestión</span>
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

        <div className="text-right flex flex-col relative z-10">
          <span className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">Fecha de Atención</span>
          <span className="text-2xl font-black text-white tracking-tighter">
            {new Date(ticket.fecha_visita).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 mt-4">
        {/* Section 1: Cliente */}
        <DetailSection icon={User} title="Información del Cliente" index={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            <InfoItem label="Titular / Razón Social" value={ticket.cliente} fullWidth />
            <InfoItem label="DNI / RUC" value={ticket.doc_cliente} icon={Hash} />
            <InfoItem label="Email de Contacto" value={ticket.email} icon={Mail} />
            <div className="col-span-full h-px bg-slate-100 dark:bg-slate-800 my-2" />
            <InfoItem label="Celular Principal" value={ticket.celular1} icon={Phone} />
            <InfoItem label="Celular Secundario" value={ticket.celular2} icon={Phone} />
          </div>
        </DetailSection>

        {/* Section 2: Ubicación */}
        <DetailSection icon={MapPin} title="Dirección de Atención" variant="accent" index={2}>
          <div className="grid grid-cols-1 gap-8">
            <InfoItem 
              label="Dirección Completa" 
              value={`${ticket.calle || ''} ${ticket.numero_calle || ''}`.trim() || 'No especificada'} 
              fullWidth 
            />
            <div className="grid grid-cols-2 gap-8">
              <InfoItem label="Distrito" value={ticket.distrito} />
              <InfoItem label="Ciudad / Provincia" value={ticket.ciudad} />
            </div>
            <InfoItem label="Referencia de Ubicación" value={ticket.referencia} fullWidth icon={AlertCircle} />
          </div>
        </DetailSection>

        {/* Section 3: Equipo */}
        <DetailSection icon={Box} title="Equipo y Tipo de Servicio" index={3}>
          <div className="grid grid-cols-1 gap-8">
             <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 flex items-start gap-5 shadow-sm">
               <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                 <Settings className="w-8 h-8 text-primary" />
               </div>
               <div className="flex-1 min-w-0 pt-1">
                 <span className="text-[10px] font-black text-muted-foreground uppercase mb-1 block">Producto Asignado</span>
                 <p className="text-base font-black text-slate-800 dark:text-slate-100 leading-snug">
                   {ticket.equipo}
                 </p>
                 <div className="flex items-center gap-4 mt-3">
                   <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">ID:</span>
                      <span className="text-[11px] font-mono font-black bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">{ticket.id_equipo}</span>
                   </div>
                   <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase">COD:</span>
                      <span className="text-[11px] font-mono font-black bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">{ticket.cod_equipo}</span>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                   <span className="text-[10px] font-black text-primary/60 uppercase mb-2 block tracking-widest">Servicio</span>
                   <p className="text-lg font-black text-primary uppercase leading-tight">{ticket.tipo_servicio || 'SERVICIO ESTÁNDAR'}</p>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                   <span className="text-[10px] font-black text-muted-foreground uppercase mb-2 block tracking-widest">Bloque FSM</span>
                   <p className="text-lg font-black text-slate-700 dark:text-slate-300 leading-tight">{ticket.bloque_original || '—'}</p>
                </div>
             </div>
          </div>
        </DetailSection>

        {/* Section 4: Horarios */}
        <DetailSection icon={Clock} title="Programación de Tiempo" variant="highlight" index={4}>
           <div className="flex flex-col gap-8">
              <div className="flex items-center justify-between p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-emerald-100 dark:border-emerald-950 shadow-xl relative overflow-hidden group">
                 <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full -mr-24 -mt-24 blur-2xl transition-transform group-hover:scale-110" />
                 
                 <div className="flex-1 relative z-10">
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.2em] mb-3 block">Ventana Asignada</span>
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-emerald-500/10 rounded-2xl">
                        <Clock className="w-10 h-10 text-emerald-500" />
                       </div>
                       <span className="text-4xl font-black text-slate-900 dark:text-emerald-300 tracking-tighter">
                         {ticket.rango_asignado || 'NO ASIGNADO'}
                       </span>
                    </div>
                 </div>
                 
                 <div className="text-right relative z-10">
                    <span className="text-[10px] font-black text-muted-foreground uppercase block mb-2 tracking-widest">Orden Turno</span>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 text-white rounded-[1.5rem] text-2xl font-black shadow-2xl shadow-emerald-500/40 ring-4 ring-emerald-500/10">
                       {ticket.orden || '?'}
                    </div>
                 </div>
              </div>

              {ticket.comentario_horario && (
                <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-start gap-4">
                   <AlertCircle className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                   <p className="text-sm font-bold italic text-emerald-700 dark:text-emerald-400 leading-relaxed">
                     "{ticket.comentario_horario}"
                   </p>
                </div>
              )}

              <div className="flex items-center gap-5 px-6 py-5 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  <UserCheck className="w-6 h-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Especialista Técnico</span>
                  <span className="text-base font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{ticket.tecnico || 'PENDIENTE DE ASIGNACIÓN'}</span>
                </div>
              </div>
           </div>
        </DetailSection>

        {/* Section 5: Comentarios */}
        <DetailSection icon={MessageSquare} title="Observaciones Operativas" variant="accent" index={5}>
          <div className="grid grid-cols-1 gap-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">Feedback Programación</span>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[120px] relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-[0.03] rotate-12">
                  <MessageSquare className="w-32 h-32" />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic relative z-10">
                  {ticket.coment_prog ? `"${ticket.coment_prog}"` : 'No se han registrado observaciones adicionales por el área de programación central.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em]">Notas del Técnico (Campo)</span>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-200 dark:border-slate-700 shadow-sm min-h-[120px] relative overflow-hidden">
                <div className="absolute -top-4 -right-4 opacity-[0.03] rotate-12">
                  <Truck className="w-32 h-32" />
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-bold italic relative z-10">
                  {ticket.coment_tecnico ? `"${ticket.coment_tecnico}"` : 'El especialista técnico aún no ha reportado comentarios desde la aplicación móvil FSM.'}
                </p>
              </div>
            </div>
          </div>
        </DetailSection>
      </div>
    </SIATCDrawer>
  );
};
