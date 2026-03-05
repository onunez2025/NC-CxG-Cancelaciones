import { useState, useEffect } from 'react';

import {
    Wallet,
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { AccountsService } from '../../services/accountsService';
import type { AccountingAccount } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { cn } from '../../utils/cn';

export function AccountsPage() {
    const [accounts, setAccounts] = useState<AccountingAccount[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<AccountingAccount | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<AccountingAccount>>({
        code: '',
        name: '',
        category: 'expense',
        is_active: true
    });

    const CATEGORIES = [
        { value: 'expense', label: 'Gasto' },
        { value: 'investment', label: 'Inversión' }
    ];

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        try {
            const data = await AccountsService.getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error("Failed to load accounts:", error);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
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
        setConfirmDeleteId(id);
    };

    const handleConfirmDelete = async () => {
        if (confirmDeleteId) {
            try {
                await AccountsService.deleteAccount(confirmDeleteId);
                await loadAccounts();
                setConfirmDeleteId(null);
            } catch (error) {
                console.error("Error deleting account:", error);
            }
        }
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
        } catch (error) {
            console.error("Error saving account:", error);
        }
    };

    const getCategoryBadge = (category: string) => {
        const styles = {
            expense: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
            investment: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            service: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
            other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
        const label = CATEGORIES.find(c => c.value === category)?.label || category;
        const style = styles[category as keyof typeof styles] || styles.other;

        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", style)}>
                {label}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Cuentas Contables</h1>
                    <p className="text-muted-foreground">Gestiona el plan de cuentas contables para presupuestos y gastos.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Cuenta
                </button>
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por código o nombre..."
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    />
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Categoría</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredAccounts.length > 0 ? (
                                filteredAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs font-medium">
                                            {account.code}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {account.name}
                                        </td>
                                        <td className="px-6 py-4">
                                            {getCategoryBadge(account.category)}
                                        </td>
                                        <td className="px-6 py-4">
                                            {account.is_active ? (
                                                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-xs font-medium">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                    Activo
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    Inactivo
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(account)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(account.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No se encontraron cuentas contables</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingAccount ? 'Editar Cuenta' : 'Nueva Cuenta'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Código SAP</label>
                            <input
                                type="text"
                                required
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none font-mono"
                                placeholder="Ej: 600100"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Ej: Gastos de Viaje"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Categoría</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="account_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <label htmlFor="account_active" className="text-sm font-medium cursor-pointer">
                                Activa
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md shadow-sm transition-colors"
                        >
                            Guardar
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!confirmDeleteId}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Cuenta"
                message="¿Estás seguro de eliminar esta cuenta contable? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                variant="danger"
            />
        </div >
    );
}
