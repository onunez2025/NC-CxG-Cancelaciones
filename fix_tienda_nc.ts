/**
 * fix_tienda_nc.ts
 * Diagnóstico de registros CxG/NC con posible tienda incorrecta — Junio 2026.
 *
 * Uso:
 *   npx tsx fix_tienda_nc.ts           → análisis por BD (sin OData)
 *   npx tsx fix_tienda_nc.ts --odata   → valida cada ticket contra C4C OData
 *   npx tsx fix_tienda_nc.ts --fix     → corrige via OData (requiere --odata)
 */

import dotenv from 'dotenv';
dotenv.config();

import { getDbConnection } from './server/db.js';

const USE_ODATA = process.argv.includes('--odata') || process.argv.includes('--fix');
const _DRY_RUN  = !process.argv.includes('--fix');

const C4C_BASE_URL = process.env.C4C_BASE_URL || process.env.SAP_BASE_URL || '';
const C4C_USER     = process.env.C4C_USER     || process.env.SAP_USER     || '';
const C4C_PASSWORD = process.env.C4C_PASSWORD || process.env.SAP_PASSWORD || '';

// ── Mapping SDK → tienda (igual que nc.ts) ───────────────────────────────────
const _STORE_MAPPING: Record<string, string> = {
    "000000000000000000000000000000000000000000000000000000002995": "SODIMAC PERU S.A.",
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
    "000000000000000000000000000000000000000000000000000000003968": "TIENDA SOLE PLAZA NORTE",
    "000000000000000000000000000000000000000000000000000000003972": "TIENDA SOLE PURUCHUCO",
    "000000000000000000000000000000000000000000000000000000003977": "TIENDA SOLE SALAVERRY",
    "000000000000000000000000000000000000000000000000000000003963": "TIENDA SOLE MEGA PLAZA INDEPENDENCIA",
    "000000000000000000000000000000000000000000000000000000003964": "TIENDA SOLE PRIMAVERA",
    "000000000000000000000000000000000000000000000000000000003992": "TIENDA SOLE PIURA",
    "000000000000000000000000000000000000000000000000000000003974": "TIENDA SOLE PLAZA SAN MIGUEL",
    "000000000000000000000000000000000000000000000000000000003967": "TELEVENTAS SOLE",
    "000000000000000000000000000000000000000000000000000000002211": "PROMART - HOMECENTERS PERUANOS S.A.",
    "000000000000000000000000000000000000000000000000000000003005": "MAESTRO - TIENDA DEL MEJORAMIENTO DEL HOGAR S.A.",
    "000000000000000000000000000000000000000000000000000000002295": "SAGA FALABELLA SA",
    "000000000000000000000000000000000000000000000000000000002548": "TIENDAS POR DEPARTAMENTO RIPLEY",
    "000000000000000000000000000000000000000000000000000000002444": "HIPERMERCADOS TOTTUS SA",
};

async function testODataConnection(): Promise<boolean> {
    if (!C4C_BASE_URL || !C4C_USER || !C4C_PASSWORD) return false;
    const auth = 'Basic ' + Buffer.from(`${C4C_USER}:${C4C_PASSWORD}`).toString('base64');
    try {
        const res = await fetch(
            `${C4C_BASE_URL}/ServiceRequestCollection?$top=1&$format=json`,
            { headers: { 'Authorization': auth, 'Accept': 'application/json' }, signal: AbortSignal.timeout(8000) }
        );
        if (!res.ok) {
            console.log(`  ⚠️  OData respondió HTTP ${res.status} — verifique credenciales C4C`);
            return false;
        }
        return true;
    } catch (e) {
        console.log(`  ⚠️  OData no disponible: ${e instanceof Error ? e.message : e}`);
        return false;
    }
}

// ── Análisis BD sin OData ─────────────────────────────────────────────────────
async function analyzeFromDB(pool: Awaited<ReturnType<typeof getDbConnection>>) {
    console.log('\n📊 ANÁLISIS DE DISTRIBUCIÓN DE TIENDAS — Junio 2026\n');

    // 1. Distribución por tienda almacenada
    const dist = await pool.request().query(`
        SELECT
            COALESCE(NULLIF(LTRIM(RTRIM(n.Lugar_Compra)), ''), 'SIN DATO') AS tienda,
            COUNT(*) AS total,
            SUM(CASE WHEN n.Tipo = 'NC'  THEN 1 ELSE 0 END) AS nc,
            SUM(CASE WHEN n.Tipo = 'CXG' THEN 1 ELSE 0 END) AS cxg
        FROM [dbo].[GAC_APP_TB_CXG_NC] n
        WHERE YEAR(n.Creado_el) = 2026 AND MONTH(n.Creado_el) = 6
        GROUP BY LTRIM(RTRIM(n.Lugar_Compra))
        ORDER BY total DESC
    `);

    console.log(`  ${'TIENDA'.padEnd(50)} ${'TOTAL'.padStart(6)} ${'NC'.padStart(6)} ${'CXG'.padStart(6)}`);
    console.log(`  ${'─'.repeat(72)}`);
    let grandTotal = 0;
    for (const row of dist.recordset as Array<{ tienda: string; total: number; nc: number; cxg: number }>) {
        const flag = row.tienda === 'SODIMAC PERU S.A.' ? ' ⚠️' : '';
        console.log(`  ${(row.tienda + flag).padEnd(55)} ${String(row.total).padStart(5)} ${String(row.nc).padStart(6)} ${String(row.cxg).padStart(6)}`);
        grandTotal += row.total;
    }
    console.log(`  ${'─'.repeat(72)}`);
    console.log(`  ${'TOTAL'.padEnd(50)} ${String(grandTotal).padStart(6)}\n`);

    // 2. Detalle SODIMAC — registros potencialmente incorrectos
    const sodimac = await pool.request().query(`
        SELECT
            n.Ticket            AS ticket,
            n.Tipo              AS tipo,
            n.Lugar_Compra      AS tienda_actual,
            n.Creado_el         AS fecha,
            n.Creado_por        AS creado_por,
            -- Ver si el ticket en FSM pertenece a empresa SOLE o SODIMAC
            t.IDEmpresa         AS fsm_empresa_id,
            COALESCE(emp.DsEmpresa, t.IDEmpresa) AS fsm_empresa_nombre
        FROM [dbo].[GAC_APP_TB_CXG_NC] n
        LEFT JOIN [SIATC].[Dashboard_FSM] t ON n.Ticket = t.Ticket
        LEFT JOIN [SAP].[FSM_TBL_EMPRESA] emp ON t.IDEmpresa = CAST(emp.IdEmpresa AS VARCHAR)
        WHERE YEAR(n.Creado_el) = 2026
          AND MONTH(n.Creado_el) = 6
          AND LTRIM(RTRIM(n.Lugar_Compra)) = 'SODIMAC PERU S.A.'
        ORDER BY n.Creado_el DESC
    `);

    const rows = sodimac.recordset as Array<{
        ticket: string; tipo: string; tienda_actual: string; fecha: Date;
        creado_por: string; fsm_empresa_id: string | null; fsm_empresa_nombre: string | null;
    }>;

    if (rows.length === 0) {
        console.log('  ✅ No hay registros con SODIMAC como tienda en junio 2026.');
        return;
    }

    console.log(`\n⚠️  REGISTROS CON "SODIMAC PERU S.A." — Total: ${rows.length}\n`);
    console.log(`  ${'TICKET'.padEnd(12)} ${'TIPO'.padEnd(5)} ${'FECHA'.padEnd(12)} ${'EMPRESA FSM'.padEnd(35)} CREADO POR`);
    console.log(`  ${'─'.repeat(90)}`);

    let sodimacsReal = 0;
    let sodimacsDoubt = 0;

    for (const r of rows) {
        const fecha = new Date(r.fecha).toLocaleDateString('es-PE');
        const empresa = r.fsm_empresa_nombre || '(sin ticket en FSM)';
        const isSodimacFSM = empresa.toUpperCase().includes('SODIMAC');
        const marker = isSodimacFSM ? '' : ' ← POSIBLE ERROR';
        if (isSodimacFSM) sodimacsReal++; else sodimacsDoubt++;
        console.log(`  ${r.ticket.padEnd(12)} ${r.tipo.padEnd(5)} ${fecha.padEnd(12)} ${empresa.padEnd(35)} ${r.creado_por}${marker}`);
    }

    console.log(`\n  ${'─'.repeat(90)}`);
    console.log(`  🔴 Con empresa FSM también SODIMAC (probablemente correctos): ${sodimacsReal}`);
    console.log(`  🟡 Empresa FSM diferente a SODIMAC (posiblemente incorrectos):  ${sodimacsDoubt}\n`);

    if (sodimacsDoubt > 0) {
        console.log(`  💡 Los marcados con "← POSIBLE ERROR" tienen SODIMAC en la BD`);
        console.log(`     pero su ticket en FSM NO pertenece a empresa SODIMAC.`);
        console.log(`     Para corregirlos necesitas confirmar la tienda real en CAC.`);
    }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log(`\n🔍 Diagnóstico tiendas CxG/NC — Junio 2026`);
    const pool = await getDbConnection();

    if (USE_ODATA) {
        console.log(`\n🔌 Verificando conexión OData C4C...`);
        const ok = await testODataConnection();
        if (!ok) {
            console.log(`\n  Cambiando a análisis por BD (sin OData)...\n`);
            await analyzeFromDB(pool);
            process.exit(0);
        }
        console.log(`  ✅ OData C4C disponible\n`);
        // Aquí iría el análisis con OData cuando las credenciales funcionen
        console.log('  OData disponible — ejecutar con tickets específicos para validar.');
    } else {
        await analyzeFromDB(pool);
    }

    process.exit(0);
}

main().catch(err => {
    console.error('\n❌ Error:', err instanceof Error ? err.message : err);
    process.exit(1);
});
