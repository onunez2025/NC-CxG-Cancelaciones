import { useState, useEffect } from 'react';
import { Calculator, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { ExchangeRatesService } from '../../services/exchangeRatesService';
import { cn } from '../../utils/cn';

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function ExchangeRatesPage() {
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
        // Allow empty or partial inputs during typing, but store valid numbers
        if (!isNaN(numValue)) {
            newRates[monthIndex] = numValue;
        } else if (value === '') {
            newRates[monthIndex] = 0; // Temporary 0 for empty string
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
        }, 300); // Small artificial delay for visual feedback
    };

    return (
        <div className="flex flex-col h-full bg-background animate-in fade-in zoom-in duration-300">
            {/* Header */}
            <div className="p-6 bg-card border border-border rounded-t-lg flex justify-between items-center shrink-0">
                <div>
                    <h2 className="text-lg font-medium flex items-center gap-2 text-foreground">
                        <Calculator className="w-5 h-5 text-primary" /> Tipos de Cambio
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">Configura la tasa de cambio mensual (USD a PEN) para el presupuesto.</p>
                </div>
            </div>

            {/* Toolbar / Year Navigation */}
            <div className="p-4 bg-muted/30 border-x border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setSelectedYear(y => y - 1)}
                        className="p-1.5 hover:bg-muted-foreground/10 rounded-md transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-lg font-bold w-16 text-center">{selectedYear}</span>
                    <button
                        onClick={() => setSelectedYear(y => y + 1)}
                        className="p-1.5 hover:bg-muted-foreground/10 rounded-md transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all shadow-sm",
                        savedSuccessfully
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-primary text-primary-foreground hover:bg-primary/90",
                        isSaving && "opacity-70 cursor-not-allowed"
                    )}
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Guardando...' : savedSuccessfully ? 'Guardado' : 'Guardar Cambios'}
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-8 bg-card border-x border-b border-border rounded-b-lg">
                <div className="max-w-4xl mx-auto space-y-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {MONTHS.map((month, index) => (
                            <div key={month} className="space-y-2 group">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-focus-within:text-primary transition-colors">
                                    {month}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 font-bold text-xs">
                                        S/
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={rates[index] || ''}
                                        onChange={(e) => handleRateChange(index, e.target.value)}
                                        className="w-full pl-9 pr-4 py-3 bg-background border border-input rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 p-6 rounded-2xl flex items-start gap-4 border border-blue-100 dark:border-blue-900/20 shadow-sm animate-in slide-in-from-bottom-4 duration-700">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                            <Calculator className="w-6 h-6 shrink-0" />
                        </div>
                        <div className="text-sm space-y-2">
                            <p className="font-bold text-base">¿Cómo funciona?</p>
                            <p className="leading-relaxed opacity-90">Estos valores se utilizan al calcular la ejecución del <strong>Presupuesto vs Real</strong>. Cualquier Solped, Orden de Compra o Gasto Real registrado en USD se convertirá a Soles (PEN) multiplicándolo por la tasa configurada en el mes correspondiente a su fecha.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
