# Spec: Gestión de Rechazo en CxG & NC

**Fecha:** 2026-06-22  
**Módulo:** CxG & NC (`/cxg-nc`)  
**Autor:** onunez

---

## Problema

Cuando un supervisor rechaza una solicitud de CxG o NC, el registro queda en estado `RECHAZADO` pero no existe ningún mecanismo para registrar si el asesor contactó al cliente y le explicó el motivo del rechazo. No hay trazabilidad de esa gestión.

## Objetivo

Permitir que un asesor (o cualquier usuario con permiso RBAC) registre la gestión del rechazo con el cliente: resultado de la conversación y observaciones. El sistema debe mostrar si un rechazo fue gestionado o está pendiente.

## Alcance

- **Incluido:** Rechazos por supervisor (`Aprobado='false'`, estado `RECHAZADO`).
- **Excluido:** Rechazos por analista en el paso "Gestionar" — esas columnas ya tienen datos del analista y están fuera de este scope.

---

## Diseño

### Sin cambios al schema de base de datos

Las columnas `Procesado_*` en `GAC_APP_TB_CXG_NC` están siempre vacías para registros con `Aprobado='false'` (nunca llegan al paso de gestión). Se reutilizan:

| Columna | Nuevo uso para rechazo |
|---|---|
| `Procesado_por` | Usuario que gestionó el rechazo con el cliente |
| `Procesado_el` | Fecha y hora de la gestión |
| `Procesado_motivo` | Resultado: `ACEPTO` / `RECLAMO` / `ESCALADO` |
| `Procesado_observacion` | Comentarios libres del asesor |

**Criterio de "gestionado":** `Aprobado = 'false'` AND `Procesado_por IS NOT NULL`.

### Fix al state machine SQL (crítico)

El CASE actual evalúa `Procesado_por IS NOT NULL` antes que `Aprobado='false'`, lo que haría que al guardar la gestión el estado cambie erróneamente a `ASIGNADO`. Se corrige el orden en los 3 lugares donde aparece en `server/routes/nc.ts`:

```sql
-- ANTES (orden incorrecto)
CASE 
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END

-- DESPUÉS (orden correcto)
CASE 
    WHEN n.Aprobado = 'false' THEN 'RECHAZADO'
    WHEN n.Procesado = 'true' THEN 'CERRADO'
    WHEN n.Procesado_por IS NOT NULL AND n.Procesado_por <> '' THEN 'ASIGNADO'
    WHEN n.Aprobado = 'true' THEN 'APROBADO_SUP'
    ELSE 'REGISTRADO'
END
```

Los 3 lugares afectados:
1. `GET /cxg-nc` — BaseQuery CTE
2. `GET /cxg-nc/unique-values` — columnMap estado
3. `GET /cxg-nc/:id` — query detalle

### Nuevo endpoint backend

```
POST /api/cxg-nc/:id/gestionar-rechazo
Permiso requerido: cxg.cxg_nc.gestionar_rechazo
```

**Validaciones:**
- El registro debe existir y tener `Aprobado='false'` (es un rechazo de supervisor).
- `Procesado_por` debe ser NULL (no se puede gestionar dos veces).
- `motivo` y `observacion` son requeridos.

**Acción SQL:**
```sql
UPDATE [dbo].[GAC_APP_TB_CXG_NC]
SET 
    Procesado_motivo = @motivo,
    Procesado_observacion = @observacion,
    Procesado_por = @gestionado_por,
    Procesado_el = GETDATE()
WHERE ID_Apro_CxG_NC = @id
  AND Aprobado = 'false'
  AND (Procesado_por IS NULL OR Procesado_por = '')
```

**Body:**
```json
{
  "motivo": "ACEPTO" | "RECLAMO" | "ESCALADO",
  "observacion": "string (requerido)",
  "gestionado_por": "string"
}
```

**Tipos SQL (cumple CLAUDE.md §3):**
- `@id`: `sql.VarChar(255)`
- `@motivo`: `sql.VarChar(50)`
- `@observacion`: `sql.NVarChar(500)`
- `@gestionado_por`: `sql.VarChar(255)`

**Respuesta:** `200 OK` con el registro actualizado.

**Audit log:** Se registra en `auditService` con acción `'GESTIONAR_RECHAZO'`.

### Nuevo permiso RBAC

`cxg.cxg_nc.gestionar_rechazo` — se agrega a la tabla de permisos. El admin asigna este permiso en el RBAC a los roles que corresponda.

### Cambios frontend

#### `ncService.ts`

Nueva función:
```typescript
gestionarRechazoCxGNC(id: string, data: {
  motivo: 'ACEPTO' | 'RECLAMO' | 'ESCALADO';
  observacion: string;
  gestionado_por: string;
}): Promise<void>
```

El tipo `CxGNC` ya incluye `procesado_motivo`, `procesado_por`, `procesado_el`, `procesado_observacion` — sin cambios al tipo.

#### `CxGNCPage.tsx`

1. **Estado local nuevo:**
   ```typescript
   const [isGestionRechazaOpen, setIsGestionRechazaOpen] = useState(false);
   const [gestionRechazoForm, setGestionRechazoForm] = useState({ 
     motivo: '' as 'ACEPTO' | 'RECLAMO' | 'ESCALADO' | '', 
     observacion: '' 
   });
   ```

2. **Handler `handleGestionarRechazo`:** llama a `ncService.gestionarRechazoCxGNC`, registra audit log, cierra modal, refresca datos.

3. **Action dropdown:** agrega acción `"Gestionar Rechazo"` visible cuando:
   - `item.estado === 'RECHAZADO'`
   - `!item.procesado_por` (no gestionado aún)
   - `hasPermission('cxg.cxg_nc.gestionar_rechazo')`

4. **Columna `procesado` en tabla:** para filas con `estado === 'RECHAZADO'`:
   - Si `procesado_por` tiene valor → badge verde `"Gestionado"`
   - Si no → badge gris `"Sin gestionar"`
   - Para filas no rechazadas → comportamiento actual (`SÍ` / `PENDIENTE`)

5. **Modal "Gestionar Rechazo":** nuevo `SIATCModalWrapper` con:
   - Resumen del registro (tipo, correlativo, cliente, motivo del rechazo del supervisor)
   - Selector de resultado: `CLIENTE ACEPTÓ` / `CLIENTE RECLAMÓ` / `SE ESCALÓ`
   - Textarea de observaciones (obligatorio)
   - Botón confirmar deshabilitado hasta que ambos campos estén completos

#### `CxGNCDetailView.tsx`

Nueva sección en la vista de detalle para registros `RECHAZADO`:
- Si `procesado_por` tiene valor: muestra tarjeta con resultado, observaciones, quién gestionó y cuándo.
- Si no: muestra botón "Gestionar Rechazo" (si el usuario tiene permiso).

La acción `onGestionarRechazo` se pasa desde `CxGNCPage` como parte del objeto `actions`, igual que las otras acciones existentes.

---

## Flujo completo

```
REGISTRADO
    → [Supervisor evalúa]
    → RECHAZADO (Aprobado='false')
        → [Asesor gestiona rechazo con cliente]  ← NUEVO
            → RECHAZADO + Procesado_por/motivo/obs/el  ← NUEVO
```

---

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| `server/routes/nc.ts` | Fix state machine (3 CASE), nuevo endpoint POST gestionar-rechazo |
| `src/services/ncService.ts` | Nueva función `gestionarRechazoCxGNC`, tipo `CxGNC` actualizado |
| `src/pages/cxg-nc/CxGNCPage.tsx` | Estado, handler, modal, action dropdown, columna procesado |
| `src/pages/cxg-nc/components/CxGNCDetailView.tsx` | Sección de gestión de rechazo, prop onGestionarRechazo |

---

## No se toca

- Schema de base de datos (sin ALTER TABLE).
- Tabla de historial (`GAC_APP_TB_HISTOTIAL_APROB_CXG_NC`).
- Flujo de rechazo por analista (fuera de scope).
- Módulo de Cancelaciones.
