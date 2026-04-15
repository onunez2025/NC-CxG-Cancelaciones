import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    BarChart3,
    TrendingUp,
    AlertTriangle,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    Search
} from 'lucide-react';
import { ManagementsService } from '../services/managementsService';
import { CostCentersService } from '../services/costCentersService';
import { CrossReferenceService } from '../services/crossReferenceService';
import { ExchangeRatesService } from '../services/exchangeRatesService';
import { useAuth } from '../hooks/useAuth';
import type { Management, CostCenter } from '../types';
import { cn } from '../utils/cn';
import type { BudgetExecutionSummary } from '../utils/budgetExecution';

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
}

export function BudgetVsRealPage() {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedManagement, setSelectedManagement] = useState(user?.management_id || 'atc');
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const isAdministrador = user?.role_name === 'Administrador';

    const [managements, setManagements] = useState<Management[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [executionData, setExecutionData] = useState<BudgetExecutionSummary | null>(null);

    useEffect(() => {
        ManagementsService.getManagements().then(setManagements).catch(console.error);
    }, []);

    // Load Cost Centers when management changes
    useEffect(() => {
        CostCentersService.getCostCenters().then(allCecos => {
            const cecos = allCecos.filter(c => c.management_id === selectedManagement && c.is_active);
            setCostCenters(cecos);
            setSelectedCostCenter('all');
        }).catch(console.error);
    }, [selectedManagement]);

    // Calculate Execution Data (server-side)
    useEffect(() => {
        const allRates = ExchangeRatesService.getRates();
        CrossReferenceService.getBudgetExecution(
            selectedYear, selectedManagement, selectedCostCenter, allRates
        )
            .then(setExecutionData)
            .catch(console.error);
    }, [selectedYear, selectedManagement, selectedCostCenter]);

    // Filter rows for table
    const filteredRows = useMemo(() => {
        if (!executionData) return [];
        return executionData.rows.filter(row =>
            row.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            row.account_code.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [executionData, searchTerm]);
    // Totals for the current view (all or specific CeCo)
    const totals = useMemo(() => {
        if (!executionData) return null;
        return {
            budgeted: executionData.total_budget,
            committed: executionData.total_committed,
            ordered: executionData.total_ordered,
            real: executionData.total_real,
            available: executionData.total_available,
            execution_pct: executionData.execution_pct
        };
    }, [executionData]);

    const getExecColor = (pct: number) => {
        if (pct === 0) return 'text-muted-foreground';
        if (pct < 50) return 'text-blue-600';
        if (pct <= 90) return 'text-green-600';
        if (pct <= 110) return 'text-amber-600';
        return 'text-red-600';
    };

    const getBarColor = (pct: number) => {
        if (pct <= 90) return 'bg-green-500';
        if (pct <= 110) return 'bg-amber-500';
        return 'bg-red-500';
    };

    const [selectedAccountForDetail, setSelectedAccountForDetail] = useState<{
        row: any; // Type should be BudgetExecutionRow but imports might cycle if not careful
        isOpen: boolean;
    } | null>(null);

    const openDetailModal = (row: any) => {
        setSelectedAccountForDetail({ row, isOpen: true });
    };

    const closeDetailModal = () => {
        setSelectedAccountForDetail(null);
    };

    return (
        <div className="flex flex-col h-full gap-5 animate-in fade-in duration-500 p-1">
            {/* Header Area */}
            <div className="flex items-center justify-between px-1 shrink-0 mb-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                        <BarChart3 className="w-6 h-6 text-primary" />
                        Ppto vs Real
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">
                        Seguimiento de ejecución presupuestal
                    </p>
                </div>

                <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-xl p-2 shadow-sm flex items-center gap-2">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent border-none px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer"
                    >
                        {[2024, 2025, 2026].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

                    <select
                        value={selectedManagement}
                        onChange={(e) => setSelectedManagement(e.target.value)}
                        disabled={!isAdministrador}
                        className="bg-transparent border-none px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer disabled:opacity-50"
                    >
                        {managements
                            .filter(m => isAdministrador || m.id === user?.management_id)
                            .map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                    </select>

                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

                    <select
                        value={selectedCostCenter}
                        onChange={(e) => setSelectedCostCenter(e.target.value)}
                        className="bg-transparent border-none px-3 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-0 outline-none cursor-pointer"
                    >
                        <option value="all">Todos los Centros</option>
                        {costCenters.map(ceco => (
                            <option key={ceco.id} value={ceco.id}>{ceco.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Main Content Area - Flex Row */}
            <div className="flex flex-col gap-6 flex-1 min-h-0">

                {/* Right Column: Cards + Table */}
                <div className="flex-1 min-w-0 flex flex-col min-h-0 space-y-4">

                    {/* Dynamic Hero Section */}
                    <div className="shrink-0">
                        {selectedCostCenter === 'all' ? (
                            /* Grid View for "All" */
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {/* Total Management Card */}
                                <div
                                    onClick={() => setSelectedCostCenter('all')}
                                    className={`py-2 px-5 h-[85px] rounded-xl border shadow-sm flex flex-col justify-between cursor-pointer transition-all hover:shadow-md ${selectedCostCenter === 'all'
                                        ? 'bg-card border-primary ring-1 ring-primary'
                                        : 'bg-card/50 border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Total Gerencia ({selectedYear})</p>
                                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                                <DollarSign className="w-4 h-4 text-primary" />
                                            </div>
                                        </div>
                                        <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">{formatCurrency(totals?.budgeted || 0)}</h2>
                                    </div>
                                    <div className="mt-1 pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px] font-bold">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="w-3 h-3 text-slate-400" />
                                            <span className="text-slate-400 uppercase tracking-widest text-[8px]">Ejecutado:</span>
                                        </div>
                                        <span className="font-bold text-slate-600">{formatCurrency(totals?.real || 0)}</span>
                                    </div>
                                </div>

                                {/* KPI Cards */}
                                <SummaryMiniCard
                                    label="Comprometido Pend."
                                    value={formatCurrency(totals?.committed || 0)}
                                    color="text-indigo-600"
                                    note="(Solped)"
                                    bgColor="bg-indigo-50/50 dark:bg-indigo-900/10"
                                    icon={<ArrowUpRight className="w-5 h-5 text-indigo-500" />}
                                />
                                <SummaryMiniCard
                                    label="Ordenado Pend."
                                    value={formatCurrency(totals?.ordered || 0)}
                                    color="text-purple-600"
                                    note="(OC)"
                                    bgColor="bg-purple-50/50 dark:bg-purple-900/10"
                                    icon={<ArrowDownRight className="w-5 h-5 text-purple-500" />}
                                />
                                <SummaryMiniCard
                                    label="Saldo Disponible"
                                    value={formatCurrency(totals?.available || 0)}
                                    color={(totals?.available || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}
                                    bgColor={(totals?.available || 0) >= 0 ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'bg-red-50/50 dark:bg-red-900/10'}
                                    icon={(totals?.available || 0) < 0 ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <DollarSign className="w-5 h-5 text-emerald-500" />}
                                />
                            </div>
                        ) : (
                            /* Sticky Hero Card for Selected CECO */
                            (() => {
                                const ceco = costCenters.find(c => c.id === selectedCostCenter);
                                const execPct = totals?.execution_pct || 0;
                                return (
                                    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-1 -mx-2 px-2 border-b border-border/50 shadow-sm animate-in fade-in slide-in-from-top-2">
                                        <div className="bg-card p-5 rounded-lg border border-primary/20 shadow-sm ring-1 ring-primary/10 relative overflow-hidden">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between relative z-10 gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
                                                            {ceco?.code}
                                                        </span>
                                                        <h2 className="text-lg font-bold text-foreground truncate">{ceco?.name}</h2>
                                                        <span className={cn("ml-2 text-xs font-bold px-2 py-0.5 rounded-full border bg-background", getExecColor(execPct))}>
                                                            {execPct.toFixed(1)}% Ejecutado Total
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-baseline gap-x-8 gap-y-4 mt-4">
                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Presupuesto</p>
                                                            <h3 className="text-2xl font-bold text-primary tracking-tight">{formatCurrency(totals?.budgeted || 0)}</h3>
                                                        </div>
                                                        <div className="h-10 w-px bg-border hidden sm:block"></div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                                                Comprometido Pend.
                                                            </div>
                                                            <p className="text-lg font-bold text-indigo-700">{formatCurrency(totals?.committed || 0)}</p>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                                Ordenado Pend.
                                                            </div>
                                                            <p className="text-lg font-bold text-purple-700">{formatCurrency(totals?.ordered || 0)}</p>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                                                Ejecutado (Real)
                                                            </div>
                                                            <p className="text-lg font-bold text-amber-700">{formatCurrency(totals?.real || 0)}</p>
                                                        </div>

                                                        <div className="h-10 w-px bg-border hidden sm:block"></div>

                                                        <div>
                                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Disponible</p>
                                                            <p className={cn("text-xl font-bold", (totals?.available || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                                                                {formatCurrency(totals?.available || 0)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar */}
                                                    <div className="mt-4 w-full h-1.5 bg-muted rounded-full overflow-hidden flex">
                                                        <div className={cn("h-full transition-all duration-500", getBarColor(execPct))} style={{ width: `${Math.min(execPct, 100)}%` }}></div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => setSelectedCostCenter('all')}
                                                    className="self-start sm:self-center px-3 py-1.5 bg-muted/50 hover:bg-muted rounded text-xs font-medium transition-colors flex items-center gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
                                                >
                                                    <ArrowUpRight className="w-3.5 h-3.5 rotate-180" />
                                                    Ver Todos
                                                </button>
                                            </div>

                                            {/* Decorative background element */}
                                            <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                                        </div>
                                    </div>
                                );
                            })()
                        )}
                    </div>

                    {/* Table Container */}
                    <div className="flex-1 bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-0">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Equilibrio de búsqueda..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                                />
                            </div>
                            <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                                {filteredRows.length} Registros
                            </div>
                        </div>

                        <div className="overflow-auto flex-1 relative custom-scrollbar">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                    <tr>
                                        <th className="px-6 py-4 w-1/3 min-w-[200px]">Cuenta Contable</th>
                                        <th className="px-4 py-4 text-right text-primary font-bold">Presupuesto</th>
                                        <th className="px-4 py-4 text-right text-indigo-600 font-bold whitespace-nowrap">Comprom. Pend.</th>
                                        <th className="px-4 py-4 text-right text-purple-600 font-bold whitespace-nowrap">Ord. Pend.</th>
                                        <th className="px-4 py-4 text-right text-amber-600 font-bold">Reserva Real</th>
                                        <th className="px-6 py-4 text-right font-bold w-32 text-slate-800 dark:text-white">Disponible</th>
                                        <th className="px-4 py-4 text-center w-24">%</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                                {t('budget_vs_real.empty_state.desc')}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map(row => (
                                            <tr key={row.account_id} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-4 py-2">
                                                    <button
                                                        onClick={() => openDetailModal(row)}
                                                        className="text-left group-hover:text-primary transition-colors focus:outline-none"
                                                    >
                                                        <div className="font-medium truncate max-w-[250px] underline decoration-dotted underline-offset-2" title={row.account_name}>{row.account_name}</div>
                                                        <div className="text-[10px] text-muted-foreground font-mono">{row.account_code}</div>
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-foreground tabular-nums">
                                                    {formatCurrency(row.budgeted)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                                                    {row.committed > 0 ? formatCurrency(row.committed) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-muted-foreground tabular-nums">
                                                    {row.ordered > 0 ? formatCurrency(row.ordered) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-amber-700 dark:text-amber-500 tabular-nums">
                                                    {row.real !== 0 ? formatCurrency(row.real) : '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-bold tabular-nums">
                                                    <span className={cn(
                                                        row.available >= 0 ? 'text-green-600' : 'text-red-600'
                                                    )}>
                                                        {formatCurrency(row.available)}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                                                        row.execution_pct > 100 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                            row.execution_pct > 80 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                    )}>
                                                        {row.execution_pct.toFixed(0)}%
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedAccountForDetail && selectedAccountForDetail.row && (
                <TransactionDetailModal
                    isOpen={selectedAccountForDetail.isOpen}
                    onClose={closeDetailModal}
                    accountName={selectedAccountForDetail.row.account_name}
                    accountCode={selectedAccountForDetail.row.account_code}
                    details={selectedAccountForDetail.row.details}
                />
            )}
        </div>
    );
}

// ─── Sub-components ─────────────────────────────────

function SummaryMiniCard({ label, value, color, note, icon, bgColor }: { label: string; value: string; color: string; note?: string; icon?: React.ReactNode; bgColor?: string }) {
    return (
        <div className="py-2 px-5 h-[85px] rounded-xl border border-slate-200 dark:border-slate-800 bg-card shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-0.5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                    {label} {note && <span className="text-[9px] opacity-60 normal-case ml-1">{note}</span>}
                </p>
                <div className={cn("p-1.5 rounded-lg", bgColor)}>
                    {icon}
                </div>
            </div>
            <h3 className={cn("text-base font-bold tracking-tight", color)}>{value}</h3>
        </div>
    );
}

function TransactionDetailModal({
    isOpen,
    onClose,
    accountName,
    accountCode,
    details
}: {
    isOpen: boolean;
    onClose: () => void;
    accountName: string;
    accountCode: string;
    details: { committed: any[]; ordered: any[]; real: any[] };
}) {
    const [activeTab, setActiveTab] = useState<'committed' | 'ordered' | 'real'>('committed');

    if (!isOpen) return null;

    const getItems = () => details[activeTab] || [];
    const items = getItems();
    const total = items.reduce((sum, item) => sum + item.amount, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-card w-full max-w-4xl max-h-[80vh] rounded-xl border border-border shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="p-6 border-b border-border flex justify-between items-start shrink-0">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">{accountName}</h2>
                        <p className="text-sm text-muted-foreground font-mono mt-1">{accountCode}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowUpRight className="w-5 h-5 rotate-45 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 pt-4 border-b border-border flex gap-6 shrink-0">
                    {(['committed', 'ordered', 'real'] as const).map((tab) => {
                        const count = details[tab]?.length || 0;
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cn(
                                    "pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                                    isActive
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab === 'committed' && "Comprometido (Solped)"}
                                {tab === 'ordered' && "Ordenado (OC)"}
                                {tab === 'real' && "Ejecutado (Real)"}
                                <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] font-bold text-muted-foreground">
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-0 min-h-0 bg-muted/5">
                    {items.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                            <p>No hay transacciones registradas en esta categoría.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-muted/50 text-muted-foreground font-medium text-xs sticky top-0 z-10 backdrop-blur-sm border-b border-border shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 w-32">Documento</th>
                                    <th className="px-3 py-3 w-24">Fecha</th>
                                    <th className="px-3 py-3 w-48">Proveedor</th>
                                    {(activeTab === 'ordered' || activeTab === 'real') && (
                                        <th className="px-3 py-3 w-32">Relacionado</th>
                                    )}
                                    <th className="px-4 py-3">Descripción</th>
                                    <th className="px-4 py-3 text-right w-32">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {items.map((item: any, idx) => (
                                    <tr key={idx} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-4 py-2 font-mono text-xs font-medium text-primary/80 align-top">
                                            {item.doc_number}
                                            {item.reference && <div className="text-[10px] text-muted-foreground opacity-70 mt-0.5">{item.reference}</div>}
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground text-xs whitespace-nowrap align-top">{item.date}</td>
                                        <td className="px-3 py-2 text-xs align-top">
                                            <div className="break-words max-w-[180px] line-clamp-2" title={item.vendor}>
                                                {item.vendor || <span className="opacity-30 italic">-</span>}
                                            </div>
                                        </td>
                                        {(activeTab === 'ordered' || activeTab === 'real') && (
                                            <td className="px-3 py-2 text-xs align-top space-y-1">
                                                {item.related_oc && (
                                                    <div className="flex items-center gap-1.5" title="Orden de Compra Relacionada">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                                                        <span className="font-mono text-[10px] text-muted-foreground">OC: {item.related_oc}</span>
                                                    </div>
                                                )}
                                                {item.related_solped && (
                                                    <div className="flex items-center gap-1.5" title="Solped Relacionada">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></span>
                                                        <span className="font-mono text-[10px] text-muted-foreground">Sol: {item.related_solped}</span>
                                                    </div>
                                                )}
                                                {!item.related_oc && !item.related_solped && <span className="opacity-30 italic">-</span>}
                                            </td>
                                        )}
                                        <td className="px-4 py-2 text-muted-foreground text-xs align-top">
                                            <div className="line-clamp-2 hover:line-clamp-none transition-all" title={item.description}>
                                                {item.description}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2 text-right font-medium tabular-nums align-top">
                                            {formatCurrency(item.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border bg-muted/20 flex justify-end items-center gap-4 shrink-0">
                    <span className="text-sm text-muted-foreground">Total {activeTab === 'committed' ? 'Comprometido' : activeTab === 'ordered' ? 'Ordenado' : 'Ejecutado'}:</span>
                    <span className="text-xl font-bold text-foreground tabular-nums">{formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    );
}
