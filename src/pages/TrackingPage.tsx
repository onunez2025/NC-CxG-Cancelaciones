import { useState, useEffect } from 'react';
import {
    Activity,
    Search,
    FileText,
    ShoppingCart,
    CreditCard,
    TrendingUp,
    Package,
    ChevronDown,
    ChevronRight,
    DollarSign,
    BarChart3,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Filter
} from 'lucide-react';
import { CrossReferenceService, type EnrichedTransaction, type TrackingMetrics } from '../services/crossReferenceService';
import { cn } from '../utils/cn';

// Moved STATUS_CONFIG inside component to use t()
import { useTranslation } from 'react-i18next';

function formatCurrency(amount: number, currency: string = 'PEN'): string {
    const cur = currency.toUpperCase() === 'USD' ? 'USD' : 'PEN';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: cur }).format(amount);
}

export function TrackingPage() {
    const { t } = useTranslation();
    const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
    const [metrics, setMetrics] = useState<TrackingMetrics | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterCeCo, setFilterCeCo] = useState<string>('all');
    const [filterCurrency, setFilterCurrency] = useState<string>('all');
    const [expandedPO, setExpandedPO] = useState<string | null>(null);

    const STATUS_CONFIG: Record<string, { label: string, color: string, icon: any }> = {
        solicitado: { label: t('tracking.status.requested'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: FileText },
        pedido: { label: t('tracking.status.ordered'), color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', icon: ShoppingCart },
        recibido: { label: t('tracking.status.received'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Package },
        facturado: { label: t('tracking.status.invoiced'), color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: CreditCard },
        pagado: { label: t('tracking.status.paid'), color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
    };

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await CrossReferenceService.getTrackingData();
            setTransactions(result.transactions);
            setMetrics(result.metrics);
        } catch (error) {
            console.error("Tracking load data error", error);
        }
    };

    // Get unique CeCos for filter
    const uniqueCecos = [...new Set(transactions.map(t => t.cost_center).filter(Boolean))].sort();

    const filteredTransactions = transactions.filter(t => {
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesCeCo = filterCeCo === 'all' || t.cost_center === filterCeCo;
        const matchesSearch = searchTerm === '' ||
            t.po_number.includes(searchTerm) ||
            (t.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (t.solped?.pr_number || '').includes(searchTerm);
        const matchesCurrency = filterCurrency === 'all' || String(t.currency || 'PEN').toUpperCase() === filterCurrency;
        return matchesStatus && matchesCeCo && matchesSearch && matchesCurrency;
    });

    const toggleExpand = (poNumber: string) => {
        setExpandedPO(prev => prev === poNumber ? null : poNumber);
    };

    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="shrink-0 mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Activity className="w-6 h-6 text-primary" />
                        {t('tracking.title')}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {t('tracking.subtitle')}
                    </p>
                </div>
            </div>

            {/* Metrics Cards */}
            {metrics && (
                <div className="shrink-0 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <MetricCard
                            icon={ShoppingCart}
                            label={t('tracking.metrics.pos')}
                            value={metrics.total_pos.toString()}
                            sub={`${metrics.pos_with_solped} ${t('tracking.metrics.with_solped')}`}
                            color="text-blue-600"
                        />
                        <MetricCard
                            icon={DollarSign}
                            label={t('tracking.metrics.total_po_value')}
                            value={formatCurrency(metrics.total_po_value)}
                            sub={t('tracking.metrics.committed')}
                            color="text-violet-600"
                        />
                        <MetricCard
                            icon={BarChart3}
                            label={t('tracking.metrics.real_expense')}
                            value={formatCurrency(metrics.total_real_expense)}
                            sub={`${metrics.pos_with_invoice} ${t('tracking.metrics.with_invoice')}`}
                            color="text-amber-600"
                        />
                        <MetricCard
                            icon={TrendingUp}
                            label={t('tracking.metrics.total_paid')}
                            value={formatCurrency(metrics.total_paid)}
                            sub={`${metrics.pos_fully_paid} ${t('tracking.metrics.pos_paid')}`}
                            color="text-green-600"
                        />
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="shrink-0 space-y-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t('tracking.search_placeholder')}
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
                        <option value="all">{t('tracking.filters.all_status')}</option>
                        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                            <option key={key} value={key}>{cfg.label}</option>
                        ))}
                    </select>
                    <select
                        value={filterCeCo}
                        onChange={(e) => setFilterCeCo(e.target.value)}
                        className="px-3 py-2 bg-card border border-input rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow min-w-[150px]"
                    >
                        <option value="all">{t('tracking.filters.all_cecos')}</option>
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

                {/* Results count */}
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3" />
                    {t('tracking.results_count', { count: filteredTransactions.length, total: transactions.length })}
                </p>
            </div>

            {/* Transaction List */}
            {transactions.length === 0 ? (
                <div className="bg-card border rounded-lg p-12 text-center shrink-0">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2">{t('tracking.empty.title')}</h3>
                    <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('tracking.empty.desc') }} />
                </div>
            ) : (
                <div className="flex-1 bg-card border rounded-lg shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-card shadow-sm ring-1 ring-border/50">
                                <tr className="border-b bg-muted/30">
                                    <th className="w-8 py-3 px-2"></th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">PEDIDO</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground w-28 text-center">{t('tracking.table.status', { defaultValue: 'ESTADO' })}</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell w-24">CECO</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground w-full">{t('tracking.table.vendor_desc', { defaultValue: 'PROVEEDOR / DESCR.' })}</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center">MONEDA</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">{t('tracking.table.po_value', { defaultValue: 'VALOR PO' })}</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right">{t('tracking.table.real', { defaultValue: 'REAL (KSB1)' })}</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right" title="Incluye IGV (18%)">{t('tracking.table.paid', { defaultValue: 'PAGADO (Inc. IGV)' })}</th>
                                    <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground text-center hidden lg:table-cell">TRAZABILIDAD</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {filteredTransactions.map(txn => {
                                    const isExpanded = expandedPO === txn.po_number;
                                    const statusCfg = STATUS_CONFIG[txn.status];
                                    const StatusIcon = statusCfg?.icon || Clock;

                                    const IGV_RATE = 0.18;
                                    // Base imponible = total facturado (incluyendo pendientes) / 1.18
                                    const netInvoiced = txn.total_invoiced / (1 + IGV_RATE);
                                    const igvInvoiced = txn.total_invoiced - netInvoiced;

                                    return (
                                        <>
                                            <tr
                                                key={txn.po_number}
                                                className="hover:bg-muted/10 transition-colors cursor-pointer"
                                                onClick={() => toggleExpand(txn.po_number)}
                                            >
                                                {/* Chevron */}
                                                <td className="py-2.5 px-2 text-muted-foreground text-center">
                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 mx-auto" /> : <ChevronRight className="w-3.5 h-3.5 mx-auto" />}
                                                </td>

                                                {/* PO Number */}
                                                <td className="py-2.5 px-4">
                                                    <div className="flex flex-row items-center gap-1.5 w-max">
                                                        <span className="font-mono text-xs font-bold text-primary">{txn.po_number}</span>
                                                        {txn.release_info && (
                                                            <ReleaseIndicator
                                                                status={txn.release_info.status}
                                                                strategy={txn.release_info.strategy}
                                                            />
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status Badge */}
                                                <td className="py-2.5 px-4 text-center">
                                                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold", statusCfg?.color)}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {statusCfg?.label}
                                                    </span>
                                                </td>

                                                {/* CeCo */}
                                                <td className="py-2.5 px-4 hidden md:table-cell">
                                                    <span className="text-xs font-mono text-muted-foreground">{txn.cost_center}</span>
                                                </td>

                                                {/* Vendor */}
                                                <td className="py-2.5 px-4 max-w-[200px] xl:max-w-[300px]">
                                                    <p className="text-xs font-medium truncate block" title={txn.vendor_name || ''}>{txn.vendor_name || t('tracking.list.no_vendor')}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate block" title={txn.description || ''}>{txn.description}</p>
                                                </td>

                                                {/* Currency */}
                                                <td className="py-2.5 px-4 text-center border-l bg-muted/5">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase">{String(txn.currency || 'PEN').toUpperCase()}</span>
                                                </td>

                                                {/* PO Value */}
                                                <td className="py-2.5 px-4 text-right bg-muted/5">
                                                    <span className="text-xs font-bold">{formatCurrency(txn.po_value, txn.currency)}</span>
                                                </td>

                                                {/* Real Expense */}
                                                <td className="py-2.5 px-4 text-right bg-muted/5">
                                                    <span className={cn("text-xs font-bold", txn.total_real_expense > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground")}>
                                                        {txn.total_real_expense > 0 ? formatCurrency(txn.total_real_expense, txn.currency) : '—'}
                                                    </span>
                                                </td>

                                                {/* Paid */}
                                                <td className="py-2.5 px-4 text-right bg-muted/5">
                                                    <span className={cn("text-xs font-bold", txn.total_paid > 0 ? "text-green-600 dark:text-green-500" : "text-muted-foreground")}>
                                                        {txn.total_paid > 0 ? formatCurrency(txn.total_paid, txn.currency) : '—'}
                                                    </span>
                                                </td>

                                                {/* Links */}
                                                <td className="py-2.5 px-4 text-center hidden lg:table-cell">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <div className="relative">
                                                            <SourceDot label="SP" active={!!txn.solped || !!txn.me5a} title="Solicitud de Pedido" />
                                                            {(txn.solped?.release_date || txn.me5a?.release_date) && (
                                                                <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full">
                                                                    <ShieldCheck className="w-2.5 h-2.5 text-green-500" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <SourceDot label="KB" active={txn.ksb1_entries.length > 0} title={`KSB1 (${txn.ksb1_entries.length})`} />
                                                        <SourceDot label="FB" active={txn.fbl1n_entries.length > 0} title={`FBL1N (${txn.fbl1n_entries.length})`} />
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Expanded Detail */}
                                            {isExpanded && (
                                                <tr key={`${txn.po_number}-detail`}>
                                                    <td colSpan={10} className="border-t bg-muted/10 px-4 py-4 whitespace-normal">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                            {/* Solicitud de Pedido (ME5K + ME5A unificado) */}
                                                            {(() => {
                                                                const sp = txn.solped;
                                                                const ma = txn.me5a;
                                                                const hasSolped = sp || ma;
                                                                const isReleased = !!(sp?.release_date || ma?.release_date);
                                                                return (
                                                                    <DetailSection
                                                                        title={`📋 ${t('tracking.detail.solped_title')}`}
                                                                        data={hasSolped}
                                                                        empty={t('tracking.detail.solped_empty')}
                                                                        released={isReleased}
                                                                    >
                                                                        {hasSolped && (
                                                                            <div className="space-y-1 text-xs">
                                                                                <Row label="SolPed" value={sp?.pr_number || ma?.pr_number || ''} />
                                                                                <Row label="Descripción" value={sp?.description || ma?.description || ''} />
                                                                                <Row label="Fecha" value={sp?.request_date || ''} />
                                                                                <Row label="Liberación" value={sp?.release_date || ma?.release_date || ''} />
                                                                                <Row label="Cantidad" value={String((ma?.quantity || sp?.quantity) || '—')} />
                                                                                <Row label="Precio Unit." value={(ma?.unit_price) ? formatCurrency(ma.unit_price) : (sp?.unit_price ? formatCurrency(sp.unit_price) : '—')} />
                                                                                <Row label="Valor Total" value={ma?.total_value ? formatCurrency(ma.total_value) : (sp?.net_value ? formatCurrency(sp.net_value) : '—')} />
                                                                                <Row label="Cuenta" value={sp?.gl_account || ''} />
                                                                                {ma?.created_by && <Row label={t('tracking.detail.created_by')} value={ma.created_by} />}
                                                                                {ma?.po_date && <Row label={t('tracking.detail.po_date')} value={ma.po_date} />}
                                                                            </div>
                                                                        )}
                                                                    </DetailSection>
                                                                );
                                                            })()}

                                                            {/* FBL1N — al lado derecho de Solicitud */}
                                                            <DetailSection title={`🧾 ${t('tracking.detail.fbl1n_title')} — ${txn.fbl1n_entries.length} ${t('tracking.detail.records_suffix')}`} data={txn.fbl1n_entries.length > 0 ? true : null} empty={t('tracking.detail.fbl1n_empty')}>
                                                                {txn.fbl1n_entries.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        {txn.fbl1n_entries.slice(0, 5).map((e, i) => (
                                                                            <div key={i} className="text-xs border-l-2 border-green-300 pl-2">
                                                                                <div className="flex justify-between">
                                                                                    <span className="font-medium">
                                                                                        {t('tracking.detail.doc')} {e.document_number}
                                                                                        {e.doc_type && (
                                                                                            <span className="ml-1 px-1 py-0.5 rounded bg-muted text-[9px] font-mono text-muted-foreground">{e.doc_type}</span>
                                                                                        )}
                                                                                    </span>
                                                                                    <span className={cn("font-bold", e.status === 'paid' ? "text-green-700" : "text-orange-600")}>
                                                                                        {formatCurrency(e.amount)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex justify-between">
                                                                                    <span className="text-muted-foreground">{e.posting_date} • {e.description}</span>
                                                                                    <span className={cn('text-[10px] font-bold', e.status === 'paid' ? 'text-green-600' : 'text-orange-500')}>
                                                                                        {e.status === 'paid' ? `✓ ${t('tracking.detail.paid_status')}` : `◷ ${t('tracking.detail.pending_status')}`}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {txn.fbl1n_entries.length > 5 && (
                                                                            <p className="text-[10px] text-muted-foreground italic">{t('tracking.detail.more_records', { count: txn.fbl1n_entries.length - 5 })}</p>
                                                                        )}
                                                                        <div className="mt-2 text-xs border rounded-md overflow-hidden dark:border-slate-800">
                                                                            <div className="bg-muted/30 px-3 py-1.5 flex justify-between border-b dark:border-slate-800">
                                                                                <span className="text-muted-foreground" title="Deducido (Total Facturado / 1.18)">Base Imponible: <span className="font-bold text-foreground">{formatCurrency(netInvoiced)}</span></span>
                                                                                <span className="text-muted-foreground">IGV (18%): <span className="font-bold text-foreground">{formatCurrency(igvInvoiced)}</span></span>
                                                                            </div>
                                                                            <div className="px-3 py-2 font-bold flex justify-between bg-card">
                                                                                <span>Pagado Total: {formatCurrency(txn.total_paid)}</span>
                                                                                <span>Facturado Total: {formatCurrency(txn.total_invoiced)}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </DetailSection>

                                                            {/* KSB1 — debajo de Solicitud */}
                                                            <DetailSection title={`💰 ${t('tracking.detail.ksb1_title')} — ${txn.ksb1_entries.length} ${t('tracking.detail.records_suffix')}`} data={txn.ksb1_entries.length > 0 ? true : null} empty={t('tracking.detail.ksb1_empty')}>
                                                                {txn.ksb1_entries.length > 0 && (
                                                                    <div className="space-y-2">
                                                                        {txn.ksb1_entries.slice(0, 5).map((e, i) => (
                                                                            <div key={i} className="text-xs border-l-2 border-amber-300 pl-2">
                                                                                <div className="flex justify-between">
                                                                                    <span className="font-medium">{e.cost_element_name || e.cost_element}</span>
                                                                                    <span className="font-bold text-amber-700">{formatCurrency(e.amount)}</span>
                                                                                </div>
                                                                                <span className="text-muted-foreground">{e.posting_date} • {e.description || e.reference_doc}</span>
                                                                            </div>
                                                                        ))}
                                                                        {txn.ksb1_entries.length > 5 && (
                                                                            <p className="text-[10px] text-muted-foreground italic">{t('tracking.detail.more_records', { count: txn.ksb1_entries.length - 5 })}</p>
                                                                        )}
                                                                        <div className="text-xs font-bold text-right pt-1 border-t">
                                                                            {t('tracking.detail.total')}: {formatCurrency(txn.total_real_expense)}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </DetailSection>
                                                        </div>
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
            )}
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────

function MetricCard({ icon: Icon, label, value, sub, color }: {
    icon: any;
    label: string;
    value: string;
    sub: string;
    color: string;
}) {
    return (
        <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-4 h-4", color)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <p className="text-lg font-bold tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground">{sub}</p>
        </div>
    );
}

function SourceDot({ label, active, title }: { label: string; active: boolean; title: string }) {
    return (
        <span
            title={title}
            className={cn(
                "inline-flex items-center justify-center w-6 h-6 rounded-full text-[8px] font-bold border",
                active
                    ? "bg-primary/10 text-primary border-primary/30"
                    : "bg-muted/30 text-muted-foreground border-transparent"
            )}
        >
            {label}
        </span>
    );
}

function DetailSection({ title, data, empty, released, children }: {
    title: string;
    data: any;
    empty: string;
    released?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-card border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold">{title}</h4>
                {released && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800">
                        <ShieldCheck className="w-3 h-3" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Liberada</span>
                    </div>
                )}
            </div>
            {data ? children : (
                <p className="text-[10px] text-muted-foreground italic">{empty}</p>
            )}
        </div>
    );
}

function ReleaseIndicator({ status, strategy }: { status: string; strategy: string }) {
    const isFull = status === 'XXX';
    const isPartial = status === 'XX';
    const isInitial = status === 'X';

    if (!status && !strategy) return null;

    let color = "text-muted-foreground/40";
    let Icon = Shield;
    let label = "Pendiente";

    if (isFull) {
        color = "text-green-500";
        Icon = ShieldCheck;
        label = "Liberación Total";
    } else if (isPartial) {
        color = "text-blue-500";
        Icon = ShieldAlert;
        label = "Liberación Parcial (2/3)";
    } else if (isInitial) {
        color = "text-amber-500";
        Icon = ShieldAlert;
        label = "Liberación Inicial (1/3)";
    }

    return (
        <div title={`${label} (Estrategia: ${strategy})`} className="shrink-0">
            <Icon className={cn("w-3.5 h-3.5", color)} />
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-right max-w-[60%] truncate">{value || '—'}</span>
        </div>
    );
}
