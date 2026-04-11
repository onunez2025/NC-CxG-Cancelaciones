import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Wallet,
    Search,
    Plus,
    Edit2,
    Trash2,
    Save,
    Upload
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

    return (
        <div className="flex flex-col h-full gap-5 animate-in fade-in duration-500 p-1">
            {/* Header */}
            <div className="flex items-center justify-between px-1 shrink-0">
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
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all font-bold text-sm shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Nuevo Registro
                        </button>
                    )}

                    {isAdministrador && (
                        <button
                            onClick={handleDeleteAll}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors font-medium shadow-sm"
                            title="Eliminar Todo (Temporal)"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Reset</span>
                        </button>
                    )}

                    {hasPermission('budget.create') && (
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors font-medium shadow-sm"
                            title="Carga Masiva (Excel)"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Dynamic Summary Section */}
            <div className="space-y-4">
                {selectedCostCenter === 'all' ? (
                    /* Grid View for "All" */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {/* Main Summary Card (Click to reset filter) */}
                        <div
                            onClick={() => setSelectedCostCenter('all')}
                            className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all hover:shadow-md ${selectedCostCenter === 'all'
                                ? 'bg-card border-primary ring-1 ring-primary/20'
                                : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[11px] font-bold text-slate-500 mb-1">
                                        Total Presupuesto ({selectedYear})
                                    </p>
                                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{formatCurrency(managementTotalBudget)}</h2>
                                </div>
                                <div className={`p-2.5 rounded-xl transition-colors ${selectedCostCenter === 'all' ? 'bg-primary/10 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                    <Wallet className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between text-xs">
                                <span className="text-muted-foreground font-medium">{currentMonthName}:</span>
                                <span className="font-bold text-foreground">{formatCurrency(managementMonthTotal)}</span>
                            </div>
                        </div>

                        {/* CECO Cards Grid */}
                        {filteredCostCenters.map(ceco => {
                            const cecoBudgets = budgets.filter(b => b.cost_center_id === ceco.id);
                            const cecoTotal = cecoBudgets.reduce((sum, b) => sum + b.total, 0);
                            const cecoMonthTotal = cecoBudgets.reduce((sum, b) => sum + (b.monthly_amounts[currentMonthIndex] || 0), 0);

                            return (
                                <div
                                    key={ceco.id}
                                    onClick={() => setSelectedCostCenter(ceco.id)}
                                    className={`p-4 rounded-xl border shadow-sm flex flex-col justify-between relative overflow-hidden group cursor-pointer transition-all hover:shadow-md ${selectedCostCenter === ceco.id
                                        ? 'bg-card border-primary ring-1 ring-primary'
                                        : 'bg-card/50 border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="overflow-hidden">
                                            <h4 className="font-bold text-xs truncate pr-2 text-foreground" title={ceco.name}>{ceco.name}</h4>
                                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">{ceco.code}</p>
                                        </div>
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${cecoTotal > 0 ? 'bg-green-500' : 'bg-muted'}`} />
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400 tracking-tight">
                                            {formatCurrency(cecoTotal)}
                                        </div>
                                        <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                                            <span className="text-muted-foreground font-medium">{currentMonthName}</span>
                                            <span className="font-bold text-foreground">{formatCurrency(cecoMonthTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* Hero Card for Selected CECO */
                    (() => {
                        const ceco = costCenters.find(c => c.id === selectedCostCenter);
                        // Calculate totals for this specific CECO
                        const cecoBudgets = budgets.filter(b => b.cost_center_id === selectedCostCenter);
                        const cecoTotal = cecoBudgets.reduce((sum, b) => sum + b.total, 0);
                        const cecoMonthTotal = cecoBudgets.reduce((sum, b) => sum + (b.monthly_amounts[currentMonthIndex] || 0), 0);

                        return (
                            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-2 px-2 border-b border-border/50 shadow-sm">
                                <div className="bg-card p-6 rounded-lg border border-primary/20 shadow-sm ring-1 ring-primary/10 relative overflow-hidden">
                                    <div className="flex items-center justify-between relative z-10">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-bold">
                                                    {ceco?.code}
                                                </span>
                                                <h2 className="text-lg font-bold text-foreground">{ceco?.name}</h2>
                                            </div>
                                            <div className="flex items-baseline gap-4 mt-2">
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-0.5">{t('budget.total_budget')} ({selectedYear})</p>
                                                    <h3 className="text-3xl font-bold text-primary tracking-tight">{formatCurrency(cecoTotal)}</h3>
                                                </div>
                                                <div className="h-8 w-px bg-border mx-2"></div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-0.5">{currentMonthName} ({t('budget.table.total')})</p>
                                                    <p className="text-xl font-bold text-foreground">{formatCurrency(cecoMonthTotal)}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setSelectedCostCenter('all')}
                                            className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                            title="Ver todos"
                                        >
                                            <div className="text-xs font-medium flex items-center gap-1">
                                                <span className="hidden sm:inline">Ver todos</span>
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                        </button>
                                    </div>

                                    {/* Decorative background element */}
                                    <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />
                                </div>
                            </div>
                        );
                    })()
                )}
            </div>

            {/* Content */}
            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar - Cost Centers */}
                <div className="hidden md:block w-64 shrink-0 space-y-2 sticky top-[180px] self-start h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
                    <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
                        Centros de Costo
                    </h3>
                    <div className="space-y-1 px-1">
                        <button
                            onClick={() => setSelectedCostCenter('all')}
                            className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${selectedCostCenter === 'all'
                                ? 'bg-primary/10 text-primary font-bold shadow-sm'
                                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700'
                                }`}
                        >
                            <div className="text-sm">Todos los Centros</div>
                        </button>
                        {filteredCostCenters.map(ceco => (
                            <button
                                key={ceco.id}
                                onClick={() => setSelectedCostCenter(ceco.id)}
                                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${selectedCostCenter === ceco.id
                                    ? 'bg-primary/10 text-primary font-bold shadow-sm'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700'
                                    }`}
                                title={`${ceco.code} - ${ceco.name}`}
                            >
                                <div className="text-sm leading-tight mb-0.5">{ceco.name}</div>
                                <div className="text-[10px] font-mono opacity-60 tracking-tighter">{ceco.code}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Table */}
                <div className="flex-1 bg-card rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)]">
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
                                        <td colSpan={selectedCostCenter === 'all' ? 7 : 6} className="px-6 py-12 text-center text-muted-foreground">
                                            <p>{t('budget.empty_state')}</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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
