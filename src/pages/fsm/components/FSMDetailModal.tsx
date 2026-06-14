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

const DetailSection = ({ icon: Icon, title, children, variant = 'default', index }: { icon: React.ElementType, title: string, children: React.ReactNode, variant?: 'default' | 'accent' | 'highlight', index: number }) => (
  <div 
    className={cn(
      "rounded-[1.5rem] border transition-all duration-500 relative overflow-hidden group",
      "animate-in fade-in slide-in-from-right-12 ease-out",
      variant === 'default' && "bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-white/40 dark:border-white/5 shadow-lg",
      variant === 'accent' && "bg-slate-50/60 dark:bg-slate-800/20 border-slate-200/40 dark:border-slate-700/40 shadow-sm",
      variant === 'highlight' && "bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-500/20 shadow-sm"
    )}
    style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
  >
    {/* Background Aura Decoration */}
    <div className={cn(
      "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-[40px] opacity-10 transition-all group-hover:opacity-20",
      variant === 'default' && "bg-primary",
      variant === 'accent' && "bg-slate-400",
      variant === 'highlight' && "bg-emerald-400"
    )} />

    <div className="flex items-center gap-4 p-5 border-b border-inherit bg-inherit/40 relative z-10">
      <div className={cn(
        "p-2.5 rounded-xl shadow-md relative overflow-hidden",
        variant === 'default' && "bg-gradient-to-br from-primary to-blue-600 text-white",
        variant === 'accent' && "bg-gradient-to-br from-slate-600 to-slate-800 text-white",
        variant === 'highlight' && "bg-gradient-to-br from-emerald-500 to-teal-700 text-white"
      )}>
        {/* Internal Glow for icon */}
        <div className="absolute inset-0 bg-white/10 blur-sm translate-y-1/2" />
        <Icon className="w-4 h-4 relative z-10" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 opacity-70 group-hover:opacity-100 transition-opacity">
        {title}
      </h3>
    </div>
    <div className="p-7 relative z-10">
      <div className="grid grid-cols-1 gap-7">
        {children}
      </div>
    </div>
  </div>
);

const InfoItem = ({ label, value, icon: Icon, fullWidth = false }: { label: string, value: string | null | undefined, icon?: React.ElementType, fullWidth?: boolean }) => (
  <div className={cn("flex flex-col group", fullWidth && "col-span-full")}>
    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em] mb-2 opacity-30 group-hover:opacity-80 transition-opacity flex items-center gap-2">
      {label}
      <div className="flex-1 h-px bg-slate-200 dark:bg-white/5" />
    </span>
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 group-hover:border-primary/30 transition-colors">
          <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary transition-colors" />
        </div>
      )}
      <span className="text-[14px] font-bold text-slate-900 dark:text-slate-100 leading-tight tracking-tight mt-0.5">
        {value || <span className="opacity-10 italic font-medium uppercase text-[9px]">S/I</span>}
      </span>
    </div>
  </div>
);

export const FSMDetailModal: React.FC<FSMDetailModalProps> = ({
  isOpen,
  onClose,
  ticket
}) => {
  if (!ticket) return null;
  return (
    <SIATCDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={`TICKET #${ticket.ticket}`}
      subtitle="Analítica técnica y trazabilidad en tiempo real."
      width="lg"
    >
      {/* Header "Prisma" Compacto */}
      <div className="relative group overflow-hidden rounded-[2rem] p-0.5 shadow-xl">
        {/* Animated Gradient Border Layer */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-indigo-500 to-cyan-500 animate-gradient-x opacity-70" />
        
        <div className="relative bg-slate-950/90 backdrop-blur-xl rounded-[1.95rem] p-6 text-white flex flex-col gap-5 overflow-hidden">
          {/* Glass Overlay with Prism effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          
          {/* Top Row: Status and Date */}
          <div className="flex items-center justify-between gap-6 relative z-10 w-full">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/40 blur-xl animate-pulse" />
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-xl border border-white/20 relative z-10">
                   <Truck className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-primary/80">FSM STATUS</span>
                </div>
                <SIATCBadge variant={
                  ticket.estado === 'CERRADO' || ticket.estado === 'Finalizado' ? 'success' : 
                  ticket.estado === 'EN CURSO' || ticket.estado === 'En Ruta' ? 'info' :
                  ticket.estado === 'PENDIENTE' ? 'warning' :
                  'secondary'
                } className="px-3 py-1.5 text-[10px] shadow-md border-white/10">
                  {ticket.estado}
                </SIATCBadge>
              </div>
            </div>

            <div className="text-right flex flex-col">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Programación</span>
              <span className="text-xl font-black text-white tracking-tighter bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {new Date(ticket.fecha_visita).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 relative z-10 w-full" />

          {/* Bottom Row: Horario, Técnico, Supervisor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10 w-full">
             {/* Horario */}
             <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Horario del Ticket</span>
                <div className="flex items-center gap-2">
                   <Clock className="w-4 h-4 text-cyan-400" />
                   <span className="text-[13px] font-black text-white">{ticket.bloque_original || 'S/D'}</span>
                </div>
                {ticket.rango_asignado && (
                   <span className="text-[9px] text-emerald-400 font-bold">
                      Asignado: {ticket.rango_asignado}
                   </span>
                )}
             </div>

             {/* Técnico */}
             <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Técnico Operativo</span>
                <div className="flex items-center gap-2">
                   <UserCheck className="w-4 h-4 text-primary" />
                   <span className="text-[13px] font-black text-white uppercase truncate">{ticket.tecnico || 'BUSCANDO...'}</span>
                </div>
             </div>

             {/* Supervisor */}
             <div className="flex flex-col gap-1 border-t md:border-t-0 md:border-l border-white/10 pt-2 md:pt-0 md:pl-4">
                <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Supervisor a Cargo</span>
                <div className="flex items-center gap-2">
                   <User className="w-4 h-4 text-indigo-400" />
                   <span className="text-[13px] font-black text-white uppercase truncate">{ticket.supervisor || 'NO ASIGNADO'}</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-4">
        {/* Section 1: Cliente */}
        <DetailSection icon={User} title="Identificación del Cliente" index={1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <InfoItem label="Titular Registrado" value={ticket.cliente} fullWidth />
            <InfoItem label="Doc. Identidad" value={ticket.doc_cliente} icon={Hash} />
            <InfoItem label="Canal Digital (Email)" value={ticket.email} icon={Mail} />
            <div className="col-span-full h-px bg-gradient-to-r from-slate-200/0 via-slate-200/50 to-slate-200/0 dark:via-white/10 my-0.5" />
            <InfoItem label="Contacto Móvil 01" value={ticket.celular1} icon={Phone} />
            <InfoItem label="Contacto Móvil 02" value={ticket.celular2} icon={Phone} />
          </div>
        </DetailSection>

        {/* Section 2: Ubicación */}
        <DetailSection icon={MapPin} title="Logística de Ubicación" variant="accent" index={2}>
          <div className="grid grid-cols-1 gap-6">
            <InfoItem 
              label="Ejes de Dirección" 
              value={`${ticket.calle || ''} ${ticket.numero_calle || ''}`.trim() || 'Referencia Central MT'} 
              fullWidth 
              icon={MapPin}
            />
            <div className="grid grid-cols-2 gap-6">
              <InfoItem label="Distrito Operativo" value={ticket.distrito} />
              <InfoItem label="Región / Centro Operativo" value={ticket.ciudad} />
            </div>
            <div className="p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
              <InfoItem label="Instrucciones de Referencia" value={ticket.referencia} fullWidth icon={AlertCircle} />
            </div>
          </div>
        </DetailSection>

        {/* Section 3: Datos del Servicio */}
        <DetailSection icon={Box} title="Datos del Servicio" index={3}>
          <div className="grid grid-cols-1 gap-6">
             <div className="relative group/product overflow-hidden rounded-[1.5rem] p-5 border border-white/40 dark:border-white/10 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-lg transition-all hover:scale-[1.01]">
               <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl transition-all group-hover/product:scale-110" />
               <div className="flex items-start gap-5 relative z-10">
                 <div className="p-3.5 bg-gradient-to-br from-primary/10 to-indigo-500/10 rounded-xl border border-primary/20 shadow-inner">
                    <Settings className="w-7 h-7 text-primary animate-pulse" />
                 </div>
                 <div className="flex-1 min-w-0 pt-0.5">
                   <span className="text-[9px] font-black text-primary uppercase mb-1 block tracking-widest">Tecnología / Producto</span>
                   <p className="text-[17px] font-black text-slate-900 dark:text-white leading-tight">
                     {ticket.equipo}
                   </p>
                   <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <span className="text-[8px] font-black text-slate-400 uppercase">SYS ID</span>
                        <span className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300">{ticket.id_equipo}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10">
                        <span className="text-[8px] font-black text-slate-400 uppercase">INTERNAL CODE</span>
                        <span className="text-[11px] font-mono font-black text-slate-700 dark:text-slate-300">{ticket.cod_equipo}</span>
                      </div>
                   </div>
                 </div>
               </div>
             </div>
             
             <div className="p-5 bg-gradient-to-br from-primary to-indigo-600 rounded-[1.5rem] text-white shadow-md">
                <span className="text-[9px] font-black text-white/60 uppercase mb-2 block tracking-[0.2em]">Tipo de Servicio</span>
                <p className="text-[15px] font-black uppercase leading-tight tracking-tight">{ticket.tipo_servicio || 'MANTENIMIENTO'}</p>
             </div>
          </div>
        </DetailSection>

        {/* Section 4: Horarios */}
        <DetailSection icon={Clock} title="Trazabilidad de Tiempo" variant="highlight" index={4}>
           <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                 {/* Ventana Certificada */}
                 <div className="flex items-center justify-between p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-500/10 shadow-md relative overflow-hidden group col-span-1 md:col-span-2">
                    <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-[80px] transition-all group-hover:scale-110" />
                    
                    <div className="flex-1 relative z-10">
                       <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mb-2 block">Ventana Certificada</span>
                       <div className="flex items-center gap-4">
                          <div className="relative">
                             <div className="absolute inset-0 bg-emerald-500/20 blur-xl animate-pulse" />
                             <div className="w-14 h-14 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg relative z-10">
                               <Clock className="w-7 h-7 text-white" />
                             </div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                             <span className="text-2xl font-black text-slate-900 dark:text-emerald-300 tracking-tighter">
                               {ticket.rango_asignado || 'OFFLINE'}
                             </span>
                             <span className="text-[8px] font-bold text-emerald-600/60 uppercase tracking-widest pl-0.5">FSM GAC Sync</span>
                          </div>
                       </div>
                    </div>
                    
                    <div className="text-right relative z-10 scale-100 pl-2">
                       <span className="text-[9px] font-black text-slate-500 uppercase block mb-1.5 tracking-[0.2em]">Prioridad</span>
                       <div className="inline-flex items-center justify-center w-10 h-10 bg-slate-950 text-white rounded-xl text-base font-black shadow-lg border border-white/10 ring-4 ring-emerald-500/5">
                          {ticket.orden || '0'}
                       </div>
                    </div>
                 </div>
              </div>

              {ticket.comentario_horario && (
                 <div className="p-5 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.012] rounded-2xl border border-dashed border-emerald-500/20 flex items-start gap-4">
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                     <AlertCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                       <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/50">Nota de Rango</span>
                       <p className="text-[13px] font-medium leading-relaxed text-emerald-800 dark:text-emerald-200">
                         "{ticket.comentario_horario}"
                       </p>
                    </div>
                 </div>
              )}
           </div>
        </DetailSection>

        {/* Section 5: Comentarios */}
        <DetailSection icon={MessageSquare} title="Business Intelligence" variant="accent" index={5}>
          <div className="grid grid-cols-1 gap-8">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <ClipboardList className="w-5 h-5 text-primary" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.3em]">Programación</span>
              </div>
              <div className="p-6 bg-white/60 dark:bg-black/40 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-lg min-h-[100px] relative overflow-hidden">
                <p className="text-[14px] text-slate-800 dark:text-slate-300 leading-relaxed font-bold italic relative z-10 pr-6">
                  {ticket.coment_prog ? `"${ticket.coment_prog}"` : 'Sin incidencias críticas reportadas.'}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-[0.3em]">Campo</span>
              </div>
              <div className="p-6 bg-white/60 dark:bg-black/40 rounded-[2rem] border border-white/40 dark:border-white/10 shadow-lg min-h-[100px] relative overflow-hidden">
                <p className="text-[14px] text-slate-800 dark:text-slate-300 leading-relaxed font-bold italic relative z-10 pr-6">
                  {ticket.coment_tecnico ? `"${ticket.coment_tecnico}"` : 'Sin comentarios registrados por el técnico.'}
                </p>
              </div>
            </div>
          </div>
        </DetailSection>
      </div>
    </SIATCDrawer>
  );
};
