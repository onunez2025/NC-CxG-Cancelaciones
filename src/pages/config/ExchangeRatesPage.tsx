import { useState, useEffect } from 'react';
import { 
    Calculator, 
    Save, 
    ChevronLeft, 
    ChevronRight,
    Info,
    TrendingUp,
    CalendarDays,
    ChevronRight as ChevronRightIcon,
    Currency,
    Check
} from 'lucide-react';
import { ExchangeRatesService } from '../../services/exchangeRatesService';
import { cn } from '../../utils/cn';

const MONTHS = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

export default function ExchangeRatesPage() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [rates, setRates] = useState<number[]>(Array(12).fill(3.80));
    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccessfully, setSavedSuccessfully] = useState(false);

    useEffect(() => {
        loadRates(selectedYear);
    }, [selectedYear]);

    const loadRates = (year: number) => {
        const yearRates = ExchangeRatesService.getRatesForYear(year);
        setRates(yearRates.rates);
        setSavedSuccessfully(false);
    };

    const handleRateChange = (monthIndex: number, value: string) => {
        const numValue = parseFloat(value);
        const newRates = [...rates];
        if (!isNaN(numValue)) {
            newRates[monthIndex] = numValue;
        } else if (value === '') {
            newRates[monthIndex] = 0;
        }
        setRates(newRates);
        setSavedSuccessfully(false);
    };

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            ExchangeRatesService.saveRatesForYear(selectedYear, rates);
            setIsSaving(false);
            setSavedSuccessfully(true);
            setTimeout(() => setSavedSuccessfully(false), 3000);
        }, 300);
    };

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
            {/* Header: SIATC Standard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Calculator className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRightIcon className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Tipos de Cambio</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Paridad Cambiaria</h1>
                    <p className="text-sm text-muted-foreground">Define el valor del USD frente al PEN para proyecciones presupuestarias</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Year Selector Premium */}
                    <div className="flex items-center bg-card border border-border rounded-xl p-1 shadow-sm">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 px-4 font-black text-xs min-w-[140px] justify-center text-foreground tracking-widest">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            EJERCICIO {selectedYear}
                        </div>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-2 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95",
                            savedSuccessfully
                                ? "bg-emerald-500 text-white shadow-emerald-500/25"
                                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/25",
                            isSaving && "opacity-70 cursor-wait"
                        )}
                    >
                        {savedSuccessfully ? <Check className="w-4 h-4 stroke-[3]" /> : <Save className="w-4 h-4" />}
                        {isSaving ? 'GUARDANDO...' : savedSuccessfully ? '¡DISPONIBLE!' : 'GUARDAR PARIDAD'}
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-8">
                    {/* Insights SIATC Banner */}
                    <div className="relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50" />
                        <div className="relative bg-card border border-border p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-6 shadow-sm group-hover:shadow-md transition-all">
                            <div className="p-4 bg-primary/10 rounded-2xl text-primary ring-4 ring-primary/5 shadow-inner">
                                <TrendingUp className="w-7 h-7 shrink-0" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <h3 className="font-black text-foreground flex items-center gap-2 text-sm uppercase tracking-wider">
                                    Motor de Indexación Financiera
                                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase border border-emerald-100">Activo</span>
                                </h3>
                                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                                    Toda Solped u Orden de Compra registrada en USD se consolidará a <strong>Soles (PEN)</strong> utilizando la paridad del mes contable de su registro. Los cambios se aplican automáticamente a proyecciones futuras.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 border-l border-border pl-6 text-muted-foreground/60 uppercase">
                                <span className="text-[10px] font-black tracking-widest italic">REF: SBS / SUNAT</span>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Rates Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {MONTHS.map((month, index) => (
                            <div key={month} className="group/card relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-transparent rounded-3xl opacity-0 group-hover/card:opacity-100 transition-opacity blur-sm pointer-events-none" />
                                <div className="relative p-5 bg-card border border-border rounded-2xl transition-all group-focus-within/card:border-primary/50 group-focus-within/card:ring-8 group-focus-within/card:ring-primary/5">
                                    <div className="flex justify-between items-center mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            <label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground group-focus-within/card:text-primary transition-colors">
                                                {month}
                                            </label>
                                        </div>
                                        <span className="text-[10px] font-bold text-muted-foreground/30 font-mono">
                                            #{String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    
                                    <div className="relative group/input">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-sm pointer-events-none opacity-40 group-focus-within/card:opacity-100 transition-opacity">
                                            S/
                                        </div>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={rates[index] || ''}
                                            onChange={(e) => handleRateChange(index, e.target.value)}
                                            className="w-full h-16 pl-10 pr-4 bg-muted/30 border border-transparent rounded-xl text-3xl font-mono font-black focus:outline-none focus:bg-background focus:border-primary text-foreground transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0.000"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Currency className="w-5 h-5 text-muted-foreground/20 group-hover/card:text-primary/20 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
                                        <span>Paridad FI / CO</span>
                                        <span className="group-focus-within/card:text-primary/60 transition-colors">USD → PEN</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Safety Disclaimer */}
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-[10px] font-black text-amber-600/80 uppercase tracking-[0.2em] justify-center mx-auto max-w-2xl text-center leading-relaxed">
                        <Info className="w-4 h-4 shrink-0" />
                        Los cambios realizados son de carácter retroactivo para ejercicios no cerrados. Verifique con el área contable antes de persistir cambios.
                    </div>
                </div>
            </div>
        </div>
    );
}
