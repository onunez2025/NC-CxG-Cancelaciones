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
        <div className="flex flex-col h-full bg-background animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="p-6 bg-card border border-border rounded-t-lg flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                        <Briefcase className="w-5 h-5 text-primary" /> Gerencias
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Gestione las gerencias de la organización.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Gerencia
                </button>
            </div>

            {/* Toolbar */}
            <div className="p-4 bg-muted/30 border-x border-border shrink-0">
                <div className="relative max-w-sm flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm transition-all"
                    />
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto bg-card border-x border-b border-border rounded-b-lg scrollbar-thin scrollbar-thumb-border hover:scrollbar-thumb-muted-foreground/20">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-muted/80 backdrop-blur-sm text-muted-foreground font-bold border-b border-border">
                        <tr>
                            <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider">Código</th>
                            <th className="px-6 py-3 font-bold text-xs uppercase tracking-wider">Nombre</th>
                            <th className="px-6 py-3 text-right font-bold text-xs uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {filteredManagements.map(mgmt => (
                            <tr key={mgmt.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="font-mono text-primary font-bold text-xs uppercase">{mgmt.code}</span>
                                </td>
                                <td className="px-6 py-4 font-medium text-foreground">{mgmt.name}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(mgmt)}
                                            className="p-1.5 hover:bg-primary/10 rounded-md transition-colors text-muted-foreground hover:text-primary"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(mgmt.id)}
                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-muted-foreground hover:text-red-600"
                                            title="Eliminar"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredManagements.length === 0 && (
                            <tr>
                                <td colSpan={3} className="text-center py-12 text-muted-foreground italic opacity-60">
                                    No se encontraron gerencias que coincidan con la búsqueda.
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
