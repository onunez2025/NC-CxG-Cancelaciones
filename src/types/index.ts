export type Language = 'es' | 'en';
export type Theme = 'light' | 'dark';

export interface User {
    id: string;
    full_name: string;
    username: string;
    email: string;
    password_hash?: string; // Optional for demo
    role_id: string;
    role_name?: string;
    management_id: string;
    is_active: boolean;
    created_at: string;
    language: Language;
    theme: Theme;
    avatar_url?: string;
    permissions?: Permission[];
    requires_password_change?: boolean;
    apps?: string;
}

export interface Role {
    id: string;
    name: string;
    permissions: Permission[];
    apps?: string;
}

export type Permission =
    | 'dashboard.view'
    | 'budget.view' | 'budget.create' | 'budget.edit'
    | 'cxg.cancelaciones.view' | 'cxg.cancelaciones.create' | 'cxg.cancelaciones.assign' | 'cxg.cancelaciones.gestionar' | 'cxg.cancelaciones.process'
    | 'cxg.cxg_nc.view' | 'cxg.cxg_nc.create' | 'cxg.cxg_nc.process'
    | 'cxg.reportes.exportar'
    | 'config.users' | 'config.roles' | 'config.cecos' | 'config.accounts' | 'config.managements' | 'config.exchange_rates' | 'config.audit';

export interface Management {
    id: string;
    name: string;
    code: string;
}

export interface CostCenter {
    id: string;
    code: string;
    name: string;
    management_id: string;
    is_active: boolean;
}

export interface AccountingAccount {
    id: string;
    code: string;
    name: string;
    category: 'expense' | 'investment' | 'service' | 'other';
    is_active: boolean;
}

export interface Budget {
    id: string;
    year: number;
    account_id: string;
    management_id: string;
    cost_center_id: string;
    monthly_amounts: number[]; // Index 0 = Jan, 11 = Dec
    total: number;
    created_by: string;
    created_at: string;
}

export interface Solped {
    id: string;
    pr_number: string; // Purchase Requisition Number (SAP)
    description: string;
    account_id: string;
    cost_center_id: string;
    amount: number;
    currency: string;
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'ordered';
    vendor_id?: string;
    vendor_name?: string;
    po_number?: string; // Purchase Order Number
    created_by: string;
    created_at: string;
    notes?: string;
}

// Temporary storage for uploaded SAP data
export interface SAPTransactionData {
    id: string;
    transaction_type: 'FBL1N' | 'ME5K' | 'ME2K' | 'KSB1' | 'ME5A';
    upload_date: string;
    uploaded_by: string;
    data: any[]; // Raw parsed data
}
