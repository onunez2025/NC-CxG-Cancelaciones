
import { apiClient, API_BASE_URL } from './apiClient';

/**
 * Enriched transaction: a unified view built by cross-referencing the 5 SAP files.
 * Now computed server-side for performance.
 */
export interface EnrichedTransaction {
    id: string;
    po_number: string;
    cost_center: string;
    vendor_code: string;
    vendor_name: string;
    description: string;
    po_value: number;
    currency: string;
    solped: {
        pr_number: string;
        description: string;
        quantity: number;
        unit_price: number;
        request_date: string;
        net_value: number;
        gl_account: string;
        release_date: string;
    } | null;
    me5a: {
        pr_number: string;
        description: string;
        quantity: number;
        unit_price: number;
        total_value: number;
        created_by: string;
        po_date: string;
        release_date: string;
    } | null;
    release_info?: {
        status: string;
        strategy: string;
    } | null;
    ksb1_entries: {
        cost_element: string;
        cost_element_name: string;
        amount: number;
        posting_date: string;
        description: string;
        reference_doc: string;
    }[];
    fbl1n_entries: {
        document_number: string;
        doc_type: string;
        posting_date: string;
        amount: number;
        currency: string;
        reference: string;
        description: string;
        header_text: string;
        status: 'paid' | 'pending';
    }[];
    status: 'solicitado' | 'pedido' | 'recibido' | 'facturado' | 'pagado';
    total_real_expense: number;
    total_invoiced: number;
    total_paid: number;
}

export interface TrackingMetrics {
    total_pos: number;
    total_po_value: number;
    total_real_expense: number;
    total_invoiced: number;
    total_paid: number;
    pos_with_solped: number;
    pos_with_invoice: number;
    pos_fully_paid: number;
}

export interface SolpedItem {
    position: string;
    description: string;
    cost_center: string;
    quantity: number;
    unit_price: number;
    total_value: number;
}

export interface SolpedRow {
    pr_number: string;
    po_number: string;
    description: string;
    cost_center: string;
    gl_account: string;
    quantity: number;
    net_value: number;
    currency: string;
    request_date: string;
    vendor_name: string;
    release_date: string;
    items: SolpedItem[];
    has_po: boolean;
    po_value: number;
    has_ksb1: boolean;
    real_expense: number;
    has_fbl1n: boolean;
    invoice_count: number;
}

export interface VendorSummary {
    code: string;
    name: string;
    po_count: number;
    po_total: number;
    invoice_count: number;
    invoice_total: number;
    paid_total: number;
    pending_total: number;
    cost_centers: string[];
    pos: { po_number: string; value: number; description: string }[];
    invoices: { doc_number: string; date: string; amount: number; status: 'paid' | 'pending'; description: string }[];
}

const BASE_URL = `${API_BASE_URL}/sap/cross-reference`;

export class CrossReferenceService {

    /** Get tracking data (enriched transactions + metrics) — computed server-side */
    static async getTrackingData(): Promise<{ transactions: EnrichedTransaction[]; metrics: TrackingMetrics }> {
        const response = await apiClient(`${BASE_URL}/tracking`);
        if (!response.ok) throw new Error('Failed to fetch tracking data');
        return response.json();
    }

    /** Get solped rows — computed server-side */
    static async getSolpedData(): Promise<SolpedRow[]> {
        const response = await apiClient(`${BASE_URL}/solpeds`);
        if (!response.ok) throw new Error('Failed to fetch solped data');
        return response.json();
    }

    /** Get vendor summaries — computed server-side */
    static async getVendorData(): Promise<VendorSummary[]> {
        const response = await apiClient(`${BASE_URL}/vendors`);
        if (!response.ok) throw new Error('Failed to fetch vendor data');
        return response.json();
    }

    /** Get budget execution data — computed server-side */
    static async getBudgetExecution(
        year: number,
        managementId: string,
        costCenterId: string | 'all',
        exchangeRates: { year: number; rates: number[] }[]
    ): Promise<import('../utils/budgetExecution').BudgetExecutionSummary> {
        const response = await apiClient(`${BASE_URL}/budget-execution`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                year,
                management_id: managementId,
                cost_center_id: costCenterId,
                exchange_rates: exchangeRates
            })
        });
        if (!response.ok) throw new Error('Failed to fetch budget execution data');
        return response.json();
    }
}
