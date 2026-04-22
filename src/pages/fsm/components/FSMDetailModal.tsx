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
  ClipboardList
} from 'lucide-react';
import { SIATCModalWrapper } from '../../../components/siatc/SIATCModalWrapper';
import { SIATCBadge } from '../../../components/siatc/SIATCBadge';
import type { FSMTracking } from '../../../services/fsmService';

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

  const DetailSection = ({ icon: Icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-sm font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
          {title}
        </h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );

  const InfoItem = ({ label, value, icon: Icon }: { label: string, value: string | null | undefined, icon?: any }) => (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</span>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 italic-style">
          {value || '—'}
        </span>
      </div>
    </div>
  );

  return (
    <SIATCModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Ticket #${ticket.ticket}`}
      subtitle="Información completa de programación y requerimiento técnico"
      size="xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4">
        {/* Sección 1: Cliente y Contacto */}
        <DetailSection icon={User} title="Cliente y Contacto">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Titular / Razón Social" value={ticket.cliente} />
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="DNI / RUC" value={ticket.doc_cliente} />
              <InfoItem label="Email" value={ticket.email} icon={Mail} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InfoItem label="Celular 1" value={ticket.celular1} icon={Phone} />
              <InfoItem label="Celular 2" value={ticket.celular2} icon={Phone} />
              <InfoItem label="Referencia" value={ticket.referencia} />
            </div>
          </div>
        </DetailSection>

        {/* Sección 2: Ubicación */}
        <DetailSection icon={MapPin} title="Ubicación de Visita">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Dirección" value={`${ticket.calle || ''} ${ticket.numero_calle || ''}`} />
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Distrito" value={ticket.distrito} />
              <InfoItem label="Ciudad / Provincia" value={ticket.ciudad} />
            </div>
          </div>
        </DetailSection>

        {/* Sección 3: Equipo y Servicio */}
        <DetailSection icon={Box} title="Equipo y Servicio">
          <div className="grid grid-cols-1 gap-4">
            <InfoItem label="Equipo / Producto" value={ticket.equipo} icon={Settings} />
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Cód. Externo" value={ticket.cod_equipo} />
              <InfoItem label="ID FSM" value={ticket.id_equipo} />
            </div>
            <InfoItem label="Tipo de Servicio" value={ticket.tipo_servicio} icon={Settings} />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Estado de Servicio</span>
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
        </DetailSection>

        {/* Sección 4: Programación Técnica */}
        <DetailSection icon={Clock} title="Programación y Horarios">
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
               <InfoItem label="Fecha de Visita" value={new Date(ticket.fecha_visita).toLocaleDateString()} icon={Calendar} />
               <InfoItem label="Técnico Asignado" value={ticket.tecnico} icon={User} />
            </div>
            <InfoItem label="Bloque Original (FSM)" value={ticket.bloque_original} icon={Clock} />
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl">
               <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Rango Asignado</span>
                    <span className="text-base font-black text-emerald-800 dark:text-emerald-300">{ticket.rango_asignado || 'NO ASIGNADO'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter mb-0.5">Nro Orden</span>
                    <span className="text-base font-black text-emerald-800 dark:text-emerald-300">{ticket.orden || '—'}</span>
                  </div>
               </div>
               {ticket.comentario_horario && (
                 <div className="mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/30">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">Nota de Programación:</span>
                    <p className="text-xs italic text-emerald-900 dark:text-emerald-200 mt-1">{ticket.comentario_horario}</p>
                 </div>
               )}
            </div>
          </div>
        </DetailSection>

        {/* Sección 5: Comentarios y Notas */}
        <div className="md:col-span-2">
          <DetailSection icon={MessageSquare} title="Observaciones y Comentarios">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Comentario Programador:</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[80px]">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    {ticket.coment_prog ? `"${ticket.coment_prog}"` : 'Sin comentarios del programador.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Comentario Técnico:</span>
                </div>
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[80px]">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                    {ticket.coment_tecnico ? `"${ticket.coment_tecnico}"` : 'Sin comentarios de campo del técnico.'}
                  </p>
                </div>
              </div>
            </div>
          </DetailSection>
        </div>
      </div>
    </SIATCModalWrapper>
  );
};
