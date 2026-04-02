import { useState, useEffect } from 'react';
import {
    Briefcase,
    Search,
    Plus,
    Edit2,
    Trash2,
    X
} from 'lucide-react';
import { ManagementsService } from '../../services/managementsService';
import type { Management } from '../../types';
import { Modal } from '../../components/common/Modal';

export function ManagementsPage() {
    const [managements, setManagements] = useState<Management[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMgmt, setEditingMgmt] = useState<Management | null>(null);

    const [formData, setFormData] = useState<Partial<Management>>({
        name: '',
        code: ''
    });

    useEffect(() => {
        loadManagements();
    }, []);

    const loadManagements = async () => {
        try {
            const data = await ManagementsService.getManagements();
            setManagements(data);
        } catch (error) {
            console.error("Failed to load managements:", error);
        }
    };

    const filteredManagements = managements.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingMgmt(null);
        setFormData({ name: '', code: '' });
        setIsModalOpen(true);
    };

    const handleEdit = (mgmt: Management) => {
        setEditingMgmt(mgmt);
        setFormData({ name: mgmt.name, code: mgmt.code });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await ManagementsService.deleteManagement(id);
            await loadManagements();
        } catch (error) {
            console.error("Error deleting management:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.code) return;

        try {
            if (editingMgmt) {
                await ManagementsService.saveManagement({
                    ...editingMgmt,
                    name: formData.name!,
                    code: formData.code!
                });
            } else {
                await ManagementsService.saveManagement({
                    name: formData.name!,
                    code: formData.code!
                });
            }

            setIsModalOpen(false);
            await loadManagements();
        } catch (error) {
            console.error("Error saving management:", error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-primary" />
                        Gerencias
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Gestione las gerencias de la organización.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Gerencia
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-card border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b bg-muted/30">
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Código</th>
                            <th className="text-left py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Nombre</th>
                            <th className="text-right py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredManagements.map(mgmt => (
                            <tr key={mgmt.id} className="hover:bg-muted/10 transition-colors">
                                <td className="py-3 px-4">
                                    <span className="font-mono text-primary font-bold text-xs">{mgmt.code}</span>
                                </td>
                                <td className="py-3 px-4 font-medium">{mgmt.name}</td>
                                <td className="py-3 px-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button
                                            onClick={() => handleEdit(mgmt)}
                                            className="p-1.5 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mgmt.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-muted-foreground hover:text-red-600"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredManagements.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-8 text-muted-foreground text-sm">
                                    No se encontraron gerencias.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingMgmt ? 'Editar Gerencia' : 'Nueva Gerencia'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Código</label>
                        <input
                            type="text"
                            value={formData.code || ''}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Ej: AT01"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Nombre</label>
                        <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="Ej: Atención al Cliente"
                            required
                        />
                    </div>
                    <div className="flex items-center gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 bg-muted text-muted-foreground rounded-lg font-bold text-sm hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            {editingMgmt ? 'Guardar Cambios' : 'Crear Gerencia'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
