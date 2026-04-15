import { useState, useEffect } from 'react';
import {
    Briefcase,
    Search,
    Plus,
    Edit2,
    Trash2,
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

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { 
    SIATCTable, 
    SIATCTableHeader, 
    SIATCTableRow, 
    SIATCTableCell, 
    SIATCTableFooter 
} from '../../components/siatc/table/SIATCTable';

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
            title: 'Eliminar gerencia / sede',
            message: '¿Está seguro de eliminar esta gerencia? Esta acción es irreversible y podría afectar centros de coste y usuarios vinculados.',
            type: 'danger',
            confirmText: 'Eliminar gerencia',
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
            alert({ title: 'Error de guardado', message: error.message || 'No se pudo procesar la solicitud', type: 'error' });
        }
    };

    return (
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Briefcase className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Gerencias</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Estructura de Gerencias</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Administra los niveles jerárquicos y unidades de negocio</p>
                </div>
                <SIATCButton 
                    onClick={handleCreate}
                    icon={Plus}
                >
                    Nueva Gerencia
                </SIATCButton>
            </div>

            {/* Content Container */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {/* Search / Filters */}
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por código o nombre..."
                            className={SIATC_THEME.COMPONENTS.INPUT}
                        />
                    </div>
                </div>

                {/* Table Area */}
                <SIATCTable>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Cargando gerencias...</span>
                        </div>
                    ) : (
                        <>
                            <thead className={SIATC_THEME.TABLE.HEADER_ROW}>
                                <tr className="border-b border-border">
                                    <SIATCTableHeader className="w-48">Código identificador</SIATCTableHeader>
                                    <SIATCTableHeader>Denominación gerencial</SIATCTableHeader>
                                    <SIATCTableHeader className="w-28 text-right italic uppercase">Acciones</SIATCTableHeader>
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
                                        <SIATCTableRow key={mgmt.id}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-2 font-mono text-primary font-bold text-[11px] uppercase bg-primary/5 px-3 py-1.5 rounded-xl border border-primary/20 w-fit shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                    <Hash className="w-3.5 h-3.5 opacity-50" />
                                                    {mgmt.code}
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all border border-transparent group-hover:border-primary/20">
                                                        <Building className="w-4.5 h-4.5" />
                                                    </div>
                                                    <span className="font-bold text-foreground text-sm tracking-tight">{mgmt.name}</span>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-right">
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
                                            </SIATCTableCell>
                                        </SIATCTableRow>
                                    ))
                                )}
                            </tbody>
                        </>
                    )}
                </SIATCTable>
                
                {/* Footer Stats */}
                <SIATCTableFooter 
                    totalRecords={filteredManagements.length}
                    showPaging={false}
                />
            </div>

            {/* Modal: SIATC Standard */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMgmt ? 'Configuración de Gerencia' : 'Nueva Gerencia'} size="md">
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2 bg-muted/30 p-5 rounded-2xl border border-border/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <Hash className="w-16 h-16 rotate-12" />
                            </div>
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1 relative z-10">Código identificador:</label>
                            <input
                                type="text"
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-muted-foreground/30 relative z-10"
                                placeholder="Ej: AT01"
                                required
                            />
                        </div>
                        <div className="space-y-2 px-1">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Denominación gerencial:</label>
                            <input
                                type="text"
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                                placeholder="Ej: Gerencia de Atención al Cliente"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-4 border-t border-border mt-2">
                        <SIATCButton
                            type="button"
                            variant="secondary"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </SIATCButton>
                        <SIATCButton
                            type="submit"
                            variant="success"
                            icon={Check}
                            className="flex-1"
                        >
                            {editingMgmt ? 'Guardar cambios' : 'Confirmar registro'}
                        </SIATCButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
