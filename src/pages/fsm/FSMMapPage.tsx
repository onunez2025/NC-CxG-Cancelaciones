import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';
import { Filter, MapPin, Loader2, RefreshCw, X } from 'lucide-react';
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { fsmService } from '../../services/fsmService';
import type { FSMMapItem, FSMMapFiltros } from '../../services/fsmService';
import { cn } from '../../utils/cn';

// ── Leaflet icons ──────────────────────────────────────────────────────────

const makeIcon = (color: string) =>
    L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 6px rgba(0,0,0,0.45);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });

const SOLE_ICON = makeIcon('#3b82f6');   // blue-500
const CAS_ICON  = makeIcon('#f97316');   // orange-500

// ── Auto-fit bounds when data changes ─────────────────────────────────────

function FitBounds({ data }: { data: FSMMapItem[] }) {
    const map = useMap();
    useEffect(() => {
        if (data.length === 0) return;
        const bounds = L.latLngBounds(data.map(d => [d.latitud, d.longitud]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }, [data, map]);
    return null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);

// ── Component ──────────────────────────────────────────────────────────────

export const FSMMapPage = () => {
    const [filtros, setFiltros]         = useState<FSMMapFiltros>({ empresas: [], tecnicos: [] });
    const [data, setData]               = useState<FSMMapItem[]>([]);
    const [isLoadingFiltros, setIsLoadingFiltros] = useState(false);
    const [isLoading, setIsLoading]     = useState(false);
    const [error, setError]             = useState<string | null>(null);

    // Draft filters (panel) — applied only when user clicks Aplicar
    const [draftEmpresa,  setDraftEmpresa]  = useState('');
    const [draftTecnico,  setDraftTecnico]  = useState('');
    const [draftDesde,    setDraftDesde]    = useState(today());
    const [draftHasta,    setDraftHasta]    = useState(today());

    // Applied filters (used for the API call)
    const [appliedFilters, setAppliedFilters] = useState({
        empresaCas: '',
        tecnico: '',
        fechaDesde: today(),
        fechaHasta: today(),
    });

    // Load filter options whenever the date range draft changes
    const loadFiltros = useCallback(async (fechaDesde: string, fechaHasta: string) => {
        setIsLoadingFiltros(true);
        try {
            const result = await fsmService.getMapFiltros({ fechaDesde, fechaHasta });
            setFiltros(result);
        } catch {
            // Non-critical: filtros just won't update
        } finally {
            setIsLoadingFiltros(false);
        }
    }, []);

    useEffect(() => {
        loadFiltros(draftDesde, draftHasta);
    }, [draftDesde, draftHasta, loadFiltros]);

    // Load map data whenever applied filters change
    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const result = await fsmService.getMapData(appliedFilters);
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Error al cargar datos del mapa');
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [appliedFilters]);

    const handleApply = () => {
        setAppliedFilters({
            empresaCas: draftEmpresa,
            tecnico:    draftTecnico,
            fechaDesde: draftDesde,
            fechaHasta: draftHasta,
        });
        // Reset tecnico if it no longer exists in updated filtros
        if (draftTecnico && !filtros.tecnicos.includes(draftTecnico)) {
            setDraftTecnico('');
        }
    };

    const handleClear = () => {
        const t = today();
        setDraftEmpresa('');
        setDraftTecnico('');
        setDraftDesde(t);
        setDraftHasta(t);
        setAppliedFilters({ empresaCas: '', tecnico: '', fechaDesde: t, fechaHasta: t });
    };

    const defaultCenter: [number, number] = [-12.046374, -77.042793];

    const soleCount = data.filter(d => !d.empresa).length;
    const casCount  = data.filter(d => !!d.empresa).length;

    return (
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Mapa de Servicios FSM</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>
                        Visualización geográfica de servicios asignados por empresa y técnico.
                    </p>
                </div>
            </div>

            {/* Body: panel + map */}
            <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                {/* ── Filter panel ── */}
                <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-3">
                    <div className={cn(SIATC_THEME.LAYOUT.CONTENT_CONTAINER, 'p-5 flex flex-col gap-4')}>
                        <div className="flex items-center gap-2 text-sm font-bold text-foreground uppercase tracking-widest">
                            <Filter className="w-4 h-4 text-primary" />
                            Filtros
                        </div>

                        {/* Empresa CAS */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Empresa CAS
                            </label>
                            <select
                                value={draftEmpresa}
                                onChange={e => { setDraftEmpresa(e.target.value); setDraftTecnico(''); }}
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="">Todas (CAS + SOLE)</option>
                                <option value="SOLE">SOLE</option>
                                {filtros.empresas.map(emp => (
                                    <option key={emp} value={emp}>{emp}</option>
                                ))}
                            </select>
                        </div>

                        {/* Técnico */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Técnico
                                {isLoadingFiltros && <Loader2 className="inline w-3 h-3 ml-1 animate-spin" />}
                            </label>
                            <select
                                value={draftTecnico}
                                onChange={e => setDraftTecnico(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                                <option value="">Todos</option>
                                {filtros.tecnicos.map(tec => (
                                    <option key={tec} value={tec}>{tec}</option>
                                ))}
                            </select>
                        </div>

                        {/* Fecha desde */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Fecha desde
                            </label>
                            <input
                                type="date"
                                value={draftDesde}
                                max={draftHasta}
                                onChange={e => setDraftDesde(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>

                        {/* Fecha hasta */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Fecha hasta
                            </label>
                            <input
                                type="date"
                                value={draftHasta}
                                min={draftDesde}
                                onChange={e => setDraftHasta(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                            <SIATCButton
                                variant="primary"
                                icon={RefreshCw}
                                onClick={handleApply}
                                className="flex-1"
                            >
                                Aplicar
                            </SIATCButton>
                            <SIATCButton
                                variant="secondary"
                                icon={X}
                                onClick={handleClear}
                            >
                                Limpiar
                            </SIATCButton>
                        </div>
                    </div>

                    {/* Stats */}
                    {!isLoading && data.length > 0 && (
                        <div className={cn(SIATC_THEME.LAYOUT.CONTENT_CONTAINER, 'p-5 flex flex-col gap-3')}>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                Resultados
                            </p>
                            <div className="grid grid-cols-3 gap-3">
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl font-bold text-foreground">{data.length}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl font-bold text-blue-500">{soleCount}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">SOLE</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <span className="text-2xl font-bold text-orange-500">{casCount}</span>
                                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">CAS</span>
                                </div>
                            </div>
                            {/* Legend */}
                            <div className="flex flex-col gap-1.5 pt-1 border-t border-border/50">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow" />
                                    SOLE
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="inline-block w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow" />
                                    CAS
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                {/* ── Map ── */}
                <div className={cn(
                    SIATC_THEME.LAYOUT.CONTENT_CONTAINER,
                    'flex-1 p-0 overflow-hidden min-h-[400px] lg:min-h-0',
                )}>
                    {isLoading ? (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-sm text-muted-foreground font-medium">Cargando mapa...</p>
                        </div>
                    ) : error ? (
                        <div className="flex h-full min-h-[400px] items-center justify-center">
                            <p className="text-red-500 font-semibold">{error}</p>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-3 text-muted-foreground">
                            <MapPin className="w-10 h-10 opacity-30" />
                            <p className="text-sm font-medium">No hay servicios con coordenadas para los filtros seleccionados.</p>
                        </div>
                    ) : (
                        <div className="flex-1 relative" style={{ minHeight: 400 }}>
                        <MapContainer
                            center={defaultCenter}
                            zoom={11}
                            style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
                        >
                            <FitBounds data={data} />
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />
                            <MarkerClusterGroup>
                                {data.map((item, idx) => (
                                    <Marker
                                        key={`${item.ticket}-${idx}`}
                                        position={[item.latitud, item.longitud]}
                                        icon={item.empresa ? CAS_ICON : SOLE_ICON}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[210px] text-slate-800">
                                                <p className="font-bold text-sm mb-2">Ticket #{item.ticket}</p>
                                                <div className="space-y-0.5 text-xs">
                                                    <p><b>Cliente:</b> {item.cliente}</p>
                                                    <p><b>Técnico:</b> {item.tecnico || '—'}</p>
                                                    <p>
                                                        <b>Empresa:</b>{' '}
                                                        <span className={item.empresa ? 'text-orange-600 font-semibold' : 'text-blue-600 font-semibold'}>
                                                            {item.empresa ?? 'SOLE'}
                                                        </span>
                                                    </p>
                                                    <p><b>Estado:</b> {item.estado || '—'}</p>
                                                    <p><b>Distrito:</b> {item.distrito || '—'}</p>
                                                    {item.direccion && <p><b>Dirección:</b> {item.direccion}</p>}
                                                    <p><b>Fecha visita:</b> {item.fecha_visita
                                                        ? new Date(item.fecha_visita).toLocaleDateString('es-PE')
                                                        : '—'}
                                                    </p>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MarkerClusterGroup>
                        </MapContainer>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
