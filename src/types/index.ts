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
    | 'cxg.cxg_nc.view' | 'cxg.cxg_nc.create' | 'cxg.cxg_nc.approve' | 'cxg.cxg_nc.assign' | 'cxg.cxg_nc.gestionar' | 'cxg.cxg_nc.process' | 'cxg.cxg_nc.gestionar_rechazo'
    | 'cxg.fsm.view'
    | 'cxg.programa_supervisores.view' | 'cxg.programa_supervisores.create' | 'cxg.programa_supervisores.edit' | 'cxg.programa_supervisores.delete'
    | 'cxg.casos_especiales.view' | 'cxg.casos_especiales.create' | 'cxg.casos_especiales.gestionar'
    | 'cxg.emergencias.view' | 'cxg.emergencias.create' | 'cxg.emergencias.verify' | 'cxg.emergencias.process'
    | 'cxg.reportes.exportar'
    | 'config.users' | 'config.roles' | 'config.cecos' | 'config.accounts' | 'config.managements' | 'config.exchange_rates' | 'config.audit';

export interface ProgramaSupervisor {
    id: string;
    empleado_id: string;
    empleado_name: string;
    empleado_estado?: string | null;
    empleado_subarea?: string | null;
    empleado_role?: string | null;
    fecha_labor: string;
    labor: string;
    creado_el?: string;
    creado_por?: string;
    modificado_el?: string;
    modificado_por?: string;
}

export interface SpecialCase {
    id: string;
    ticket: string;
    motivo: string;
    comentario: string;
    fecha: string;
    creado_por: string;
    estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    revisado_el?: string;
    revisado_por?: string;
    motivo_rechazo?: string;
    fecha_visita?: string;
    service_status?: string;
    codigo_producto?: string;
    producto?: string;
}

export interface SpecialCaseMotivo {
    id: string;
    motivo: string;
    tipo_usuario: string;
}

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
    data: Record<string, unknown>[]; // Raw parsed data
}

// ─────────────────────────────────────────────
// EMERGENCIAS
// ─────────────────────────────────────────────

export interface Emergency {
    id: string;
    ticket: string;
    observacion: string;
    verificacion?: string;
    verificacion_motivo?: string;
    verificado_el?: string;
    verificado_por?: string;
    procesado?: string;
    procesado_motivo?: string;
    proceso_el?: string;
    procesado_por?: string;
    creado_el: string;
    creado_por: string;
    tipo: string;
    producto: string;
    asesor_cc?: string;
    tecnico_asignado?: string;
    cliente: string;
    telefono_1: string;
    telefono_2?: string;
    direccion: string;
    direccion_referencia?: string;
    solicitud_repuestos?: string;
}

export interface EmergencyMotive {
    id: string;
    motivo: string;
    ref_id?: string; // Links to Verificacion or Procesado status ID
}

export interface EmergencyStatus {
    id: string;
    label: string;
}

export interface EmergencySparePart {
    id: string;
    material_id: string;
    cantidad: string;
    emergencia_id: string;
    material_nombre?: string;
}

