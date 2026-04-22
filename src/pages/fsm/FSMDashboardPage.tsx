import { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  RefreshCw, 
  Loader2,
  Calendar,
  Clock,
  User,
  MapPin,
  ChevronRight,
  FileText,
  UserCheck
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
  
  // Separate Filters
  const [filterTicket, setFilterTicket] = useState('');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterDocumento, setFilterDocumento] = useState('');
  const [filterTecnico, setFilterTecnico] = useState('');
  
  const [limit, setLimit] = useState(1000);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fsmService.getTracking({ 
        ticket: filterTicket,
        cliente: filterCliente,
        documento: filterDocumento,
        tecnico: filterTecnico,
        limit 
      });
      setData(result);
    } catch (error) {
      console.error('Error fetching FSM data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterTicket, filterCliente, filterDocumento, filterTecnico, limit]);

  // Initial load only
  useEffect(() => {
    fetchData();
  }, []);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Seguimiento Técnico FSM</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Control de horarios y programación de visitas técnicas. (Búsqueda manual activada)
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
        {/* Advanced Filters */}
        <div className="px-6 py-5 border-b border-border bg-slate-50/50">
          <form onSubmit={handleFilter} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Ticket Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Ticket</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input 
                    type="text"
                    placeholder="Ej: 123456"
                    className={`${SIATC_THEME.COMPONENTS.INPUT} pl-9 h-9 text-xs`}
                    value={filterTicket}
                    onChange={(e) => setFilterTicket(e.target.value)}
                  />
                </div>
              </div>

              {/* Cliente Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Nombre Cliente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input 
                    type="text"
                    placeholder="Nombre o apellido..."
                    className={`${SIATC_THEME.COMPONENTS.INPUT} pl-9 h-9 text-xs`}
                    value={filterCliente}
                    onChange={(e) => setFilterCliente(e.target.value)}
                  />
                </div>
              </div>

              {/* Documento Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Documento (DNI/RUC)</label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input 
                    type="text"
                    placeholder="Nro identificación..."
                    className={`${SIATC_THEME.COMPONENTS.INPUT} pl-9 h-9 text-xs`}
                    value={filterDocumento}
                    onChange={(e) => setFilterDocumento(e.target.value)}
                  />
                </div>
              </div>

              {/* Tecnico Filter */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Técnico</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input 
                    type="text"
                    placeholder="Nombre del técnico..."
                    className={`${SIATC_THEME.COMPONENTS.INPUT} pl-9 h-9 text-xs`}
                    value={filterTecnico}
                    onChange={(e) => setFilterTecnico(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Muestra:</span>
                  <select 
                    className="bg-transparent border-none text-xs font-bold text-foreground focus:ring-0 cursor-pointer p-0 h-auto"
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={2000}>2000</option>
                  </select>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                  Filtro por defecto: HOY
                </span>
              </div>
              
              <SIATCButton 
                type="submit"
                variant="primary" 
                icon={Search}
                size="sm"
                isLoading={isLoading}
              >
                Filtrar Resultados
              </SIATCButton>
            </div>
          </form>
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
                  <SIATCTableHeader>CLIENTE / DOCUMENTO</SIATCTableHeader>
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
                        <span className="font-bold text-foreground truncate uppercase">{item.cliente}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[8px] bg-slate-100 text-slate-500 font-black px-1 rounded">ID</span>
                            <span className="text-[10px] text-muted-foreground font-mono">{item.doc_cliente || 'SIN DOC'}</span>
                        </div>
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
                        <span className="text-xs font-medium text-slate-700 uppercase">{item.tecnico || 'NO ASIGNADO'}</span>
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
