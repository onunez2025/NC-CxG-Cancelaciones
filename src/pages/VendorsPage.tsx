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
        <div className="flex flex-col h-full gap-5 animate-in fade-in duration-500 p-1">
            <div className="shrink-0 mb-2 px-1">
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                    <Users className="w-6 h-6 text-primary" />
                    Proveedores
                </h1>
                <p className="text-slate-500 text-sm font-medium">
                    Gestión y análisis de desempeño de proveedores
                </p>
            </div>

            {/* KPI Cards */}
            <div className="shrink-0 mb-6">
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <MetricCard icon={Users} label="Total Proveedores" value={String(metrics.totalVendors)} color="text-indigo-600" />
                    <MetricCard icon={ShoppingCart} label="Total Órdenes" value={formatCurrency(metrics.totalPOValue)} color="text-purple-600" />
                    <MetricCard icon={CreditCard} label="Total Facturado" value={formatCurrency(metrics.totalInvoiced)} color="text-amber-600" />
                    <MetricCard icon={TrendingUp} label="Total Pagado" value={formatCurrency(metrics.totalPaid)} color="text-emerald-600" />
                    <MetricCard icon={DollarSign} label="Saldo Pendiente" value={formatCurrency(metrics.totalPending)} color="text-red-600" />
                </div>
            </div>

            <div className="shrink-0 mb-6">
                <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm flex items-center flex-wrap gap-2">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o código de proveedor..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400"
                        />
                    </div>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent border-none px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer min-w-[150px]"
                    >
                        <option value="po_total">Monto PO</option>
                        <option value="po_count">Cantidad PO</option>
                        <option value="name">Alfabético</option>
                    </select>
                </div>

                <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5" />
                        Mostrando {filteredVendors.length} registros
                    </p>
                </div>
            </div>

            {/* Empty state */}
            {vendors.length === 0 ? (
                <div className="bg-card border rounded-lg p-12 text-center">
                    <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-bold mb-2">{t('vendors.empty.title')}</h3>
                    <p className="text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: t('vendors.empty.desc') }} />
                </div>
            ) : (
                <div className="flex-1 bg-card border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
                                <tr>
                                    <th className="w-10 py-4 px-3"></th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500">Código</th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 w-full">Proveedor</th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 text-center">Cant. PO</th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right">Valor Total PO</th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right">Cant. Facturas</th>
                                    <th className="py-4 px-4 font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right">Total Pagado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y relative">
                                {filteredVendors.map(v => {
                                    const isExpanded = expandedVendor === v.code;
                                    return (
                                        <>
                                            <tr
                                                key={v.code}
                                                className="hover:bg-muted/10 transition-colors cursor-pointer"
                                                onClick={() => setExpandedVendor(prev => prev === v.code ? null : v.code)}
                                            >
                                                <td className="py-3 px-3 text-slate-400 text-center">
                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 mx-auto" /> : <ChevronRight className="w-3.5 h-3.5 mx-auto" />}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="font-mono text-xs font-bold text-primary">{v.code}</span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="max-w-[300px]">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{v.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 truncate uppercase mt-0.5">{v.cost_centers.join(', ') || 'Sin CeCo'}</p>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-center font-bold text-slate-600 dark:text-slate-400">{v.po_count}</td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-700 bg-slate-50/30 dark:bg-slate-900/10">{formatCurrency(v.po_total)}</td>
                                                <td className="py-3 px-4 text-right font-bold text-slate-500">{v.invoice_count || '—'}</td>
                                                <td className="py-3 px-4 text-right font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">
                                                    {v.paid_total > 0 ? formatCurrency(v.paid_total) : '—'}
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr key={`${v.code}-detail`}>
                                                    <td colSpan={7} className="border-t bg-slate-50/50 dark:bg-slate-900/30 px-6 py-6 whitespace-normal">
                                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                            {/* POs */}
                                                            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                                                <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-500 uppercase tracking-tighter">
                                                                    <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950 rounded-lg">
                                                                        <ShoppingCart className="w-3.5 h-3.5 text-indigo-500" />
                                                                    </div>
                                                                    Órdenes Asociadas ({v.pos.length})
                                                                </h4>
                                                                <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar pr-1">
                                                                    {v.pos.map(po => (
                                                                        <div key={po.po_number} className="flex justify-between items-center text-xs border-l-2 border-indigo-200 dark:border-indigo-900 pl-3 py-1 hover:bg-indigo-50/30 transition-colors">
                                                                            <div>
                                                                                <span className="font-mono font-bold text-indigo-600">{po.po_number}</span>
                                                                                <p className="text-[10px] font-bold text-slate-400 truncate max-w-[250px] mt-0.5">{po.description}</p>
                                                                            </div>
                                                                            <span className="font-bold text-slate-700 dark:text-slate-300 ml-4">{formatCurrency(po.value)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                                <div className="text-sm font-bold text-right pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 text-indigo-600">
                                                                    Total Órdenes: {formatCurrency(v.po_total)}
                                                                </div>
                                                            </div>

                                                            {/* Invoices */}
                                                            <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                                                                <h4 className="text-xs font-bold mb-4 flex items-center gap-2 text-slate-500 uppercase tracking-tighter">
                                                                    <div className="p-1.5 bg-amber-50 dark:bg-amber-950 rounded-lg">
                                                                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                                                                    </div>
                                                                    Facturas Recibidas ({v.invoices.length})
                                                                </h4>
                                                                {v.invoices.length === 0 ? (
                                                                    <div className="h-40 flex items-center justify-center text-slate-400 italic text-[11px] font-medium">No se registran facturas FB60/MIRO</div>
                                                                ) : (
                                                                    <>
                                                                        <div className="space-y-2 max-h-[300px] overflow-auto custom-scrollbar pr-1">
                                                                            {v.invoices.slice(0, 50).map((inv, i) => (
                                                                                <div key={i} className="flex justify-between items-center text-xs border-l-2 border-amber-200 dark:border-amber-900 pl-3 py-1 hover:bg-amber-50/30 transition-colors">
                                                                                    <div>
                                                                                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">Doc {inv.doc_number}</span>
                                                                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{formatExcelDate(inv.date)}</p>
                                                                                    </div>
                                                                                    <div className="text-right ml-4">
                                                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{formatCurrency(inv.amount)}</span>
                                                                                        <p className={cn("text-[10px] font-bold uppercase tracking-tighter mt-0.5", inv.status === 'paid' ? "text-emerald-500" : "text-amber-500")}>
                                                                                            {inv.status === 'paid' ? '✓ Pagado' : '◷ Pendiente'}
                                                                                        </p>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            {v.invoices.length > 50 && (
                                                                                <p className="text-[10px] text-slate-400 italic text-center py-2">+ {v.invoices.length - 50} registros adicionales</p>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-[11px] font-bold pt-4 border-t border-slate-100 dark:border-slate-800 mt-4 flex justify-between uppercase tracking-tighter">
                                                                            <span className="text-emerald-600">Total Pagado: {formatCurrency(v.paid_total)}</span>
                                                                            <span className="text-red-500">Saldo Pendiente: {formatCurrency(v.pending_total)}</span>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
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

function MetricCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
    return (
        <div className={cn("p-6 rounded-2xl border transition-all shadow-sm flex flex-col justify-between h-full bg-card border-slate-100 dark:border-slate-800")}>
            <div className="flex justify-between items-start mb-4">
                <p className={cn("text-[10px] font-bold uppercase tracking-tighter opacity-80", color)}>{label}</p>
                <div className={cn("p-2 rounded-xl bg-white/50 dark:bg-black/20", color)}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{value}</h3>
        </div>
    );
}
