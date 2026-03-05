import * as XLSX from 'xlsx';
import { apiClient, API_BASE_URL } from './apiClient';
import type { SAPTransactionData } from '../types';

import { CostCentersService } from './costCentersService';

type TransactionType = 'FBL1N' | 'ME5K' | 'ME2K' | 'KSB1' | 'ME5A';

interface ColumnMapping {
    [key: string]: string[]; // Standardized field -> Possible SAP headers
}

/** Result of parsing a file, includes harvested keys for relational filtering */
export interface ParseResult {
    upload: SAPTransactionData;
    /** PO numbers harvested from this file (Documento compras / Pedido) */
    harvestedPOs: Set<string>;
    /** Solped numbers harvested from this file (Solicitud de pedido) */
    harvestedPRs: Set<string>;
    /** Vendor codes harvested from this file (numeric prefix of Proveedor/Centro suministrador) */
    harvestedVendors: Set<string>;
}

export class SapParserService {
    private static API_URL = `${API_BASE_URL}/sap/uploads`;

    // ─── Column Mappings ────────────────────────────────────────
    private static MAPPINGS: Record<TransactionType, ColumnMapping> = {
        'FBL1N': {
            vendor_id: ['Proveedor', 'Vendor', 'Acreedor', 'Account', 'Cta'],
            gl_account: ['Cuenta de mayor', 'G/L Account', 'Cta.mayor', 'Cta. mayor'],
            document_number: ['Nº documento', 'Document Number', 'Nº doc.', 'Documento'],
            posting_date: ['Fecha contabiliz.', 'Fecha de contabiliz.', 'Posting Date', 'Fe.contabilización', 'Fecha cont.'],
            payment_date: ['Fecha de pago', 'Payment Date', 'Fe.pago'],
            amount_local: ['Importe en moneda local', 'Amount in loc.curr.', 'Impte.mon.local', 'Importe'],
            currency_local: ['Moneda local', 'L.Curr', 'M.local', 'Mon'],
            clearing_doc: ['Doc.compensación', 'Doc.compens.', 'Clearing Doc.', 'Doc.comp.', 'Compensación'],
            description: ['Texto', 'Text'],
            header_text: ['Texto cab.documento'],
            assignment: ['Asignación', 'Assignment', 'Asign.'],
            reference: ['Referencia', 'Reference', 'Refer.'],
            doc_type: ['Clase de documento', 'Document Type', 'Cl.doc.', 'Clase doc.'],
            cost_center: ['Centro de coste', 'Cost Center', 'CeCo', 'Centro coste'],
            po_number: ['Documento compras', 'Purchasing Document', 'Doc.compras']
        },
        'ME5K': {
            cost_center: ['Centro de coste', 'Cost Center', 'CeCo', 'Centro coste'],
            gl_account: ['Cuenta de mayor', 'G/L Account', 'Cta.mayor'],
            pr_number: ['Solicitud de pedido', 'Purchase Requisition', 'Sol.Ped.', 'SolPed'],
            description: ['Texto breve', 'Short Text', 'Descripción'],
            quantity: ['Cantidad solicitada', 'Quantity Requested', 'Ctd.solicitada', 'Cantidad'],
            unit: ['Unidad de medida', 'Unit of Measure', 'UDM', 'Um'],
            vendor_id: ['Proveedor fijo', 'Fixed Vendor', 'Prov.fijo', 'Vendor'],
            vendor_name: ['Nombre del proveedor', 'Nombre de proveedor', 'Vendor Name', 'Nombre prov.', 'Nombre del proveedor deseado'],
            po_number: ['Pedido', 'Número del pedido', 'Purchase Order', 'No.pedido', 'Doc.compras'],
            request_date: ['Fecha de solicitud', 'Requisition Date', 'Fe.solicitud'],
            release_date: ['Fecha de liberación', 'Release Date', 'Fe.liberación'],
            net_value: ['Valor neto de orden', 'Net Value', 'Val.neto', 'Importe'],
            currency: ['Moneda', 'Currency', 'Mon.'],
            pr_item: ['Pos.solicitud pedido', 'Requisn. item', 'Pos.Sol.', 'Posición'],
            distribution: ['Distribución (%)', 'Distribution (%)', 'Distrib.(%)']
        },
        'ME2K': {
            po_number: ['Documento compras', 'Purchasing Document', 'Doc.compras', 'Pedido'],
            document_date: ['Fecha documento', 'Document Date', 'Fe.documento'],
            vendor_id: ['Proveedor/Centro suministrador', 'Vendor/Supplying Plant', 'Prov/CeSum', 'Proveedor'],
            cost_center: ['Centro de coste', 'Cost Center', 'CeCo', 'Centro coste'],
            description: ['Texto breve', 'Short Text', 'Descripción'],
            ordered_quantity: ['Cantidad de pedido', 'Order Quantity', 'Ctd.pedido'],
            pending_quantity: ['Por entregar (cantidad)', 'Quantity to be Delivered', 'Por entregar'],
            order_value: ['Valor neto de orden', 'Net Order Value', 'Val.net.p.'],
            net_price: ['Precio neto', 'Net Price', 'Precio'],
            gl_account: ['Cuenta de mayor', 'G/L Account', 'Cta.mayor'],
            pr_number: ['Solicitud de pedido', 'Requisitioner', 'Sol.Ped.', 'SolPed'],
            release_status: ['Estado liberación', 'Release Status', 'Est.liberación'],
            release_strategy: ['Estrategia liberac.', 'Release Strategy', 'Estr.liberación']
        },
        'KSB1': {
            cost_element: ['Clase de coste', 'Cost Element', 'Cl.coste'],
            cost_element_name: ['Denom.clase de coste', 'Cost element name', 'Denom.cl.coste'],
            amount: ['Valor/mon.inf.', 'Val.in rep.cur.', 'Val/m.inf.', 'Valor'],
            posting_date: ['Fe.contabilización', 'Posting Date', 'Fecha'],
            description: ['Texto breve material', 'Material Description', 'Texto', 'Descripción'],
            reference_doc: ['Nº docum.refer.', 'Nº docum.referencia', 'Ref. Document Number', 'Nº doc.ref.', 'Referencia'],
            po_number: ['Documento compras', 'Purchasing Document', 'Doc.compras', 'Pedido'],
            cost_center: ['Centro de coste', 'Cost Center', 'CeCo', 'Centro coste']
        },
        'ME5A': {
            pr_number: ['Solicitud de pedido', 'Purchase requisition', 'Sol.Ped.', 'SolPed', 'Nº sol.pedido', 'Requisition', 'Solicitud'],
            pr_item: ['Pos.solicitud pedido', 'Requisn. item', 'Pos.Sol.', 'Posición'],
            description: ['Texto breve', 'Short text', 'Descripción', 'Texto'],
            quantity: ['Cantidad solicitada', 'Quantity requested', 'Ctd.sol.', 'Cantidad'],
            request_date: ['Fecha de solicitud', 'Requisition date', 'Fe.solicitud', 'Fecha'],
            release_date: ['Fecha de liberación', 'Release date', 'Fe.lib.', 'Fe.liberación'],
            created_by: ['Creado por', 'Created by', 'Usuario'],
            total_value: ['Valor total', 'Total value', 'Val.total', 'Importe total'],
            unit_price: ['Precio de valoración', 'Valuation Price', 'Precio val.', 'Precio unitario'],
            po_number: ['Pedido', 'Purchase order', 'Doc.compras', 'Nº pedido'],
            po_date: ['Fecha de pedido', 'PO date', 'Fe.pedido'],
            ordered_quantity: ['Cantidad pedida', 'Ordered quantity', 'Ctd.pedida'],
            cost_center: ['Centro de coste', 'Cost Center', 'CeCo', 'Centro coste', 'Centro', 'Cen.coste', 'C.coste', 'Imputación'],
            vendor_name: ['Nombre de proveedor', 'Vendor Name', 'Nomb.prov.', 'Nombre'],
            desired_vendor: ['Proveedor deseado', 'Desired Vendor', 'Prov.deseado', 'Acreedor'],
            currency: ['Moneda', 'Currency', 'Mon.']
        }
    };

    // ─── ROOT types: have CeCo, used to harvest keys ────────────
    private static ROOT_TYPES: TransactionType[] = ['ME2K', 'ME5K', 'ME5A'];

    /**
     * Parse a SAP file with relational filtering.
     * 
     * @param file        The Excel file
     * @param type        Transaction type (FBL1N, ME5K, ME2K, KSB1, ME5A)
     * @param uploadedBy  Username
     * @param validPOs    Set of PO numbers harvested from ROOT files (for BRIDGE filtering)
     * @param validVendors Set of vendor codes harvested from ME2K (for FBL1N filtering)
     */
    static async parseFile(
        file: File,
        type: TransactionType,
        uploadedBy: string
    ): Promise<ParseResult> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target?.result as ArrayBuffer);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (jsonData.length === 0) {
                        reject(new Error('El archivo está vacío'));
                        return;
                    }

                    // ── Find header row ──────────────────────────────
                    const mapping = this.MAPPINGS[type];
                    let headerRowIndex = -1;
                    let maxMatches = 0;

                    const possibleHeaders = Object.values(mapping).flat().map(h => h.toUpperCase());

                    for (let i = 0; i < Math.min(30, jsonData.length); i++) {
                        const row = jsonData[i] as any[];
                        if (!row) continue;
                        let matches = 0;
                        row.forEach(cell => {
                            if (cell !== undefined && cell !== null) {
                                const normalized = String(cell).trim().toUpperCase();
                                if (possibleHeaders.includes(normalized)) {
                                    matches++;
                                }
                            }
                        });

                        if (matches > maxMatches) {
                            maxMatches = matches;
                            headerRowIndex = i;
                        }
                    }

                    if (headerRowIndex === -1 || maxMatches === 0) {
                        reject(new Error('No se pudo identificar la fila de cabecera. Verifique el formato del archivo.'));
                        return;
                    }

                    const headers = jsonData[headerRowIndex] as string[];
                    const rows = jsonData.slice(headerRowIndex + 1);

                    // ── Map columns (case-insensitive exact match) ──
                    const columnMap: Record<string, number> = {};
                    Object.entries(mapping).forEach(([field, aliases]) => {
                        const upperAliases = aliases.map(a => a.trim().toUpperCase());
                        const index = headers.findIndex(h =>
                            h != null && upperAliases.includes(String(h).trim().toUpperCase())
                        );
                        if (index !== -1) {
                            columnMap[field] = index;
                        }
                    });

                    // ── Parse all rows into objects ──────────────────
                    const allRows = rows.map((row: any) => {
                        const item: any = {};
                        Object.entries(columnMap).forEach(([field, colIndex]) => {
                            item[field] = row[colIndex];
                        });
                        return item;
                    }).filter((item: any) => {
                        // Discard rows where every mapped field is empty
                        return Object.values(item).some(v => v !== undefined && v !== null && String(v).trim() !== '');
                    });

                    // ── Get active CeCos ─────────────────────────────
                    const fetchedCecos = await CostCentersService.getCostCenters();
                    const activeCecosRaw = fetchedCecos.filter(c => c.is_active);
                    const activeCecos = new Set<string>(
                        activeCecosRaw.map(c => String(c.code).trim().toUpperCase())
                    );

                    // ── Apply relational filter ─────────────────────
                    const harvestedPOs = new Set<string>();
                    const harvestedPRs = new Set<string>();
                    const harvestedVendors = new Set<string>();
                    let parsedData: any[];

                    const isRoot = this.ROOT_TYPES.includes(type);

                    if (isRoot) {
                        // ═══ PHASE 1: ROOT files (ME2K, ME5K, ME5A) ═══
                        if (activeCecos.size === 0) {
                            reject(new Error(
                                'No hay Centros de Costo (CeCos) configurados en la aplicación.'
                            ));
                            return;
                        }

                        // Helper for robust CeCo matching
                        const matchesCeCo = (rowCeCo: any) => {
                            const r = String(rowCeCo || '').trim().toUpperCase();
                            if (!r) return false;
                            if (activeCecos.has(r)) return true;

                            // Fallback: match by numeric part (e.g. 050004 matches MT050004)
                            const rNum = r.replace(/\D/g, '');
                            if (!rNum) return false;

                            for (const active of activeCecos) {
                                if (active.replace(/\D/g, '') === rNum) return true;
                            }
                            return false;
                        };

                        // Primary filter: CeCo match (Except for ME5A since CeCo is usually blank and deduced in backend)
                        if (type === 'ME5A') {
                            parsedData = allRows;
                        } else {
                            parsedData = allRows.filter((item: any) => matchesCeCo(item.cost_center));
                        }

                        if (parsedData.length === 0) {
                            // Extract a few unique CeCos from the file to show the user what we actually parsed
                            const fileCecosRaw = new Set<string>();
                            allRows.slice(0, 50).forEach(r => {
                                if (r.cost_center) fileCecosRaw.add(String(r.cost_center).trim().toUpperCase());
                            });
                            const sampleFileCecos = Array.from(fileCecosRaw).slice(0, 3).join(', ') || 'Ninguno encontrado';

                            reject(new Error(
                                `Cero coincidencias. Verifique CeCos.\n` +
                                `• CeCos en su BD: ${Array.from(activeCecos).join(', ')}\n` +
                                `• CeCos detectados en el Excel (Muestra): ${sampleFileCecos}`
                            ));
                            return;
                        }

                        // Harvest IDs for BRIDGE files
                        parsedData.forEach((item: any) => {
                            const po = item.po_number ? String(item.po_number).trim() : '';
                            if (po) harvestedPOs.add(po);

                            const pr = item.pr_number ? String(item.pr_number).trim() : '';
                            if (pr) harvestedPRs.add(pr);
                        });

                        // For ME2K: also harvest vendor codes
                        if (type === 'ME2K') {
                            parsedData.forEach((item: any) => {
                                if (item.vendor_id) {
                                    const vCode = String(item.vendor_id).trim().split(/\s+/)[0].replace(/\D/g, '');
                                    if (vCode) harvestedVendors.add(vCode);
                                }
                            });
                        }

                    } else {
                        // ═══ PHASE 2: BRIDGE files (KSB1, ME5A, FBL1N) ═══
                        // YA NO FILTRAMOS EN EL CLIENTE Y ENVIAMOS TODA LA DATA, 
                        // LA BASE DE DATOS Y SUS TABLAS RESOLVERAN EL CRUCE NATURALMENTE.
                        parsedData = allRows;

                        // Solo filtramos si hay 0 filas leidas en general (archivos vacios)
                        if (parsedData.length === 0) {
                            reject(new Error(`El archivo ${type} procesado resultó sin filas válidas.`));
                            return;
                        }
                    }

                    const upload: SAPTransactionData = {
                        id: Math.random().toString(36).substring(2, 15),
                        transaction_type: type,
                        upload_date: new Date().toISOString(),
                        uploaded_by: uploadedBy,
                        data: parsedData
                    };

                    await this.saveUpload(upload);
                    resolve({ upload, harvestedPOs, harvestedPRs, harvestedVendors });

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    static async saveUpload(upload: SAPTransactionData): Promise<void> {
        try {
            const response = await apiClient(this.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(upload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to save SAP upload to server');
            }
        } catch (error: any) {
            console.error('Failed to save SAP Upload:', error);
            throw error;
        }
    }

    /** Returns only metadata (without .data) for all uploads */
    static async getUploads(): Promise<Omit<SAPTransactionData, 'data'>[]> {
        const response = await apiClient(this.API_URL);
        if (!response.ok) throw new Error('Failed to fetch SAP uploads from server');
        return response.json();
    }

    /** Fetches all uploads fully populated with data (Heavier operation) */
    static async getAllUploadsFull(): Promise<SAPTransactionData[]> {
        const metadata = await this.getUploads();
        const full = await Promise.all(metadata.map(m => this.getUploadById(m.id)));
        return full;
    }

    /** Fetches a complete upload including the massive .data array */
    static async getUploadById(id: string): Promise<SAPTransactionData> {
        const response = await apiClient(`${this.API_URL}/${id}`);
        if (!response.ok) throw new Error('Failed to fetch full SAP upload details');
        return response.json();
    }

    static async deleteUpload(id: string): Promise<void> {
        const response = await apiClient(`${this.API_URL}/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete SAP upload');
    }

    static async clearAllUploads(): Promise<void> {
        const response = await apiClient(this.API_URL, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to clear SAP uploads');
    }
}
