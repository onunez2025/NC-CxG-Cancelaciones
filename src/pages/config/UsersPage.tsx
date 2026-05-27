import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Search, 
    Edit2, 
    Users, 
    ChevronUp, 
    ChevronDown,
    Save,
    Mail,
    ShieldCheck,
    ChevronRight,
    Activity,
    Check
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useDialog } from '../../context/DialogContext';
import { UsersService } from '../../services/usersService';
import { RolesService } from '../../services/rolesService';
import { ManagementsService } from '../../services/managementsService';
import type { User, Role, Management } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { toTitleCase } from '../../utils/formatters';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { 
    SIATCTable, 
    SIATCTableHeader,
    SIATCTableRow, 
    SIATCTableCell, 
    SIATCTableFooter 
} from '../../components/siatc/table/SIATCTable';

export default function UsersPage() {
    const { confirm, alert } = useDialog();
    const { hasPermission } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [managements, setManagements] = useState<Management[]>([]);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User> & { password_hash?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<string>('username');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
    const [error, setError] = useState('');

    // Pagination State (SIATC Standard)
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [u, r, m] = await Promise.all([
                UsersService.getUsers(),
                RolesService.getRoles(),
                ManagementsService.getManagements()
            ]);
            setUsers(u);
            setRoles(r);
            setManagements(m);
        } catch (err: any) { 
            console.error(err);
            setError(err.message || 'Error de comunicación con el servidor central');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!editingUser) return;
        setError('');
        try {
            await UsersService.saveUser(editingUser as User);
            setIsModalOpen(false);
            setEditingUser(null);
            loadData();
        } catch (err: any) {
            setError(err.message || 'Error al procesar la solicitud');
        }
    };

    const handleDelete = async (id: string) => {
        confirm({
            title: 'Baja de Usuario',
            message: '¿Está seguro de revocar el acceso a este usuario en Gestor NC-CxG? Esta acción no afectará sus accesos en otras aplicaciones del ecosistema.',
            type: 'danger',
            confirmText: 'Revocar Acceso',
            onConfirm: async () => {
                try {
                    await UsersService.deleteUser(id);
                    loadData();
                } catch (err: any) { 
                    alert({ title: 'Error', message: err.message || 'No se pudo eliminar el usuario', type: 'error' });
                }
            }
        });
    };

    const openNew = () => {
        setEditingUser({ full_name: '', username: '', email: '', role_id: '', management_id: '', is_active: true, apps: 'CXG', password_hash: '' });
        setError('');
        setIsModalOpen(true);
    };

    const toggleApp = (appCode: string) => {
        if (!editingUser) return;
        const currentApps = (editingUser.apps || '').split(',').map(a => a.trim()).filter(Boolean);
        const updatedApps = currentApps.includes(appCode)
            ? currentApps.filter(a => a !== appCode)
            : [...currentApps, appCode];
        
        setEditingUser({ ...editingUser, apps: updatedApps.join(', ') });
    };

    const openEdit = (user: User) => {
        setEditingUser({ ...user, password_hash: '' });
        setError('');
        setIsModalOpen(true);
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

    const filtered = users
        .filter(u =>
            (u.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.username || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase())
        )
        .sort((a, b) => {
            const factor = sortOrder === 'ASC' ? 1 : -1;
            if (sortBy === 'username') return (a.username || '').localeCompare(b.username || '') * factor;
            if (sortBy === 'email') return (a.email || '').localeCompare(b.email || '') * factor;
            if (sortBy === 'rol') return (a.role_name || '').localeCompare(b.role_name || '') * factor;
            return 0;
        });

    // Pagination Logic
    const totalPages = Math.ceil(filtered.length / recordsPerPage);
    const paginatedRecords = filtered.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-cb-text-secondary font-medium">
                        <Users className="w-4 h-4 text-cb-neutral" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-cb-text-primary">Gestión de Usuarios</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Gestión de Usuarios</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Administra los accesos y perfiles autorizados para Gestor NC-CxG</p>
                </div>
                {hasPermission('config.users') && (
                    <button
                        onClick={openNew}
                        className={SIATC_THEME.COMPONENTS.BUTTON_PRIMARY}
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            {/* Content Container */}
            <div className={cn(SIATC_THEME.LAYOUT.CONTENT_CONTAINER, "dark:bg-cb-bg")}>
                {/* Search / Filters */}
                <div className={SIATC_THEME.LAYOUT.SEARCH_BAR_WRAPPER}>
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-neutral/60" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Buscar por nombre, usuario o email..."
                            className={cn(SIATC_THEME.COMPONENTS.INPUT, "pl-10 pr-4 dark:bg-cb-bg text-cb-text-primary border-cb-border")}
                        />
                    </div>
                </div>

                {/* Table Area */}
                <SIATCTable containerClassName="relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-bold text-cb-text-secondary mt-4 tracking-widest">Sincronizando con el directorio...</span>
                        </div>
                    ) : (
                        <>
                            <thead className={SIATC_THEME.TABLE.HEADER_ROW}>
                                <tr className="border-b border-cb-border">
                                    <SIATCTableHeader className="text-left">
                                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('username')}>
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Responsable / ID</span>
                                            <SortIcon column="username" />
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-left cursor-pointer" onClick={() => handleSort('email')}>
                                        <div className="flex items-center gap-2">
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Correo Corporativo</span>
                                            <SortIcon column="email" />
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-left cursor-pointer" onClick={() => handleSort('rol')}>
                                        <div className="flex items-center gap-2">
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Perfil de Seguridad</span>
                                            <SortIcon column="rol" />
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-center">
                                        <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Alcance Ecosistema</span>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="w-28 text-right">
                                        <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Acciones</span>
                                    </SIATCTableHeader>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-cb-border/60">
                                {paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-cb-text-secondary opacity-40" />
                                                <p className="text-sm font-bold text-cb-text-secondary italic">No se encontraron registros</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((user) => (
                                        <SIATCTableRow key={user.id}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary dark:text-primary-foreground font-bold text-xs border border-primary/20 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                                                        {user.username?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-cb-text-primary text-sm truncate tracking-tight">
                                                            {toTitleCase(user.full_name || user.username)}
                                                        </div>
                                                        <div className={cn(SIATC_THEME.TYPOGRAPHY.TINY_MONO, "opacity-65 mt-0.5")}>
                                                            ID: {user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <span className="text-cb-text-secondary font-medium">{user.email}</span>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <span className={cn(SIATC_THEME.STATES.BADGE_BASE, SIATC_THEME.STATES.PRIMARY, "gap-1")}>
                                                     <ShieldCheck className="w-3 h-3 text-primary/60" />
                                                    {user.role_name || 'Invitado'}
                                                </span>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {(user.apps || 'CXG').split(',').map((app: string) => (
                                                        <span key={app} className={cn(SIATC_THEME.STATES.BADGE_BASE, SIATC_THEME.STATES.INFO)}>
                                                            {app.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasPermission('config.users') && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(user)}
                                                                className="p-1.5 text-cb-text-secondary hover:text-primary hover:bg-primary/10 rounded-cb-btn transition-all active:scale-90 cursor-pointer"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-1.5 text-cb-text-secondary hover:text-[#DF2935] hover:bg-[#DF2935]/10 rounded-cb-btn transition-all active:scale-90 cursor-pointer"
                                                                title="Revocar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </SIATCTableCell>
                                        </SIATCTableRow>
                                    ))
                                )}
                            </tbody>
                        </>
                    )}
                </SIATCTable>
                
                {/* Footer SIATC Standard */}
                <SIATCTableFooter 
                    totalRecords={filtered.length} 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>

            {/* Modal: SIATC Standard */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUser?.id ? 'Configuración de Identidad' : 'Registro de Usuario'} size="lg">
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="p-6 pt-2 space-y-6">
                    {error && (
                        <div className="p-4 bg-rose-500/10 text-rose-700 rounded-xl border border-rose-500/20 text-xs font-bold tracking-tight flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                            <Activity className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">Nombre completo del colaborador:</label>
                            <input 
                                type="text" 
                                required
                                value={editingUser?.full_name || ''} 
                                onChange={e => setEditingUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                                className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 dark:bg-cb-bg text-cb-text-primary border-cb-border")}
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">ID / Login User:</label>
                            <input type="text" required value={editingUser?.username || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)}
                                className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 dark:bg-cb-bg text-cb-text-primary border-cb-border font-mono")} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">Correo institucional:</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-neutral/40" />
                                <input type="email" required value={editingUser?.email || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                                    className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 pl-10 pr-4 dark:bg-cb-bg text-cb-text-primary border-cb-border")} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">{editingUser?.id ? 'Cambiar password:' : 'Password de seguridad:'}</label>
                            <input type="password" required={!editingUser?.id} value={editingUser?.password_hash || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, password_hash: e.target.value } : null)}
                                className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 dark:bg-cb-bg text-cb-text-primary border-cb-border font-mono")} placeholder="••••••••" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">Rol de seguridad:</label>
                            <div className="relative">
                                <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-neutral/40 pointer-events-none" />
                                <select required value={editingUser?.role_id || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, role_id: e.target.value } : null)}
                                    className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 pl-10 pr-4 dark:bg-cb-bg text-cb-text-primary border-cb-border appearance-none cursor-pointer")}>
                                    <option value="" disabled>Seleccionar perfil...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1">Gerencia / Sede asignada:</label>
                            <div className="relative">
                                <Activity className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-neutral/40 pointer-events-none" />
                                <select required value={editingUser?.management_id || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, management_id: e.target.value } : null)}
                                    className={cn(SIATC_THEME.COMPONENTS.INPUT, "h-11 pl-10 pr-4 dark:bg-cb-bg text-cb-text-primary border-cb-border appearance-none cursor-pointer")}>
                                    <option value="" disabled>Seleccionar ubicación corporativa...</option>
                                    {managements.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div className="col-span-full space-y-4 pt-4 border-t border-cb-border">
                            <label className="text-[11px] font-bold text-cb-neutral uppercase tracking-wider pl-1 mb-3 block">Ámbito del ecosistema SIATC:</label>
                            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                                {[
                                    { id: 'EBM', label: 'EBM Central' },
                                    { id: 'FSM', label: 'Gestor FSM' },
                                    { id: 'TCtrl', label: 'Tablero' },
                                    { id: 'Liq', label: 'Liquidaciones' },
                                    { id: 'VAL', label: 'Valuaciones' },
                                    { id: 'CXG', label: 'Gestor NC-CxG' }
                                ].map(app => {
                                    const isSelected = (editingUser?.apps || '').split(',').map(a => a.trim()).includes(app.id);
                                    return (
                                        <button key={app.id} type="button" onClick={() => toggleApp(app.id)}
                                            className={cn(
                                                "flex items-center gap-2.5 px-3 py-2.5 rounded-cb-btn text-[10px] font-bold tracking-tight transition-all border shadow-sm cursor-pointer",
                                                isSelected
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : 'bg-white dark:bg-cb-bg border-cb-border text-cb-neutral hover:bg-cb-bg'
                                            )}>
                                            <div className={cn(
                                                "w-4 h-4 rounded-lg border flex items-center justify-center transition-all shrink-0",
                                                isSelected ? 'bg-white text-primary border-white' : 'bg-card border-border shadow-inner'
                                            )}>
                                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" /> }
                                            </div>
                                            <span className="truncate">{app.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="col-span-full pt-2">
                             <button
                                type="button"
                                onClick={() => setEditingUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null)}
                                className={cn(
                                    "w-full flex items-center justify-between px-5 py-3.5 rounded-cb-card text-xs font-bold transition-all border shadow-sm cursor-pointer",
                                    editingUser?.is_active 
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-500" 
                                        : "bg-[#DF2935]/10 border-[#DF2935]/20 text-[#DF2935]"
                                )}
                            >
                                <span className="tracking-widest uppercase text-[10px] text-cb-neutral">Estado operativo:</span>
                                <div className="flex items-center gap-3">
                                    {editingUser?.is_active ? 'Habilitado' : 'Suspendido'}
                                    <div className={cn(
                                        "w-9 h-4.5 rounded-full relative transition-colors border",
                                        editingUser?.is_active ? "bg-emerald-500 border-emerald-500" : "bg-rose-500 border-rose-500"
                                    )}>
                                        <div className={cn(
                                            "absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all shadow-sm",
                                            editingUser?.is_active ? "left-5" : "left-0.5"
                                        )} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-cb-border mt-2">
                        <button type="button" onClick={() => setIsModalOpen(false)} className={cn(SIATC_THEME.COMPONENTS.BUTTON_SECONDARY, "flex-1")}>
                            Cancelar
                        </button>
                        <button type="submit" className={cn(SIATC_THEME.COMPONENTS.BUTTON_PRIMARY, "flex-1")}>
                            <Save className="w-4 h-4" />
                            {editingUser?.id ? 'Guardar cambios' : 'Confirmar cambios'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
