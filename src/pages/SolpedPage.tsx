import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FileText,
    Search,
    ShoppingCart,
    Clock,
    AlertTriangle,
    CreditCard,
    ChevronDown,
    ChevronRight,
    Package,
    Filter
} from 'lucide-react';
import { CrossReferenceService, type SolpedRow } from '../services/crossReferenceService';
import { CostCentersService } from '../services/costCentersService';
import { cn } from '../utils/cn';



function formatCurrency(amount: number, currency: string = 'PEN'): string {
    const cur = currency.toUpperCase() === 'USD' ? 'USD' : 'PEN';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: cur }).format(amount);
}

function formatExcelDate(value: any): string {
    if (!value) return '—';
    const num = Number(value);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        const date = new Date((num - 25569) * 86400 * 1000);
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return String(value);
}

export function SolpedPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<SolpedRow[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterCeCo, setFilterCeCo] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');
    const [expandedPR, setExpandedPR] = useState<string | null>(null);

    const [cecoNameMap, setCecoNameMap] = useState<Map<string, string>>(new Map());

    useEffect(() => {
        CostCentersService.getCostCenters().then(cecos => {
            const map = new Map<string, string>();
            cecos.forEach(cc => map.set(cc.code, cc.name));
            setCecoNameMap(map);
        }).catch(console.error);
        loadData();
    }, []);

    const resolveCecoName = (costCenter: string): string => {
        if (!costCenter) return '—';
        // Handle multi-CeCo (e.g. "MT050002 / MT050004")
        const codes = costCenter.split(/\s*\/\s*/);
        const names = codes.map(c => cecoNameMap.get(c.trim()) || c.trim());
        return names.join(' / ');
    };

    // Load data triggered by useEffect above

    const loadData = async () => {
        try {
            const solpedRows = await CrossReferenceService.getSolpedData();
            setRows(solpedRows);
        } catch (error) {
            console.error('Error loading solped data:', error);
        }
    };

    // Unique CeCos
    const uniqueCecos = useMemo(() => {
        const cecos = new Set<string>();
        rows.forEach(r => {
            if (r.cost_center) cecos.add(r.cost_center);
            r.items.forEach(i => {
                if (i.cost_center) cecos.add(i.cost_center);
            });
        });
        return [...cecos].sort();
    }, [rows]);

    // Filter
    const filteredRows = useMemo(() => rows.filter(r => {
        const matchesSearch = searchTerm === '' ||
            r.pr_number.includes(searchTerm) ||
            r.po_number.includes(searchTerm) ||
            r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.vendor_name.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesStatus = true;
        if (filterStatus === 'pendiente') matchesStatus = !r.has_po && !r.release_date;
        else if (filterStatus === 'liberada') matchesStatus = !r.has_po && !!r.release_date;
        else if (filterStatus === 'con_po') matchesStatus = r.has_po && !r.has_ksb1;
        else if (filterStatus === 'ejecutado') matchesStatus = r.has_ksb1;
        else if (filterStatus === 'facturado') matchesStatus = r.has_fbl1n;

        const matchesCeCo = filterCeCo === 'all' ||
            r.cost_center === filterCeCo ||
            r.items.some(i => i.cost_center === filterCeCo);
        const matchesCurrency = filterCurrency === 'all' || String(r.currency || 'PEN').toUpperCase() === filterCurrency;

        return matchesSearch && matchesStatus && matchesCeCo && matchesCurrency;
    }), [rows, searchTerm, filterStatus, filterCeCo, filterCurrency]);

    // Metrics
    const metrics = useMemo(() => ({
        total: rows.length,
        pendienteFirma: rows.filter(r => !r.has_po && !r.release_date).length,
        liberadas: rows.filter(r => !r.has_po && r.release_date).length,
        conPO: rows.filter(r => r.has_po).length,
        ejecutados: rows.filter(r => r.has_ksb1).length,
        facturados: rows.filter(r => r.has_fbl1n).length,
        valorTotal: rows.reduce((s, r) => s + r.net_value, 0)
    }), [rows]);

    const getStatusBadge = (r: SolpedRow) => {
        if (r.has_fbl1n) return { label: t('solped.status.billed'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CreditCard };
        if (r.has_ksb1) return { label: t('solped.status.executed'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Package };
        if (r.has_po) return { label: t('solped.status.with_po'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: ShoppingCart };
        if (r.release_date) return { label: t('solped.status.released'), color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400', icon: Package };
        return { label: t('solped.status.pending_approval'), color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Clock };
    };

    const togglePillFilter = (status: string) => {
        setFilterStatus(prev => prev === status ? 'all' : status);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {/* Header Area */}
            <div className="shrink-0 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <FileText className="w-6 h-6 text-primary" />
                            {t('solped.title')}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {t('solped.subtitle')}
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI Area */}
            <div className="shrink-0 mb-6">
                <div className="flex flex-wrap gap-3">
                    <Pill label={t('solped.kpi.total')} value={metrics.total} color="bg-card" active={filterStatus === 'all'} onClick={() => togglePillFilter('all')} />
                    <Pill label={t('solped.kpi.to_approve')} value={metrics.pendienteFirma} color="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" active={filterStatus === 'pendiente'} onClick={() => togglePillFilter('pendiente')} />
                    <Pill label={t('solped.kpi.ready_for_po')} value={metrics.liberadas} color="bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400" active={filterStatus === 'liberada'} onClick={() => togglePillFilter('liberada')} />
                    <Pill label={t('solped.kpi.with_po')} value={metrics.conPO} color="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" active={filterStatus === 'con_po'} onClick={() => togglePillFilter('con_po')} />
                    <Pill label={t('solped.kpi.executed')} value={metrics.ejecutados} color="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" active={filterStatus === 'ejecutado'} onClick={() => togglePillFilter('ejecutado')} />
                    <Pill label={t('solped.kpi.billed')} value={metrics.facturados} color="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400" active={filterStatus === 'facturado'} onClick={() => togglePillFilter('facturado')} />
                </div>
            </div>

            {/* Filters Area */}
            <div className="shrink-0 space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('solped.search_placeholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-card border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-card border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    >
                        <option value="all">{t('solped.filter_status')}</option>
                        <option value="pendiente">{t('solped.status.pending_approval')}</option>
                        <option value="liberada">{t('solped.status.released')}</option>
                        <option value="con_po">{t('solped.status.with_po')}</option>
                        <option value="ejecutado">{t('solped.status.executed')}</option>
                        <option value="facturado">{t('solped.status.billed')}</option>
                    </select>
                    <select
                        value={filterCeCo}
                        onChange={(e) => setFilterCeCo(e.target.value)}
                        className="px-3 py-2 bg-card border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow min-w-[150px]"
                    >
                        <option value="all">{t('solped.filter_ceco')}</option>
                        {uniqueCecos.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <select
                        value={filterCurrency}
                        onChange={(e) => setFilterCurrency(e.target.value)}
                        className="px-3 py-2 bg-card border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
                    >
                        <option value="all">Todas las Monedas</option>
                        <option value="PEN">PEN (Soles)</option>
                        <option value="USD">USD (Dólares)</option>
                    </select>
                </div>

                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    {t('solped.results_label', { count: filteredRows.length, total: rows.length })}
                </p>
            </div>

            {/* ─── Table Area ─── */}
            {
                rows.length === 0 ? (
                    <div className="bg-card border rounded-lg p-12 text-center shrink-0">
                        <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t('solped.empty_state.title')}</h3>
                        <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('solped.empty_state.desc') }} />
                    </div>
                ) : (
                    <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 z-10 bg-card shadow-sm ring-1 ring-border/50">
                                    <tr className="border-b bg-muted/30">
                                        <th className="w-8 py-3 px-2"></th>
                                        <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('solped.table.solped')}</th>
                                        <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('solped.table.po')}</th>
                                        <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden lg:table-cell">{t('solped.table.description')}</th>
                                        <th className="text-left py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">{t('solped.table.ceco')}</th>
                                        <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('solped.table.currency', { defaultValue: 'MONEDA' })}</th>
                                        <th className="text-right py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('solped.table.value')}</th>
                                        <th className="text-center py-3 px-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{t('solped.table.status')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {filteredRows.map(r => {
                                        const status = getStatusBadge(r);
                                        const StatusIcon = status.icon;
                                        const isExpanded = expandedPR === (r.pr_number || r.po_number);

                                        return (
                                            <>
                                                <tr
                                                    key={r.pr_number || r.po_number}
                                                    className="hover:bg-muted/10 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedPR(prev => prev === (r.pr_number || r.po_number) ? null : (r.pr_number || r.po_number))}
                                                >
                                                    <td className="py-2.5 px-2 text-muted-foreground">
                                                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-primary">{r.pr_number || '—'}</td>
                                                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground">{r.po_number || '—'}</td>
                                                    <td className="py-2.5 px-3 text-xs truncate max-w-[200px] hidden lg:table-cell">{r.description || '—'}</td>
                                                    <td className="py-2.5 px-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{r.cost_center || '—'}</td>
                                                    <td className="py-2.5 px-3 font-mono text-xs font-bold text-center">{String(r.currency || 'PEN').toUpperCase()}</td>
                                                    <td className="py-2.5 px-3 text-xs font-bold text-right">{formatCurrency(r.net_value, r.currency)}</td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", status.color)}>
                                                            <StatusIcon className="w-3 h-3" />
                                                            {status.label}
                                                        </span>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr key={`${r.pr_number || r.po_number}-detail`}>
                                                        <td colSpan={8} className="bg-muted/10 px-6 py-4">
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                                                <DetailItem label={t('solped.detail.date')} value={formatExcelDate(r.request_date)} />
                                                                <DetailItem label={t('solped.detail.release_date')} value={formatExcelDate(r.release_date)} highlight={!!r.release_date} />
                                                                <DetailItem label={t('solped.detail.quantity')} value={String(r.quantity)} />
                                                                <DetailItem label={t('solped.detail.gl_account')} value={r.gl_account || '—'} />
                                                                <DetailItem label={t('solped.detail.vendor')} value={r.vendor_name || '—'} />
                                                                <DetailItem label={t('solped.detail.po_value')} value={r.has_po ? formatCurrency(r.po_value, r.currency) : '—'} highlight={r.has_po} />
                                                                <DetailItem label={t('solped.detail.real_expense')} value={r.has_ksb1 ? formatCurrency(r.real_expense) : '—'} highlight={r.has_ksb1} />
                                                                <DetailItem label={t('solped.detail.invoices')} value={r.has_fbl1n ? t('solped.detail.invoices_count', { count: r.invoice_count }) : '—'} highlight={r.has_fbl1n} />
                                                                <DetailItem
                                                                    label={t('solped.detail.traceability')}
                                                                    value={[
                                                                        r.pr_number ? `✓ ${t('solped.traceability.solped')}` : `✗ ${t('solped.traceability.solped')}`,
                                                                        r.has_po ? `✓ ${t('solped.traceability.po')}` : `✗ ${t('solped.traceability.po')}`,
                                                                        r.has_ksb1 ? `✓ ${t('solped.traceability.expense')}` : `✗ ${t('solped.traceability.expense')}`,
                                                                        r.has_fbl1n ? `✓ ${t('solped.traceability.invoice')}` : `✗ ${t('solped.traceability.invoice')}`
                                                                    ].join(' → ')}
                                                                />
                                                            </div>

                                                            {/* ─── Items sub-table (multi-position Solpeds) ─── */}
                                                            {r.items.length > 1 && (
                                                                <div className="mt-4 border rounded-md overflow-hidden">
                                                                    <div className="bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                                        {t('solped.detail.items_title', { count: r.items.length })}
                                                                    </div>
                                                                    <table className="w-full text-xs">
                                                                        <thead>
                                                                            <tr className="border-b bg-muted/20">
                                                                                <th className="text-left py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">Pos</th>
                                                                                <th className="text-left py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.table.ceco')}</th>
                                                                                <th className="text-left py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.table.ceco_name') || 'Nombre CeCo'}</th>
                                                                                <th className="text-left py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.table.description')}</th>
                                                                                <th className="text-center py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.table.currency', { defaultValue: 'MONEDA' })}</th>
                                                                                <th className="text-right py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.detail.quantity')}</th>
                                                                                <th className="text-right py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.detail.unit_price')}</th>
                                                                                <th className="text-right py-1.5 px-3 font-semibold text-[10px] uppercase text-muted-foreground">{t('solped.table.value')}</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y">
                                                                            {r.items.map((item, idx) => (
                                                                                <tr key={idx} className="hover:bg-muted/5">
                                                                                    <td className="py-1.5 px-3 font-mono text-muted-foreground">{item.position || idx + 1}</td>
                                                                                    <td className="py-1.5 px-3 font-mono text-[10px] text-muted-foreground">{item.cost_center || '—'}</td>
                                                                                    <td className="py-1.5 px-3 text-[10px] text-muted-foreground">{resolveCecoName(item.cost_center)}</td>
                                                                                    <td className="py-1.5 px-3">{item.description}</td>
                                                                                    <td className="py-1.5 px-3 text-center font-mono text-[10px] font-bold">{String(r.currency || 'PEN').toUpperCase()}</td>
                                                                                    <td className="py-1.5 px-3 text-right font-mono">{item.quantity}</td>
                                                                                    <td className="py-1.5 px-3 text-right font-mono">{formatCurrency(item.unit_price, r.currency)}</td>
                                                                                    <td className="py-1.5 px-3 text-right font-mono font-bold">{formatCurrency(item.total_value, r.currency)}</td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr className="bg-muted/20 font-bold">
                                                                                <td colSpan={7} className="py-1.5 px-3 text-right text-muted-foreground">Total</td>
                                                                                <td className="py-1.5 px-3 text-right font-mono text-primary">{formatCurrency(r.net_value, r.currency)}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                )}
                                            </>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// ─── Sub-components ─────────────────────────────────

function Pill({ label, value, color, active, onClick }: { label: string; value: string | number; color: string; active?: boolean; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm cursor-pointer select-none transition-all duration-150 hover:scale-105",
                color,
                active && "ring-2 ring-primary ring-offset-2 dark:ring-offset-background scale-105"
            )}
        >
            {label}: <span className="font-bold">{value}</span>
        </div>
    );
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div>
            <span className="text-muted-foreground">{label}</span>
            <p className={cn("font-medium mt-0.5", highlight && "text-primary font-bold")}>{value}</p>
        </div>
    );
}
