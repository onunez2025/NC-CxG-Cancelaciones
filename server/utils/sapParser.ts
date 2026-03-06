/**
 * Utilidades para estructurar la data de SAPLineItems antes de la inserción,
 * permitiendo una migración fluida del JSON a filas con SQL Bulk Insert.
 */
import sql from 'mssql';

export function createSapMe2kTable() {
    const table = new sql.Table('EBM.SAP_ME2K');
    table.create = false;
    table.columns.add('UploadId', sql.NVarChar(50), { nullable: false });
    table.columns.add('PoNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('CostCenter', sql.NVarChar(50), { nullable: true });
    table.columns.add('GlAccount', sql.NVarChar(50), { nullable: true });
    table.columns.add('VendorId', sql.NVarChar(150), { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('OrderValue', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('NetPrice', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('Quantity', sql.Decimal(18, 4), { nullable: true });
    table.columns.add('Currency', sql.NVarChar(10), { nullable: true });
    table.columns.add('ReleaseStatus', sql.NVarChar(50), { nullable: true });
    table.columns.add('ReleaseStrategy', sql.NVarChar(50), { nullable: true });
    return table;
}

export function createSapMe5kTable() {
    const table = new sql.Table('EBM.SAP_ME5K');
    table.create = false;
    table.columns.add('UploadId', sql.NVarChar(50), { nullable: false });
    table.columns.add('PrNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('PrItem', sql.NVarChar(50), { nullable: true });
    table.columns.add('PoNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('CostCenter', sql.NVarChar(50), { nullable: true });
    table.columns.add('GlAccount', sql.NVarChar(50), { nullable: true });
    table.columns.add('VendorName', sql.NVarChar(150), { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('NetValue', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('Quantity', sql.Decimal(18, 4), { nullable: true });
    table.columns.add('Currency', sql.NVarChar(10), { nullable: true });
    table.columns.add('RequestDate', sql.DateTime2, { nullable: true });
    table.columns.add('ReleaseDate', sql.DateTime2, { nullable: true });
    return table;
}

export function createSapMe5aTable() {
    const table = new sql.Table('EBM.SAP_ME5A');
    table.create = false;
    table.columns.add('UploadId', sql.NVarChar(50), { nullable: false });
    table.columns.add('PrNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('PrItem', sql.NVarChar(50), { nullable: true });
    table.columns.add('PoNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('CostCenter', sql.NVarChar(50), { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('TotalValue', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('UnitPrice', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('Quantity', sql.Decimal(18, 4), { nullable: true });
    table.columns.add('Currency', sql.NVarChar(10), { nullable: true });
    table.columns.add('VendorName', sql.NVarChar(150), { nullable: true });
    table.columns.add('CreatedBy', sql.NVarChar(150), { nullable: true });
    table.columns.add('PoDate', sql.DateTime2, { nullable: true });
    table.columns.add('ReleaseDate', sql.DateTime2, { nullable: true });
    table.columns.add('RequestDate', sql.DateTime2, { nullable: true });
    return table;
}

export function createSapKsb1Table() {
    const table = new sql.Table('EBM.SAP_KSB1');
    table.create = false;
    table.columns.add('UploadId', sql.NVarChar(50), { nullable: false });
    table.columns.add('CostCenter', sql.NVarChar(50), { nullable: true });
    table.columns.add('CostElement', sql.NVarChar(50), { nullable: true });
    table.columns.add('CostElementName', sql.NVarChar(150), { nullable: true });
    table.columns.add('Amount', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('PostingDate', sql.DateTime2, { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('ReferenceDoc', sql.NVarChar(100), { nullable: true });
    table.columns.add('PoNumber', sql.NVarChar(50), { nullable: true });
    return table;
}

export function createSapFbl1nTable() {
    const table = new sql.Table('EBM.SAP_FBL1N');
    table.create = false;
    table.columns.add('UploadId', sql.NVarChar(50), { nullable: false });
    table.columns.add('CostCenter', sql.NVarChar(50), { nullable: true });
    table.columns.add('VendorId', sql.NVarChar(150), { nullable: true });
    table.columns.add('DocumentNumber', sql.NVarChar(50), { nullable: true });
    table.columns.add('DocType', sql.NVarChar(20), { nullable: true });
    table.columns.add('PostingDate', sql.DateTime2, { nullable: true });
    table.columns.add('AmountLocal', sql.Decimal(18, 2), { nullable: true });
    table.columns.add('CurrencyLocal', sql.NVarChar(10), { nullable: true });
    table.columns.add('Reference', sql.NVarChar(100), { nullable: true });
    table.columns.add('Assignment', sql.NVarChar(100), { nullable: true });
    table.columns.add('Description', sql.NVarChar(500), { nullable: true });
    table.columns.add('ClearingDoc', sql.NVarChar(50), { nullable: true });
    table.columns.add('PoNumber', sql.NVarChar(50), { nullable: true });
    return table;
}

export function parseExcelDate(val: any): Date | null {
    if (!val) return null;
    const num = Number(val);
    if (!isNaN(num) && num > 40000 && num < 60000) {
        // Excel fecha serial (dias desde 1900) a objeto Date
        const date = new Date((num - 25569) * 86400 * 1000);
        return isNaN(date.getTime()) ? null : date;
    }
    // Si ya es un texto ISO o algo parseable...
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}
