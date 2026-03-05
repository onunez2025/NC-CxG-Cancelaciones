import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Building2,
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { CostCentersService } from '../../services/costCentersService';
import { ManagementsService } from '../../services/managementsService';
import type { CostCenter, Management } from '../../types';
import { Modal } from '../../components/common/Modal';

export function CostCentersPage() {
    const { t } = useTranslation();
    const [cecos, setCecos] = useState<CostCenter[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCeco, setEditingCeco] = useState<CostCenter | null>(null);
    const [cecoToDelete, setCecoToDelete] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<CostCenter>>({
        code: '',
        name: '',
        management_id: 'it',
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [cecosData, mgmtData] = await Promise.all([
                CostCentersService.getCostCenters(),
                ManagementsService.getManagements()
            ]);
            setCecos(cecosData);
            setManagements(mgmtData);
        } catch (error) {
            console.error("Failed to load data:", error);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredCecos = cecos.filter(ceco =>
        ceco.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ceco.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingCeco(null);
        setFormData({
            code: '',
            name: '',
            management_id: managements.length > 0 ? managements[0].id : 'it',
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (ceco: CostCenter) => {
        setEditingCeco(ceco);
        setFormData({ ...ceco });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setCecoToDelete(id);
    };

    const confirmDelete = async () => {
        if (!cecoToDelete) return;
        try {
            await CostCentersService.deleteCostCenter(cecoToDelete);
            await loadData();
            setCecoToDelete(null);
        } catch (error) {
            console.error("Error deleting CostCenter:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCeco) {
                await CostCentersService.saveCostCenter({ ...editingCeco, ...formData } as CostCenter);
            } else {
                await CostCentersService.saveCostCenter(formData as Omit<CostCenter, 'id'>);
            }
            setIsModalOpen(false);
            await loadData();
        } catch (error) {
            console.error("Error saving CostCenter:", error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Centros de Coste</h1>
                    <p className="text-muted-foreground">Gestiona los centros de coste (CeCos) y su asignación a gerencias.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo CeCo
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

            {/* Cecos Table */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Código</th>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Gerencia</th>
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredCecos.length > 0 ? (
                                filteredCecos.map((ceco) => (
                                    <tr key={ceco.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4 font-mono text-xs font-medium">
                                            {ceco.code}
                                        </td>
                                        <td className="px-6 py-4 font-medium">
                                            {ceco.name}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {managements.find(m => m.id === ceco.management_id)?.name || ceco.management_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            {ceco.is_active ? (
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
                                                    onClick={() => handleEdit(ceco)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(ceco.id)}
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
                                        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No se encontraron Centros de Coste</p>
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
                title={editingCeco ? 'Editar Centro de Coste' : 'Nuevo Centro de Coste'}
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
                                placeholder="Ej: 1001"
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
                                placeholder="Ej: Desarrollo de Software"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Gerencia</label>
                            <select
                                value={formData.management_id}
                                onChange={(e) => setFormData({ ...formData, management_id: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            >
                                {managements.map(mgmt => (
                                    <option key={mgmt.id} value={mgmt.id}>{mgmt.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="ceco_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <label htmlFor="ceco_active" className="text-sm font-medium cursor-pointer">
                                Activo
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

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!cecoToDelete}
                onClose={() => setCecoToDelete(null)}
                title="Eliminar Centro de Coste"
            >
                <div className="space-y-4">
                    <p className="text-sm text-foreground">
                        {t('common.deleteConfirm', { defaultValue: '¿Estás seguro de eliminar este Centro de Coste? Esta acción no se puede deshacer.' })}
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setCecoToDelete(null)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive hover:bg-destructive/90 rounded-md shadow-sm transition-colors"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
