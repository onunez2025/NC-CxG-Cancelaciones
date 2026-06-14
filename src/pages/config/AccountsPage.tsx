import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Search,
    Plus,
    Edit2,
    Trash2,
    BadgePercent,
    ArrowUpRight,
    ChevronRight,
    Activity,
    Hash,
    Database,
    Check
} from 'lucide-react';
import { AccountsService } from '../../services/accountsService';
import type { AccountingAccount } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { 
    SIATCTable, 
    SIATCTableHeader,
    SIATCTableRow, 
    SIATCTableCell, 
    SIATCTableFooter 
} from '../../components/siatc/table/SIATCTable';

export default function AccountsPage() {
    const { confirm, alert } = useDialog();
    const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    // Form state
    const [formData, setFormData] = useState<Partial<AccountingAccount>>({
        code: '',
        name: '',
        category: 'expense',
        is_active: true
    });

    const CATEGORIES = [
        { value: 'expense', label: 'Gasto operativo', color: 'rose' },
        { value: 'investment', label: 'Inversión / CAPEX', color: 'blue' },
        { value: 'service', label: 'Servicios externos', color: 'amber' }
    ];

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setIsLoading(true);
        try {
            const data = await AccountsService.getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredAccounts.length / recordsPerPage);
    const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

    const handleCreate = () => {
        setEditingAccount(null);
        setFormData({
            code: '',
            name: '',
            category: 'expense',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (account: AccountingAccount) => {
        setEditingAccount(account);
        setFormData({ ...account });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        confirm({
            title: 'Eliminar cuenta contable',
            message: '¿Está seguro de eliminar esta cuenta del plan contable? Esta acción podría afectar la integridad de presupuestos y liquidaciones vinculadas.',
            type: 'danger',
            confirmText: 'Eliminar cuenta',
            onConfirm: async () => {
                try {
                    await AccountsService.deleteAccount(id);
                    await loadAccounts();
                } catch (error: unknown) {
                    alert({ title: 'Error', message: error instanceof Error ? error.message : 'No se pudo eliminar el registro', type: 'error' });
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAccount) {
                await AccountsService.saveAccount({ ...editingAccount, ...formData } as AccountingAccount);
            } else {
                await AccountsService.saveAccount(formData as Omit<AccountingAccount, 'id'>);
            }
            setIsModalOpen(false);
            await loadAccounts();
        } catch (error: unknown) {
            alert({ title: 'Error de guardado', message: error instanceof Error ? error.message : 'No se pudo procesar la solicitud', type: 'error' });
        }
    };

    const getCategoryBadge = (category: string) => {
        const cat = CATEGORIES.find(c => c.value === category) || { label: category, color: 'slate' };
        
        const styleMap: Record<string, string> = {
            rose: 'bg-rose-50 text-rose-700 border-rose-200/50',
            blue: 'bg-blue-50 text-blue-700 border-blue-200/50',
            amber: 'bg-amber-50 text-amber-700 border-amber-200/50',
            slate: 'bg-slate-50 text-slate-700 border-slate-200/50'
        };

        return (
            <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-tight border shadow-sm", styleMap[cat.color as string])}>
                {cat.label}
            </span>
        );
    };

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Wallet className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Cuentas Contables</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Plan de Cuentas SAP</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Administra la categorización financiera y asignación contable del ERP</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className={SIATC_THEME.COMPONENTS.BUTTON_PRIMARY}
                >
                    <Plus className="w-4 h-4" />
                    Nuevo
                </button>
            </div>

            {/* Content Container */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {/* Search / Filters */}
                <div className="p-4 border-b border-cb-border bg-cb-bg/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-text-secondary/55" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            placeholder="Buscar por código contable o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 bg-card text-cb-text-primary border border-cb-border rounded-cb-btn focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium placeholder:text-cb-neutral/40"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Cargando plan de cuentas...</span>
                        </div>
                    ) : (
                        <SIATCTable>
                            <thead>
                                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                                    <SIATCTableHeader className="text-left w-48">Plan Contable (SAP)</SIATCTableHeader>
                                    <SIATCTableHeader className="text-left">Denominación de Cuenta</SIATCTableHeader>
                                    <SIATCTableHeader className="text-center w-64">Naturaleza</SIATCTableHeader>
                                    <SIATCTableHeader className="text-center w-40">Disponibilidad</SIATCTableHeader>
                                    <SIATCTableHeader className="text-right w-28">Acciones</SIATCTableHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-cb-text-secondary opacity-40" />
                                                <p className="text-sm font-medium text-cb-text-secondary italic">No se encontraron cuentas contables registradas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAccounts.map((account) => (
                                        <SIATCTableRow key={account.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-2 font-mono text-primary font-bold text-[11px] uppercase bg-primary/5 px-3 py-1.5 rounded-cb-btn border border-primary/20 w-fit shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                    <Hash className="w-3.5 h-3.5 opacity-50" />
                                                    {account.code}
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-cb-text-primary text-sm tracking-tight">{account.name}</span>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-cb-text-secondary font-bold tracking-widest mt-1 opacity-60">
                                                        <BadgePercent className="w-3 h-3 text-primary/70" /> Account ID #{account.id.substring(0,8).toUpperCase()}
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-center">
                                                {getCategoryBadge(account.category)}
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-center">
                                                {account.is_active ? (
                                                    <span className={cn(SIATC_THEME.STATES.BADGE_BASE, SIATC_THEME.STATES.SUCCESS)}>Habilitada</span>
                                                ) : (
                                                    <span className={cn(SIATC_THEME.STATES.BADGE_BASE, SIATC_THEME.STATES.ERROR)}>Bloqueada</span>
                                                )}
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(account)}
                                                        className="p-2 text-cb-text-secondary hover:text-primary hover:bg-cb-bg rounded-cb-btn transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(account.id)}
                                                        className="p-2 text-cb-text-secondary hover:text-destructive hover:bg-cb-bg rounded-cb-btn transition-all"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </SIATCTableCell>
                                        </SIATCTableRow>
                                    ))
                                )}
                            </tbody>
                        </SIATCTable>
                    )}
                </div>

                {/* Footer Stats */}
                <SIATCTableFooter 
                    totalRecords={filteredAccounts.length}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    label="Total cuentas"
                />
            </div>

            {/* Modal: SIATC Standard */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAccount ? 'Configuración de Cuenta ERP' : 'Alta de Cuenta Contable'} size="lg">
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 bg-muted/30 p-5 rounded-2xl border border-border/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <ArrowUpRight className="w-16 h-16 rotate-12" />
                            </div>
                            <div className="flex flex-col gap-1.5 relative z-10">
                                <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Código SAP / Plan contable:</label>
                                <div className="relative">
                                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                    <input
                                        type="text"
                                        required
                                        value={formData.code || ''}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-muted-foreground/30 font-mono"
                                        placeholder="Ej: 600100"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 px-1">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Nombre descriptivo de cuenta:</label>
                            <input
                                type="text"
                                required
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                                placeholder="Ej: Gastos de operación"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2 px-1">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Categorización / naturaleza del gasto:</label>
                            <div className="relative">
                                <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                <select
                                    value={formData.category || 'expense'}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as 'expense' | 'investment' | 'service' | 'other' })}
                                    className="w-full h-12 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    {CATEGORIES.map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="col-span-full pt-2">
                             <button
                                type="button"
                                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                className={cn(
                                    "w-full flex items-center justify-between px-6 py-4 rounded-2xl text-xs font-bold transition-all border shadow-sm",
                                    formData.is_active
                                        ? "bg-primary/5 text-primary border-primary/20"
                                        : "bg-rose-50 text-rose-700 border-rose-200/50"
                                )}
                            >
                                <span className="tracking-widest">Estado contable en SIATC:</span>
                                <div className="flex items-center gap-3">
                                    {formData.is_active ? 'Cuenta habilitada' : 'Cuenta bloqueada'}
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors",
                                        formData.is_active ? "bg-primary" : "bg-rose-500"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                                            formData.is_active ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)}
                            className={SIATC_THEME.COMPONENTS.BUTTON_SECONDARY}
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className={SIATC_THEME.COMPONENTS.BUTTON_PRIMARY}
                        >
                            <Check className="w-4 h-4" />
                            {editingAccount ? 'Guardar Cambios' : 'Abrir Cuenta SAP'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
