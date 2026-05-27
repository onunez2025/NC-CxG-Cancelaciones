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
    Check,
    Filter
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
import { SIATCButton } from '../../components/siatc/SIATCButton';
import { SIATCBadge } from '../../components/siatc/SIATCBadge';
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

    // Specific filters
    const [userFilter, setUserFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [openFilter, setOpenFilter] = useState<'usuario' | 'rol' | null>(null);

    // Pagination State (SIATC Standard)
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        const handleClickOutside = () => setOpenFilter(null);
        if (openFilter) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [openFilter]);

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
        .filter(u => {
            if (userFilter) {
                const uf = userFilter.toLowerCase();
                if (!(u.full_name?.toLowerCase().includes(uf) || u.username?.toLowerCase().includes(uf))) {
                    return false;
                }
            }
            if (roleFilter) {
                if (u.role_id !== roleFilter && u.role_name !== roleFilter) {
                    return false;
                }
            }
            return true;
        })
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
                        Nuevo
                    </SIATCButton>
                )}
            </div>

            {/* Content Container */}
            <div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
                {/* Search / Filters */}
                <div className="p-4 border-b border-cb-border bg-cb-bg/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-cb-text-secondary/55" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            placeholder="Buscar por nombre, usuario o email..."
                            className="w-full pl-10 pr-4 py-2.5 bg-card text-cb-text-primary border border-cb-border rounded-cb-btn focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-sm font-medium placeholder:text-cb-neutral/40"
                        />
                    </div>
                </div>

                {/* Table Area */}
                <div className={SIATC_THEME.TABLE.SCROLL_AREA}>
                    {isLoading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/50 backdrop-blur-sm z-50">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm font-medium text-muted-foreground mt-4 tracking-[0.2em]">Sincronizando con el directorio...</span>
                        </div>
                    ) : (
                        <SIATCTable>
                            <thead>
                                <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                                    <SIATCTableHeader className="text-left">
                                        <div className="flex items-center justify-between gap-2 group/header">
                                            <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleSort('username')}>
                                                <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Responsable / ID</span>
                                                <SortIcon column="username" />
                                            </div>
                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setOpenFilter(openFilter === 'usuario' ? null : 'usuario')} className={cn("p-1.5 rounded-md transition-all shadow-sm", userFilter ? 'text-primary bg-primary/10 border-primary/20 border' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted border border-transparent')}>
                                                    <Filter className="w-3.5 h-3.5" />
                                                </button>
                                                {openFilter === 'usuario' && (
                                                    <div className="absolute top-full left-0 mt-1 w-56 bg-background border border-border shadow-xl rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                                        <input 
                                                            type="text" 
                                                            autoFocus
                                                            placeholder="Buscar ID o nombre..." 
                                                            className="w-full text-xs px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:border-primary transition-colors font-medium placeholder:text-muted-foreground/50"
                                                            value={userFilter}
                                                            onChange={e => { setUserFilter(e.target.value); setCurrentPage(1); }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-left cursor-pointer" onClick={() => handleSort('email')}>
                                        <div className="flex items-center gap-2">
                                            <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Correo Corporativo</span>
                                            <SortIcon column="email" />
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-left">
                                        <div className="flex items-center justify-between gap-2 group/header">
                                            <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleSort('rol')}>
                                                <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Perfil de Seguridad</span>
                                                <SortIcon column="rol" />
                                            </div>
                                            <div className="relative" onClick={e => e.stopPropagation()}>
                                                <button onClick={() => setOpenFilter(openFilter === 'rol' ? null : 'rol')} className={cn("p-1.5 rounded-md transition-all shadow-sm", roleFilter ? 'text-primary bg-primary/10 border-primary/20 border' : 'text-muted-foreground/40 hover:text-foreground hover:bg-muted border border-transparent')}>
                                                    <Filter className="w-3.5 h-3.5" />
                                                </button>
                                                {openFilter === 'rol' && (
                                                    <div className="absolute top-full left-0 mt-1 w-48 bg-background border border-border shadow-xl rounded-xl p-2 z-50 animate-in fade-in slide-in-from-top-2">
                                                        <select 
                                                            autoFocus
                                                            className="w-full text-xs px-3 py-2 bg-muted/30 border border-border rounded-lg outline-none focus:border-primary transition-colors appearance-none cursor-pointer font-bold text-foreground"
                                                            value={roleFilter}
                                                            onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                                                        >
                                                            <option value="" className="font-medium text-muted-foreground">Todos los perfiles</option>
                                                            {roles.map(r => (
                                                                <option key={r.id} value={r.id} className="font-bold text-foreground">{r.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="text-center">
                                        <span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>Alcance Ecosistema</span>
                                    </SIATCTableHeader>
                                    <SIATCTableHeader className="w-28 text-right">Acciones</SIATCTableHeader>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center opacity-60">
                                            <div className="flex flex-col items-center gap-3">
                                                <Activity className="w-12 h-12 text-cb-text-secondary opacity-40" />
                                                <p className="text-sm font-medium text-cb-text-secondary">No se encontraron registros</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedRecords.map((user) => (
                                        <SIATCTableRow key={user.id} className={SIATC_THEME.TABLE.BODY_ROW}>
                                            <SIATCTableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20 shrink-0">
                                                        {user.username?.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs font-medium text-cb-text-primary truncate">
                                                            {toTitleCase(user.full_name || user.username)}
                                                        </div>
                                                        <div className={SIATC_THEME.TYPOGRAPHY.TINY_MONO + " opacity-65 mt-0.5"}>
                                                            ID: {user.username}
                                                        </div>
                                                    </div>
                                                </div>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <span className="text-xs text-cb-text-secondary">{user.email}</span>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <SIATCBadge variant="info">
                                                    {user.role_name || 'Invitado'}
                                                </SIATCBadge>
                                            </SIATCTableCell>
                                            <SIATCTableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(user.apps || 'CXG').split(',').map(app => (
                                                        <span key={app} className="px-2 py-0.5 rounded-cb-chip text-[9px] font-bold tracking-tighter border bg-primary/5 text-primary border-primary/10">
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
                                                                className="p-2 text-cb-text-secondary hover:text-primary hover:bg-cb-bg rounded-cb-btn transition-all"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(user.id)}
                                                                className="p-2 text-cb-text-secondary hover:text-destructive hover:bg-cb-bg rounded-cb-btn transition-all"
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
                        </SIATCTable>
                    )}
                </div>

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
