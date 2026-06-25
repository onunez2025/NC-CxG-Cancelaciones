import { useState, useEffect, useRef } from 'react';
import {
  Search, RefreshCw, Loader2, CheckCircle2, XCircle,
  Eye, Plus, Calendar, User, ArrowUp, ArrowDown,
  ArrowUpDown, Filter
} from 'lucide-react';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { SIATCModalWrapper } from '../../components/siatc/SIATCModalWrapper';
import { SIATCActionDropdown } from '../../components/siatc/SIATCActionDropdown';
import {
  SIATCTable,
  SIATCTableHeader,
  SIATCTableRow,
  SIATCTableCell
} from '../../components/siatc/table/SIATCTable';
import { specialCasesService } from '../../services/specialCasesService';
import type { SpecialCase, SpecialCaseMotivo } from '../../types';
import { auditService } from '../../services/auditService';
import { useAuth } from '../../hooks/useAuth';
import { ncService } from '../../services/ncService';

const COLUMNS = [
  { id: 'ticket',         label: 'TICKET',           sortable: true,  filterable: true,  filterType: 'text'  },
  { id: 'producto',       label: 'PRODUCTO',          sortable: false, filterable: false, filterType: 'none'  },
  { id: 'motivo',         label: 'MOTIVO',            sortable: true,  filterable: true,  filterType: 'text'  },
  { id: 'creado_por',     label: 'CREADO POR',        sortable: true,  filterable: true,  filterType: 'text'  },
  { id: 'fecha',          label: 'FECHA REGISTRO',    sortable: true,  filterable: true,  filterType: 'date'  },
  { id: 'fecha_visita',   label: 'FECHA VISITA',      sortable: true,  filterable: true,  filterType: 'date'  },
  { id: 'estado',         label: 'ESTADO SOLICITUD',  sortable: true,  filterable: true,  filterType: 'fixed', filterValues: ['PENDIENTE', 'APROBADO', 'RECHAZADO'] },
  { id: 'service_status', label: 'ESTADO SERVICIO',   sortable: true,  filterable: true,  filterType: 'text'  },
] as const;

export const SpecialCasesPage = () => {
  const { user, hasPermission } = useAuth();
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 20;
  const [data, setData] = useState<SpecialCase[]>([]);
  const [motivos, setMotivos] = useState<SpecialCaseMotivo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Sort & filter
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [filterSearchTerm, setFilterSearchTerm] = useState('');
  const [filterSuggestions, setFilterSuggestions] = useState<string[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  // Detail & approval
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<SpecialCase | null>(null);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [approveForm, setApproveForm] = useState({ estado: '' as 'APROBADO' | 'RECHAZADO' | '', motivo_rechazo: '' });

  const [formData, setFormData] = useState({
    ticket: '', motivo: '', comentario: '',
    cliente_temp: '', fecha_visita_temp: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await specialCasesService.getSpecialCases({
        page: currentPage,
        pageSize,
        search: searchTerm,
        sortBy: sortConfig?.key,
        sortOrder: sortConfig?.direction,
        filters: columnFilters
      });
      setData(response.data);
      setTotalRecords(response.total);
    } catch (error) {
      console.error('Error fetching special cases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMotivos = async () => {
    try { setMotivos(await specialCasesService.getMotivos()); }
    catch (error) { console.error('Error fetching motives:', error); }
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 500);
    return () => clearTimeout(timer);
  }, [currentPage, searchTerm, sortConfig, columnFilters]);

  useEffect(() => { fetchMotivos(); }, []);

  useEffect(() => {
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, sortConfig, columnFilters]);

  // Click-outside to close filter dropdown
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target as Node)) {
        setActiveFilterCol(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sort
  const handleSort = (colId: string) => {
    setSortConfig(current => {
      if (!current || current.key !== colId) return { key: colId, direction: 'asc' };
      if (current.direction === 'asc') return { key: colId, direction: 'desc' };
      return null;
    });
  };

  // Filters
  const toggleFilter = (colId: string) => {
    if (activeFilterCol === colId) { setActiveFilterCol(null); return; }
    setActiveFilterCol(colId);
    setFilterSearchTerm('');
    const col = COLUMNS.find(c => c.id === colId);
    if (col?.filterType === 'fixed' && 'filterValues' in col) {
      setFilterSuggestions([...(col.filterValues as unknown as string[])]);
    } else if (col?.filterType !== 'date') {
      setFilterSuggestions([]);
    }
  };

  useEffect(() => {
    if (!activeFilterCol) return;
    const col = COLUMNS.find(c => c.id === activeFilterCol);
    if (col?.filterType !== 'text') return;
    const timer = setTimeout(async () => {
      setIsFetchingSuggestions(true);
      try {
        const s = await specialCasesService.getUniqueColumnValues(activeFilterCol, filterSearchTerm);
        setFilterSuggestions(s);
      } catch { setFilterSuggestions([]); }
      finally { setIsFetchingSuggestions(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [filterSearchTerm, activeFilterCol]);

  const applyFilter = (colId: string, value: string) => {
    setColumnFilters(prev => {
      const current = prev[colId] || [];
      const next = { ...prev };
      if (!value) { delete next[colId]; }
      else if (current.includes(value)) {
        const remaining = current.filter(v => v !== value);
        if (remaining.length === 0) delete next[colId]; else next[colId] = remaining;
      } else {
        next[colId] = [...current, value];
      }
      return next;
    });
  };

  const hasAnyFilter = searchTerm !== '' || Object.keys(columnFilters).length > 0;

  const handleClearFilters = () => {
    setSearchTerm('');
    setColumnFilters({});
    setSortConfig(null);
  };

  const handleLookupTicket = async () => {
    if (!formData.ticket) return;
    setIsLookingUp(true);
    try {
      const ticketInfo = await ncService.getTicketDetails(formData.ticket);
      setFormData(prev => ({ ...prev, cliente_temp: ticketInfo.cliente, fecha_visita_temp: ticketInfo.fecha_visita || '' }));
    } catch {
      setFormData(prev => ({ ...prev, cliente_temp: 'Ticket no encontrado' }));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.ticket || !formData.motivo) return;

    if (formData.fecha_visita_temp) {
      const now = new Date();
      const limaTimeStr = now.toLocaleString('en-US', { timeZone: 'America/Lima', hour12: false });
      const timePart = limaTimeStr.split(', ')[1];
      const limaHour = parseInt(timePart.split(':')[0]);
      const limaMinute = parseInt(timePart.split(':')[1]);
      const isAfterCutoff = limaHour > 10 || (limaHour === 10 && limaMinute >= 30);

      const todayLima = new Date(now.toLocaleString('en-US', { timeZone: 'America/Lima' }));
      todayLima.setHours(0, 0, 0, 0);

      const visitDateStr = formData.fecha_visita_temp.split('T')[0];
      const [year, month, day] = visitDateStr.split(/[-/]/).map(Number);
      const visitDate = new Date(year, month - 1, day);
      visitDate.setHours(0, 0, 0, 0);

      const diffDays = Math.round((visitDate.getTime() - todayLima.getTime()) / (1000 * 60 * 60 * 24));

      if (isAfterCutoff && diffDays < 2) {
        alert('Después de las 10:30 AM, solo se permiten registros con fecha de visita a partir de PASADO MAÑANA (Hoy + 2).');
        return;
      }
      if (!isAfterCutoff && diffDays < 1) {
        alert('Solo se permiten registros con fecha de visita a partir de MAÑANA (Hoy + 1).');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await specialCasesService.createSpecialCase({
        ticket: formData.ticket, motivo: formData.motivo,
        comentario: formData.comentario,
        usuario: user?.full_name || user?.username || 'Sistema'
      });
      await auditService.logAction({
        UsuarioID: user?.id || '0', UsuarioNombre: user?.username || 'Sistema',
        Accion: 'CREATE', Entidad: 'CASOS_ESPECIALES', EntidadID: 'NEW',
        Detalle: `Caso especial creado para Ticket: ${formData.ticket}. Motivo: ${formData.motivo}`
      });
      setIsModalOpen(false);
      fetchData();
      setFormData({ ticket: '', motivo: '', comentario: '', cliente_temp: '', fecha_visita_temp: '' });
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedCase || !approveForm.estado) return;
    setIsSubmitting(true);
    try {
      await specialCasesService.updateStatus(selectedCase.id, {
        estado: approveForm.estado as 'APROBADO' | 'RECHAZADO',
        revisado_por: user?.full_name || user?.username || 'Sistema',
        motivo_rechazo: approveForm.estado === 'RECHAZADO' ? approveForm.motivo_rechazo : undefined
      });
      await auditService.logAction({
        UsuarioID: user?.id || '0', UsuarioNombre: user?.username || 'Sistema',
        Accion: approveForm.estado === 'APROBADO' ? 'APPROVE' : 'REJECT',
        Entidad: 'CASOS_ESPECIALES', EntidadID: selectedCase.id,
        Detalle: `Caso especial ${selectedCase.ticket} marcado como ${approveForm.estado}`
      });
      setIsApproveModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
      {/* Header */}
      <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
        <div>
          <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Casos Especiales</h1>
          <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
            Registro y seguimiento de tickets que requieren atención especial del Contact Center.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SIATCButton variant="secondary" icon={RefreshCw} onClick={fetchData} isLoading={isLoading}>
            Sincronizar
          </SIATCButton>
          {hasPermission('cxg.casos_especiales.create') && (
            <SIATCButton variant="primary" icon={Plus} onClick={() => setIsModalOpen(true)}>
              Registrar
            </SIATCButton>
          )}
        </div>
      </div>

      {/* Filters bar */}
      <div className="shrink-0 flex flex-col gap-2 mb-2">
        <div className="bg-white dark:bg-cb-bg border border-cb-border rounded-cb-card p-2 flex items-center flex-wrap gap-2 shadow-cb-level-1">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cb-text-secondary/55" />
            <input
              type="text"
              placeholder="Buscar por ticket, motivo o comentario..."
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm text-cb-text-primary placeholder:text-cb-neutral/40 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {hasAnyFilter && (
            <SIATCButton variant="ghost" size="sm" onClick={handleClearFilters}
              className="h-7 text-[10px] uppercase font-black tracking-tighter">
              Limpiar Filtros
            </SIATCButton>
          )}
        </div>
      </div>

      <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
        <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Cargando casos...</p>
            </div>
          ) : (
            <SIATCTable>
              <thead>
                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                  {COLUMNS.map(col => (
                    <SIATCTableHeader key={col.id} className="relative group p-0">
                      <div className="flex items-center justify-between gap-1 px-3 py-2 w-full h-full">
                        {/* Sort trigger */}
                        <div
                          className={`flex items-center gap-1 flex-1 min-w-0 ${col.sortable ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                          onClick={() => col.sortable && handleSort(col.id)}
                        >
                          <span className="truncate leading-tight">{col.label}</span>
                          {col.sortable && (
                            sortConfig?.key === col.id
                              ? sortConfig.direction === 'asc'
                                ? <ArrowUp className="w-3 h-3 shrink-0" />
                                : <ArrowDown className="w-3 h-3 shrink-0" />
                              : <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                          )}
                        </div>

                        {/* Filter button */}
                        {col.filterable && (
                          <div className="relative shrink-0" ref={activeFilterCol === col.id ? filterDropdownRef : undefined}>
                            <button
                              className={`p-1 rounded hover:bg-muted/50 transition-colors relative ${
                                (columnFilters[col.id]?.length > 0 || columnFilters[`${col.id}_start`] || columnFilters[`${col.id}_end`])
                                  ? 'text-primary bg-primary/10'
                                  : 'text-muted-foreground opacity-30 hover:opacity-100'
                              }`}
                              onClick={(e) => { e.stopPropagation(); toggleFilter(col.id); }}
                            >
                              <Filter className="w-3 h-3" />
                              {(columnFilters[col.id]?.length || 0) > 0 && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center leading-none">
                                  {columnFilters[col.id].length}
                                </span>
                              )}
                            </button>

                            {/* Filter dropdown */}
                            {activeFilterCol === col.id && (
                              <div
                                className="absolute top-full left-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-lg z-50 p-2 font-normal"
                                onClick={e => e.stopPropagation()}
                              >
                                {col.filterType === 'date' ? (
                                  <div className="flex flex-col gap-2 p-1">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground">Desde</span>
                                      <input
                                        type="date"
                                        className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                        value={columnFilters[`${col.id}_start`]?.[0] || ''}
                                        onChange={e => setColumnFilters(prev => ({ ...prev, [`${col.id}_start`]: e.target.value ? [e.target.value] : [] }))}
                                      />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-black uppercase text-muted-foreground">Hasta</span>
                                      <input
                                        type="date"
                                        className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                        value={columnFilters[`${col.id}_end`]?.[0] || ''}
                                        onChange={e => setColumnFilters(prev => ({ ...prev, [`${col.id}_end`]: e.target.value ? [e.target.value] : [] }))}
                                      />
                                    </div>
                                    <SIATCButton variant="primary" size="sm" className="mt-1" onClick={() => setActiveFilterCol(null)}>
                                      Aplicar Rango
                                    </SIATCButton>
                                  </div>
                                ) : (
                                  <>
                                    {col.filterType === 'text' && (
                                      <input
                                        type="text"
                                        className={`${SIATC_THEME.COMPONENTS.INPUT} h-8 text-xs font-semibold`}
                                        placeholder={`Buscar en ${col.label}...`}
                                        value={filterSearchTerm}
                                        onChange={e => setFilterSearchTerm(e.target.value)}
                                        autoFocus
                                      />
                                    )}
                                    <div className="max-h-56 overflow-y-auto flex flex-col gap-0.5 pr-1 mt-1">
                                      {isFetchingSuggestions ? (
                                        <div className="text-xs text-muted-foreground p-2 text-center flex items-center justify-center gap-2">
                                          <Loader2 className="w-3 h-3 animate-spin" /> Cargando...
                                        </div>
                                      ) : filterSuggestions.length === 0 ? (
                                        <div className="text-xs text-muted-foreground p-2 text-center">Sin resultados</div>
                                      ) : filterSuggestions.map(val => {
                                        const isChecked = (columnFilters[col.id] || []).includes(val);
                                        return (
                                          <label
                                            key={val}
                                            className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/50 transition-colors ${isChecked ? 'bg-primary/8 text-primary' : 'text-foreground'}`}
                                            onClick={() => applyFilter(col.id, val)}
                                          >
                                            <input
                                              type="checkbox"
                                              className="w-3.5 h-3.5 rounded border-border accent-primary shrink-0 cursor-pointer"
                                              checked={isChecked}
                                              onChange={() => applyFilter(col.id, val)}
                                              onClick={e => e.stopPropagation()}
                                            />
                                            <span className={`text-xs leading-tight break-words ${isChecked ? 'font-bold' : ''}`}>{val}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/60">
                                      <button
                                        className="text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors px-1"
                                        onClick={() => setColumnFilters(prev => { const n = { ...prev }; delete n[col.id]; return n; })}
                                      >
                                        Limpiar
                                      </button>
                                      <span className="text-[10px] text-muted-foreground">
                                        {(columnFilters[col.id]?.length || 0) > 0 ? `${columnFilters[col.id].length} seleccionado(s)` : 'Ninguno'}
                                      </span>
                                      <button
                                        className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors px-1"
                                        onClick={() => setActiveFilterCol(null)}
                                      >
                                        Cerrar
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SIATCTableHeader>
                  ))}
                  <SIATCTableHeader className="text-right">ACCIONES</SIATCTableHeader>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <SIATCTableRow key={item.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                    <SIATCTableCell>
                      <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>#{item.ticket}</span>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-xs font-bold text-cb-text-primary truncate" title={item.codigo_producto}>{item.codigo_producto || 'N/A'}</span>
                        <span className="text-[10px] text-cb-text-secondary truncate" title={item.producto}>{item.producto || 'Sin descripción'}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="text-xs font-medium text-cb-text-primary max-w-[150px] truncate" title={item.motivo}>{item.motivo}</div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-cb-text-secondary" />
                        <span className="text-xs text-cb-text-secondary">{item.creado_por}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2 text-cb-text-secondary">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>{new Date(item.fecha).toLocaleDateString('es-PE')}</span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-cb-text-secondary" />
                        <span className={SIATC_THEME.TYPOGRAPHY.TINY_MONO}>
                          {item.fecha_visita ? new Date(item.fecha_visita).toLocaleDateString('es-PE') : '—'}
                        </span>
                      </div>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={item.estado === 'APROBADO' ? 'success' : item.estado === 'PENDIENTE' ? 'warning' : 'danger'}>
                        {item.estado}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell>
                      <SIATCBadge variant={
                        item.service_status === 'Cancelled' ? 'danger' :
                        item.service_status === 'Ready to plan' ? 'primary' :
                        item.service_status === 'Closed' ? 'success' : 'info'
                      }>
                        {item.service_status === 'Cancelled' ? 'CANCELADO' :
                         item.service_status === 'Ready to plan' ? 'POR PLANIFICAR' :
                         item.service_status === 'Closed' ? 'CERRADO' :
                         item.service_status?.toUpperCase() || 'N/A'}
                      </SIATCBadge>
                    </SIATCTableCell>
                    <SIATCTableCell className="text-right">
                      <SIATCActionDropdown actions={[
                        {
                          label: 'Ver Detalle', icon: Eye,
                          onClick: () => { setSelectedCase(item); setIsDetailOpen(true); }
                        },
                        {
                          label: 'Gestionar Caso', icon: CheckCircle2,
                          onClick: () => {
                            setSelectedCase(item);
                            setApproveForm({ estado: '', motivo_rechazo: '' });
                            setIsApproveModalOpen(true);
                          },
                          show: item.estado === 'PENDIENTE' &&
                                hasPermission('cxg.casos_especiales.gestionar') &&
                                user?.role_name !== 'Contact Center'
                        }
                      ]} />
                    </SIATCTableCell>
                  </SIATCTableRow>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-cb-text-secondary italic text-xs">
                      No se encontraron casos especiales.
                    </td>
                  </tr>
                )}
              </tbody>
            </SIATCTable>
          )}
        </div>

        {/* Footer */}
        <div className={SIATC_THEME.TABLE.FOOTER}>
          <div className={SIATC_THEME.TYPOGRAPHY.FOOTER_STATS}>
            MOSTRANDO {data.length} DE {totalRecords} REGISTROS
          </div>
          <div className="flex items-center gap-2">
            <SIATCButton variant="ghost" size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || isLoading}>
              Anterior
            </SIATCButton>
            <span className="text-[10px] font-black text-muted-foreground uppercase">PÁGINA {currentPage}</span>
            <SIATCButton variant="ghost" size="sm"
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={data.length < pageSize || isLoading}>
              Siguiente
            </SIATCButton>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <SIATCModalWrapper
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Caso Especial"
        subtitle="Registre los detalles del ticket con atención especial."
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleCreate} isLoading={isSubmitting}
              disabled={!formData.ticket || !formData.motivo}>
              Registrar Caso
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Ticket de Referencia</label>
            <div className="flex gap-2">
              <input className={SIATC_THEME.COMPONENTS.INPUT} value={formData.ticket}
                onChange={(e) => setFormData({ ...formData, ticket: e.target.value })}
                placeholder="N° de Ticket FSM" onBlur={handleLookupTicket} />
              <SIATCButton variant="secondary" icon={isLookingUp ? Loader2 : Search}
                onClick={handleLookupTicket} isLoading={isLookingUp} className="w-12 h-10 flex-shrink-0" />
            </div>
            {formData.cliente_temp && (
              <div className="mt-1.5 pl-4 space-y-1">
                <p className={`text-[10px] font-bold ${formData.cliente_temp === 'Ticket no encontrado' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {formData.cliente_temp === 'Ticket no encontrado' ? '⚠' : '✔'} Cliente: {formData.cliente_temp}
                </p>
                {formData.fecha_visita_temp && (
                  <p className="text-[10px] font-bold text-primary">
                    📅 Fecha Visita: {new Date(formData.fecha_visita_temp).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Motivo de la Solicitud</label>
            <select className={SIATC_THEME.COMPONENTS.INPUT} value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}>
              <option value="">Seleccione un motivo...</option>
              {motivos.map(m => <option key={m.id} value={m.motivo}>{m.motivo}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">Comentario / Observación</label>
            <textarea className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
              placeholder="Detalle el caso..."
              value={formData.comentario}
              onChange={(e) => setFormData({ ...formData, comentario: e.target.value })} />
          </div>
        </div>
      </SIATCModalWrapper>

      {/* Detail Modal */}
      <SIATCModalWrapper
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalle del Caso"
        subtitle={`Ticket #${selectedCase?.ticket}`}
      >
        {selectedCase && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Estado Actual</p>
                <SIATCBadge variant={selectedCase.estado === 'APROBADO' ? 'success' : selectedCase.estado === 'PENDIENTE' ? 'warning' : 'danger'}>
                  {selectedCase.estado}
                </SIATCBadge>
              </div>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Fecha de Registro</p>
                <p className="text-sm font-bold">{new Date(selectedCase.fecha).toLocaleString()}</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 pl-4">Motivo de Solicitud</p>
                <div className="p-4 bg-background rounded-xl border border-border/50 font-bold text-sm">{selectedCase.motivo}</div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5 pl-4">Comentario de Asesor</p>
                <div className="p-4 bg-background rounded-xl border border-border/50 text-sm italic">{selectedCase.comentario || 'Sin comentarios.'}</div>
              </div>
              {selectedCase.estado !== 'PENDIENTE' && (
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary">Información de Revisión</p>
                    <p className="text-[10px] font-bold text-muted-foreground">{new Date(selectedCase.revisado_el!).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{selectedCase.revisado_por}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Revisor</p>
                    </div>
                  </div>
                  {selectedCase.motivo_rechazo && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700">
                      <span className="font-black uppercase text-[9px] block mb-1">Motivo de Rechazo:</span>
                      {selectedCase.motivo_rechazo}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </SIATCModalWrapper>

      {/* Management Modal */}
      <SIATCModalWrapper
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        title="Gestionar Caso Especial"
        subtitle={`Evaluando ticket #${selectedCase?.ticket}`}
        footer={
          <>
            <SIATCButton variant="ghost" onClick={() => setIsApproveModalOpen(false)}>Cancelar</SIATCButton>
            <SIATCButton variant="primary" onClick={handleUpdateStatus} isLoading={isSubmitting}
              disabled={!approveForm.estado || (approveForm.estado === 'RECHAZADO' && !approveForm.motivo_rechazo)}>
              Confirmar Gestión
            </SIATCButton>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿Cuál es el resultado de la gestión?</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setApproveForm({ ...approveForm, estado: 'APROBADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  approveForm.estado === 'APROBADO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10' : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}>
                <CheckCircle2 className="w-5 h-5" /> APROBAR
              </button>
              <button onClick={() => setApproveForm({ ...approveForm, estado: 'RECHAZADO' })}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all font-bold text-sm ${
                  approveForm.estado === 'RECHAZADO' ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10' : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}>
                <XCircle className="w-5 h-5" /> RECHAZAR
              </button>
            </div>
          </div>
          {approveForm.estado === 'RECHAZADO' && (
            <div>
              <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4 text-rose-500">Motivo del Rechazo</label>
              <textarea className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 border-rose-200 focus:ring-rose-500`}
                placeholder="Indique por qué se rechaza este caso especial..."
                value={approveForm.motivo_rechazo}
                onChange={(e) => setApproveForm({ ...approveForm, motivo_rechazo: e.target.value })} />
            </div>
          )}
        </div>
      </SIATCModalWrapper>
    </div>
  );
};
