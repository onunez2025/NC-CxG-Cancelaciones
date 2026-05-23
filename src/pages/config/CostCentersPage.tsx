import React, { useState, useEffect } from 'react';
import {
    Building2,
    Search,
    Plus,
    Edit2,
    Trash2,
    Building,
    ChevronRight,
    Activity,
    Hash,
    Database,
    Check
} from 'lucide-react';
import { CostCentersService } from '../../services/costCentersService';
import { ManagementsService } from '../../services/managementsService';
import type { CostCenter, Management } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
import { 
    SIATCTable, 
    SIATCTableRow, 
    SIATCTableCell, 
    SIATCTableFooter 
} from '../../components/siatc/table/SIATCTable';

export default function CostCentersPage() {
    const { confirm, alert } = useDialog();
    const [cecos, setCecos] = useState<CostCenter[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCeco, setEditingCeco] = useState<CostCenter | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Form state
    const [formData, setFormData] = useState<Partial<CostCenter>>({
        code: '',
        name: '',
        management_id: '',
        is_active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [cecosData, mgmtData] = await Promise.all([
                CostCentersService.getCostCenters(),
                ManagementsService.getManagements()
            ]);
            setCecos(cecosData);
            setManagements(mgmtData);
        } catch (error) {
            console.error("Failed to load data:", error);
        } finally {
            setIsLoading(false);
        }
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
            management_id: managements.length > 0 ? managements[0].id : '',
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
        confirm({
            title: 'Eliminar centro de coste',
            message: '¿Está seguro de eliminar este centro de coste? Esta acción es irreversible y podría afectar la asignación presupuestaria.',
            type: 'danger',
            confirmText: 'Eliminar CeCo',
            onConfirm: async () => {
                try {
                    await CostCentersService.deleteCostCenter(id);
                    await loadData();
                } catch (error: any) {
                    alert({ title: 'Error', message: error.message || 'No se pudo eliminar el registro', type: 'error' });
                }
            }
        });
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
                        <Building2 className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Centros de Coste</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Centros de Coste (CeCo)</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Administra la estructura organizacional y asignación presupuestaria</p>
                </div>
                <SIATCButton 
                    onClick={handleCreate}
                    icon={Plus}
                >
                    Nuevo
                </SIATCButton>
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
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por código SAP o nombre..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-cb-border rounded-cb-btn focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium placeholder:text-cb-neutral/40"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Cargando centros de coste...</span>
                        </div>
                    ) : (
                        <SIATCTable>
                            <thead>
                                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-48">Código SAP</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left">Nombre del Centro</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-left w-64">Gerencia Vinculada</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-center w-40">Estado</th>
                                    <th className="px-6 py-4 font-sans font-medium text-[12px] uppercase tracking-[0.06em] text-cb-neutral text-right w-28">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCecos.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-cb-text-secondary opacity-40" />
                                                <p className="text-sm font-medium text-cb-text-secondary italic">No se encontraron centros de coste activos</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCecos.map((ceco) => (
                                        <SIATCTableRow key={ceco.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-2 font-mono text-primary font-bold text-[11px] uppercase bg-primary/5 px-3 py-1.5 rounded-cb-btn border border-primary/20 w-fit shadow-sm group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                                                    <Hash className="w-3.5 h-3.5 opacity-50" />
                                                    {ceco.code}
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-cb-text-primary text-sm tracking-tight">{ceco.name}</span>
                                                    <span className="text-[10px] text-cb-text-secondary font-medium mt-0.5 opacity-60">Centro de coste directo</span>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-cb-btn bg-cb-bg flex items-center justify-center text-cb-text-secondary group-hover:bg-primary/10 group-hover:text-primary transition-all border border-cb-border">
                                                        <Building className="w-4 h-4" />
                                                    </div>
                                                    <span className="font-bold text-cb-text-secondary text-xs truncate">
                                                        {managements.find(m => m.id === ceco.management_id)?.name || 'Sin asignar'}
                                                    </span>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-center">
                                                {ceco.is_active ? (
                                                    <SIATCBadge variant="success">
                                                        Operativo
                                                    </SIATCBadge>
                                                ) : (
                                                    <SIATCBadge variant="danger">
                                                        Suspendido
                                                    </SIATCBadge>
                                                )}
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleEdit(ceco)}
                                                        className="p-2 text-cb-text-secondary hover:text-primary hover:bg-cb-bg rounded-cb-btn transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(ceco.id)}
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
                    totalRecords={filteredCecos.length}
                    showPaging={false}
                />
            </div>

            {/* Modal: SIATC Standard */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCeco ? 'Configuración de CeCo' : 'Nuevo Centro de Coste'} size="lg">
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 bg-muted/30 p-5 rounded-2xl border border-border/50 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                <Hash className="w-16 h-16 rotate-12" />
                            </div>
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1 relative z-10">Código SAP / Identificador:</label>
                            <input
                                type="text"
                                required
                                value={formData.code || ''}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:text-muted-foreground/30 relative z-10"
                                placeholder="Ej: 10001"
                            />
                        </div>

                        <div className="space-y-2 px-1">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Nombre descriptivo:</label>
                            <input
                                type="text"
                                required
                                value={formData.name || ''}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/30"
                                placeholder="Ej: Operaciones Logísticas"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2 px-1">
                            <label className="text-xs font-bold text-muted-foreground tracking-widest pl-1">Gerencia / unidad responsable:</label>
                            <div className="relative">
                                <Database className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                <select
                                    value={formData.management_id || ''}
                                    onChange={(e) => setFormData({ ...formData, management_id: e.target.value })}
                                    className="w-full h-12 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                                    required
                                >
                                    <option value="" disabled>Seleccionar gerencia de origen...</option>
                                    {managements.map(mgmt => (
                                        <option key={mgmt.id} value={mgmt.id}>{mgmt.name}</option>
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
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200/50"
                                        : "bg-rose-50 text-rose-700 border-rose-200/50"
                                )}
                            >
                                <span className="tracking-widest">Estado operativo del centro:</span>
                                <div className="flex items-center gap-3">
                                    {formData.is_active ? 'Habilitado' : 'Suspendido'}
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors",
                                        formData.is_active ? "bg-emerald-500" : "bg-rose-500"
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
                            {editingCeco ? 'Guardar cambios' : 'Registrar CeCo'}
                        </SIATCButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
