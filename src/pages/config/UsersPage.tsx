import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    AlertCircle
} from 'lucide-react';
import { ManagementsService } from '../../services/managementsService';
import { UsersService } from '../../services/usersService';
import { RolesService } from '../../services/rolesService';
import type { User, Management, Role } from '../../types';
import { Modal } from '../../components/common/Modal';
import { cn } from '../../utils/cn';

export function UsersPage() {
    const { t } = useTranslation();
    const [users, setUsers] = useState<User[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<User>>({
        full_name: '',
        username: '',
        email: '',
        role_id: 'viewer',
        management_id: 'it',
        is_active: true,
        language: 'es',
        theme: 'light',
        password_hash: '',
        apps: 'EBM'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, mgmtData, rolesData] = await Promise.all([
                UsersService.getUsers(),
                ManagementsService.getManagements(),
                RolesService.getRoles()
            ]);
            setUsers(usersData);
            setManagements(mgmtData);
            setRoles(rolesData);
        } catch (error) {
            console.error("Failed to load users data:", error);
        }
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const handleCreate = () => {
        setEditingUser(null);
        setError(null);
        setFormData({
            full_name: '',
            username: '',
            email: '',
            role_id: roles.length > 0 ? roles[0].id : 'viewer',
            management_id: managements.length > 0 ? managements[0].id : 'it',
            is_active: true,
            language: 'es',
            theme: 'light',
            password_hash: '',
            apps: 'EBM'
        });
        setIsModalOpen(true);
    };

    const toggleApp = (appCode: string) => {
        const currentApps = (formData.apps || '').split(',').map(a => a.trim()).filter(Boolean);
        const updatedApps = currentApps.includes(appCode)
            ? currentApps.filter(a => a !== appCode)
            : [...currentApps, appCode];
        
        setFormData({ ...formData, apps: updatedApps.join(', ') });
    };

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setError(null);
        setFormData({ ...user, password_hash: '' }); // Clear password field on edit so it's not pre-filled
        setIsModalOpen(true);
    };

    const handleDelete = (id: string) => {
        setUserToDelete(id);
    };

    const confirmDelete = async () => {
        if (!userToDelete) return;
        try {
            await UsersService.deleteUser(userToDelete);
            await loadData();
            setUserToDelete(null);
        } catch (error) {
            console.error("Error deleting user:", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        try {
            if (editingUser) {
                await UsersService.saveUser({ ...editingUser, ...formData } as User);
            } else {
                await UsersService.saveUser(formData as User);
            }
            setIsModalOpen(false);
            await loadData();
        } catch (error: any) {
            console.error("Error saving user:", error);
            setError(error.message);
        }
    };

    const getRoleBadge = (roleId: string) => {
        const role = roles.find(r => r.id === roleId);
        // Default colors mapping as a fallback since color is not strictly on Role
        const roleColorMap: Record<string, string> = {
            'admin': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'manager': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'analyst': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            'viewer': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
        };
        const colorClass = roleColorMap[roleId] || roleColorMap['viewer'];

        return (
            <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium", colorClass)}>
                {role?.name || roleId}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
                    <p className="text-muted-foreground">Administra el acceso y roles de los usuarios del sistema.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nuevo Usuario
                </button>
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={handleSearch}
                        className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                    />
                </div>
                {/* Placeholder for more filters */}
            </div>

            {/* Users Table */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-6 py-3">Usuario</th>
                                <th className="px-6 py-3">Rol</th>
                                <th className="px-6 py-3">Gerencia</th>
                                <th className="px-6 py-3 text-center">Aplicaciones</th>
                                <th className="px-6 py-3 text-center">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                    {user.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-foreground">{user.full_name || user.username}</div>
                                                    <div className="text-xs text-muted-foreground">{user.username} • {user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getRoleBadge(user.role_id)}
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground">
                                            {managements.find(m => m.id === user.management_id)?.name || user.management_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {(user.apps || 'EBM').split(',').map(app => (
                                                    <span key={app} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                                                        {app.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                                user.is_active 
                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20"
                                            )}>
                                                {user.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
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
                                        <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No se encontraron usuarios</p>
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
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Nombre Completo</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Usuario / ID de Inicio de sesión</label>
                            <input
                                type="text"
                                required
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="Ej: jperez"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder="juan@empresa.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                Contraseña {editingUser && <span className="text-xs text-muted-foreground font-normal">(Dejar en blanco para mantener actual)</span>}
                            </label>
                            <input
                                type="password"
                                required={!editingUser}
                                value={formData.password_hash || ''}
                                onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                placeholder={editingUser ? "••••••••" : "Ingresa una contraseña segura"}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol</label>
                                <select
                                    value={formData.role_id}
                                    onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                                >
                                    {roles.map(role => (
                                        <option key={role.id} value={role.id}>{role.name}</option>
                                    ))}
                                </select>
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
                        </div>

                        <div className="col-span-full border-t border-border pt-4 mt-2">
                            <label className="block text-sm font-medium text-foreground mb-3">Acceso a Aplicaciones</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'EBM', label: 'EBM (Principal)' },
                                    { id: 'FSM', label: 'Gestor FSM' },
                                    { id: 'TCtrl', label: 'Tablero Control' }
                                ].map(app => {
                                    const isSelected = (formData.apps || '').split(',').map(a => a.trim()).includes(app.id);
                                    return (
                                        <button key={app.id} type="button" onClick={() => toggleApp(app.id)}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border",
                                                isSelected
                                                    ? "bg-primary/5 border-primary/20 text-primary"
                                                    : "bg-card border-border text-foreground hover:bg-muted"
                                            )}>
                                            <div className={cn(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                isSelected ? "bg-primary border-primary text-white" : "border-input bg-background"
                                            )}>
                                                {isSelected && <Users className="w-2.5 h-2.5" />}
                                            </div>
                                            {app.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 col-span-full border-t border-border pt-4">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary"
                            />
                            <label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                                Usuario Activo
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
                isOpen={!!userToDelete}
                onClose={() => setUserToDelete(null)}
                title="Eliminar Usuario"
            >
                <div className="space-y-4">
                    <p className="text-sm text-foreground">
                        {t('common.deleteConfirm', { defaultValue: '¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.' })}
                    </p>
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            onClick={() => setUserToDelete(null)}
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
