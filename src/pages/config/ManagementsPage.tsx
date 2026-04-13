import React, { useState, useEffect } from 'react';
import {
    Briefcase,
    Search,
    Plus,
    Edit2,
    Trash2,
    X,
    Building,
    Hash,
    ChevronRight,
    Activity,
    Check
} from 'lucide-react';
import { ManagementsService } from '../../services/managementsService';
import type { Management } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';

export default function ManagementsPage() {
    const { confirm, alert } = useDialog();
    const [managements, setManagements] = useState<Management[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMgmt, setEditingMgmt] = useState<Management | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [formData, setFormData] = useState<Partial<Management>>({
        name: '',
        code: ''
    });

    useEffect(() => {
        loadManagements();
    }, []);

    const loadManagements = async () => {
        setIsLoading(true);
        try {
            const data = await ManagementsService.getManagements();
            setManagements(data);
        } catch (error) {
            console.error("Failed to load managements:", error);
        } finally {
            setIsLoading(false);
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

    const handleDelete = (id: string) => {
        confirm({
            title: 'Eliminar Gerencia / Sede',
            message: '¿Está seguro de eliminar esta gerencia? Esta acción es irreversible y podría afectar centros de coste y usuarios vinculados.',
            type: 'danger',
            confirmText: 'Eliminar Gerencia',
            onConfirm: async () => {
                try {
                    await ManagementsService.deleteManagement(id);
                    await loadManagements();
                } catch (error: any) {
                    alert({ title: 'Error', message: error.message || 'No se pudo eliminar el registro', type: 'error' });
                }
            }
        });
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
        } catch (error: any) {
            alert({ title: 'Error de Guardado', message: error.message || 'No se pudo procesar la solicitud', type: 'error' });
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Briefcase className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Gerencias</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Estructura de Gerencias</h1>
                    <p className="text-sm text-muted-foreground">Administra los niveles jerárquicos y unidades de negocio</p>
                </div>
                <button 
                    onClick={handleCreate}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all active:scale-95 font-semibold text-sm shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Gerencia
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
                            placeholder="Buscar por código o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className="flex-1 overflow-auto relative custom-scrollbar">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 uppercase tracking-[0.2em]">Cargando gerencias...</span>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left border-collapse table-fixed min-w-[600px]">
                            <thead className="sticky top-0 z-20 bg-muted/90 backdrop-blur-md">
                                <tr className="border-b border-border">
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground w-48">ID / Código</th>
                                    <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-muted-foreground">Denominación Gerencial</th>
                                    <th className="px-6 py-4 w-24 font-bold text-xs uppercase tracking-wider text-muted-foreground text-right italic">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredManagements.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-muted-foreground/20" />
                                                <p className="text-sm font-medium text-muted-foreground italic">No se encontraron gerencias registradas</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredManagements.map((mgmt) => (
                                        <tr key={mgmt.id} className="group hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-mono text-primary font-bold text-xs uppercase bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 w-fit shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                    <Hash className="w-3.5 h-3.5 opacity-50" />
                                                    {mgmt.code}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all border border-transparent group-hover:border-primary/20">
                                                        <Building className="w-4.5 h-4.5" />
                                                    </div>
                                                    <span className="font-bold text-foreground text-sm uppercase tracking-tight">{mgmt.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(mgmt)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(mgmt.id)}
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
                        Total unidades: <span className="text-foreground ml-1">{filteredManagements.length}</span>
                    </p>
                </div>
            </div>

            {/* Modal: SIATC Standard */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMgmt ? 'GESTIÓN DE GERENCIA' : 'NUEVA GERENCIA'} size="md">
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2 bg-muted/30 p-5 rounded-2xl border border-border/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <Hash className="w-16 h-16 rotate-12" />
                            </div>
                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1 relative z-10">Código Identificador:</label>
                            <input
                                type="text"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-muted-foreground/30 relative z-10"
                                placeholder="EJ: AT01"
                                required
                            />
                        </div>
                        <div className="space-y-2 px-1">
                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">Denominación Gerencial:</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                                placeholder="EJ: GERENCIA DE ATENCIÓN AL CLIENTE"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all uppercase tracking-widest active:scale-95 flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Descartar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 text-xs font-bold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/25 active:scale-95 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                        >
                            <Check className="w-4 h-4 stroke-[3]" />
                            {editingMgmt ? 'Guardar Cambios' : 'Confirmar Registro'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
