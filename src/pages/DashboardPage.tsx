import React, { useState, useEffect, useMemo } from 'react';
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
import { SIATC_THEME } from '../utils/siatc-theme';

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
        const pendingCancels = cancellations.filter(c => c.estado === 'REGISTRADO');
        const pendingDocs = cxgData.filter(d => d.estado === 'REGISTRADO');
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
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div>
                    <h1 className={cn(SIATC_THEME.TYPOGRAPHY.PAGE_TITLE, "flex items-center gap-2")}>
                        <LayoutDashboard className="w-6 h-6 text-primary" />
                        Panel de Control
                    </h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Bienvenido, {user?.username || 'Administrador'}</p>
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
                <div className={cn(SIATC_THEME.COMPONENTS.CARD_CONTAINER, "p-6 flex flex-col min-h-[400px]")}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={cn(SIATC_THEME.TYPOGRAPHY.SECTION_TITLE, "flex items-center gap-2")}>
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
                                    item.estado === 'REGISTRADO' ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
                                )}>
                                    <AlertCircle className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.cliente}</p>
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
                <div className={cn(SIATC_THEME.COMPONENTS.CARD_CONTAINER, "p-6 flex flex-col min-h-[400px]")}>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className={cn(SIATC_THEME.TYPOGRAPHY.SECTION_TITLE, "flex items-center gap-2")}>
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
                                    item.tipo === 'NC' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" : "bg-violet-50 text-violet-600 dark:bg-violet-900/20"
                                )}>
                                    <DollarSign className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{item.cliente}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded uppercase text-muted-foreground">{item.tipo}</span>
                                        <span className="text-[10px] text-muted-foreground">ID: {item.correlativo}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                         {item.estado === 'CERRADO' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Clock className="w-3 h-3 text-amber-500" />}
                                         <span className="text-[10px] font-medium uppercase opacity-80">{item.estado}</span>
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
    icon: React.ElementType; label: string; value: string; sub: string; color: string; bgColor: string;
}) {
    return (
        <div className={SIATC_THEME.COMPONENTS.KPI_CARD_CONTAINER}>
            <div className="flex items-center justify-between mb-2">
                <span className={SIATC_THEME.COMPONENTS.KPI_CARD_LABEL}>{label}</span>
                <div className={cn("p-2.5 rounded-xl transition-transform", bgColor)}>
                    <Icon className={cn("w-5 h-5", color)} />
                </div>
            </div>
            <div className="space-y-1">
                <p className={SIATC_THEME.COMPONENTS.KPI_CARD_VALUE}>{value}</p>
                <p className={SIATC_THEME.COMPONENTS.KPI_CARD_SUB}>{sub}</p>
            </div>
        </div>
    );
}
