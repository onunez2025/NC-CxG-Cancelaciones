/**
 * fix_tienda_nc.ts
 * Diagnóstico y corrección de registros CxG/NC con tienda incorrecta.
 *
 * Uso:
 *   npx tsx fix_tienda_nc.ts           → solo reporta, no modifica nada
 *   npx tsx fix_tienda_nc.ts --fix     → corrige los registros con tienda incorrecta
 *
 * Requiere: C4C_BASE_URL, C4C_USER, C4C_PASSWORD en .env (o variables de entorno)
 */

import dotenv from 'dotenv';
dotenv.config();

import { getDbConnection } from './server/db.js';
import sql from 'mssql';

// ── Mapping OData SDK → nombre de tienda (misma tabla que nc.ts) ──────────────
const STORE_MAPPING: Record<string, string> = {
    "000000000000000000000000000000000000000000000000000000002995": "SODIMAC PERU S.A.",
    "000000000000000000000000000000000000000000000000000000002540": "TIENDAS VARIAS",
    "000000000000000000000000000000000000000000000000000000000003": "IMPORTACIONES HIRAOKA S.A.C.",
    "000000000000000000000000000000000000000000000000000000003381": "CASSINELLI S A",
    "000000000000000000000000000000000000000000000000000000002211": "PROMART - HOMECENTERS PERUANOS S.A.",
    "000000000000000000000000000000000000000000000000000000003005": "MAESTRO - TIENDA DEL MEJORAMIENTO DEL HOGAR S.A.",
    "000000000000000000000000000000000000000000000000000000001836": "TIENDAS PERUANAS SA - OECHSLE",
    "000000000000000000000000000000000000000000000000000000002548": "TIENDAS POR DEPARTAMENTO RIPLEY",
    "000000000000000000000000000000000000000000000000000000002295": "SAGA FALABELLA SA",
    "000000000000000000000000000000000000000000000000000000002444": "HIPERMERCADOS TOTTUS SA",
    "000000000000000000000000000000000000000000000000000000003978": "TIENDA SOLE CHORRILLOS",
    "000000000000000000000000000000000000000000000000000000003984": "TIENDA SOLE PRINCIPAL",
    "000000000000000000000000000000000000000000000000000000003990": "TIENDA SOLE SANTA ANITA",
    "000000000000000000000000000000000000000000000000000000003983": "TIENDA METUSA MALVINAS",
    "000000000000000000000000000000000000000000000000000000003970": "TIENDA SOLE AREQUIPA",
    "000000000000000000000000000000000000000000000000000000003981": "TIENDA SOLE BELLAVISTA",
    "000000000000000000000000000000000000000000000000000000003993": "TIENDA SOLE BOULEVAR ASIA",
    "000000000000000000000000000000000000000000000000000000003982": "TIENDA SOLE CHIMBOTE",
    "000000000000000000000000000000000000000000000000000000003969": "TIENDA SOLE MALL DEL SUR",
    "000000000000000000000000000000000000000000000000000000003975": "TIENDA SOLE CHICLAYO",
    "000000000000000000000000000000000000000000000000000000003973": "TIENDA SOLE MARSANO",
    "000000000000000000000000000000000000000000000000000000003986": "TIENDA SOLE PLAZA SAN MIGUEL",
    "000000000000000000000000000000000000000000000000000000003980": "TIENDA SOLE SAN JUAN LURIGANCHO",
    "000000000000000000000000000000000000000000000000000000003989": "TELEVENTAS SOLE",
    "000000000000000000000000000000000000000000000000000000003971": "TIENDA SOLE JOCKEY PLAZA",
    "000000000000000000000000000000000000000000000000000000003979": "TIENDA SOLE JOCKEY PLAZA",
    "000000000000000000000000000000000000000000000000000000003968": "TIENDA SOLE PLAZA NORTE",
    "000000000000000000000000000000000000000000000000000000003972": "TIENDA SOLE PURUCHUCO",
    "000000000000000000000000000000000000000000000000000000003977": "TIENDA SOLE SALAVERRY",
    "000000000000000000000000000000000000000000000000000000003963": "TIENDA SOLE MEGA PLAZA INDEPENDENCIA",
    "000000000000000000000000000000000000000000000000000000003964": "TIENDA SOLE PRIMAVERA",
    "000000000000000000000000000000000000000000000000000000003992": "TIENDA SOLE PIURA",
    "000000000000000000000000000000000000000000000000000000003974": "TIENDA SOLE PLAZA SAN MIGUEL",
    "000000000000000000000000000000000000000000000000000000003967": "TELEVENTAS SOLE",
};

function resolveStore(code: string | null | undefined): string {
    if (!code) return 'TIENDAS VARIAS';
    const c = code.toString().trim();
    if (STORE_MAPPING[c]) return STORE_MAPPING[c];
    if (c.startsWith('1301') || c.includes('2995')) return 'SODIMAC PERU S.A.';
    if (c.startsWith('1303') || c.includes('2211')) return 'PROMART - HOMECENTERS PERUANOS S.A.';
    if (/^[a-zA-Z]/i.test(c) && c !== 'null' && c !== 'undefined') return c;
    return 'TIENDAS VARIAS';
}

// ── OData ────────────────────────────────────────────────────────────────────
const C4C_BASE_URL = process.env.C4C_BASE_URL || process.env.SAP_BASE_URL || '';
const C4C_USER     = process.env.C4C_USER     || process.env.SAP_USER     || '';
const C4C_PASSWORD = process.env.C4C_PASSWORD || process.env.SAP_PASSWORD || '';

if (!C4C_BASE_URL || !C4C_USER || !C4C_PASSWORD) {
    console.error('❌ Faltan variables de entorno: C4C_BASE_URL, C4C_USER, C4C_PASSWORD');
    process.exit(1);
}

const AUTH_HEADER = 'Basic ' + Buffer.from(`${C4C_USER}:${C4C_PASSWORD}`).toString('base64');

async function resolveStoreFromOData(ticket: string): Promise<{ store: string | null; sdkCode: string | null }> {
    try {
        const url = `${C4C_BASE_URL}/ServiceRequestCollection?$filter=ID eq '${ticket}'&$format=json`;
        const res = await fetch(url, {
            headers: { 'Authorization': AUTH_HEADER, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return { store: null, sdkCode: null };
        const body = await res.json() as { d?: { results?: Array<{ zIDLugarCompra_SDK?: string }> } };
        const results = body?.d?.results || [];
        if (results.length === 0) return { store: null, sdkCode: null };
        const sdkCode = results[0].zIDLugarCompra_SDK || null;
        if (!sdkCode) return { store: null, sdkCode: null };
        const store = STORE_MAPPING[sdkCode] || null;
        return { store, sdkCode };
    } catch {
        return { store: null, sdkCode: null };
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const DRY_RUN = !process.argv.includes('--fix');

async function main() {
    console.log(`\n🔍 Diagnóstico tiendas CxG/NC — Junio 2026`);
    console.log(`   Modo: ${DRY_RUN ? 'SOLO LECTURA (agregar --fix para corregir)' : '⚠️  CORRECCIÓN ACTIVA'}\n`);

    const pool = await getDbConnection();

    const result = await pool.request().query(`
        SELECT
            n.ID_Apro_CxG_NC   AS id,
            n.Ticket            AS ticket,
            n.Tipo              AS tipo,
            n.Lugar_Compra      AS lugar_compra_bd,
            n.Creado_el         AS fecha,
            n.Creado_por        AS creado_por
        FROM [dbo].[GAC_APP_TB_CXG_NC] n
        WHERE YEAR(n.Creado_el) = 2026
          AND MONTH(n.Creado_el) = 6
        ORDER BY n.Creado_el DESC
    `);

    const records = result.recordset as Array<{
        id: string; ticket: string; tipo: string;
        lugar_compra_bd: string | null; fecha: Date; creado_por: string;
    }>;

    console.log(`📋 Total registros junio 2026: ${records.length}\n`);

    const stats = { correctos: 0, incorrectos: 0, sinDatoC4C: 0, sdkDesconocido: 0, corregidos: 0 };

    type Discrepancia = {
        ticket: string; tipo: string; fecha: string; creado_por: string;
        actual: string; correcto: string; sdkCode: string;
    };
    const discrepancias: Discrepancia[] = [];

    for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        const actual = resolveStore(rec.lugar_compra_bd);
        process.stdout.write(`  [${i + 1}/${records.length}] ${rec.tipo} #${rec.ticket} ... `);

        const { store: correcto, sdkCode } = await resolveStoreFromOData(rec.ticket);

        if (!sdkCode) {
            stats.sinDatoC4C++;
            console.log(`⚪ Sin código SDK en C4C`);
        } else if (!correcto) {
            stats.sdkDesconocido++;
            console.log(`🟡 SDK "${sdkCode}" desconocido — actual: "${actual}"`);
        } else if (actual === correcto) {
            stats.correctos++;
            console.log(`✅ OK (${actual})`);
        } else {
            stats.incorrectos++;
            console.log(`🔴 DISCREPANCIA: "${actual}" → debería ser "${correcto}"`);
            discrepancias.push({
                ticket: rec.ticket, tipo: rec.tipo,
                fecha: new Date(rec.fecha).toLocaleDateString('es-PE'),
                creado_por: rec.creado_por, actual, correcto, sdkCode,
            });

            if (!DRY_RUN) {
                await pool.request()
                    .input('id',           sql.VarChar(255), rec.id)
                    .input('lugar_compra', sql.VarChar(255), correcto)
                    .query(`
                        UPDATE [dbo].[GAC_APP_TB_CXG_NC]
                        SET Lugar_Compra = @lugar_compra
                        WHERE ID_Apro_CxG_NC = @id
                    `);
                stats.corregidos++;
                console.log(`    ✏️  → Actualizado en BD`);
            }
        }

        // Pausa para no saturar C4C
        await new Promise(r => setTimeout(r, 250));
    }

    // ── Resumen ──
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`📊 RESUMEN — Junio 2026`);
    console.log(`   Total analizados     : ${records.length}`);
    console.log(`   ✅ Tienda correcta   : ${stats.correctos}`);
    console.log(`   🔴 Tienda incorrecta : ${stats.incorrectos}`);
    console.log(`   ⚪ Sin dato en C4C   : ${stats.sinDatoC4C}`);
    console.log(`   🟡 SDK desconocido   : ${stats.sdkDesconocido}`);
    if (!DRY_RUN) console.log(`   ✏️  Corregidos        : ${stats.corregidos}`);

    if (discrepancias.length > 0) {
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`🔴 REGISTROS CON TIENDA INCORRECTA:\n`);
        console.log(`  ${'TICKET'.padEnd(12)} ${'TIPO'.padEnd(5)} ${'FECHA'.padEnd(12)} ${'ACTUAL'.padEnd(30)} ${'CORRECTO'}`);
        console.log(`  ${'─'.repeat(90)}`);
        for (const d of discrepancias) {
            console.log(`  ${d.ticket.padEnd(12)} ${d.tipo.padEnd(5)} ${d.fecha.padEnd(12)} ${d.actual.padEnd(30)} ${d.correcto}`);
        }

        if (DRY_RUN) {
            console.log(`\n  Para corregir estos ${discrepancias.length} registro(s), ejecuta:`);
            console.log(`  npx tsx fix_tienda_nc.ts --fix\n`);
        }
    }

    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Error fatal:', err instanceof Error ? err.message : err);
    process.exit(1);
});
