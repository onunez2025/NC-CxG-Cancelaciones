import React, { useState, useEffect } from 'react';
import {
    Wallet,
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle,
    BadgePercent,
    ArrowUpRight,
    ChevronRight,
    Activity,
    Check,
    Hash,
    Database,
    Save
} from 'lucide-react';
import { AccountsService } from '../../services/accountsService';
import type { AccountingAccount } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';

export default function AccountsPage() {
    const { confirm, alert } = useDialog();
    const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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
                } catch (error: any) {
                    alert({ title: 'Error', message: error.message || 'No se pudo eliminar el registro', type: 'error' });
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
        } catch (error: any) {
            alert({ title: 'Error de guardado', message: error.message || 'No se pudo procesar la solicitud', type: 'error' });
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Wallet className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Cuentas Contables</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Plan de Cuentas SAP</h1>
                    <p className="text-sm text-muted-foreground">Administra la categorización financiera y asignación contable del ERP</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95 font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Cuenta
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 min-h-0 flex flex-col bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                {/* Search / Filters */}
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por código contable o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Cargando plan de cuentas...</span>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse table-fixed min-w-[900px]">
                            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md">
                                <tr className="border-b border-border">
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-48">Plan contable (SAP)</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground">Denominación de cuenta</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-64 text-center">Naturaleza</th>
                                    <th className="px-6 py-4 font-bold text-xs tracking-wider text-muted-foreground w-40 text-center">Disponibilidad</th>
                                    <th className="px-6 py-4 w-28 font-bold text-xs tracking-wider text-muted-foreground text-right italic">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredAccounts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-muted-foreground/20" />
                                                <p className="text-sm font-medium text-muted-foreground italic">No se encontraron cuentas contables registradas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAccounts.map((account) => (
                                        <tr key={account.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-mono text-primary font-bold text-[11px] uppercase bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 w-fit shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                    <Hash className="w-3.5 h-3.5 opacity-50" />
                                                    {account.code}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground text-sm tracking-tight">{account.name}</span>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold tracking-widest mt-1 opacity-60">
                                                        <BadgePercent className="w-3 h-3 text-primary/70" /> Account ID #{account.id.substring(0,8).toUpperCase()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getCategoryBadge(account.category)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {account.is_active ? (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 text-[10px] font-black shadow-sm">
                                                        <CheckCircle className="w-3 h-3 stroke-[3]" />
                                                        Habilitada
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[10px] font-black opacity-70">
                                                        <XCircle className="w-3 h-3 stroke-[3]" />
                                                        Bloqueada
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(account)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(account.id)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all active:scale-90"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
                
                {/* Footer Stats */}
                <div className="px-6 py-3 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Cuentas registradas: <span className="text-foreground ml-1">{filteredAccounts.length}</span>
                    </p>
                </div>
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
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
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
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted font-bold rounded-xl transition-all tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all tracking-widest flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            {editingAccount ? 'Guardar cambios' : 'Abrir cuenta SAP'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
