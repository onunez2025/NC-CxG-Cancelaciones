import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, AlertCircle, CheckCircle, FileSpreadsheet, Loader2 } from 'lucide-react';
import ExcelJS from 'exceljs';
import { Modal } from '../common/Modal';
import { AccountsService } from '../../services/accountsService';
import { CostCentersService } from '../../services/costCentersService';
import { BudgetService } from '../../services/budgetService';
import type { AccountingAccount, CostCenter, Budget } from '../../types';
import { useAuth } from '../../hooks/useAuth';

interface BulkBudgetUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    targetYear: number;
}


interface ParsedRow {
    isValid: boolean;
    errors: string[];
    ceco: string;
    accountCode: string;
    accountName: string;
    monthlyAmounts: number[];
    isNewAccount: boolean;
    status: 'ok' | 'new_account' | 'error';
    managementId?: string;
    costCenterId?: string;
}

export function BulkBudgetUploadModal({ isOpen, onClose, onSuccess, targetYear }: BulkBudgetUploadModalProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [previewData, setPreviewData] = useState<ParsedRow[]>([]);
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [stats, setStats] = useState({ total: 0, valid: 0, newAccounts: 0, errors: 0 });
    const [globalError, setGlobalError] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const [allAccounts, setAllAccounts] = useState<AccountingAccount[]>([]);
    const [allBudgets, setAllBudgets] = useState<Budget[]>([]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            // Pre-fetch catalogs for local validation logic
            const [fetchedAccounts, fetchedCecos, fetchedBudgets] = await Promise.all([
                AccountsService.getAccounts(),
                CostCentersService.getCostCenters(),
                BudgetService.getBudgets(targetYear)
            ]);

            setAllAccounts(fetchedAccounts);
            setAllBudgets(fetchedBudgets);
            const data = await file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(data);
            const worksheet = workbook.worksheets[0];
            const jsonData: unknown[][] = [];
            worksheet.eachRow((row) => {
                const rowValues = row.values as unknown[];
                jsonData.push(rowValues.slice(1));
            });

            if (jsonData.length < 2) throw new Error('El archivo está vacío o no tiene datos');

            // Validate columns length on Header
            const headerRow = jsonData[0] || [];
            if (headerRow.length < 14) {
                throw new Error('El formato del archivo es inválido. Faltan columnas (se esperan CECO, Cuenta, Nombre de Cuenta y los 12 meses).');
            }

            const parsedRowsMap = new Map<string, ParsedRow>();
            const parsedRows: ParsedRow[] = [];

            // Process data rows (start from index 1)
            for (let i = 1; i < jsonData.length; i++) {
                const row = jsonData[i];
                if (!row || row.length === 0) continue;

                const ceco = String(row[0] || '').trim();
                const accountCode = String(row[1] || '').trim();
                const accountName = String(row[2] || '').trim();

                // Skip completely empty rows
                if (!ceco && !accountCode) continue;

                const errors: string[] = [];
                const monthlyAmounts: number[] = [];

                // Parse months (Columns D to O -> indices 3 to 14)
                for (let m = 3; m <= 14; m++) {
                    const val = row[m];
                    if (val === '-' || val === null || val === undefined || val === '') {
                        monthlyAmounts.push(0);
                    } else {
                        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
                        monthlyAmounts.push(isNaN(num) ? 0 : num);
                    }
                }

                let managementId: string | undefined;
                let costCenterId: string | undefined;

                if (!ceco) {
                    errors.push('Falta CECO');
                } else {
                    const costCenter = fetchedCecos.find((c: CostCenter) => c.code === ceco);
                    if (costCenter) {
                        managementId = costCenter.management_id;
                        costCenterId = costCenter.id;
                    } else {
                        errors.push(`CECO no encontrado: ${ceco}`);
                    }
                }

                if (!accountCode) {
                    errors.push('Falta Cuenta Contable');
                } else if (accountCode.length > 20 || /\s/.test(accountCode)) {
                    errors.push(`Formato de cuenta inválido (sin espacios, max 20 char): '${accountCode}'`);
                }

                if (accountName && !isNaN(Number(accountName)) && accountName !== '') {
                    errors.push(`Nombre de cuenta parece un monto (${accountName}). ¿Columnas movidas?`);
                }

                const existingAccount = fetchedAccounts.find((a: AccountingAccount) => a.code === accountCode);
                const isNewAccount = !existingAccount;

                const key = `${ceco}-${accountCode}`;
                const existingRow = parsedRowsMap.get(key);

                if (existingRow) {
                    // Aggregate monthly amounts
                    for (let m = 0; m < 12; m++) {
                        existingRow.monthlyAmounts[m] += monthlyAmounts[m];
                    }
                    // Retain valid properties etc
                } else {
                    let status: ParsedRow['status'] = 'ok';
                    if (errors.length > 0) status = 'error';
                    else if (isNewAccount) status = 'new_account';

                    parsedRowsMap.set(key, {
                        isValid: errors.length === 0,
                        errors,
                        ceco,
                        accountCode,
                        accountName,
                        monthlyAmounts,
                        isNewAccount,
                        managementId,
                        costCenterId,
                        status
                    });
                }
            }

            parsedRows.push(...Array.from(parsedRowsMap.values()));

            setPreviewData(parsedRows);
            setStats({
                total: parsedRows.length,
                valid: parsedRows.filter(r => r.isValid).length,
                newAccounts: parsedRows.filter(r => r.isValid && r.isNewAccount).length,
                errors: parsedRows.filter(r => !r.isValid).length
            });
            setStep('preview');
            setGlobalError(null);
            setShowConfirm(false);
        } catch (error) {
            console.error('Error parsing Excel:', error);
            setGlobalError('Error al leer el archivo Excel');
        } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleImport = async () => {
        if (stats.errors > 0 && !showConfirm) {
            setShowConfirm(true);
            return;
        }

        setIsLoading(true);
        setGlobalError(null);
        setShowConfirm(false);

        try {
            const validRows = previewData.filter(r => r.isValid);
            const currentAccounts = [...allAccounts];
            const currentBudgets = [...allBudgets];

            for (const row of validRows) {
                // 1. Ensure Account exists
                let account = currentAccounts.find(a => a.code === row.accountCode);
                if (!account) {
                    account = await AccountsService.saveAccount({
                        code: row.accountCode,
                        name: row.accountName || `Cuenta ${row.accountCode}`,
                        category: 'expense',
                        is_active: true
                    });
                    // Update local copy so subsequent rows see the new account and don't duplicate it
                    currentAccounts.push(account);
                    setAllAccounts([...currentAccounts]);
                }

                // 2. Create/Update Budget
                if (row.managementId && row.costCenterId && account) {
                    const total = row.monthlyAmounts.reduce((a, b) => a + b, 0);

                    // Check if exists
                    const existingBudget = currentBudgets.find(
                        b => b.management_id === row.managementId &&
                            b.cost_center_id === row.costCenterId &&
                            b.account_id === account!.id // We know account is defined here
                    );

                    if (existingBudget) {
                        const updated = await BudgetService.saveBudget({
                            ...existingBudget,
                            monthly_amounts: row.monthlyAmounts,
                            total: total
                        });
                        const idx = currentBudgets.findIndex(b => b.id === updated.id);
                        if (idx !== -1) currentBudgets[idx] = updated;
                    } else {
                        const created = await BudgetService.saveBudget({
                            id: '',
                            year: targetYear,
                            management_id: row.managementId,
                            cost_center_id: row.costCenterId,
                            account_id: account.id,
                            monthly_amounts: row.monthlyAmounts,
                            total: total,
                            created_by: user?.id || '',
                            created_at: new Date().toISOString()
                        });
                        currentBudgets.push(created);
                    }
                }
            }

            setStep('upload');
            setPreviewData([]);
            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error(error);
            setGlobalError((error instanceof Error ? error.message : null) || 'Error al importar datos. Revisa tu conexión o el formato.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('budget.bulk_upload_title', { defaultValue: 'Carga Masiva de Presupuesto' })}>
            <div className="space-y-4">
                {step === 'upload' ? (
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-muted-foreground/25 hover:bg-muted/50 transition-colors">
                        <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-sm text-muted-foreground mb-4 text-center">
                            Selecciona o arrastra tu archivo Excel (.xlsx)<br />
                            <span className="text-xs opacity-75">Formato: CECO, Cuenta, Nombre, Ene-Dic</span>
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                            className="hidden"
                            id="budget-file-upload"
                        />
                        <label
                            htmlFor="budget-file-upload"
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 cursor-pointer flex items-center gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            Seleccionar Archivo
                        </label>
                        {globalError && (
                            <div className="mt-4 p-3 bg-red-100 text-red-700 rounded text-sm w-full text-center">
                                {globalError}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Stats Summary */}
                        <div className="grid grid-cols-4 gap-2 text-center text-xs">
                            <div className="bg-muted p-2 rounded">
                                <div className="font-bold text-lg">{stats.total}</div>
                                <div className="text-muted-foreground">Total Filas</div>
                            </div>
                            <div className="bg-green-500/10 text-green-700 p-2 rounded">
                                <div className="font-bold text-lg">{stats.valid}</div>
                                <div>Válidos</div>
                            </div>
                            <div className="bg-yellow-500/10 text-yellow-700 p-2 rounded">
                                <div className="font-bold text-lg">{stats.newAccounts}</div>
                                <div>Nuevas Cuentas</div>
                            </div>
                            <div className="bg-red-500/10 text-red-700 p-2 rounded">
                                <div className="font-bold text-lg">{stats.errors}</div>
                                <div>Errores</div>
                            </div>
                        </div>

                        {/* Preview Table */}
                        <div className="border rounded-md overflow-hidden max-h-[300px] overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left">Estado</th>
                                        <th className="p-2 text-left">CECO</th>
                                        <th className="p-2 text-left">Cuenta</th>
                                        <th className="p-2 text-left">Nombre</th>
                                        <th className="p-2 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="border-t hover:bg-muted/50">
                                            <td className="p-2">
                                                {row.status === 'ok' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                {row.status === 'new_account' && <span title="Nueva Cuenta"><AlertCircle className="w-4 h-4 text-yellow-500" /></span>}
                                                {row.status === 'error' && (
                                                    <div className="group relative">
                                                        <X className="w-4 h-4 text-red-500 cursor-help" />
                                                        <div className="absolute left-6 top-0 bg-popover text-popover-foreground text-[10px] p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none">
                                                            {row.errors.join(', ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-2 font-mono">{row.ceco}</td>
                                            <td className="p-2 font-mono">{row.accountCode}</td>
                                            <td className="p-2 truncate max-w-[150px]" title={row.accountName}>{row.accountName}</td>
                                            <td className="p-2 text-right font-mono">
                                                {row.monthlyAmounts.reduce((a, b) => a + b, 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {globalError && (
                            <div className="p-3 bg-red-100 text-red-700 rounded text-sm w-full font-medium">
                                <AlertCircle className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                                {globalError}
                            </div>
                        )}

                        {showConfirm && (
                            <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm w-full font-medium flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span>Hay {stats.errors} filas con errores que serán ignoradas.</span>
                                    <span>¿Desea continuar e importar las {stats.valid} filas válidas?</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setShowConfirm(false)} className="px-3 py-1 bg-white border border-yellow-400 rounded hover:bg-yellow-50">Cancelar</button>
                                    <button onClick={handleImport} className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600">Continuar</button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                onClick={() => {
                                    setStep('upload');
                                    setPreviewData([]);
                                    setGlobalError(null);
                                    setShowConfirm(false);
                                }}
                                className="px-3 py-1.5 text-sm border rounded hover:bg-muted"
                                disabled={isLoading}
                            >
                                Cancelar
                            </button>
                            {!showConfirm && (
                                <button
                                    onClick={handleImport}
                                    disabled={isLoading || stats.valid === 0}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Importar {stats.valid} filas
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
}
