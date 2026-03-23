import { useState, useEffect } from 'react';
import { Shield, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { RolesService } from '../../services/rolesService';
import type { Role, Permission } from '../../types';
import { Modal } from '../../components/common/Modal';
import { cn } from '../../utils/cn';

export function RolesPage() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [availablePermissions] = useState(RolesService.getAllPermissions());
    const [roleToDelete, setRoleToDelete] = useState<string | null>(null);

    const [formData, setFormData] = useState<Omit<Role, 'id'>>({
        name: '',
        permissions: []
    });

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
            permissions: []
        });
        setIsModalOpen(true);
    };

    const handleEdit = (role: Role) => {
        setEditingRole(role);
        setFormData({
            name: role.name,
            permissions: role.permissions
        });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setRoleToDelete(id);
    };

    const confirmDelete = async () => {
        if (!roleToDelete) return;
        try {
            await RolesService.deleteRole(roleToDelete);
            await loadRoles();
            setRoleToDelete(null);
        } catch (error) {
            console.error("Error deleting role:", error);
        }
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

    // Group permissions by category
    const groupedPermissions = availablePermissions.reduce((acc, curr) => {
        if (!acc[curr.group]) acc[curr.group] = [];
        acc[curr.group].push(curr);
        return acc;
    }, {} as Record<string, typeof availablePermissions>);

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
                                            <h3 className="font-semibold text-foreground text-sm">{role.name}</h3>
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

                                <div className="flex flex-wrap gap-1.5">
                                    {role.permissions.length === 0 ? (
                                        <span className="text-xs text-muted-foreground italic">Sin permisos asignados</span>
                                    ) : (
                                        role.permissions.map(perm => {
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

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Nombre del Rol *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Ej: Auditor"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">Permisos del Sistema</label>
                        <div className="space-y-4">
                            {Object.entries(groupedPermissions).map(([group, permissions]) => (
                                <div key={group}>
                                    <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">{group}</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {permissions.map((perm) => {
                                            const isSelected = formData.permissions.includes(perm.id);
                                            return (
                                                <button
                                                    key={perm.id}
                                                    type="button"
                                                    onClick={() => togglePermission(perm.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border",
                                                        isSelected
                                                            ? "bg-primary/5 border-primary/20 text-primary"
                                                            : "bg-card border-border text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded flex items-center justify-center transition-colors",
                                                        isSelected ? "bg-primary text-primary-foreground" : "border border-border"
                                                    )}>
                                                        {isSelected && <Check className="w-3 h-3" />}
                                                    </div>
                                                    {perm.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
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
                            {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                title="Eliminar Rol"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-sm text-foreground">
                        ¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer y afectará a todos los usuarios que tengan este rol asignado.
                    </p>
                    <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                            onClick={() => setRoleToDelete(null)}
                            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent rounded-md transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={confirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-md shadow-sm transition-colors"
                        >
                            Eliminar Rol
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
