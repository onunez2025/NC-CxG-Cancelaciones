import { useState, useEffect } from 'react';
// import { useTranslation } from 'react-i18next';
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Save,
    ChevronUp,
    ChevronDown
} from 'lucide-react';
import { ManagementsService } from '../../services/managementsService';
import { UsersService } from '../../services/usersService';
import { RolesService } from '../../services/rolesService';
import type { User, Management, Role } from '../../types';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { cn } from '../../utils/cn';
import { useTableResizer } from '../../hooks/useTableResizer';
import { ResizableHeader } from '../../components/common/ResizableHeader';
import { useAuth } from '../../hooks/useAuth';

export function UsersPage() {
    // const { t } = useTranslation();
    const { confirm } = useDialog();
    const { hasPermission } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [sortBy, setSortBy] = useState<string>('username');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
    const [error, setError] = useState<string | null>(null);

    // Resizing logic
    const { widths, onResizeStart } = useTableResizer('ebm_users_column_widths', {
        usuario: 250,
        email: 200,
        rol: 150,
        apps: 200
    });

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

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(column);
            setSortOrder('ASC');
        }
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortBy !== column) return <ChevronUp className="w-3.5 h-3.5 opacity-20" />;
        return sortOrder === 'ASC' 
            ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> 
            : <ChevronDown className="w-3.5 h-3.5 text-primary" />;
    };

    const filteredUsers = users
        .filter(user =>
            (user.apps || 'EBM').split(',').some(a => a.trim().toUpperCase() === 'EBM') &&
            (user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .sort((a, b) => {
            const factor = sortOrder === 'ASC' ? 1 : -1;
            if (sortBy === 'username') return (a.username || '').localeCompare(b.username || '') * factor;
            if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '') * factor;
            if (sortBy === 'rol') return (a.role_name || '').localeCompare(b.role_name || '') * factor;
            return 0;
        });

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
        confirm({
            title: 'Eliminar Usuario',
            message: '¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y el usuario perderá el acceso a todas las aplicaciones asociadas.',
            onConfirm: async () => {
                try {
                    await UsersService.deleteUser(id);
                    await loadData();
                } catch (error) {
                    console.error("Error deleting user:", error);
                }
            }
        });
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col shadow-sm rounded-lg border border-border bg-card overflow-hidden h-[calc(100vh-140px)]">
                <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card shrink-0">
                    <div>
                        <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                            <Users className="w-5 h-5 text-primary" /> Gestión de Usuarios
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Administra los usuarios con acceso al sistema EBM</p>
                    </div>
                    {hasPermission('ebm.config.users') && (
                        <button onClick={handleCreate} className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium shadow-sm shrink-0">
                            <Plus className="w-4 h-4" /> Nuevo Usuario
                        </button>
                    )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        <div className="sticky top-0 z-30 bg-card pb-4 -mt-2">
                            <div className="relative max-w-md">
                                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={handleSearch}
                                    placeholder="Buscar por nombre, usuario o email..."
                                    className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-md focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="bg-card rounded-lg border border-border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left table-fixed border-collapse">
                                    <thead className="sticky top-0 z-20 bg-muted/50 text-muted-foreground font-medium border-b border-border">
                                        <tr>
                                            <ResizableHeader columnId="usuario" width={widths.usuario} onResizeStart={onResizeStart} className="px-6 py-3 group/header bg-muted/50">
                                                <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                    <span className="truncate pr-1 font-bold">Usuario</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSort('username'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0"><SortIcon column="username" /></button>
                                                </div>
                                            </ResizableHeader>
                                            <ResizableHeader columnId="email" width={widths.email} onResizeStart={onResizeStart} className="px-6 py-3 group/header bg-muted/50">
                                                <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                    <span className="truncate pr-1 font-bold">Email</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSort('email'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0"><SortIcon column="email" /></button>
                                                </div>
                                            </ResizableHeader>
                                            <ResizableHeader columnId="rol" width={widths.rol} onResizeStart={onResizeStart} className="px-6 py-3 group/header bg-muted/50">
                                                <div className="flex items-center justify-between gap-1 w-full overflow-hidden">
                                                    <span className="truncate pr-1 font-bold">Rol</span>
                                                    <button onClick={(e) => { e.stopPropagation(); handleSort('rol'); }} className="p-1 hover:bg-primary/10 rounded-md transition-colors shrink-0"><SortIcon column="rol" /></button>
                                                </div>
                                            </ResizableHeader>
                                            <ResizableHeader columnId="apps" width={widths.apps} onResizeStart={onResizeStart} className="px-6 py-3 bg-muted/50">Aplicaciones</ResizableHeader>
                                            <th className="px-6 py-3 text-right w-24 bg-muted/50">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => (
                                                <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                                                    <td style={{ width: widths.usuario }} className="px-6 py-4 truncate">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                                                                {user.username.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="truncate">
                                                                <div className="font-medium text-foreground truncate">{user.full_name || user.username}</div>
                                                                <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ width: widths.email }} className="px-6 py-4 text-foreground truncate">{user.email}</td>
                                                    <td style={{ width: widths.rol }} className="px-6 py-4 truncate">
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                            {user.role_name || 'Sin Rol'}
                                                        </span>
                                                    </td>
                                                    <td style={{ width: widths.apps }} className="px-6 py-4 truncate">
                                                        <div className="flex flex-wrap gap-1">
                                                            {(user.apps || 'EBM').split(',').map(app => (
                                                                <span key={app} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/5 text-primary border border-primary/10 uppercase">
                                                                    {app.trim()}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {hasPermission('ebm.config.users') && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleEdit(user)}
                                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                                                        title="Editar"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(user.id)}
                                                                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium italic opacity-60">
                                                    No se encontraron usuarios que coincidan con la búsqueda.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                size="lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Nombre Completo *</label>
                            <input
                                type="text"
                                value={formData.full_name || ''}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Usuario *</label>
                            <input
                                type="text"
                                value={formData.username || ''}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                {editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}
                            </label>
                            <input
                                type="password"
                                value={formData.password_hash || ''}
                                onChange={(e) => setFormData({ ...formData, password_hash: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder={editingUser ? "••••••••" : ""}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Rol *</label>
                            <select
                                value={formData.role_id || ''}
                                onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Seleccionar rol</option>
                                {roles.map(role => (
                                    <option key={role.id} value={role.id}>{role.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Gerencia *</label>
                            <select
                                value={formData.management_id || ''}
                                onChange={(e) => setFormData({ ...formData, management_id: e.target.value })}
                                className="w-full flex h-10 px-3 py-2 bg-background border border-input rounded-md text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">Seleccionar gerencia</option>
                                {managements.map(mgmt => (
                                    <option key={mgmt.id} value={mgmt.id}>{mgmt.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="col-span-full border-t border-border pt-4 mt-2">
                            <label className="block text-sm font-medium text-foreground mb-3">Acceso a Aplicaciones</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'EBM', label: 'EBM (Principal)' },
                                    { id: 'FSM', label: 'Gestor FSM' },
                                    { id: 'TCtrl', label: 'Tablero Control' },
                                    { id: 'Liq', label: 'Liquidaciones' }
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
                                                {isSelected && <Save className="w-2.5 h-2.5" />}
                                            </div>
                                            {app.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-4 col-span-full border-t border-border pt-4">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active ?? true}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="rounded border-input text-primary focus:ring-primary"
                                />
                                <label htmlFor="is_active" className="text-sm font-medium text-foreground">
                                    Usuario activo
                                </label>
                            </div>
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
        </div>
    );
}
