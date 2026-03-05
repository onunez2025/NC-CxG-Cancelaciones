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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Calculator className="w-6 h-6 text-primary" />
                    Tipos de Cambio
                </h1>
                <p className="text-muted-foreground text-sm">
                    Configura la tasa de cambio mensual (USD a PEN) para el cálculo de ejecución presupuestal.
                </p>
            </div>

            <div className="bg-card border rounded-lg overflow-hidden flex flex-col max-w-3xl">
                {/* Header Toolbar */}
                <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSelectedYear(y => y - 1)}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-lg font-bold w-16 text-center">{selectedYear}</span>
                        <button
                            onClick={() => setSelectedYear(y => y + 1)}
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
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

                {/* Rates Grid */}
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {MONTHS.map((month, index) => (
                            <div key={month} className="space-y-1.5">
                                <label className="text-sm font-medium text-muted-foreground">
                                    {month}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                                        S/
                                    </span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={rates[index] || ''}
                                        onChange={(e) => handleRateChange(index, e.target.value)}
                                        className="w-full pl-8 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-4 rounded-lg flex items-start gap-3 max-w-3xl border border-blue-100 dark:border-blue-900/30">
                <Calculator className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                    <p className="font-semibold">¿Cómo funciona?</p>
                    <p>Estos valores se utilizan al calcular la ejecución del <strong>Presupuesto vs Real</strong>. Cualquier Solped, Orden de Compra o Gasto Real registrado en USD se convertirá a Soles (PEN) multiplicándolo por la tasa configurada en el mes correspondiente a su fecha.</p>
                </div>
            </div>
        </div>
    );
}
