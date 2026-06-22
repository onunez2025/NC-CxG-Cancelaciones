# Gestión de Rechazo CxG & NC — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que cualquier usuario con permiso `cxg.cxg_nc.gestionar_rechazo` registre la gestión del rechazo con el cliente (resultado + observaciones) sobre solicitudes CxG/NC rechazadas por supervisor.

**Architecture:** Se reutilizan las columnas `Procesado_*` (vacías en registros rechazados) para almacenar la gestión del rechazo. Se corrige el orden del CASE SQL en 3 lugares críticos para que `Aprobado='false'` tenga prioridad. Nuevo endpoint `POST /api/cxg-nc/:id/gestionar-rechazo` protegido por permiso RBAC. Frontend: nuevo modal + acción en dropdown + sección en detalle.

**Tech Stack:** TypeScript, Express, mssql, React, TailwindCSS, componentes SIATC.

## Global Constraints

- Todos los `.input()` deben declarar tipo SQL explícito (CLAUDE.md §3).
- Nunca pasar `req.params` o `req.body` directamente sin tipo SQL.
- No agregar columnas a la base de datos.
- Solo aplica a rechazos de supervisor (`Aprobado='false'`), no rechazos de analista.
- El permiso RBAC se llama exactamente `cxg.cxg_nc.gestionar_rechazo`.

---

## Mapa de Archivos

| Archivo | Qué cambia |
|---|---|
| `server/routes/nc.ts` | Fix CASE order en 3 lugares + nuevo endpoint POST |
| `src/services/ncService.ts` | Nueva función `gestionarRechazoCxGNC` |
| `src/pages/cxg-nc/CxGNCPage.tsx` | Estado, handler, modal, acción dropdown, render columna procesado |
| `src/pages/cxg-nc/components/CxGNCDetailView.tsx` | Nueva prop `canGestionarRechazo` + `onGestionarRechazo`, nueva sección de rechazo gestionado |

---

## Task 1: Fix state machine SQL + nuevo endpoint backend

**Files:**
- Modify: `server/routes/nc.ts`

**Interfaces:**
- Produces: `POST /api/cxg-nc/:id/gestionar-rechazo` — body `{ motivo: string, observacion: string, gestionado_por: string }`, requiere permiso `cxg.cxg_nc.gestionar_rechazo`, responde `200 { message: string }` o `400/404/409`.

---

- [ ] **Step 1: Corregir el CASE en la BaseQuery CTE (GET /cxg-nc)**

En `server/routes/nc.ts`, busca el bloque dentro de `baseCte` que dice:
```sql
CASE 
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as estado,
```

Reemplázalo por (mueve RECHAZADO al primer lugar):
```sql
CASE 
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as estado,
```

- [ ] **Step 2: Corregir el CASE en el endpoint de detalle (GET /cxg-nc/:id)**

En el mismo archivo, dentro de la query del `router.get('/cxg-nc/:id', ...)`, busca:
```sql
CASE 
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as estado,
```

Reemplázalo por:
```sql
CASE 
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as estado,
```

- [ ] **Step 3: Corregir el CASE en el checkState del endpoint gestionar (POST /cxg-nc/:id/gestionar)**

En el `router.post('/cxg-nc/:id/gestionar', ...)`, busca su checkState query:
```sql
CASE 
    WHEN Procesado = 'true' THEN 'CERRADO'
    WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
    WHEN Aprobado = 'false' THEN 'RECHAZADO'
    WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as Estado_Proceso
```

Reemplázalo por:
```sql
CASE 
    WHEN Aprobado = 'false' THEN 'RECHAZADO'
    WHEN Procesado = 'true' THEN 'CERRADO'
    WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
    WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END as Estado_Proceso
```

Esto previene que el endpoint `gestionar` funcione sobre un registro rechazado+gestionado (que ahora tendría `Procesado_por` no nulo).

- [ ] **Step 4: Agregar el nuevo endpoint POST /cxg-nc/:id/gestionar-rechazo**

Pega este bloque completo inmediatamente después del cierre del endpoint `gestionar` (después del `});` que cierra `router.post('/cxg-nc/:id/gestionar', ...)`):

```typescript
// ─────────────────────────────────────────────
// CXG/NC: Gestionar Rechazo (Asesor informa al cliente)
// ─────────────────────────────────────────────

router.post('/cxg-nc/:id/gestionar-rechazo', verifyPermission('cxg.cxg_nc.gestionar_rechazo'), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { motivo, observacion, gestionado_por } = req.body;

        if (!motivo || !observacion) {
            return res.status(400).json({ error: 'Motivo y observación son requeridos.' });
        }

        const pool = await getDbConnection();
        const checkState = await pool.request()
            .input('id', sql.VarChar(255), id)
            .query(`
                SELECT 
                    CASE 
                        WHEN Aprobado = 'false' THEN 'RECHAZADO'
                        WHEN Procesado = 'true' THEN 'CERRADO'
                        WHEN Procesado_por IS NOT NULL AND Procesado_por <> '' THEN 'ASIGNADO'
                        WHEN Aprobado = 'true' THEN 'APROBADO_SUP'
                        ELSE 'REGISTRADO'
                    END as Estado_Proceso,
                    Procesado_por
                FROM [dbo].[GAC_APP_TB_CXG_NC]
                WHERE ID_Apro_CxG_NC = @id
            `);

        if (checkState.recordset.length === 0) {
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const { Estado_Proceso, Procesado_por } = checkState.recordset[0];

        if (Estado_Proceso !== 'RECHAZADO') {
            return res.status(400).json({ error: `Acción inválida. Estado actual: ${Estado_Proceso}. Se requiere: RECHAZADO.` });
        }
        if (Procesado_por) {
            return res.status(409).json({ error: 'Este rechazo ya fue gestionado.' });
        }

        const histId = Math.random().toString(16).substring(2, 10).toUpperCase();
        const userDisplayName = await getAuthenticatedUserDisplayName(req, gestionado_por);

        await pool.request()
            .input('id', sql.VarChar(255), id)
            .input('motivo', sql.VarChar(50), motivo)
            .input('observacion', sql.NVarChar(500), observacion)
            .input('gestionado_por', sql.VarChar(255), userDisplayName)
            .query(`
                UPDATE [dbo].[GAC_APP_TB_CXG_NC]
                SET 
                    Procesado_motivo   = @motivo,
                    Procesado_observacion = @observacion,
                    Procesado_por      = @gestionado_por,
                    Procesado_el       = GETDATE()
                WHERE ID_Apro_CxG_NC = @id
                  AND Aprobado = 'false'
                  AND (Procesado_por IS NULL OR Procesado_por = '')
            `);

        await pool.request()
            .input('histId', sql.VarChar(255), histId)
            .input('solicitud', sql.VarChar(255), id)
            .input('tipo', sql.VarChar(255), 'Gestión de Rechazo')
            .input('obs', sql.NVarChar(500), `${motivo} — ${observacion}`)
            .input('usuario', sql.VarChar(255), userDisplayName)
            .query(`
                INSERT INTO [dbo].[GAC_APP_TB_HISTOTIAL_APROB_CXG_NC]
                (ID_Historial_Apro_CxG_NC, Solicitud, Tipo, Observacion, Creado_el, Creado_por)
                VALUES (@histId, @solicitud, @tipo, @obs, GETDATE(), @usuario)
            `);

        res.json({ message: 'Gestión de rechazo registrada correctamente' });
    } catch (error: unknown) {
        res.status(500).json({ error: safeError(error) });
    }
});
```

- [ ] **Step 5: Agregar permiso a la base de datos**

Ejecuta este SQL en la base de datos para registrar el nuevo permiso (ajusta el nombre de la tabla si difiere):

```sql
-- Verificar tabla de permisos primero:
-- SELECT * FROM EBM.Permissions WHERE Name LIKE 'cxg.cxg_nc%'

INSERT INTO EBM.Permissions (Name, Description)
VALUES ('cxg.cxg_nc.gestionar_rechazo', 'Gestionar rechazo de solicitudes CxG/NC con el cliente');
```

Luego asigna el permiso a los roles correspondientes desde el RBAC de la aplicación.

- [ ] **Step 6: Verificar manualmente el endpoint**

Inicia el servidor con `npm run dev`. Con un registro en estado RECHAZADO (puedes verlo en la tabla `/cxg-nc`), haz el siguiente request usando Postman o curl (reemplaza `TOKEN` e `ID`):

```bash
curl -X POST http://localhost:3000/api/cxg-nc/CNC-XXXX/gestionar-rechazo \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"motivo":"ACEPTO","observacion":"El cliente fue contactado y aceptó el rechazo.","gestionado_por":"Test"}'
```

Resultado esperado: `200 { "message": "Gestión de rechazo registrada correctamente" }`.

Llama de nuevo al mismo endpoint. Resultado esperado: `409 { "error": "Este rechazo ya fue gestionado." }`.

- [ ] **Step 7: Commit**

```bash
git add server/routes/nc.ts
git commit -m "feat(cxg-nc): fix state machine CASE order + endpoint gestionar-rechazo"
```

---

## Task 2: Función de servicio en ncService.ts

**Files:**
- Modify: `src/services/ncService.ts`

**Interfaces:**
- Consumes: endpoint `POST /api/cxg-nc/:id/gestionar-rechazo` del Task 1.
- Produces: función `ncService.gestionarRechazoCxGNC(id, data)` → `Promise<void>`.

---

- [ ] **Step 1: Agregar la función `gestionarRechazoCxGNC`**

En `src/services/ncService.ts`, localiza la última función exportada del objeto `ncService` (probablemente `gestionarCxGNC` o `getEquipmentHistory`). Agrega esta función dentro del mismo objeto, antes del cierre `}`:

```typescript
async gestionarRechazoCxGNC(id: string, data: {
    motivo: 'ACEPTO' | 'RECLAMO' | 'ESCALADO';
    observacion: string;
    gestionado_por: string;
}): Promise<void> {
    await apiClient.post(`/api/cxg-nc/${id}/gestionar-rechazo`, data);
},
```

- [ ] **Step 2: Verificar que el archivo compila**

```bash
npx tsc --noEmit
```

Resultado esperado: sin errores de tipo.

- [ ] **Step 3: Commit**

```bash
git add src/services/ncService.ts
git commit -m "feat(cxg-nc): add gestionarRechazoCxGNC service function"
```

---

## Task 3: Modal + handler + lista en CxGNCPage.tsx

**Files:**
- Modify: `src/pages/cxg-nc/CxGNCPage.tsx`

**Interfaces:**
- Consumes: `ncService.gestionarRechazoCxGNC` del Task 2.
- Produces: estado `isGestionRechazaOpen`, handler `handleGestionarRechazo`, formulario `gestionRechazoForm`. Estos son pasados como props a `CxGNCDetailView` en Task 4.

---

- [ ] **Step 1: Agregar los imports necesarios**

En `CxGNCPage.tsx`, el import de lucide-react ya incluye `MessageSquare` o similar, pero para el botón de rechazo usaremos `PhoneCall`. Agrega `PhoneCall` al import existente de lucide-react:

```typescript
import { 
  // ... (imports existentes) ...
  PhoneCall,
} from 'lucide-react';
```

- [ ] **Step 2: Agregar estado del modal de gestión de rechazo**

Después del bloque `// Gestión state` (alrededor de la línea donde están `isGestionModalOpen`, `gestiónObs`, `gestiónResultado`), agrega:

```typescript
// Gestión de Rechazo state
const [isGestionRechazaOpen, setIsGestionRechazaOpen] = useState(false);
const [gestionRechazoForm, setGestionRechazoForm] = useState<{
  motivo: 'ACEPTO' | 'RECLAMO' | 'ESCALADO' | '';
  observacion: string;
}>({ motivo: '', observacion: '' });
```

- [ ] **Step 3: Agregar el handler `handleGestionarRechazo`**

Después de `handleGestionar`, agrega:

```typescript
const handleGestionarRechazo = async () => {
  if (!selectedRecord || !gestionRechazoForm.motivo || !gestionRechazoForm.observacion) return;
  setIsSubmitting(true);
  try {
    await ncService.gestionarRechazoCxGNC(selectedRecord.id, {
      motivo: gestionRechazoForm.motivo as 'ACEPTO' | 'RECLAMO' | 'ESCALADO',
      observacion: gestionRechazoForm.observacion,
      gestionado_por: user?.full_name || user?.username || 'Sistema'
    });

    await auditService.logAction({
      UsuarioID: user?.id || '0',
      UsuarioNombre: user?.username || 'Sistema',
      Accion: 'GESTIONAR_RECHAZO',
      Entidad: 'CXG_NC',
      EntidadID: selectedRecord.id,
      Detalle: `Rechazo gestionado con cliente. Solicitud ${selectedRecord.correlativo}. Resultado: ${gestionRechazoForm.motivo}. Obs: ${gestionRechazoForm.observacion}`
    });

    setIsGestionRechazaOpen(false);
    setGestionRechazoForm({ motivo: '', observacion: '' });
    fetchData();
    if (isDetailOpen && selectedRecord) {
      handleViewDetail(selectedRecord.id);
    }
  } catch (error) {
    console.error(error);
    toast.error('Error', 'No se pudo registrar la gestión del rechazo.');
  } finally {
    setIsSubmitting(false);
  }
};
```

- [ ] **Step 4: Actualizar el render de la columna `procesado` en la tabla**

Localiza el `case 'procesado':` dentro de `renderCellContent`. Actualmente es:

```typescript
case 'procesado': return (
  <div className="flex flex-col gap-1">
    <SIATCTooltip content={item.procesado_el ? fullDate(item.procesado_el) : 'Sin fecha'} position="bottom">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-xs">{item.procesado_el ? relativeDate(item.procesado_el) : '—'}</span>
      </div>
    </SIATCTooltip>
    <div className="flex flex-col gap-0.5">
      <SIATCBadge variant={item.procesado === 'true' ? 'success' : 'warning'}>
        {item.procesado === 'true' ? 'SÍ' : 'PENDIENTE'}
      </SIATCBadge>
      {item.procesado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.procesado_por}</span>}
    </div>
  </div>
);
```

Reemplázalo por:

```typescript
case 'procesado': return (
  <div className="flex flex-col gap-1">
    <SIATCTooltip content={item.procesado_el ? fullDate(item.procesado_el) : 'Sin fecha'} position="bottom">
      <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
        <Calendar className="w-3.5 h-3.5" />
        <span className="text-xs">{item.procesado_el ? relativeDate(item.procesado_el) : '—'}</span>
      </div>
    </SIATCTooltip>
    <div className="flex flex-col gap-0.5">
      {item.estado === 'RECHAZADO' ? (
        <SIATCBadge variant={item.procesado_por ? 'success' : 'secondary'}>
          {item.procesado_por ? 'Gestionado' : 'Sin gestionar'}
        </SIATCBadge>
      ) : (
        <SIATCBadge variant={item.procesado === 'true' ? 'success' : 'warning'}>
          {item.procesado === 'true' ? 'SÍ' : 'PENDIENTE'}
        </SIATCBadge>
      )}
      {item.procesado_por && <span className="text-[9px] text-muted-foreground/80 truncate max-w-[100px] italic">{item.procesado_por}</span>}
    </div>
  </div>
);
```

- [ ] **Step 5: Agregar la acción "Gestionar Rechazo" en el SIATCActionDropdown**

Localiza el array `actions={[...]}` del `SIATCActionDropdown` dentro del tbody. Después de la acción `'Gestionar Solicitud'`, agrega:

```typescript
{
  label: 'Gestionar Rechazo',
  icon: PhoneCall,
  onClick: () => {
    setSelectedRecord(item);
    setIsGestionRechazaOpen(true);
  },
  show: item.estado === 'RECHAZADO' && !item.procesado_por && hasPermission('cxg.cxg_nc.gestionar_rechazo')
},
```

- [ ] **Step 6: Agregar la acción en el detalle (props al CxGNCDetailView)**

Localiza el bloque `actions={{...}}` que se pasa a `<CxGNCDetailView`. Después de `canClone` / `onClone`, agrega:

```typescript
canGestionarRechazo: detailData?.estado === 'RECHAZADO' && !detailData?.procesado_por && hasPermission('cxg.cxg_nc.gestionar_rechazo'),
onGestionarRechazo: () => {
  setSelectedRecord(detailData);
  setIsGestionRechazaOpen(true);
},
```

- [ ] **Step 7: Agregar el modal "Gestionar Rechazo"**

Al final del JSX, después del modal de Gestionar (`</SIATCModalWrapper>` que cierra `isGestionModalOpen`) y antes del comentario de cierre, pega:

```tsx
{/* ─────────────────────────────────────────── */}
{/* Gestionar Rechazo Modal */}
{/* ─────────────────────────────────────────── */}
<SIATCModalWrapper
  isOpen={isGestionRechazaOpen}
  onClose={() => setIsGestionRechazaOpen(false)}
  title="Gestionar Rechazo con Cliente"
  subtitle={selectedRecord ? `${selectedRecord.tipo} #${selectedRecord.correlativo} — ${selectedRecord.cliente}` : ''}
  footer={
    <>
      <SIATCButton variant="ghost" onClick={() => setIsGestionRechazaOpen(false)}>Cancelar</SIATCButton>
      <SIATCButton
        variant="primary"
        icon={PhoneCall}
        onClick={handleGestionarRechazo}
        isLoading={isSubmitting}
        disabled={!gestionRechazoForm.motivo || !gestionRechazoForm.observacion}
      >
        Confirmar Gestión
      </SIATCButton>
    </>
  }
>
  <div className="space-y-4">
    <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800">
      <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Motivo del Rechazo (Supervisor)</p>
      <p className="text-sm font-bold text-foreground">{selectedRecord?.aprobado_motivo || '—'}</p>
      {selectedRecord?.aprobado_observacion && (
        <p className="text-xs text-muted-foreground mt-1">{selectedRecord.aprobado_observacion}</p>
      )}
    </div>

    <div>
      <label className="text-[10px] font-black uppercase text-muted-foreground mb-3 block tracking-widest pl-4">¿Cómo respondió el cliente?</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {([
          { value: 'ACEPTO',   label: 'Aceptó',    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-500/10' },
          { value: 'RECLAMO',  label: 'Reclamó',   activeClass: 'border-amber-500 bg-amber-50 text-amber-700 shadow-lg shadow-amber-500/10' },
          { value: 'ESCALADO', label: 'Se escaló', activeClass: 'border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-500/10' },
        ] as const).map(({ value, label, activeClass }) => (
          <button
            key={value}
            type="button"
            onClick={() => setGestionRechazoForm(f => ({ ...f, motivo: value }))}
            className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all font-bold text-sm ${
              gestionRechazoForm.motivo === value
                ? activeClass
                : 'border-border text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>

    <div>
      <label className="text-[10px] font-black uppercase text-muted-foreground mb-1.5 block tracking-widest pl-4">
        Observaciones <span className="text-rose-500 font-bold ml-1">(REQUERIDO)</span>
      </label>
      <textarea
        className={`${SIATC_THEME.COMPONENTS.INPUT} h-24 pt-2 resize-none`}
        placeholder="Describe la conversación con el cliente..."
        value={gestionRechazoForm.observacion}
        onChange={(e) => setGestionRechazoForm(f => ({ ...f, observacion: e.target.value }))}
      />
    </div>
  </div>
</SIATCModalWrapper>
```

- [ ] **Step 8: Verificar que compila sin errores de tipo**

```bash
npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 9: Commit**

```bash
git add src/pages/cxg-nc/CxGNCPage.tsx
git commit -m "feat(cxg-nc): modal gestionar rechazo + acción dropdown + badge lista"
```

---

## Task 4: Sección de rechazo gestionado en CxGNCDetailView.tsx

**Files:**
- Modify: `src/pages/cxg-nc/components/CxGNCDetailView.tsx`

**Interfaces:**
- Consumes: props `actions.canGestionarRechazo: boolean` y `actions.onGestionarRechazo: () => void` definidas en Task 3, y campos `procesado_por`, `procesado_el`, `procesado_motivo`, `procesado_observacion` del tipo `CxGNC` (ya existen).

---

- [ ] **Step 1: Agregar PhoneCall al import de lucide-react**

En `CxGNCDetailView.tsx`, la primera línea importa iconos de lucide-react. Agrega `PhoneCall` a ese import:

```typescript
import { Loader2, DollarSign, ShieldCheck, UserPlus, CheckCircle2, ArrowLeft, Wrench, XCircle, FileText, RefreshCw, PhoneCall } from 'lucide-react';
```

- [ ] **Step 2: Actualizar la interfaz de props**

Localiza la interfaz `CxGNCDetailViewProps` y su campo `actions`. Agrega las dos nuevas propiedades opcionales:

```typescript
actions?: {
  canApprove?: boolean;
  onApprove?: () => void;
  canAssign?: boolean;
  onAssign?: () => void;
  canManage?: boolean;
  onManage?: () => void;
  canClone?: boolean;
  onClone?: () => void;
  canGestionarRechazo?: boolean;    // NUEVO
  onGestionarRechazo?: () => void;  // NUEVO
};
```

- [ ] **Step 3: Agregar el botón en el header de acciones**

Dentro del bloque `<div className="flex items-center gap-2">` del header (donde están los otros botones de acción), después del botón `canClone`, agrega:

```tsx
{actions?.canGestionarRechazo && (
  <SIATCButton variant="info" size="sm" icon={PhoneCall} onClick={actions.onGestionarRechazo}>
    Gestionar Rechazo
  </SIATCButton>
)}
```

- [ ] **Step 4: Agregar la sección de gestión de rechazo en el cuerpo del detalle**

Localiza la sección de aprobación en el detalle (busca el texto `Aprobación del Supervisor` o similar en el JSX). Después de esa sección, agrega la sección condicional para gestión de rechazo:

```tsx
{/* Sección: Gestión del Rechazo */}
{detailData.estado === 'RECHAZADO' && (
  <div className={`p-4 rounded-xl border ${detailData.procesado_por ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800'}`}>
    <h3 className={`text-xs font-black uppercase tracking-widest mb-4 ${detailData.procesado_por ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
      Gestión con el Cliente
    </h3>
    {detailData.procesado_por ? (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase">Resultado</span>
          <span className={`text-sm font-black ${
            detailData.procesado_motivo === 'ACEPTO' ? 'text-emerald-600' :
            detailData.procesado_motivo === 'RECLAMO' ? 'text-amber-600' :
            'text-rose-600'
          }`}>
            {detailData.procesado_motivo === 'ACEPTO' ? 'Cliente Aceptó' :
             detailData.procesado_motivo === 'RECLAMO' ? 'Cliente Reclamó' :
             detailData.procesado_motivo === 'ESCALADO' ? 'Se Escaló' :
             detailData.procesado_motivo || '—'}
          </span>
        </div>
        <div className="flex justify-between items-start gap-4">
          <span className="text-xs font-bold text-muted-foreground uppercase shrink-0">Observaciones</span>
          <span className="text-xs text-foreground text-right">{detailData.procesado_observacion || '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase">Gestionado por</span>
          <span className="text-xs font-semibold">{detailData.procesado_por}</span>
        </div>
        {detailData.procesado_el && (
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-muted-foreground uppercase">Fecha</span>
            <span className="text-xs font-mono text-muted-foreground">
              {new Date(detailData.procesado_el).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-3 py-2">
        <p className="text-xs text-muted-foreground text-center">El rechazo aún no ha sido gestionado con el cliente.</p>
        {actions?.canGestionarRechazo && (
          <SIATCButton variant="info" size="sm" icon={PhoneCall} onClick={actions.onGestionarRechazo}>
            Gestionar Rechazo
          </SIATCButton>
        )}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 5: Verificar que compila sin errores de tipo**

```bash
npx tsc --noEmit
```

Resultado esperado: sin errores.

- [ ] **Step 6: Prueba manual en el navegador**

1. Abre la app (`npm run dev`).
2. Ve a CxG & NC.
3. Busca un registro con estado `RECHAZADO`.
4. Confirma que la columna "PROCESADO" muestra `Sin gestionar` (badge gris).
5. Abre el menú de acciones → confirma que aparece "Gestionar Rechazo".
6. Haz click → se abre el modal con el motivo del supervisor visible.
7. Selecciona un resultado, escribe observaciones → "Confirmar Gestión".
8. Verifica que la tabla se refresca y ahora muestra `Gestionado` (badge verde) en la columna PROCESADO.
9. Abre el detalle del mismo registro → la sección "Gestión con el Cliente" muestra resultado, observaciones, quién gestionó y cuándo.
10. Verifica que el botón "Gestionar Rechazo" ya no aparece (ni en detalle ni en dropdown).

- [ ] **Step 7: Commit**

```bash
git add src/pages/cxg-nc/components/CxGNCDetailView.tsx
git commit -m "feat(cxg-nc): sección gestión de rechazo en vista detalle"
```
