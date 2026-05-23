import { useState, useEffect } from 'react';
import { 
    Calculator, 
    ChevronLeft, 
    ChevronRight,
    Info,
    TrendingUp,
    CalendarDays,
    ChevronRight as ChevronRightIcon,
    Currency,
    Check,
    Save
} from 'lucide-react';
import { ExchangeRatesService } from '../../services/exchangeRatesService';

// SIATC DESIGN SYSTEM IMPORTS
import { SIATC_THEME } from '../../utils/siatc-theme';
import { SIATCButton } from '../../components/siatc/SIATCButton';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
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
        <div className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}>
            {/* Header: SIATC Standard */}
            <div className={SIATC_THEME.LAYOUT.HEADER_WRAPPER}>
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                        <Calculator className="w-4 h-4" />
                        <span>Configuración</span>
                        <ChevronRightIcon className="w-3 h-3 opacity-50" />
                        <span className="text-foreground">Tipos de Cambio</span>
                    </div>
                    <h1 className={SIATC_THEME.TYPOGRAPHY.PAGE_TITLE}>Paridad Cambiaria</h1>
                    <p className={SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE}>Define el valor del USD frente al PEN para proyecciones presupuestarias</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* Year Selector Premium */}
                    <div className="flex items-center bg-white dark:bg-cb-bg border border-cb-border rounded-cb-btn p-1 shadow-cb-level-1">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-2 hover:bg-cb-bg rounded-cb-btn transition-all text-cb-text-secondary hover:text-cb-text-primary active:scale-95"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-2 px-4 font-bold text-xs min-w-[140px] justify-center text-cb-text-primary tracking-widest">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            Ejercicio {selectedYear}
                        </div>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-2 hover:bg-cb-bg rounded-cb-btn transition-all text-cb-text-secondary hover:text-cb-text-primary active:scale-95"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <SIATCButton
                        onClick={handleSave}
                        isLoading={isSaving}
                        variant={savedSuccessfully ? "success" : "primary"}
                        icon={savedSuccessfully ? Check : Save}
                        className="w-full sm:w-auto"
                    >
                        {savedSuccessfully ? 'Actualizado' : 'Guardar Cambios'}
                    </SIATCButton>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                <div className="max-w-7xl mx-auto space-y-8 pb-8">
                    {/* Insights SIATC Banner */}
                    <div className="relative group overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-50" />
                        <div className="relative bg-white dark:bg-cb-bg border border-cb-border p-6 rounded-cb-card flex flex-col md:flex-row items-start md:items-center gap-6 shadow-cb-level-1 transition-all">
                            <div className="p-4 bg-primary/10 rounded-cb-btn text-primary ring-4 ring-primary/5 shadow-inner">
                                <TrendingUp className="w-7 h-7 shrink-0" />
                            </div>
                            <div className="space-y-1.5 flex-1">
                                <h3 className="font-bold text-cb-text-primary flex items-center gap-2 text-sm tracking-tight">
                                    Motor de Indexación Financiera
                                    <span className="px-2 py-0.5 rounded-cb-chip bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 uppercase">Activo</span>
                                </h3>
                                <p className="text-xs text-cb-text-secondary leading-relaxed font-medium">
                                    Toda Solped u Orden de Compra registrada en USD se consolidará a <strong className="text-cb-text-primary">Soles (PEN)</strong> utilizando la paridad del mes contable de su registro. Los cambios se aplican automáticamente a proyecciones futuras.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 border-l border-cb-border pl-6 text-cb-text-secondary/60 italic">
                                <span className="text-[10px] font-black tracking-widest">REFERENCIA: SBS / SUNAT</span>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Rates Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {MONTHS.map((month, index) => (
                            <div key={month} className="group/card relative">
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-primary/30 to-transparent rounded-3xl opacity-0 group-hover/card:opacity-100 transition-opacity blur-sm pointer-events-none" />
                                <div className="relative p-5 bg-white dark:bg-cb-bg border border-cb-border rounded-cb-card transition-all group-focus-within/card:border-primary/50 group-focus-within/card:ring-4 group-focus-within/card:ring-primary/5">
                                    <div className="flex justify-between items-center mb-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                            <label className="text-[11px] font-bold tracking-widest text-cb-text-secondary group-focus-within/card:text-primary transition-colors uppercase">
                                                {month}
                                            </label>
                                        </div>
                                        <span className="text-[10px] font-bold text-cb-neutral/40 font-mono">
                                            #{String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>
                                    
                                    <div className="relative group/input">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-sm pointer-events-none opacity-40 group-focus-within/card:opacity-100 transition-opacity">
                                            S/
                                        </div>
                                        <input
                                            type="number"
                                            step="0.001"
                                            min="0"
                                            value={rates[index] || ''}
                                            onChange={(e) => handleRateChange(index, e.target.value)}
                                            className="w-full h-16 pl-10 pr-4 bg-cb-bg/50 border border-cb-border rounded-cb-btn text-3xl font-mono font-bold focus:outline-none focus:bg-white focus:border-primary text-cb-text-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0.000"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <Currency className="w-5 h-5 text-cb-neutral/20 group-hover/card:text-primary/20 transition-colors" />
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-[9px] font-black text-cb-neutral/40 tracking-widest uppercase">
                                        <span>Paridad FI / CO</span>
                                        <span className="group-focus-within/card:text-primary/60 transition-colors">USD → PEN</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Safety Disclaimer */}
                    <div className="flex items-center gap-4 p-5 bg-[#FFF4E5] text-[#F0AD4E] border border-[#F0AD4E]/20 rounded-cb-btn text-[10px] font-bold tracking-widest justify-center mx-auto max-w-2xl text-center leading-relaxed uppercase">
                        <Info className="w-4 h-4 shrink-0" />
                        Los cambios realizados son de carácter retroactivo para ejercicios no cerrados. Verifique con el área contable antes de persistir cambios.
                    </div>
                </div>
            </div>
        </div>
    );
}
