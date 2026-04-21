import { useState, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Search, 
    Edit2, 
    Users, 
    ChevronUp, 
    ChevronDown,
    UserCircle2,
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
import { useTableResizer } from '../../hooks/useTableResizer';
import { ResizableHeader } from '../../components/common/ResizableHeader';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils/cn';
import { toTitleCase } from '../../utils/formatters';

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

    // Resizing logic
    const { widths, onResizeStart } = useTableResizer('ebm_users_column_widths', {
        usuario: 280,
        email: 220,
        rol: 160,
        apps: 220
    });

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
            (u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase()))
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
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Users className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRight className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Gestión de Usuarios</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Gestión de Usuarios</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Administra los accesos y perfiles autorizados para Gestor NC-CxG</p>
                </div>
                {hasPermission('config.users') && (
                    <SIATCButton onClick={openNew} icon={Plus}>
                        Nuevo Usuario
                    </SIATCButton>
                )}
            </div>

            {/* Content Container */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {/* Search / Filters */}
                <div className="p-4 border-b border-border bg-muted/20">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Buscar por nombre, usuario o email..."
                            className={SIATC_THEME.COMPONENTS.INPUT}
                        />
                    </div>
                </div>

                {/* Table Area */}
                <SIATCTable>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Sincronizando con el directorio...</span>
                        </div>
                    ) : (
                        <>
                            <thead className={SIATC_THEME.TABLE.HEADER_ROW}>
                                <tr className="border-b border-border">
                                    <ResizableHeader columnId="usuario" width={widths.usuario} onResizeStart={onResizeStart} className="px-6 py-4">
                                        <div className="flex items-center justify-between gap-2 group/header cursor-pointer" onClick={() => handleSort('username')}>
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Responsable / ID</span>
                                            <SortIcon column="username" />
                                        </div>
                                    </ResizableHeader>
                                    <ResizableHeader columnId="email" width={widths.email} onResizeStart={onResizeStart} className="px-6 py-4">
                                        <div className="flex items-center justify-between gap-2 group/header cursor-pointer" onClick={() => handleSort('email')}>
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Correo Corporativo</span>
                                            <SortIcon column="email" />
                                        </div>
                                    </ResizableHeader>
                                    <ResizableHeader columnId="rol" width={widths.rol} onResizeStart={onResizeStart} className="px-6 py-4">
                                        <div className="flex items-center justify-between gap-2 group/header cursor-pointer" onClick={() => handleSort('rol')}>
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Perfil de Seguridad</span>
                                            <SortIcon column="rol" />
                                        </div>
                                    </ResizableHeader>
                                    <ResizableHeader columnId="apps" width={widths.apps} onResizeStart={onResizeStart} className="px-6 py-4 text-center">
                                        <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Alcance Ecosistema</span>
                                    </ResizableHeader>
                                    <th className="px-6 py-4 w-28 bg-muted/30 text-right italic font-medium text-[10px] text-muted-foreground uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-muted-foreground/20" />
                                                <p className="text-sm font-medium text-muted-foreground">No se encontraron registros</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((user) => (
                                        <SIATCTableRow key={user.id}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-extrabold text-xs border border-primary/20 shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                                                        {user.username?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-foreground text-sm truncate tracking-tight">
                                                            {toTitleCase(user.full_name || user.username)}
                                                        </div>
                                                        <div className={SIATC_THEME.TYPOGRAPHY.TINY_MONO + " text-muted-foreground truncate uppercase opacity-60 mt-0.5"}>
                                                            ID: {user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell className="font-medium text-muted-foreground truncate">
                                                {user.email}
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <SIATCBadge variant="info" icon={ShieldCheck}>
                                                    {user.role_name || 'Invitado'}
                                                </SIATCBadge>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.apps || 'CXG').split(',').map(app => (
                                                        <span key={app} className="px-2 py-0.5 rounded-lg text-[9px] font-black tracking-tighter border bg-primary/5 text-primary border-primary/10">
                                                            {app.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {hasPermission('config.users') && (
                                                        <>
                                                            <button
                                                                onClick={() => openEdit(user)}
                                                                className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all active:scale-90"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all active:scale-90"
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
                <div className="p-6 pt-2 space-y-6">
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-[11px] font-bold rounded-xl flex items-center gap-3">
                            <Activity className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4 md:col-span-2 bg-muted/30 p-5 rounded-2xl border border-border/50">
                            <div className="flex items-center gap-2 text-xs font-black text-muted-foreground tracking-[0.2em]">
                                <UserCircle2 className="w-4 h-4 text-primary" />
                                Nombre completo del colaborador:
                            </div>
                            <input 
                                type="text" 
                                required
                                value={editingUser?.full_name || ''} 
                                onChange={e => setEditingUser(prev => prev ? { ...prev, full_name: e.target.value } : null)}
                                className="w-full h-12 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-muted-foreground/30" 
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground tracking-widest pl-1">ID / Login User:</label>
                            <input type="text" required value={editingUser?.username || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, username: e.target.value } : null)}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground tracking-widest pl-1">Correo institucional:</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                <input type="email" required value={editingUser?.email || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                                    className="w-full h-11 pl-10 pr-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground tracking-widest pl-1">{editingUser?.id ? 'Cambiar password:' : 'Password de seguridad:'}</label>
                            <input type="password" required={!editingUser?.id} value={editingUser?.password_hash || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, password_hash: e.target.value } : null)}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="••••••••" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground tracking-widest pl-1">Rol de seguridad:</label>
                            <select required value={editingUser?.role_id || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, role_id: e.target.value } : null)}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer">
                                <option value="" disabled>Seleccionar perfil...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-[10px] font-black text-muted-foreground tracking-widest pl-1">Gerencia / Sede asignada:</label>
                            <select required value={editingUser?.management_id || ''} onChange={e => setEditingUser(prev => prev ? { ...prev, management_id: e.target.value } : null)}
                                className="w-full h-11 px-4 bg-background border border-border rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer">
                                <option value="" disabled>Seleccionar ubicación corporativa...</option>
                                {managements.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        
                        <div className="col-span-full space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground tracking-[0.2em] mb-2 px-1">
                                <ShieldCheck className="w-4 h-4 text-primary" /> Alcance en ecosistema SIATC:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                                                "group flex flex-col items-center gap-3 p-4 rounded-2xl text-[10px] font-black transition-all border shadow-sm relative overflow-hidden",
                                                isSelected
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20'
                                                    : 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50'
                                            )}>
                                            <div className={cn(
                                                "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                                                isSelected ? 'bg-white border-white text-primary scale-110 shadow-sm' : 'border-border bg-background'
                                            )}>
                                                {isSelected && <Check className="w-3.5 h-3.5 stroke-[4]" /> }
                                            </div>
                                            {app.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="col-span-full pt-4">
                            <SIATCButton
                                type="button"
                                variant={editingUser?.is_active ? 'success' : 'danger'}
                                onClick={() => setEditingUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null)}
                                className="w-full flex items-center justify-between px-6 py-4 rounded-2xl"
                            >
                                <span className="tracking-widest capitalize">Acceso al ecosistema:</span>
                                <div className="flex items-center gap-3">
                                    {editingUser?.is_active ? 'Habilitado' : 'Suspendido'}
                                    <div className={cn(
                                        "w-10 h-5 rounded-full relative transition-colors border border-white/20",
                                        editingUser?.is_active ? "bg-emerald-500" : "bg-rose-500"
                                    )}>
                                        <div className={cn(
                                            "absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                                            editingUser?.is_active ? "left-6" : "left-1"
                                        )} />
                                    </div>
                                </div>
                            </SIATCButton>
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
                        <SIATCButton type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </SIATCButton>
                        <SIATCButton onClick={handleSave} variant="success" icon={Check}>
                            Confirmar cambios
                        </SIATCButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
