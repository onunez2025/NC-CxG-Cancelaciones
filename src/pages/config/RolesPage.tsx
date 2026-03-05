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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión de Roles</h1>
                    <p className="text-muted-foreground">Define los roles y permisos de acceso al sistema.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Rol
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {roles.map((role) => (
                    <div key={role.id} className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{role.name}</h3>
                                    <p className="text-sm text-muted-foreground">{role.permissions.length} permisos asignados</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleEdit(role)}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                {role.id !== 'admin' && ( // Prevent deleting admin
                                    <button
                                        onClick={() => handleDelete(role.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4">
                            {role.permissions.slice(0, 5).map(perm => {
                                const label = availablePermissions.find(p => p.id === perm)?.label || perm;
                                return (
                                    <span key={perm} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-md">
                                        {label}
                                    </span>
                                );
                            })}
                            {role.permissions.length > 5 && (
                                <span className="px-2 py-1 bg-muted/50 text-muted-foreground text-xs rounded-md">
                                    +{role.permissions.length - 5} más
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingRole ? 'Editar Rol' : 'Nuevo Rol'}
                className="max-w-4xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre del Rol</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                            placeholder="Ej: Auditor"
                        />
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-sm font-medium border-b border-border pb-2">Permisos del Sistema</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto p-1">
                            {Object.entries(groupedPermissions).map(([group, permissions]) => (
                                <div key={group} className="space-y-2">
                                    <h4 className="text-sm font-semibold text-primary">{group}</h4>
                                    <div className="space-y-1">
                                        {permissions.map((perm) => {
                                            const isSelected = formData.permissions.includes(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => togglePermission(perm.id)}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors border",
                                                        isSelected
                                                            ? "bg-primary/5 border-primary/20 text-foreground"
                                                            : "bg-background border-transparent hover:bg-muted text-muted-foreground"
                                                    )}
                                                >
                                                    <span>{perm.label}</span>
                                                    {isSelected ? (
                                                        <Check className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <div className="w-4 h-4" />
                                                    )}
                                                </div>
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
                            Guardar Rol
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!roleToDelete}
                onClose={() => setRoleToDelete(null)}
                title="Eliminar Rol"
            >
                <div className="space-y-4">
                    <p className="text-sm text-foreground">
                        ¿Estás seguro de eliminar este rol? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setRoleToDelete(null)}
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
