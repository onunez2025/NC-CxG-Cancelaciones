import React, { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, ChevronDown, Activity, Settings, CalendarDays, Users, ChevronRight, ListChecks, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { RolesService } from '../../services/rolesService';
import type { Role, Permission } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';
import { toTitleCase } from '../../utils/formatters';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';

export default function RolesPage() {
    const { confirm, alert } = useDialog();
    const { hasPermission } = useAuth();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [availablePermissions] = useState(RolesService.getAllPermissions());

    const [formData, setFormData] = useState<Omit<Role, 'id'>>({
        name: '',
        permissions: [],
        apps: 'CXG'
    });

    const [isLoading, setIsLoading] = useState(true);
    const permissionGroups = [...new Set(availablePermissions.map(p => p.group))];
    const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

    const toggleGroup = (group: string) => {
        setExpandedGroup(prev => prev === group ? null : group);
    };

    const getGroupIcon = (groupName: string) => {
        const lower = groupName.toLowerCase();
        if (lower.includes('control') || lower.includes('operati')) return <Activity className="w-4 h-4" />;
        if (lower.includes('config')) return <Settings className="w-4 h-4" />;
        if (lower.includes('reserva') || lower.includes('agenda') || lower.includes('ticket')) return <CalendarDays className="w-4 h-4" />;
        if (lower.includes('empleado') || lower.includes('personal') || lower.includes('user') || lower.includes('usuario')) return <Users className="w-4 h-4" />;
        return <Shield className="w-4 h-4" />;
    };

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        setIsLoading(true);
        try {
            const data = await RolesService.getRoles();
            setRoles(data);
        } catch (error) {
            console.error("Failed to load roles:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            permissions: [],
            apps: 'CXG'
        });
        setExpandedGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            permissions: role.permissions,
            apps: role.apps || 'CXG'
        });
        setExpandedGroup(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        confirm({
            title: 'Eliminar Rol de Seguridad',
            message: '¿Está seguro de eliminar este perfil? Esta acción afectará los permisos de todos los usuarios vinculados a este rol en Gestor NC-CxG.',
            type: 'danger',
            confirmText: 'Eliminar Rol',
            onConfirm: async () => {
                try {
                    await RolesService.deleteRole(id);
                    await loadRoles();
                } catch (error: any) {
                    alert({ title: 'Error', message: error.message || 'No se pudo eliminar el rol', type: 'error' });
                }
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRole) {
                await RolesService.saveRole({ ...editingRole, ...formData });
            } else {
                await RolesService.saveRole(formData);
            }
            setIsModalOpen(false);
            await loadRoles();
        } catch (error: any) {
            alert({ title: 'Error de Guardado', message: error.message || 'No se pudo procesar la solicitud', type: 'error' });
        }
    };

    const togglePermission = (permissionId: Permission) => {
        setFormData(prev => {
            const hasP = prev.permissions.includes(permissionId);
            return {
                ...prev,
                permissions: hasP
                    ? prev.permissions.filter(p => p !== permissionId)
                    : [...prev.permissions, permissionId]
            };
        });
    };

    const filteredRoles = roles;

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Shield className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Roles</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Gestión de Roles</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Define las matrices de permisos y niveles de acceso para Gestor NC-CxG</p>
                </div>
                {hasPermission('config.roles') && (
                    <SIATCButton 
                        onClick={handleCreate}
                        icon={Plus}
                    >
                        Nuevo
                    </SIATCButton>
                )}
            </div>

            {/* Scrollable Content: Premium Cards */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="h-full flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm rounded-2xl border border-dashed border-border p-12">
                        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Cargando perfiles...</span>
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center bg-card/30 rounded-2xl border border-dashed border-border p-12">
                         <ShieldAlert className="w-12 h-12 text-muted-foreground/20 mb-4" />
                         <p className="text-sm font-bold text-muted-foreground tracking-widest text-center">No se encontraron roles configurados</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6 mt-2">
                        {filteredRoles.map((role) => {
                            const platformPermissions = role.permissions.filter(perm => availablePermissions.some(p => p.id === perm));
                            
                            return (
                            <div key={role.id} className="group bg-white dark:bg-cb-bg border border-cb-border rounded-cb-card shadow-cb-level-1 hover:shadow-cb-level-2 hover:border-primary/20 transition-all duration-300 relative overflow-hidden flex flex-col h-full">
                                {/* Visual Accent */}
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                                    <Shield className="w-20 h-20 rotate-12" />
                                </div>
                                
                                <div className="p-6 pb-4 space-y-4 flex-1">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-cb-btn bg-primary/10 flex items-center justify-center border border-primary/20 transition-transform group-hover:scale-110 shrink-0">
                                                <Shield className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-cb-text-primary text-sm tracking-tight">
                                                    {toTitleCase(role.name)}
                                                </h3>
                                                <p className="text-[10px] font-bold text-cb-text-secondary flex items-center gap-1.5 mt-0.5">
                                                    <ListChecks className="w-3 h-3 text-primary/60" />
                                                    {platformPermissions.length} Permisos autorizados
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all -mr-1">
                                            {hasPermission('config.roles') && (
                                                <>
                                                    <button onClick={() => handleEdit(role)} className="p-2 text-cb-text-secondary hover:text-primary hover:bg-cb-bg rounded-cb-btn transition-all" title="Editar Rol">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    {role.id !== 'admin' && (
                                                        <button onClick={() => handleDelete(role.id)} className="p-2 text-cb-text-secondary hover:text-destructive hover:bg-cb-bg rounded-cb-btn transition-all" title="Eliminar Rol">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Permissions Matrix Snapshot */}
                                    <div className="space-y-2">
                                        <p className="text-[9px] font-black text-cb-neutral tracking-widest pl-1 uppercase opacity-60">Vista rápida de facultades:</p>
                                        <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto pr-2 custom-scrollbar-thin">
                                            {platformPermissions.length === 0 ? (
                                                <span className="text-[10px] text-cb-text-secondary italic font-medium px-1">Sin facultades administrativas...</span>
                                            ) : (
                                                platformPermissions.slice(0, 15).map(perm => {
                                                    const label = availablePermissions.find(p => p.id === perm)?.label || perm;
                                                    return (
                                                        <span key={perm} className="px-2 py-0.5 rounded-cb-chip text-[9px] font-bold bg-cb-bg text-cb-text-secondary border border-cb-border tracking-tight group-hover:bg-primary/5 group-hover:border-primary/10 group-hover:text-primary transition-all">
                                                            {label}
                                                        </span>
                                                    );
                                                })
                                            )}
                                            {platformPermissions.length > 15 && (
                                                <span className="px-2 py-0.5 rounded-cb-chip text-[9px] font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                                                    +{platformPermissions.length - 15} más
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Footer Action */}
                                <div className="p-4 pt-0">
                                    <button 
                                        onClick={() => handleEdit(role)}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-cb-btn border border-cb-border bg-cb-bg/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all text-[10px] font-black tracking-[0.2em] group/btn uppercase"
                                    >
                                        Configurar Matriz
                                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                                    </button>
                                </div>
                            </div>
                        )})}
                    </div>
                )}
            </div>

            {/* Modal: SIATC Standard XL */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRole ? 'Matriz de Permisos' : 'Registro de Rol'} size="xl">
                <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-6">
                    {/* Header Identifier */}
                    <div className="bg-muted/30 p-5 rounded-2xl border border-border/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
                            <Shield className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="relative z-10 flex flex-col gap-4">
                            <div className="flex items-center gap-2 text-xs font-black text-muted-foreground tracking-[0.2em]">
                                <Shield className="w-4 h-4 text-primary" />
                                Identificación del rol:
                            </div>
                            <input 
                                type="text" 
                                required
                                value={formData.name || ''} 
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm font-bold placeholder:text-muted-foreground/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                                placeholder="Ej: Administrador Central" 
                            />
                        </div>
                    </div>

                    {/* App Reach Section */}
                    <div className="space-y-4 px-1">
                        <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground tracking-[0.2em]">
                            <Settings className="w-4 h-4 text-primary" /> Alcance en el ecosistema:
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            {[
                                { id: 'EBM', label: 'EBM Central' },
                                { id: 'FSM', label: 'Gestor FSM' },
                                { id: 'TCtrl', label: 'Tablero' },
                                { id: 'Liq', label: 'Liquidaciones' },
                                { id: 'VAL', label: 'Valuaciones' },
                                { id: 'CXG', label: 'Gestor NC-CxG' }
                            ].map(app => {
                                const isSelected = (formData.apps || '').split(',').map(a => a.trim()).includes(app.id);
                                return (
                                    <button 
                                        key={app.id} 
                                        type="button" 
                                        onClick={() => {
                                            const currentApps = (formData.apps || '').split(',').map((a: string) => a.trim()).filter(Boolean);
                                            const updatedApps = currentApps.includes(app.id)
                                                ? currentApps.filter((a: string) => a !== app.id)
                                                : [...currentApps, app.id];
                                            setFormData({ ...formData, apps: updatedApps.join(', ') });
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-3.5 rounded-2xl text-[10px] font-black transition-all border shadow-sm",
                                            isSelected
                                                ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                                                : "bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50"
                                        )}>
                                        <div className={cn(
                                            "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                                            isSelected ? "bg-white text-primary border-white" : "border-border bg-background"
                                        )}>
                                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[4]" />}
                                        </div>
                                        <span className="truncate">{app.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Permissions Hierarchy Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1 border-b border-border pb-4">
                            <h3 className="text-xs font-black text-foreground tracking-widest flex items-center gap-2 uppercase">
                                <ListChecks className="w-4 h-4 text-primary" /> Matriz de facultad administrativa
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-muted-foreground opacity-60 uppercase">Seleccionados:</span>
                                <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-lg border border-primary/20">
                                    {formData.permissions.length}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {permissionGroups.map(group => {
                                const isExpanded = expandedGroup === group;
                                return (
                                    <div key={group} className="border border-border/50 rounded-2xl overflow-hidden bg-muted/10 hover:border-primary/20 transition-all">
                                        <button 
                                            type="button"
                                            onClick={() => toggleGroup(group)}
                                            className={cn(
                                                "w-full flex items-center justify-between p-4 group/header hover:bg-muted/30 transition-colors",
                                                isExpanded && "bg-muted/20"
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl flex items-center justify-center border transition-all group-hover/header:rotate-12",
                                                    isExpanded ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" : "bg-card text-primary border-border"
                                                )}>
                                                    {getGroupIcon(group)}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs font-black text-foreground tracking-tight">{group}</p>
                                                    <p className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">
                                                        {availablePermissions.filter(p => p.group === group).length} Permisos disponibles
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex -space-x-1.5 overflow-hidden">
                                                    {formData.permissions.filter(p => availablePermissions.find(ap => ap.id === p)?.group === group).slice(0, 3).map((_, i) => (
                                                        <div key={i} className="w-2 h-2 rounded-full bg-primary border-2 border-white dark:border-zinc-950 shadow-sm" />
                                                    ))}
                                                    {formData.permissions.filter(p => availablePermissions.find(ap => ap.id === p)?.group === group).length > 3 && (
                                                        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center text-[7px] font-black text-white border-2 border-white dark:border-zinc-950 shadow-sm">
                                                            +
                                                        </div>
                                                    )}
                                                </div>
                                                <div className={cn(
                                                    "w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center transition-transform",
                                                    isExpanded ? "rotate-180" : "rotate-0"
                                                )}>
                                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        </button>

                                        {isExpanded && (
                                            <div className="p-5 pt-2 border-t border-border/50 bg-background/50 animate-in slide-in-from-top-2 duration-300">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-3">
                                                    {availablePermissions.filter(p => p.group === group).map(perm => {
                                                        const isSelected = formData.permissions.includes(perm.id);
                                                        return (
                                                            <button 
                                                                type="button"
                                                                key={perm.id} 
                                                                onClick={() => togglePermission(perm.id)}
                                                                className={cn(
                                                                    "group relative flex items-center gap-3 px-4 py-3.5 rounded-xl text-[11px] text-left transition-all border",
                                                                    isSelected
                                                                        ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/10'
                                                                        : 'bg-card border-border/60 text-muted-foreground hover:border-primary/40 hover:bg-muted/30 hover:text-foreground'
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    "w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0 shadow-inner",
                                                                    isSelected 
                                                                        ? 'bg-white text-primary' 
                                                                        : 'bg-muted border border-border'
                                                                )}>
                                                                    {isSelected && <Check className="w-3 h-3 stroke-[5px]" />}
                                                                </div>
                                                                <span className="font-bold tracking-tight leading-none">
                                                                    {perm.label}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-border mt-6">
                        <SIATCButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </SIATCButton>
                        <SIATCButton type="submit" variant="success" icon={Check}>
                            {editingRole ? 'Guardar Matriz' : 'Registrar Rol'}
                        </SIATCButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
