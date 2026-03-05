import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    Search,
    ShoppingCart,
    CreditCard,
    ChevronDown,
    ChevronRight,
    DollarSign,
    AlertTriangle,
    Filter,
    TrendingUp,
    FileText
} from 'lucide-react';
import { CrossReferenceService, type VendorSummary } from '../services/crossReferenceService';
import { cn } from '../utils/cn';



function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
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

export function VendorsPage() {
    const { t } = useTranslation();
    const [vendors, setVendors] = useState<VendorSummary[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedVendor, setExpandedVendor] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'po_total' | 'name' | 'po_count'>('po_total');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await CrossReferenceService.getVendorData();
            setVendors(result);
        } catch (error) {
            console.error('Error loading vendor data:', error);
        }
    };

    // Sort & Filter
    const filteredVendors = useMemo(() => {
        let result = vendors.filter(v =>
            searchTerm === '' ||
            v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.code.includes(searchTerm)
        );

        result.sort((a, b) => {
            if (sortBy === 'po_total') return b.po_total - a.po_total;
            if (sortBy === 'po_count') return b.po_count - a.po_count;
            return a.name.localeCompare(b.name);
        });

        return result;
    }, [vendors, searchTerm, sortBy]);

    // Metrics
    const metrics = useMemo(() => ({
        totalVendors: vendors.length,
        totalPOValue: vendors.reduce((s, v) => s + v.po_total, 0),
        totalInvoiced: vendors.reduce((s, v) => s + v.invoice_total, 0),
        totalPaid: vendors.reduce((s, v) => s + v.paid_total, 0),
        totalPending: vendors.reduce((s, v) => s + v.pending_total, 0)
    }), [vendors]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="w-6 h-6 text-primary" />
                    {t('vendors.title')}
                </h1>
                <p className="text-muted-foreground text-sm">
                    {t('vendors.subtitle')}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <MiniKPI icon={Users} label={t('vendors.kpi.vendors')} value={String(metrics.totalVendors)} color="text-blue-600" />
                <MiniKPI icon={ShoppingCart} label={t('vendors.kpi.po_value')} value={formatCurrency(metrics.totalPOValue)} color="text-violet-600" />
                <MiniKPI icon={CreditCard} label={t('vendors.kpi.invoiced')} value={formatCurrency(metrics.totalInvoiced)} color="text-amber-600" />
                <MiniKPI icon={TrendingUp} label={t('vendors.kpi.paid')} value={formatCurrency(metrics.totalPaid)} color="text-green-600" />
                <MiniKPI icon={DollarSign} label={t('vendors.kpi.pending')} value={formatCurrency(metrics.totalPending)} color="text-red-600" />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('vendors.search_placeholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2.5 bg-card border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    <option value="po_total">{t('vendors.sort.amount')}</option>
                    <option value="po_count">{t('vendors.sort.count')}</option>
                    <option value="name">{t('vendors.sort.alpha')}</option>
                </select>
            </div>

            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Filter className="w-3 h-3" />
                {t('vendors.count_label', { count: filteredVendors.length })}
            </p>

            {/* Empty state */}
            {vendors.length === 0 ? (
                <div className="bg-card border rounded-lg p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('vendors.empty.title')}</h3>
                    <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('vendors.empty.desc') }} />
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredVendors.map(v => {
                        const isExpanded = expandedVendor === v.code;
                        return (
                            <div key={v.code} className="bg-card border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <button
                                    onClick={() => setExpandedVendor(prev => prev === v.code ? null : v.code)}
                                    className="w-full px-4 py-3 flex items-center gap-4 text-left hover:bg-muted/20 transition-colors"
                                >
                                    <div className="shrink-0 text-muted-foreground">
                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </div>

                                    {/* Vendor Code */}
                                    <div className="w-24 shrink-0">
                                        <span className="font-mono text-[10px] text-muted-foreground">{v.code}</span>
                                    </div>

                                    {/* Vendor Name */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{v.name}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            {v.cost_centers.join(', ') || t('vendors.card.no_ceco')}
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="hidden md:flex items-center gap-6 shrink-0 text-right">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">{t('vendors.card.pos')}</p>
                                            <p className="text-xs font-bold">{v.po_count}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">{t('vendors.card.po_value')}</p>
                                            <p className="text-xs font-bold">{formatCurrency(v.po_total)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">{t('vendors.card.invoices')}</p>
                                            <p className="text-xs font-bold">{v.invoice_count || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground">{t('vendors.card.paid')}</p>
                                            <p className={cn("text-xs font-bold", v.paid_total > 0 ? "text-green-600" : "text-muted-foreground")}>
                                                {v.paid_total > 0 ? formatCurrency(v.paid_total) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* Expanded detail */}
                                {isExpanded && (
                                    <div className="border-t bg-muted/10 px-4 py-4">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {/* POs */}
                                            <div className="bg-card border rounded-lg p-3">
                                                <h4 className="text-xs font-bold mb-3 flex items-center gap-1">
                                                    <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
                                                    {t('vendors.detail.orders')} ({v.pos.length})
                                                </h4>
                                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                    {v.pos.map(po => (
                                                        <div key={po.po_number} className="flex justify-between items-center text-xs border-l-2 border-blue-300 pl-2">
                                                            <div>
                                                                <span className="font-mono font-bold text-primary">{po.po_number}</span>
                                                                <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{po.description}</p>
                                                            </div>
                                                            <span className="font-bold shrink-0 ml-2">{formatCurrency(po.value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="text-xs font-bold text-right pt-2 border-t mt-2">
                                                    {t('vendors.detail.total')}: {formatCurrency(v.po_total)}
                                                </div>
                                            </div>

                                            {/* Invoices */}
                                            <div className="bg-card border rounded-lg p-3">
                                                <h4 className="text-xs font-bold mb-3 flex items-center gap-1">
                                                    <FileText className="w-3.5 h-3.5 text-amber-500" />
                                                    {t('vendors.detail.invoices')} ({v.invoices.length})
                                                </h4>
                                                {v.invoices.length === 0 ? (
                                                    <p className="text-[10px] text-muted-foreground italic">{t('vendors.detail.no_invoices')}</p>
                                                ) : (
                                                    <>
                                                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                                            {v.invoices.slice(0, 10).map((inv, i) => (
                                                                <div key={i} className="flex justify-between items-center text-xs border-l-2 border-amber-300 pl-2">
                                                                    <div>
                                                                        <span className="font-mono font-medium">{t('vendors.detail.doc')} {inv.doc_number}</span>
                                                                        <p className="text-[10px] text-muted-foreground">{formatExcelDate(inv.date)}</p>
                                                                    </div>
                                                                    <div className="text-right shrink-0 ml-2">
                                                                        <span className="font-bold">{formatCurrency(inv.amount)}</span>
                                                                        <p className={cn("text-[10px] font-bold", inv.status === 'paid' ? "text-green-600" : "text-orange-500")}>
                                                                            {inv.status === 'paid' ? `✓ ${t('vendors.detail.paid_status')}` : `◷ ${t('vendors.detail.pending_status')}`}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                            {v.invoices.length > 10 && (
                                                                <p className="text-[10px] text-muted-foreground italic">{t('vendors.detail.more', { count: v.invoices.length - 10 })}</p>
                                                            )}
                                                        </div>
                                                        <div className="text-xs font-bold pt-2 border-t mt-2 flex justify-between">
                                                            <span className="text-green-600">{t('vendors.detail.paid_label')}: {formatCurrency(v.paid_total)}</span>
                                                            <span className="text-orange-500">{t('vendors.detail.pending_label')}: {formatCurrency(v.pending_total)}</span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────

function MiniKPI({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className="bg-card border rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon className={cn("w-3.5 h-3.5", color)} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            </div>
            <p className="text-sm font-bold tracking-tight">{value}</p>
        </div>
    );
}
