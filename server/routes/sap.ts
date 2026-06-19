import { safeError } from '../lib/security.js';
import { Router } from 'express';
import { getDbConnection } from '../db.js';
import sql from 'mssql';
import { invalidateCrossReferenceCache } from './crossReference.js';
import {
    parseExcelDate,
    createSapMe2kTable,
    createSapMe5kTable,
    createSapMe5aTable,
    createSapKsb1Table,
    createSapFbl1nTable
} from '../utils/sapParser.js';
const router = Router();

// Get all uploaded files metadata — real record counts from individual tables
router.get('/', async (req, res) => {
    try {
        const pool = await getDbConnection();

        // Get upload metadata header records
        const uploadsResult = await pool.request().query(`
            SELECT Id, TransactionType, UploadDate, UploadedBy
            FROM EBM.SAPUploads 
            ORDER BY UploadDate DESC
        `);

        // Get real row counts from each table
        const countsResult = await pool.request().query(`
            SELECT 'ME2K' AS T, COUNT(*) AS N FROM EBM.SAP_ME2K
            UNION ALL
            SELECT 'ME5K', COUNT(*) FROM EBM.SAP_ME5K
            UNION ALL
            SELECT 'ME5A', COUNT(*) FROM EBM.SAP_ME5A
            UNION ALL
            SELECT 'KSB1', COUNT(*) FROM EBM.SAP_KSB1
            UNION ALL
            SELECT 'FBL1N', COUNT(*) FROM EBM.SAP_FBL1N
        `);

        const countsByType: Record<string, number> = {};
        countsResult.recordset.forEach((r: { T: string; N: number }) => {
            countsByType[r.T] = r.N;
        });

        const uploads = uploadsResult.recordset.map((row: { Id: string; TransactionType: string; UploadDate: string; UploadedBy: string }) => ({
            id: row.Id,
            transaction_type: row.TransactionType,
            upload_date: row.UploadDate,
            uploaded_by: row.UploadedBy,
            record_count: countsByType[row.TransactionType] ?? 0
        }));

        res.json(uploads);
    } catch (error) {
        console.error('Error fetching SAP uploads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


// Get a specific upload with its full Data
router.get('/:id', async (req, res) => {
    try {
        const pool = await getDbConnection();
        const result = await pool.request()
            .input('id', sql.NVarChar(50), req.params.id)
            .query(`
                SELECT Id, TransactionType, UploadDate, UploadedBy, Data 
                FROM EBM.SAPUploads 
                WHERE Id = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Upload not found' });
        }

        const row = result.recordset[0];
        res.json({
            id: row.Id,
            transaction_type: row.TransactionType,
            upload_date: row.UploadDate,
            uploaded_by: row.UploadedBy,
            data: JSON.parse(row.Data)
        });
    } catch (error) {
        console.error('Error fetching SAP upload:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create/Replace an upload
router.post('/', async (req, res) => {
    try {
        const { id, transaction_type, upload_date, uploaded_by, data } = req.body;
        const user = (req as { user?: { role_id?: string; management_id?: string } }).user;

        if (!id || !transaction_type || !data) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pool = await getDbConnection();

        // 1. Obtener CeCos autorizados para este usuario (Filtro de Seguridad)
        const authorizedCecos = new Set<string>();
        let isAdmin = false;

        if (user && user.role_id) {
            const roleQuery = await pool.request()
                .input('roleId', sql.UniqueIdentifier, String(user.role_id))
                .query(`SELECT Name FROM EBM.Roles WHERE Id = @roleId`);
            const roleName = roleQuery.recordset[0]?.Name;

            if (roleName === 'Administrador' || roleName === 'Gerente General') {
                isAdmin = true;
            } else if (user.management_id) {
                const cecoQuery = await pool.request()
                    .input('managementId', sql.UniqueIdentifier, String(user.management_id))
                    .query(`SELECT Code FROM EBM.CostCenters WHERE ManagementId = @managementId AND IsActive = 1`);
                cecoQuery.recordset.forEach((r: { Code: string }) => authorizedCecos.add(String(r.Code).trim()));
            }
        }

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Eliminar registros anteriores del mismo tipo (EBM.SAPUploads y ON DELETE CASCADE borra las tablas dependientes)
            await transaction.request()
                .input('transaction_type', sql.NVarChar(20), transaction_type)
                .query(`DELETE FROM EBM.SAPUploads WHERE TransactionType = @transaction_type`);

            // Insert new SAPUpload (header)
            // IMPORTANTE: Ya no guardamos el RAW Data (JSON) porque satura la BD. 
            // Guardamos NULL o vacío, las 5 tablas transaccionales tienen la veracidad.
            await transaction.request()
                .input('id', sql.NVarChar(50), id)
                .input('transaction_type', sql.NVarChar(20), transaction_type)
                .input('upload_date', sql.DateTime, new Date(upload_date))
                .input('uploaded_by', sql.NVarChar(100), uploaded_by)
                .input('data', sql.NVarChar(sql.MAX), '[]') // Vaciado intencional de RAW Data
                .query(`
                    INSERT INTO EBM.SAPUploads (Id, TransactionType, UploadDate, UploadedBy, Data)
                    VALUES (@id, @transaction_type, @upload_date, @uploaded_by, @data)
                `);

            // --- INICIO PRECARGA PARA FILTROS EN MEMORIA ---
            const validMe2k = new Map<string, { CostCenter: string; Description: string; VendorId: string }>(); // PoNumber -> { CostCenter, Description, VendorId }
            const validMe5k = new Map<string, { PrNumber: string; PrItem: string; CostCenter: string }>(); // PrNumber -> CostCenter

            if (data.length > 0 && ['ME5A', 'KSB1', 'FBL1N'].includes(transaction_type)) {

                // Cargar ME2K limitando a los CeCos del usuario si corresponde
                let queryMe2k = `SELECT PoNumber, CostCenter, Description, VendorId FROM EBM.SAP_ME2K WHERE PoNumber IS NOT NULL`;
                const me2kReq = transaction.request();

                if (!isAdmin && authorizedCecos.size > 0) {
                    const cecosArr = Array.from(authorizedCecos);
                    const paramNames = cecosArr.map((_, i) => `@c2k${i}`).join(',');
                    queryMe2k += ` AND CostCenter IN (${paramNames})`;
                    cecosArr.forEach((c, i) => me2kReq.input(`c2k${i}`, sql.NVarChar(50), String(c).trim()));
                } else if (!isAdmin && authorizedCecos.size === 0) {
                    queryMe2k += ` AND 1=0`; // No admin y sin cecos -> no ver nada
                }
                const me2kResult = await me2kReq.query(queryMe2k);

                me2kResult.recordset.forEach((r: { PoNumber: string; CostCenter: string; Description: string; VendorId: string }) => validMe2k.set(r.PoNumber, {
                    CostCenter: r.CostCenter,
                    Description: r.Description,
                    VendorId: r.VendorId
                }));

                // Cargar ME5K
                let queryMe5k = `SELECT PrNumber, PrItem, CostCenter FROM EBM.SAP_ME5K WHERE PrNumber IS NOT NULL`;
                const me5kReq = transaction.request();

                if (!isAdmin && authorizedCecos.size > 0) {
                    const cecosArr = Array.from(authorizedCecos);
                    const paramNames = cecosArr.map((_, i) => `@c5k${i}`).join(',');
                    queryMe5k += ` AND CostCenter IN (${paramNames})`;
                    cecosArr.forEach((c, i) => me5kReq.input(`c5k${i}`, sql.NVarChar(50), String(c).trim()));
                } else if (!isAdmin && authorizedCecos.size === 0) {
                    queryMe5k += ` AND 1=0`;
                }
                const me5kResult = await me5kReq.query(queryMe5k);

                me5kResult.recordset.forEach((r: { PrNumber: string; PrItem: string; CostCenter: string }) => {
                    validMe5k.set(`${r.PrNumber}_${r.PrItem}`, r);
                    validMe5k.set(r.PrNumber, r); // Fallback al header
                });
            }

            // Normaliza un token de referencia de factura eliminando ceros leading del número
            // "0E001-0000077" → "E001-77"  |  "E1-68" → "E1-68"  |  "E001-77" → "E001-77"
            const normalizeInvoiceToken = (raw: string): string => {
                if (!raw) return '';
                let s = raw.toUpperCase().trim();
                // Quitar cero(s) de prefijo antes de letra: "0E001-..." -> "E001-..."
                s = s.replace(/^0+([A-Z])/, '$1');
                // Quitar ceros leading del número tras el guion: "E001-0000077" -> "E001-77"
                s = s.replace(/-0*(\d+)$/, (_, n) => `-${parseInt(n, 10)}`);
                return s;
            };

            // Extrae tokens de referencia de factura de un texto dado (FBL1N o ME2K)
            // Acepta: "E001-77", "E1-68", "0E001-0000077", "FAZZIO E001-77 TEXTO"
            const extractInvoiceTokens = (text: string): Set<string> => {
                const tokens = new Set<string>();
                if (!text) return tokens;
                // Patrón ampliado: dígito opcional + letra + 1-3 dígitos + guion + 1+ dígitos
                const pattern = /0?[A-Z]\d{1,3}-\d+/gi;
                let m;
                const src = String(text);
                while ((m = pattern.exec(src)) !== null) {
                    tokens.add(normalizeInvoiceToken(m[0]));
                }
                return tokens;
            };

            // MATCH EXACTO por token:
            // Fragments del Texto Breve ME2K deben tener al menos un token exacto en FBL1N tokens
            const smartMatch = (poDesc: string, fblRef: string, fblAsig: string, fblText?: string): boolean => {
                if (!poDesc) return false;
                const fragments = extractInvoiceTokens(poDesc);
                if (fragments.size === 0) return false;
                // Unir tokens de todos los campos disponibles en FBL1N
                const fblTokens = new Set<string>([
                    ...extractInvoiceTokens(fblRef),
                    ...extractInvoiceTokens(fblAsig),
                    ...extractInvoiceTokens(fblText || '')
                ]);
                for (const f of fragments) {
                    if (fblTokens.has(f)) return true;
                }
                return false;
            };
            // --- FIN PRECARGA ---




            if (Array.isArray(data) && data.length > 0) {
                const bulkReq = new sql.Request(transaction);

                if (transaction_type === 'ME2K' || transaction_type === 'ME2M') {
                    const tvp = createSapMe2kTable();
                    for (const row of data) {
                        const ceco = String(row.cost_center || '').trim();
                        if (!isAdmin && !authorizedCecos.has(ceco)) continue; // Filtrado CeCo

                        const amt = isNaN(Number(row.order_value)) ? 0 : Number(row.order_value);
                        const netPrice = isNaN(Number(row.net_price)) ? 0 : Number(row.net_price);
                        const qty = isNaN(Number(row.ordered_quantity) || Number(row.quantity)) ? 0 : Number(row.ordered_quantity) || Number(row.quantity);

                        tvp.rows.add(
                            id,
                            String(row.po_number || '').trim().substring(0, 50) || null,
                            ceco || null,
                            String(row.gl_account || '').trim().substring(0, 50) || null,
                            String(row.vendor_id || '').trim().substring(0, 150) || null,
                            String(row.description || row.short_text || '').trim().substring(0, 500) || null,
                            amt,
                            netPrice,
                            qty,
                            String(row.currency || 'PEN').toUpperCase().substring(0, 10),
                            String(row.release_status || '').trim().substring(0, 50) || null,
                            String(row.release_strategy || '').trim().substring(0, 50) || null
                        );
                    }
                    if (tvp.rows.length > 0) await bulkReq.bulk(tvp);
                }
                else if (transaction_type === 'ME5K') {
                    const tvp = createSapMe5kTable();
                    for (const row of data) {
                        const ceco = String(row.cost_center || '').trim();
                        if (!isAdmin && !authorizedCecos.has(ceco)) continue;

                        tvp.rows.add(
                            id,
                            String(row.pr_number || '').trim().substring(0, 50) || null,
                            String(row.pr_item || '').trim().substring(0, 50) || null,
                            String(row.po_number || '').trim().substring(0, 50) || null,
                            ceco || null,
                            String(row.gl_account || '').trim().substring(0, 50) || null,
                            String(row.vendor_name || row.desired_vendor || '').trim().substring(0, 150) || null,
                            String(row.description || row.short_text || '').trim().substring(0, 500) || null,
                            Number(row.net_value) || 0,
                            Number(row.quantity) || 0,
                            String(row.currency || 'PEN').toUpperCase().substring(0, 10),
                            parseExcelDate(row.request_date),
                            parseExcelDate(row.release_date)
                        );
                    }
                    if (tvp.rows.length > 0) await bulkReq.bulk(tvp);
                }
                else if (transaction_type === 'ME5A') {
                    const tvp = createSapMe5aTable();
                    for (const row of data) {
                        const prNum = String(row.pr_number || '').trim();
                        const prItem = String(row.pr_item || '').trim();

                        let matchedCeco = '';
                        if (prNum) {
                            const match = validMe5k.get(`${prNum}_${prItem}`) || validMe5k.get(prNum);
                            if (match) matchedCeco = match.CostCenter;
                        }

                        // Si no lo encuentra en ME5K, buscamos en ME2K
                        if (!matchedCeco) {
                            const poNum = String(row.po_number || '').trim();
                            if (poNum) {
                                const match = validMe2k.get(poNum);
                                if (match) matchedCeco = match.CostCenter;
                            }
                        }

                        // El filtrado riguroso: solo insertamos si encontramos correspondencia en memoria (heredamos CeCo)
                        const finalCeco = matchedCeco || String(row.cost_center || '').trim() || null;
                        if (!finalCeco) continue; // Descarte estricto de huérfanos
                        if (!isAdmin && !authorizedCecos.has(finalCeco)) continue;

                        tvp.rows.add(
                            id,
                            prNum || null,
                            prItem || null,
                            String(row.po_number || '').trim().substring(0, 50) || null,
                            finalCeco,
                            String(row.description || row.short_text || '').trim().substring(0, 500) || null,
                            Number(row.total_value) || 0,
                            Number(row.unit_price) || 0,
                            Number(row.quantity) || 0,
                            String(row.currency || 'PEN').toUpperCase().substring(0, 10),
                            String(row.vendor_name || row.desired_vendor || '').trim().substring(0, 150) || null,
                            String(row.created_by || '').trim().substring(0, 150) || null,
                            parseExcelDate(row.po_date || row.request_date),
                            parseExcelDate(row.release_date),
                            parseExcelDate(row.request_date)
                        );
                    }
                    if (tvp.rows.length > 0) await bulkReq.bulk(tvp);
                }
                else if (transaction_type === 'KSB1') {
                    const tvp = createSapKsb1Table();
                    for (const row of data) {
                        let ceco = String(row.cost_center || '').trim();

                        // Si no hay CeCo, intentamos deducirlo por PoNumber o PurchasingDoc
                        if (!ceco) {
                            const poList = [
                                String(row.po_number || '').trim(),
                                String(row.purchasing_doc || '').trim(),
                                String(row.reference_doc || '').trim()
                            ];
                            for (const poStr of poList) {
                                if (poStr) {
                                    const match = validMe2k.get(poStr);
                                    if (match) {
                                        ceco = match.CostCenter;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!ceco) continue; // Descarte estricto
                        if (!isAdmin && !authorizedCecos.has(ceco)) continue;

                        tvp.rows.add(
                            id,
                            ceco || null,
                            String(row.cost_element || '').trim().substring(0, 50) || null,
                            String(row.cost_element_name || '').trim().substring(0, 150) || null,
                            Number(row.amount) || Number(row.value_in_rep_cur) || 0,
                            parseExcelDate(row.posting_date),
                            String(row.description || row.name || '').trim().substring(0, 500) || null,
                            String(row.reference_doc || row.purchasing_doc || '').trim().substring(0, 100) || null,
                            String(row.po_number || row.purchasing_doc || row.reference_doc || '').trim().substring(0, 50) || null
                        );
                    }
                    if (tvp.rows.length > 0) await bulkReq.bulk(tvp);
                }
                else if (transaction_type === 'FBL1N') {
                    const tvp = createSapFbl1nTable();
                    const validMe2kEntries = Array.from(validMe2k.entries()); // Para búsqueda exhaustiva

                    for (const row of data) {
                        let poStr = String(row.po_number || '').trim().substring(0, 50);
                        let matchedCeco = '';

                        // 1. Extraer PO de campos de texto comunes si no viene nativo
                        if (!poStr) {
                            const assign = String(row.assignment || '');
                            const ref = String(row.reference || '');
                            const matchStr = (assign + ' ' + ref).match(/4[012345]\d{8}/);
                            if (matchStr) poStr = matchStr[0];
                        }

                        // 2. Coincidencia directa de PO Number -> CostCenter
                        if (poStr) {
                            const match = validMe2k.get(poStr);
                            if (match) matchedCeco = match.CostCenter;
                        }

                        // Extrae código numérico del vendor: "1000012509 BLACK PREMIUM..." → "1000012509"
                        const extractVendorCode = (v: string): string => v ? String(v).trim().split(/\s+/)[0] : '';

                        // 3. Heurísticas y SmartMatch si aún no hay CeCo
                        if (!matchedCeco) {
                            const ref = String(row.reference || '');
                            const assign = String(row.assignment || '');
                            const searchText = `${row.description || ''} ${row.header_text || ''} ${assign} ${ref}`;
                            const fblVendorCode = String(row.vendor_id || row.account || '').trim();

                            for (const [me2kPo, me2kData] of validMe2kEntries) {
                                const me2kVendorCode = extractVendorCode(me2kData.VendorId);

                                if (searchText.includes(me2kPo)) {
                                    // Si ambos vendors están disponibles, exigir coincidencia
                                    if (me2kVendorCode && fblVendorCode && me2kVendorCode !== fblVendorCode) continue;
                                    poStr = poStr || me2kPo;
                                    matchedCeco = me2kData.CostCenter;
                                    break;
                                }
                                if (smartMatch(me2kData.Description, ref, assign, `${row.header_text || ''} ${row.text || ''}`)) {
                                    if (me2kVendorCode && fblVendorCode && me2kVendorCode !== fblVendorCode) continue;
                                    poStr = poStr || me2kPo;
                                    matchedCeco = me2kData.CostCenter;
                                    break;
                                }
                            }
                        }

                        const finalCeco = matchedCeco || String(row.cost_center || '').trim();
                        if (!finalCeco) continue; // Descarte estricto
                        if (!isAdmin && !authorizedCecos.has(finalCeco)) continue;

                        tvp.rows.add(
                            id,
                            finalCeco || null,
                            String(row.vendor_id || row.account || '').trim().substring(0, 150) || null,
                            String(row.document_number || '').trim().substring(0, 50) || null,
                            String(row.doc_type || '').trim().substring(0, 20) || null,
                            parseExcelDate(row.posting_date),
                            Number(row.amount_local) || Number(row.amount) || 0,
                            String(row.currency_local || row.currency || 'PEN').toUpperCase().substring(0, 10),
                            String(row.reference || '').trim().substring(0, 100) || null,
                            String(row.assignment || '').trim().substring(0, 100) || null,
                            String(row.description || row.text || row.header_text || '').trim().substring(0, 500) || null,
                            String(row.clearing_doc || '').trim().substring(0, 50) || null,
                            poStr || null
                        );
                    }
                    if (tvp.rows.length > 0) await bulkReq.bulk(tvp);
                }
            }

            // --- INTELIGENCIA DE AUTORREPARACIÓN DE CECOS FALTANTES (OBSERVACIÓN DEL USUARIO) ---
            // Una vez que el archivo se ha insertado, si es FBL1N o ME5A,
            // ejecutamos un UPDATE cruzando con ME2K o ME5K para rellenar los CostCenters vacíos.
            if (transaction_type === 'FBL1N') {
                await transaction.request().query(`
                    -- Deducir Cost Center cruzando con SAP_ME2K mediante PoNumber
                    UPDATE F
                    SET F.CostCenter = M.CostCenter
                    FROM EBM.SAP_FBL1N F
                    INNER JOIN EBM.SAP_ME2K M ON F.PoNumber = M.PoNumber
                    WHERE F.CostCenter IS NULL AND F.PoNumber IS NOT NULL;
                `);
            } else if (transaction_type === 'ME5A') {
                await transaction.request().query(`
                    -- Deducir Cost Center cruzando con SAP_ME5K (PR Number + Item)
                    UPDATE A
                    SET A.CostCenter = K.CostCenter
                    FROM EBM.SAP_ME5A A
                    INNER JOIN EBM.SAP_ME5K K ON A.PrNumber = K.PrNumber AND (A.PrItem = K.PrItem OR A.PrItem IS NULL)
                    WHERE A.CostCenter IS NULL AND A.PrNumber IS NOT NULL;

                    -- Si no encontro, buscar en ME2K mediante PO Number
                    UPDATE A
                    SET A.CostCenter = M.CostCenter
                    FROM EBM.SAP_ME5A A
                    INNER JOIN EBM.SAP_ME2K M ON A.PoNumber = M.PoNumber
                    WHERE A.CostCenter IS NULL AND A.PoNumber IS NOT NULL;
                `);
            }

            await transaction.commit();
            invalidateCrossReferenceCache();
            res.status(201).json({ message: 'Upload and structured data saved successfully' });
        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (error) {
        console.error('Error saving SAP upload:', error);
        if (error instanceof Error && error.message.includes('string or binary data would be truncated')) {
            return res.status(400).json({ error: 'Data is too large for the database column.' });
        }
        res.status(500).json({ error: 'Internal server error: ' + (safeError(error)) });
    }
});

// Delete specific upload (Cascade deletes SAPLineItems inherently)
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getDbConnection();
        await pool.request()
            .input('id', sql.NVarChar(50), req.params.id)
            .query(`DELETE FROM EBM.SAPUploads WHERE Id = @id`);

        invalidateCrossReferenceCache();
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting SAP upload:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clear all uploads
router.delete('/', async (req, res) => {
    try {
        const pool = await getDbConnection();
        await pool.request().query(`TRUNCATE TABLE EBM.SAPUploads`);
        // TRUNCATE las 5 Tablas Transaccionales
        await pool.request().query(`
            TRUNCATE TABLE EBM.SAP_ME2K;
            TRUNCATE TABLE EBM.SAP_ME5K;
            TRUNCATE TABLE EBM.SAP_ME5A;
            TRUNCATE TABLE EBM.SAP_KSB1;
            TRUNCATE TABLE EBM.SAP_FBL1N;
        `);
        invalidateCrossReferenceCache();
        res.status(204).send();
    } catch (error) {
        console.error('Error clearing SAP uploads:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const sapRouter = router;

