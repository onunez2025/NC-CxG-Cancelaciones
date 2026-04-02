import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    ShoppingCart,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Upload,
    ArrowRight,
    BarChart3,
    Users,
    FileText,
    CreditCard,
    CheckCircle2,
    Clock,
    Package
} from 'lucide-react';
import { CrossReferenceService, type EnrichedTransaction, type TrackingMetrics } from '../services/crossReferenceService';
import { SapParserService } from '../services/sapParserService';
import { CostCentersService } from '../services/costCentersService';
import type { CostCenter } from '../types';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

function formatNumber(n: number): string {
    return new Intl.NumberFormat('es-PE').format(n);
}

const STATUS_COLORS: Record<string, string> = {
    solicitado: 'bg-blue-500',
    pedido: 'bg-violet-500',
    recibido: 'bg-amber-500',
    facturado: 'bg-orange-500',
    pagado: 'bg-green-500'
};



export function DashboardPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
    const [metrics, setMetrics] = useState<TrackingMetrics | null>(null);
    const [hasData, setHasData] = useState(false);
    const [cecos, setCecos] = useState<CostCenter[]>([]);
    const [uploadsMeta, setUploadsMeta] = useState<any[]>([]);

    useEffect(() => {
        const loadDashboard = async () => {
            try {
                const uploads = await SapParserService.getUploads();
                setUploadsMeta(uploads);
                setHasData(uploads.length > 0);

                if (uploads.length > 0) {
                    const [trackingResult, cecosData] = await Promise.all([
                        CrossReferenceService.getTrackingData(),
                        CostCentersService.getCostCenters()
                    ]);
                    setTransactions(trackingResult.transactions);
                    setMetrics(trackingResult.metrics);
                    setCecos(cecosData);
                }
            } catch (error) {
                console.error("Dashboard Load Error", error);
            }
        };
        loadDashboard();
    }, []);

    // ─── Computed analytics ──────────────────────────
    const analytics = useMemo(() => {
        if (transactions.length === 0) return null;

        // Status distribution
        const statusCounts: Record<string, number> = {};
        transactions.forEach(t => {
            statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        });

        // Spend by CeCo
        const spendByCeCo: { code: string; name: string; amount: number }[] = [];
        const cecoMap = new Map<string, number>();
        transactions.forEach(t => {
            if (t.cost_center) {
                cecoMap.set(t.cost_center, (cecoMap.get(t.cost_center) || 0) + t.po_value);
            }
        });
        cecoMap.forEach((amount, code) => {
            const ceco = cecos.find(c => c.code === code);
            spendByCeCo.push({ code, name: ceco?.name || code, amount });
        });
        spendByCeCo.sort((a, b) => b.amount - a.amount);

        // Top Vendors
        const vendorMap = new Map<string, { name: string; amount: number; count: number }>();
        transactions.forEach(t => {
            if (t.vendor_name) {
                const existing = vendorMap.get(t.vendor_code) || { name: t.vendor_name, amount: 0, count: 0 };
                existing.amount += t.po_value;
                existing.count += 1;
                vendorMap.set(t.vendor_code, existing);
            }
        });
        const topVendors = [...vendorMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 7);

        // Recent Activity (last 5 transactions by PO number desc)
        const recentPOs = [...transactions].sort((a, b) => b.po_number.localeCompare(a.po_number)).slice(0, 5);

        // File upload status
        const uploadStatus = ['ME2K', 'ME5K', 'KSB1', 'ME5A', 'FBL1N'].map(type => {
            const hasUpload = uploadsMeta.some(u => u.transaction_type === type);
            // Since uploadsMeta doesn't have .data, we can't show immediate row count without fetching all.
            // For dashboard simplicity, we just mark loaded or not.
            return {
                type,
                count: hasUpload ? 'Loaded' : 0,
                loaded: hasUpload
            };
        });

        return { statusCounts, spendByCeCo, topVendors, recentPOs, uploadStatus };
    }, [transactions, cecos, uploadsMeta]);

    // ─── No data state ───────────────────────────────
    if (!hasData) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                        {t('nav.dashboard')}
                    </h1>
                    <p className="text-muted-foreground text-sm">{t('common.welcome')}, {user?.username || 'Administrador'}</p>
                </div>

                <div className="bg-card border rounded-lg p-12 text-center">
                    <Upload className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">{t('dashboard.empty.title')}</h3>
                    <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                        {t('dashboard.empty.desc')}
                    </p>
                    <button
                        onClick={() => navigate('/files')}
                        className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2"
                    >
                        <Upload className="w-4 h-4" />
                        {t('dashboard.empty.button')}
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    const maxCecoAmount = analytics ? Math.max(...analytics.spendByCeCo.map(c => c.amount), 1) : 1;
    const maxVendorAmount = analytics ? Math.max(...analytics.topVendors.map(v => v.amount), 1) : 1;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <LayoutDashboard className="w-6 h-6 text-primary" />
                    {t('nav.dashboard')}
                </h1>
                <p className="text-muted-foreground text-sm">{t('common.welcome')}, {user?.username || 'Administrador'}</p>
            </div>

            {/* KPI Cards */}
            {metrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <KPICard
                        icon={ShoppingCart}
                        label={t('dashboard.pendingSolped')}
                        value={formatNumber(metrics.total_pos)}
                        sub={`${metrics.pos_with_solped} ${t('dashboard.withSolped')}`}
                        color="text-blue-600"
                        bgColor="bg-blue-50 dark:bg-blue-900/20"
                    />
                    <KPICard
                        icon={DollarSign}
                        label={t('dashboard.committed')}
                        value={formatCurrency(metrics.total_po_value)}
                        sub={t('dashboard.poTotalValue')}
                        color="text-violet-600"
                        bgColor="bg-violet-50 dark:bg-violet-900/20"
                    />
                    <KPICard
                        icon={BarChart3}
                        label={t('dashboard.realCost')}
                        value={formatCurrency(metrics.total_real_expense)}
                        sub={t('dashboard.bookedInKSB1')}
                        color="text-amber-600"
                        bgColor="bg-amber-50 dark:bg-amber-900/20"
                    />
                    <KPICard
                        icon={TrendingUp}
                        label={t('dashboard.totalPaid')}
                        value={formatCurrency(metrics.total_paid)}
                        sub={`${metrics.pos_fully_paid} ${t('dashboard.paidPOs')}`}
                        color="text-green-600"
                        bgColor="bg-green-50 dark:bg-green-900/20"
                    />
                </div>
            )}

            {/* Three columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Status Distribution */}
                {analytics && (
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            {t('dashboard.requestStatus')}
                        </h3>
                        <div className="space-y-3">
                            {['solicitado', 'pedido', 'recibido', 'facturado', 'pagado'].map((key) => {
                                const label = t(`dashboard.status_labels.${key}`);
                                const count = analytics.statusCounts[key] || 0;
                                const pct = metrics ? (count / metrics.total_pos * 100) : 0;
                                return (
                                    <div key={key} className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-medium">{label}</span>
                                            <span className="text-muted-foreground">{count} ({pct.toFixed(0)}%)</span>
                                        </div>
                                        <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-500", STATUS_COLORS[key])}
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Spend by CeCo */}
                {analytics && (
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-primary" />
                            {t('dashboard.spendingByCeco')}
                        </h3>
                        <div className="space-y-3">
                            {analytics.spendByCeCo.slice(0, 6).map(c => (
                                <div key={c.code} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-medium truncate max-w-[55%]" title={c.name}>{c.name}</span>
                                        <span className="font-mono text-muted-foreground">{formatCurrency(c.amount)}</span>
                                    </div>
                                    <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary/70 transition-all duration-500"
                                            style={{ width: `${(c.amount / maxCecoAmount) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {analytics.spendByCeCo.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">{t('dashboard.empty.ceco')}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Top Vendors */}
                {analytics && (
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            {t('dashboard.topVendors')}
                        </h3>
                        <div className="space-y-2.5">
                            {analytics.topVendors.map((v, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="font-medium truncate max-w-[55%]" title={v.name}>{v.name}</span>
                                        <span className="font-mono text-muted-foreground">{v.count} POs</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500"
                                                style={{ width: `${(v.amount / maxVendorAmount) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">{formatCurrency(v.amount)}</span>
                                    </div>
                                </div>
                            ))}
                            {analytics.topVendors.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">{t('dashboard.empty.vendors')}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom row: Recent Activity + Upload Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent POs */}
                {analytics && (
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                {t('dashboard.recentActivity')}
                            </h3>
                            <button
                                onClick={() => navigate('/tracking')}
                                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                            >
                                {t('dashboard.seeAll')} <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {analytics.recentPOs.map(po => (
                                <div key={po.po_number} className="flex items-center gap-3 py-2 border-b last:border-0">
                                    <StatusIcon status={po.status} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold font-mono text-primary">{po.po_number}</p>
                                        <p className="text-[10px] text-muted-foreground truncate">{po.vendor_name}</p>
                                    </div>
                                    <span className="text-xs font-bold shrink-0">{formatCurrency(po.po_value)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload Status */}
                {analytics && (
                    <div className="bg-card border rounded-lg p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4 text-primary" />
                                {t('dashboard.fileStatus')}
                            </h3>
                            <button
                                onClick={() => navigate('/files')}
                                className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                            >
                                {t('dashboard.manage')} <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            {analytics.uploadStatus.map(f => (
                                <div key={f.type} className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shrink-0",
                                        f.loaded ? "bg-green-500" : "bg-red-500"
                                    )} />
                                    <span className="text-xs font-bold font-mono w-12">{f.type}</span>
                                    <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all", f.loaded ? "bg-green-500" : "bg-muted")}
                                            style={{ width: f.loaded ? '100%' : '0%' }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono w-20 text-right">
                                        {f.loaded ? t('files.db.records_loaded') : t('dashboard.file_status.not_loaded')}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Alerts */}
                        {metrics && metrics.total_real_expense > metrics.total_po_value * 1.1 && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-red-700 dark:text-red-400">{t('dashboard.alert.over_execution_title')}</p>
                                        <p className="text-[10px] text-red-600/70">
                                            {t('dashboard.alert.over_execution_desc', {
                                                real: formatCurrency(metrics.total_real_expense),
                                                committed: formatCurrency(metrics.total_po_value)
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color, bgColor }: {
    icon: any; label: string; value: string; sub: string; color: string; bgColor: string;
}) {
    return (
        <div className="bg-card border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                <div className={cn("p-2 rounded-lg", bgColor)}>
                    <Icon className={cn("w-4 h-4", color)} />
                </div>
            </div>
            <p className="text-xl font-bold tracking-tight">{value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
        </div>
    );
}

function StatusIcon({ status }: { status: string }) {
    const icons: Record<string, any> = {
        solicitado: FileText,
        pedido: ShoppingCart,
        recibido: Package,
        facturado: CreditCard,
        pagado: CheckCircle2
    };
    const colors: Record<string, string> = {
        solicitado: 'text-blue-500',
        pedido: 'text-violet-500',
        recibido: 'text-amber-500',
        facturado: 'text-orange-500',
        pagado: 'text-green-500'
    };
    const Icon = icons[status] || Clock;
    return <Icon className={cn("w-4 h-4", colors[status] || 'text-muted-foreground')} />;
}
