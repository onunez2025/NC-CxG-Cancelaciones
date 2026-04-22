import { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronRight
} from 'lucide-react';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { 
  SIATCTable, 
  SIATCTableHeader, 
  SIATCTableRow, 
  SIATCTableCell 
} from '../../components/siatc/table/SIATCTable';
import { fsmService } from '../../services/fsmService';
import type { FSMTracking } from '../../services/fsmService';

export const FSMDashboardPage = () => {
  const [data, setData] = useState<FSMTracking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(100);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await fsmService.getTracking({ search: searchTerm, limit });
      setData(result);
    } catch (error) {
      console.error('Error fetching FSM data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, limit]);

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Seguimiento Técnico FSM</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Control de horarios y programación de visitas técnicas.
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
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        {/* Filters */}
        <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              type="text"
              placeholder="Buscar por ticket, cliente o técnico..."
              className={`${SIATC_THEME.COMPONENTS.INPUT} pl-10`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Mostrar:</span>
            <select 
              className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
            >
              <option value={50}>50 registros</option>
              <option value={100}>100 registros</option>
              <option value={200}>200 registros</option>
              <option value={500}>500 registros</option>
            </select>
          </div>
        </div>

        {/* Table Area */}
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium italic">Consultando programación FSM...</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  <SIATCTableHeader>TICKET</SIATCTableHeader>
                  <SIATCTableHeader>CLIENTE / ASUNTO</SIATCTableHeader>
                  <SIATCTableHeader>UBICACIÓN</SIATCTableHeader>
                  <SIATCTableHeader>TÉCNICO</SIATCTableHeader>
                  <SIATCTableHeader>BLOQUE ORIGINAL</SIATCTableHeader>
                  <SIATCTableHeader>RANGO ASIGNADO</SIATCTableHeader>
                  <SIATCTableHeader>ORDEN</SIATCTableHeader>
                  <SIATCTableHeader>ESTADO</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="text-center py-12 text-muted-foreground italic text-sm">
                            No se encontraron registros para los criterios seleccionados.
                        </td>
                    </tr>
                ) : data.map((item, idx) => (
                  <SIATCTableRow key={`${item.ticket}-${idx}`}>
                    <SIATCTableCell>
                      <div className="flex flex-col">
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground">
                            {new Date(item.fecha_visita).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex flex-col max-w-[250px]">
                        <span className="font-bold text-foreground truncate">{item.cliente}</span>
                        <span className="text-[10px] text-muted-foreground truncate">{item.asunto}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">{item.distrito}</span>
                          <span className="text-[9px] uppercase text-muted-foreground">{item.ciudad}</span>
                        </div>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                          <User className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <span className="text-xs font-medium text-slate-700">{item.tecnico || 'NO ASIGNADO'}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant="secondary">
                        {item.bloque_original}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      {item.rango_asignado ? (
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-xs font-black">{item.rango_asignado}</span>
                          </div>
                          {item.comentario_horario && (
                            <span className="text-[9px] text-muted-foreground italic mt-0.5 truncate max-w-[150px]">
                              "{item.comentario_horario}"
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sin horario</span>
                      )}
                    </SIATCTableCell>
                    <SIATCTableCell>
                      {item.orden ? (
                         <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center border border-slate-200">
                            <span className="text-xs font-black text-slate-600">{item.orden}</span>
                         </div>
                      ) : '—'}
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={
                        item.estado === 'CERRADO' || item.estado === 'Finalizado' ? 'success' : 
                        item.estado === 'EN CURSO' || item.estado === 'En Ruta' ? 'info' :
                        item.estado === 'PENDIENTE' ? 'warning' :
                        'secondary'
                      }>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                  </SIATCTableRow>
                ))}
              </tbody>
            </SIATCTable>
          )}
        </div>

        {/* Footer Stats */}
        <div className={SIATC_THEME.TABLE.FOOTER}>
          <div className={SIATC_THEME.TYPOGRAPHY.FOOTER_STATS}>
            DATA SET: {data.length} REGISTROS CARGADOS
          </div>
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            SIATC PLATINUM v2.0 <ChevronRight className="w-3 h-3" /> FSM ANALYTICS
          </div>
        </div>
      </div>
    </div>
  );
};
