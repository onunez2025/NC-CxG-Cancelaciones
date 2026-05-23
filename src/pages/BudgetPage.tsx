import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet,
    Search,
    Plus,
    Edit2,
    Trash2,
    Save,
    Upload,
    Calendar
} from 'lucide-react';
import { BudgetService } from '../services/budgetService';
import { BulkBudgetUploadModal } from '../components/budget/BulkBudgetUploadModal';

import { AccountsService } from '../services/accountsService';
import { ManagementsService } from '../services/managementsService';
import { CostCentersService } from '../services/costCentersService';
import { useAuth } from '../hooks/useAuth';
import type { Budget, AccountingAccount, Management, CostCenter } from '../types';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { SIATC_THEME } from '../utils/siatc-theme';
import { cn } from '../utils/cn';

// Removed static MONTHS array

export function BudgetPage() {
    const { t } = useTranslation();
    const { user, hasPermission } = useAuth();

    const months = [
        t('budget.table.jan'), t('budget.table.feb'), t('budget.table.mar'),
        t('budget.table.apr'), t('budget.table.may'), t('budget.table.jun'),
        t('budget.table.jul'), t('budget.table.aug'), t('budget.table.sep'),
        t('budget.table.oct'), t('budget.table.nov'), t('budget.table.dec')
    ];

    // State
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
    const [filteredCostCenters, setFilteredCostCenters] = useState<CostCenter[]>([]);

    // Filters
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedManagement, setSelectedManagement] = useState<string>(user?.management_id || 'it');
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const isAdministrador = user?.role_name === 'Administrador';

    // Modal & Editing
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
    const [formData, setFormData] = useState<{
        account_id: string;
        cost_center_id: string;
        monthly_amounts: number[];
    }>({
        account_id: '',
        cost_center_id: '',
        monthly_amounts: Array(12).fill(0)
    });

    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        type: 'delete_one' | 'delete_all';
        id?: string;
    }>({
        isOpen: false,
        type: 'delete_one'
    });

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            AccountsService.getAccounts(),
            ManagementsService.getManagements(),
            CostCentersService.getCostCenters()
        ]).then(([accs, mgmts, cecos]) => {
            setAccounts(accs.filter(a => a.is_active));
            setManagements(mgmts);
            setCostCenters(cecos.filter(c => c.is_active));
        }).catch(console.error);
    }, []);

    useEffect(() => {
        const cecos = costCenters.filter(c => c.management_id === selectedManagement);
        setFilteredCostCenters(cecos);
        setSelectedCostCenter('all');
    }, [selectedManagement, costCenters]);

    useEffect(() => {
        loadBudgets();
    }, [selectedYear, selectedManagement, selectedCostCenter]);

    const loadBudgets = async () => {
        try {
            const data = await BudgetService.getBudgets(selectedYear, selectedManagement);
            setBudgets(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreate = () => {
        const cecos = costCenters.filter(c => c.management_id === selectedManagement);
        if (cecos.length === 0) {
            setErrorMsg(t('budget.no_cecos', { defaultValue: 'No hay Centros de Costo activos para esta gerencia.' }));
            return;
        }

        setEditingBudget(null);
        setFormData({
            account_id: accounts.length > 0 ? accounts[0].id : '',
            cost_center_id: selectedCostCenter !== 'all' ? selectedCostCenter : cecos[0].id,
            monthly_amounts: Array(12).fill(0)
        });
        setIsModalOpen(true);
    };

    const handleEdit = (budget: Budget) => {
        setEditingBudget(budget);
        setFormData({
            account_id: budget.account_id,
            cost_center_id: budget.cost_center_id,
            monthly_amounts: [...budget.monthly_amounts]
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setConfirmState({
            isOpen: true,
            type: 'delete_one',
            id
        });
    };

    const handleDeleteAll = () => {
        setConfirmState({
            isOpen: true,
            type: 'delete_all'
        });
    };

    const handleConfirmAction = async () => {
        try {
            if (confirmState.type === 'delete_one' && confirmState.id) {
                await BudgetService.deleteBudget(confirmState.id);
            } else if (confirmState.type === 'delete_all') {
                await BudgetService.deleteBudgetsBulk(selectedYear, selectedManagement);
            }
            await loadBudgets();
        } catch (error: any) {
            console.error(error);
            setErrorMsg(error.message);
        } finally {
            setConfirmState({ ...confirmState, isOpen: false });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const total = formData.monthly_amounts.reduce((sum, val) => sum + val, 0);

        try {
            if (editingBudget) {
                await BudgetService.saveBudget({
                    ...editingBudget,
                    monthly_amounts: formData.monthly_amounts,
                    total: total
                });
            } else {
                await BudgetService.saveBudget({
                    id: '', // Empty ID tells the backend to create
                    year: selectedYear,
                    management_id: isAdministrador ? selectedManagement : (user?.management_id || selectedManagement),
                    cost_center_id: formData.cost_center_id,
                    account_id: formData.account_id,
                    monthly_amounts: formData.monthly_amounts,
                    total: total,
                    created_by: user?.id || 'system',
                    created_at: new Date().toISOString()
                });
            }
            setIsModalOpen(false);
            await loadBudgets();
        } catch (error: any) {
            setErrorMsg(error.message);
        }
    };

    const handleMonthChange = (index: number, value: string) => {
        const amounts = [...formData.monthly_amounts];
        amounts[index] = Number(value) || 0;
        setFormData({ ...formData, monthly_amounts: amounts });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount);
    };

    // Filter for the table view
    const tableFilteredBudgets = budgets.filter(b => {
        // First filter by selected CECO (if not 'all')
        if (selectedCostCenter !== 'all' && b.cost_center_id !== selectedCostCenter) return false;

        // Then filter by search term
        const account = accounts.find(a => a.id === b.account_id);
        const nameMatch = account?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const codeMatch = account?.code.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || codeMatch;
    });

    // Calculate current month totals
    const currentMonthIndex = new Date().getMonth();
    const currentMonthName = months[currentMonthIndex].substring(0, 3); // Abbreviated

    // Calculate Management Totals (Unfiltered)
    const managementTotalBudget = budgets.reduce((sum, b) => sum + b.total, 0);
    const managementMonthTotal = budgets.reduce((sum, b) => sum + (b.monthly_amounts[currentMonthIndex] || 0), 0);

    // Calculate Table Totals (Filtered)
    const tableTotals = Array(12).fill(0);
    tableFilteredBudgets.forEach(b => {
        b.monthly_amounts.forEach((amt, i) => {
            tableTotals[i] += amt;
        });
    });
    const tableGrandTotal = tableTotals.reduce((a, b) => a + b, 0);

    return (
        <div className="flex flex-col h-[calc(100vh-1rem)] gap-4 animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-1 shrink-0 pb-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">Presupuesto</h1>
                    <p className="text-slate-500 text-sm font-medium">Gestión de presupuesto anual por centro de coste</p>
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
                </div>

                <div className="flex items-center gap-2">
                    {hasPermission('budget.create') && (
                        <button
                            onClick={handleCreate}
                            className={SIATC_THEME.COMPONENTS.BUTTON_PRIMARY}
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo
                        </button>
                    )}

                    {isAdministrador && (
                        <button
                            onClick={handleDeleteAll}
                            className={cn(
                                SIATC_THEME.COMPONENTS.BUTTON_DANGER,
                                "bg-destructive/10 text-destructive border-none shadow-none hover:bg-destructive/20"
                            )}
                            title="Eliminar Todo (Temporal)"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}

                    {hasPermission('budget.create') && (
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className={SIATC_THEME.COMPONENTS.BUTTON_SECONDARY}
                            title="Carga Masiva (Excel)"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Compact Metric Ribbon (New) */}
            <div className="bg-card border border-border rounded-xl px-6 py-2 shadow-sm flex items-center justify-between shrink-0 h-[55px]">
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                            <Wallet className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{t('budget.total_budget')} ({selectedYear})</p>
                            <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{formatCurrency(managementTotalBudget)}</p>
                        </div>
                    </div>

                    <div className="w-px h-8 bg-border" />

                    <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500">
                            <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{currentMonthName} ({t('budget.table.total')})</p>
                            <p className="text-base font-bold text-slate-900 dark:text-white leading-tight">{formatCurrency(managementMonthTotal)}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold text-slate-600">
                        CECO: {selectedCostCenter === 'all' ? 'Todos' : costCenters.find(c => c.id === selectedCostCenter)?.code}
                    </div>
                    <div className="px-3 py-1 bg-green-500/10 rounded-lg text-[10px] font-bold text-green-600">
                        Soles (PEN)
                    </div>
                </div>
            </div>
            {/* Content Container (Fixed Height) */}
            <div className="flex flex-1 gap-4 min-h-0 overflow-hidden">
                {/* Sidebar - Cost Centers */}
                <div className="w-64 shrink-0 flex flex-col bg-card/50 dark:bg-slate-900/50 rounded-2xl border border-border overflow-hidden">
                    <div className="px-4 py-3 border-b border-border/50 shrink-0">
                        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Centros de Costo
                        </h3>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
                        <button
                            onClick={() => setSelectedCostCenter('all')}
                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all relative group ${selectedCostCenter === 'all'
                                ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/20'
                                : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-xs">Todos los Centros</span>
                                <Wallet className={`w-3.5 h-3.5 ${selectedCostCenter === 'all' ? 'opacity-100' : 'opacity-30 group-hover:opacity-100'}`} />
                            </div>
                            <div className={`text-[10px] mt-1 ${selectedCostCenter === 'all' ? 'text-primary-foreground/80' : 'text-primary font-bold'}`}>
                                {formatCurrency(managementTotalBudget)}
                            </div>
                        </button>

                        <div className="my-2 h-px bg-border/50 mx-2" />

                        {filteredCostCenters.map(ceco => {
                            const cecoBudgets = budgets.filter(b => b.cost_center_id === ceco.id);
                            const cecoTotal = cecoBudgets.reduce((sum, b) => sum + b.total, 0);

                            return (
                                <button
                                    key={ceco.id}
                                    onClick={() => setSelectedCostCenter(ceco.id)}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all relative group ${selectedCostCenter === ceco.id
                                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                                        : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800'
                                        }`}
                                    title={`${ceco.code} - ${ceco.name}`}
                                >
                                    <div className="flex justify-between items-start gap-2">
                                        <span className="text-xs truncate flex-1">{ceco.name}</span>
                                        <span className={`text-[9px] font-mono px-1 rounded border ${selectedCostCenter === ceco.id ? 'border-white/30 text-white/80' : 'border-border text-slate-400'}`}>
                                            {ceco.code}
                                        </span>
                                    </div>
                                    <div className={`text-[10px] mt-0.5 font-bold ${selectedCostCenter === ceco.id ? 'text-white/90' : 'text-blue-500'}`}>
                                        {formatCurrency(cecoTotal)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="flex-1 bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-w-0">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por cuenta o descripción..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all"
                            />
                        </div>
                        <div className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                            {tableFilteredBudgets.length} Registros
                        </div>
                    </div>

                    <div className="overflow-auto flex-1 relative">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-800 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                                <tr>
                                    <th className="px-6 py-4">Cuenta Contable</th>
                                    {selectedCostCenter === 'all' && (
                                        <th className="px-6 py-4">Centro Costo</th>
                                    )}
                                    {months.map((month, idx) => (
                                        <th key={idx} className="px-4 py-4 text-right whitespace-nowrap">{month.substring(0, 3)}</th>
                                    ))}
                                    <th className="px-6 py-4 text-right font-bold text-slate-800 dark:text-white">Total Anual</th>
                                    {hasPermission('budget.edit') && (
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {tableFilteredBudgets.length > 0 ? (
                                    tableFilteredBudgets.map((budget) => {
                                        const account = accounts.find(a => a.id === budget.account_id);
                                        const ceco = costCenters.find(c => c.id === budget.cost_center_id);

                                        return (
                                            <tr key={budget.id} className="hover:bg-muted/50 transition-colors group">
                                                <td className="px-4 py-2">
                                                    <div className="font-medium text-foreground truncate max-w-[180px]" title={account?.name}>{account?.name || 'Unknown'}</div>
                                                    <div className="text-[10px] text-muted-foreground font-mono">{account?.code}</div>
                                                </td>
                                                {selectedCostCenter === 'all' && (
                                                    <td className="px-4 py-2">
                                                        <div className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded w-fit text-muted-foreground" title={ceco?.name}>
                                                            {ceco?.code}
                                                        </div>
                                                    </td>
                                                )}
                                                {budget.monthly_amounts.map((amount, idx) => (
                                                    <td key={idx} className="px-4 py-2 text-right text-muted-foreground whitespace-nowrap tabular-nums">
                                                        {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}
                                                    </td>
                                                ))}
                                                <td className="px-4 py-2 text-right font-bold text-foreground tabular-nums">
                                                    {formatCurrency(budget.total)}
                                                </td>
                                                {hasPermission('budget.edit') && (
                                                    <td className="px-4 py-2 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEdit(budget)}
                                                                className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                            >
                                                                <Edit2 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(budget.id)}
                                                                className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={selectedCostCenter === 'all' ? (12 + 3) : (12 + 2)} className="px-6 py-12 text-center text-muted-foreground">
                                            <p>{t('budget.empty_state')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {tableFilteredBudgets.length > 0 && (
                                <tfoot className="bg-slate-100 dark:bg-slate-900/90 font-bold sticky bottom-0 z-10 backdrop-blur-sm border-t-2 border-primary/20">
                                    <tr className="text-primary-foreground bg-primary/5">
                                        <td className="px-4 py-3 text-primary text-sm">TOTAL GENERAL</td>
                                        {selectedCostCenter === 'all' && <td className="px-4 py-3" />}
                                        {tableTotals.map((total, idx) => (
                                            <td key={idx} className="px-4 py-3 text-right tabular-nums text-slate-800 dark:text-white">
                                                {new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(total)}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-right text-primary tabular-nums text-sm">
                                            {formatCurrency(tableGrandTotal)}
                                        </td>
                                        {hasPermission('budget.edit') && <td className="px-4 py-3" />}
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Table Footer */}
                    <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest shrink-0">
                        <div className="flex items-center gap-4">
                            <span>Año: {selectedYear}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                            <span>Moneda: Soles (PEN)</span>
                        </div>
                        <div className="flex items-center gap-2 text-primary">
                            <Wallet className="w-3 h-3" />
                            EBM Control Presupuestal
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingBudget ? `${t('common.edit')} ${t('budget.title')}` : `${t('budget.new')} ${t('budget.title')}`}
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase">{t('budget.year')}</label>
                            <div className="font-medium">{selectedYear}</div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-muted-foreground uppercase">{t('budget.management')}</label>
                            <div className="font-medium">{managements.find(m => m.id === selectedManagement)?.name}</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('config.sections.cost_centers', { defaultValue: 'Centro de Costo' })}</label>
                        <select
                            value={formData.cost_center_id}
                            onChange={(e) => setFormData({ ...formData, cost_center_id: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary outline-none"
                            disabled={!!editingBudget}
                        >
                            {filteredCostCenters.map(ceco => (
                                <option key={ceco.id} value={ceco.id}>
                                    {ceco.code} - {ceco.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">{t('budget.table.account')}</label>
                        <select
                            value={formData.account_id}
                            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary outline-none"
                            disabled={!!editingBudget}
                        >
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.code} - {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium border-b border-border pb-2">{t('budget.modal.monthly_distribution')}</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {months.map((month, index) => (
                                <div key={index} className="space-y-1">
                                    <label className="text-xs text-muted-foreground">{month}</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.monthly_amounts[index] || ''}
                                        onChange={(e) => handleMonthChange(index, e.target.value)}
                                        className="w-full px-2 py-1.5 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary outline-none text-right text-sm"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-center bg-muted/50 p-3 rounded-md">
                            <span className="font-medium">{t('budget.modal.annual_total')}:</span>
                            <span className="text-lg font-bold text-primary">
                                {formatCurrency(formData.monthly_amounts.reduce((a, b) => a + b, 0))}
                            </span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-colors flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </Modal>

            <BulkBudgetUploadModal
                isOpen={isBulkModalOpen}
                onClose={() => setIsBulkModalOpen(false)}
                onSuccess={() => {
                    loadBudgets();
                    AccountsService.getAccounts().then(accs => setAccounts(accs.filter(a => a.is_active))).catch(console.error);
                }}
                targetYear={selectedYear}
            />

            {/* Error Notification Modal */}
            <Modal
                isOpen={!!errorMsg}
                onClose={() => setErrorMsg(null)}
                title="Aviso del Sistema"
            >
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground p-2 bg-muted/20 border border-border rounded-md break-words">
                        {errorMsg}
                    </div>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={() => setErrorMsg(null)}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            Aceptar
                        </button>
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ ...confirmState, isOpen: false })}
                onConfirm={handleConfirmAction}
                title={confirmState.type === 'delete_all' ? 'Eliminar Todo' : 'Eliminar Presupuesto'}
                message={confirmState.type === 'delete_all'
                    ? '¿Estás seguro de que deseas eliminar TODOS los presupuestos visibles? Esta acción no se puede deshacer.'
                    : '¿Estás seguro de eliminar este presupuesto?'}
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
}
