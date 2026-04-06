import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check, ChevronDown, Activity, Settings, CalendarDays, Users, Save } from 'lucide-react';
import { RolesService } from '../../services/rolesService';
import type { Role, Permission } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';

export function RolesPage() {
    const { confirm } = useDialog();
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [availablePermissions] = useState(RolesService.getAllPermissions());

    const [formData, setFormData] = useState<Omit<Role, 'id'>>({
        name: '',
        permissions: [],
        apps: 'EBM'
    });

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
        try {
            const data = await RolesService.getRoles();
            setRoles(data);
        } catch (error) {
            console.error("Failed to load roles:", error);
        }
    };

    const handleCreate = () => {
        setEditingRole(null);
        setFormData({
            name: '',
            permissions: [],
            apps: 'EBM'
        });
        setExpandedGroup(null);
        setIsModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            permissions: role.permissions,
            apps: role.apps || 'EBM'
        });
        setExpandedGroup(null);
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        confirm({
            title: 'Eliminar Rol',
            message: '¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer y afectará a todos los usuarios que tengan este rol asignado.',
            onConfirm: async () => {
                try {
                    await RolesService.deleteRole(id);
                    await loadRoles();
                } catch (error) {
                    console.error("Error deleting role:", error);
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
        } catch (error) {
            console.error("Error saving role:", error);
        }
    };

    const togglePermission = (permissionId: Permission) => {
        setFormData(prev => {
            const hasPermission = prev.permissions.includes(permissionId);
            return {
                ...prev,
                permissions: hasPermission
                    ? prev.permissions.filter(p => p !== permissionId)
                    : [...prev.permissions, permissionId]
            };
        });
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col shadow-sm rounded-lg text-slate-800">
                <div className="sticky top-0 z-30 p-6 border border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card rounded-t-lg before:content-[''] before:absolute before:bottom-full before:-translate-y-px before:-left-4 before:-right-4 before:h-12 before:bg-background before:pointer-events-none">
                    <div>
                        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground"><Shield className="w-5 h-5 text-primary" /> Gestión de Roles</h2>
                        <p className="text-sm text-muted-foreground mt-1">Define permisos y niveles de acceso para los usuarios</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Rol
                    </button>
                </div>

                <div className="p-6 space-y-6 bg-card border-x border-b border-border rounded-b-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map((role) => (
                            <div key={role.id} className="bg-background rounded-lg border border-border shadow-sm p-5 hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <Shield className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-foreground text-sm">{role.name}</h3>
                                            <p className="text-[11px] text-muted-foreground">{role.permissions.length} permisos asignados</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => handleEdit(role)}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-md transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        {role.id !== 'admin' && ( // Prevent deleting admin
                                            <button
                                                onClick={() => handleDelete(role.id)}
                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                    {role.permissions.filter(p => availablePermissions.some(ap => ap.id === p)).length === 0 ? (
                                        <span className="text-xs text-muted-foreground italic">Sin permisos asignados</span>
                                    ) : (
                                        role.permissions
                                            .filter(p => availablePermissions.some(ap => ap.id === p))
                                            .map(perm => {
                                                const label = availablePermissions.find(p => p.id === perm)?.label || perm;
                                                return (
                                                    <span key={perm} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground border border-border">
                                                        {label}
                                                    </span>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRole ? 'Configuración de Rol' : 'Nuevo Rol'} size="xl">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-6 py-2">
                        {/* Role Header Section - Compacted */}
                        <div className="bg-muted/30 p-4 rounded-xl border border-border/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                                <Shield className="w-16 h-16 rotate-12" />
                            </div>
                            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="shrink-0 flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                                    <Shield className="w-3.5 h-3.5 text-primary" />
                                    Identificación:
                                </div>
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        required
                                        value={formData.name || ''} 
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full h-10 pl-11 pr-4 bg-background border border-input rounded-lg text-sm font-bold placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
                                        placeholder="Nombre descriptivo del Rol (Ej: Administrador, Operador)" 
                                    />
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60">
                                        <Shield className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Application Access Section */}
                        <div className="space-y-3 pt-1">
                            <h3 className="block text-sm font-bold text-foreground">Acceso a Aplicaciones</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                {[
                                    { id: 'EBM', label: 'EBM (Principal)' },
                                    { id: 'FSM', label: 'Gestor FSM' },
                                    { id: 'TCtrl', label: 'Tablero Control' },
                                    { id: 'Liq', label: 'Liquidaciones' }
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
                                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border",
                                                isSelected
                                                    ? "bg-primary/5 border-primary/30 text-primary"
                                                    : "bg-background border-border text-foreground hover:bg-muted"
                                            )}>
                                            <div className={cn(
                                                "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                                                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-input bg-background"
                                            )}>
                                                {isSelected && <Save className="w-2.5 h-2.5" />}
                                            </div>
                                            <span className="font-medium truncate">{app.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Permissions Section */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <h3 className="text-sm font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    Panel de Permisos
                                </h3>
                                <div className="h-px bg-border flex-1" />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {permissionGroups.map(group => {
                                    const isExpanded = expandedGroup === group;
                                    return (
                                        <div key={group} className="border border-border/50 rounded-xl overflow-hidden bg-background">
                                            <button 
                                                type="button"
                                                onClick={() => toggleGroup(group)}
                                                className="w-full flex items-center justify-between p-3.5 group/header hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover/header:scale-105 transition-transform">
                                                        {getGroupIcon(group)}
                                                    </div>
                                                    <p className="text-sm font-bold text-foreground tracking-tight">{group}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-[10px] font-medium text-muted-foreground px-2 py-0.5 bg-muted rounded border border-border/50 uppercase tracking-wider">
                                                        {availablePermissions.filter(p => p.group === group).length} Opciones
                                                    </div>
                                                    <ChevronDown className={cn(
                                                        "w-4 h-4 text-muted-foreground transition-transform duration-300",
                                                        !isExpanded && "-rotate-90"
                                                    )} />
                                                </div>
                                            </button>

                                            {isExpanded && (
                                                <div className="p-4 pt-0 border-t border-border/50 bg-muted/5 transition-all">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-4">
                                                        {availablePermissions.filter(p => p.group === group).map(perm => {
                                                            const isSelected = formData.permissions.includes(perm.id);
                                                            return (
                                                                <button 
                                                                    type="button"
                                                                    key={perm.id} 
                                                                    onClick={() => togglePermission(perm.id)}
                                                                    className={cn(
                                                                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs text-left transition-all border",
                                                                        isSelected
                                                                            ? 'bg-primary/5 border-primary/30 text-primary ring-1 ring-primary/10'
                                                                            : 'bg-background border-border text-muted-foreground hover:border-primary/30 hover:bg-muted/30'
                                                                    )}
                                                                >
                                                                    <div className={cn(
                                                                        "w-4 h-4 rounded-md flex items-center justify-center transition-all shrink-0",
                                                                        isSelected 
                                                                            ? 'bg-primary text-primary-foreground' 
                                                                            : 'bg-muted border border-border'
                                                                    )}>
                                                                        {isSelected && <Check className="w-3 h-3 stroke-[3px]" />}
                                                                    </div>
                                                                    <span className={cn(
                                                                        "font-medium truncate",
                                                                        isSelected ? 'text-primary' : 'group-hover:text-foreground'
                                                                    )}>
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
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
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
        </div>
    );
}
