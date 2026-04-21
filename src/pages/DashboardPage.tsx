import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    XCircle,
    FileText,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/cn';
import { ncService } from '../services/ncService';
import type { Cancellation, CxGNC } from '../services/ncService';

export function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [cancellations, setCancellations] = useState<Cancellation[]>([]);
    const [cxgData, setCxgData] = useState<CxGNC[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cancels, docs] = await Promise.all([
                    ncService.getCancellations(),
                    ncService.getCxGNC()
                ]);
                setCancellations(cancels.data);
                setCxgData(docs.data);
            } catch (error) {
                console.error("Dashboard Load Error", error);
                // Demo fallback
                setCancellations([]);
                setCxgData([]);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    const metrics = useMemo(() => {
        const pendingCancels = cancellations.filter(c => c.estado === 'PENDIENTE');
        const pendingDocs = cxgData.filter(d => d.estado === 'PENDIENTE');
        return {
            pendingCancels: pendingCancels.length,
            pendingDocs: pendingDocs.length,
            totalDocs: cancellations.length + cxgData.length
        };
    }, [cancellations, cxgData]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-primary">
                <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6 animate-in fade-in duration-500 p-1">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-slate-800 dark:text-white">
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 text-sm font-medium">Bienvenido, {user?.username || 'Administrador'}</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    icon={XCircle}
                    label="Cancelaciones Pendientes"
                    value={metrics.pendingCancels.toString()}
                    sub="Solicitudes por procesar"
                    color="text-rose-600"
                    bgColor="bg-rose-50 dark:bg-rose-900/20"
                />
                <KPICard
                    icon={FileText}
                    label="Docs. CxG/NC Pendientes"
                    value={metrics.pendingDocs.toString()}
                    sub="Esperando aprobación"
                    color="text-amber-600"
                    bgColor="bg-amber-50 dark:bg-amber-900/20"
                />
                <KPICard
                    icon={Clock}
                    label="Tiempo de Respuesta"
                    value="2.4h"
                    sub="Promedio de aprobación"
                    color="text-blue-600"
                    bgColor="bg-blue-50 dark:bg-blue-900/20"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Recent Activity */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                            <Clock className="w-4 h-4 text-primary" />
                            Actividad Reciente
                        </h3>
                        <button 
                            onClick={() => navigate('/cancelaciones')}
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                            Ver Todo <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        {cancellations.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    item.estado === 'PENDIENTE' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                )}>
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{item.cliente}</p>
                                    <p className="text-[10px] text-muted-foreground">{item.motivo}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground">{new Date(item.fecha_generado).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {cancellations.length === 0 && !isLoading && (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <Clock className="w-12 h-12 mb-2" />
                                <p className="text-xs font-bold">No hay actividad reciente</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Docs Summary */}
                <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800 dark:text-white uppercase tracking-wider">
                            <FileText className="w-4 h-4 text-primary" />
                            Resumen de Documentos
                        </h3>
                        <button 
                            onClick={() => navigate('/cxg-nc')}
                            className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                        >
                            Gestionar <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>

                    <div className="space-y-4 flex-1">
                        {cxgData.slice(0, 5).map(item => (
                            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors">
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    item.tipo === 'NC' ? "bg-blue-100 text-blue-600" : "bg-violet-100 text-violet-600"
                                )}>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-foreground truncate">{item.cliente}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-black bg-muted px-1.5 py-0.5 rounded uppercase">{item.tipo}</span>
                                        <span className="text-[10px] text-muted-foreground">ID: {item.correlativo}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                         {item.estado === 'PROCESADO' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                                         <span className="text-[10px] font-bold uppercase opacity-60">{item.estado}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function KPICard({ icon: Icon, label, value, sub, color, bgColor }: {
    icon: any; label: string; value: string; sub: string; color: string; bgColor: string;
}) {
    return (
        <div className="bg-card border rounded-3xl h-[140px] py-4 px-6 shadow-sm flex flex-col justify-between hover:shadow-lg hover:shadow-primary/5 transition-all group">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</span>
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", bgColor)}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
            </div>
            <div className="space-y-1">
                <p className="text-2xl font-black tracking-tight text-slate-800 dark:text-white uppercase">{value}</p>
                <p className="text-[11px] font-medium text-slate-400">{sub}</p>
            </div>
        </div>
    );
}
