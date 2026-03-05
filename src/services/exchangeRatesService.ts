import { StorageService } from './storageService';

export interface YearlyExchangeRates {
    year: number;
    rates: number[]; // Array of 12 numbers (0 = Jan, 11 = Dec)
}

export class ExchangeRatesService {
    private static STORAGE_KEY = 'exchange_rates';

    // Default rate if not configured (fallback)
    private static DEFAULT_RATE = 3.80;

    static getRates(): YearlyExchangeRates[] {
        const rates = StorageService.get<YearlyExchangeRates[]>(this.STORAGE_KEY);
        if (!rates) return [];
        return rates;
    }

    static getRatesForYear(year: number): YearlyExchangeRates {
        const allRates = this.getRates();
        const yearRates = allRates.find(r => r.year === year);

        if (yearRates) {
            return yearRates;
        }

        // Return default if not found
        return {
            year,
            rates: Array(12).fill(this.DEFAULT_RATE)
        };
    }

    static getRateForMonthYear(month: number, year: number): number {
        // month is 0-indexed (0 = Jan, 11 = Dec)
        const yearRates = this.getRatesForYear(year);
        return yearRates.rates[month] || this.DEFAULT_RATE;
    }

    static saveRatesForYear(year: number, rates: number[]): void {
        const allRates = this.getRates();
        const index = allRates.findIndex(r => r.year === year);

        if (index >= 0) {
            allRates[index].rates = rates;
        } else {
            allRates.push({ year, rates });
        }

        StorageService.set(this.STORAGE_KEY, allRates);
    }
}
