# SIATC UI MOLD — Biblia de Diseño del Ecosistema v2.0 (Platinum)

> **DOCUMENTO DE REFERENCIA ESTRICTO**
> Este archivo es la fuente de verdad para toda implementación UI en el ecosistema SIATC.
> Cualquier componente nuevo DEBE cumplir con las reglas aquí descritas.
> Última actualización: Abril 2026

---

## 1. PRINCIPIOS FUNDAMENTALES

| Principio | Descripción |
|-----------|-------------|
| **Una sola fuente** | Todo valor de espaciado, color o tipografía debe provenir de `siatc-theme.ts`. Prohibido usar clases Tailwind "ad-hoc" en estilos estructurales. |
| **Componentes bloqueados** | Los componentes del directorio `src/components/siatc/` son inmutables en su estructura base. Solo se usa `className` para ajustes contextuales menores. |
| **Densidad Premium** | La interfaz debe ser densa pero no apretada: `px-6 py-4` en celdas, `h-12` en inputs de modal. |
| **Paridad Total** | El módulo de Configuración (Usuarios, Roles, Auditoría) debe ser **pixel-perfect idéntico** en todas las aplicaciones del ecosistema. |

---

## 2. TOKENS DE DECISIÓN (CAPA A)

Referencia a `src/utils/siatc-theme.ts`. Los valores clave son:

### 2.1 Shapes (Redondez)
| Token | Valor | Uso |
|-------|-------|-----|
| `MASTER_ROUNDNESS` | `rounded-[2rem]` | Contenedores principales, tarjetas, modales |
| `COMPONENT_ROUNDNESS` | `rounded-xl` | Botones, inputs, badges de tamaño normal |
| `BUTTON_ROUNDNESS` | `rounded-xl` | Todos los botones sin excepción |

### 2.2 Fondos y Efectos
| Token | Valor | Uso |
|-------|-------|-----|
| `SIDEBAR_BG` | `bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl` | Fondo del Sidebar en TODOS los proyectos |
| `MODAL_OVERLAY` | `bg-slate-900/60 backdrop-blur-md` | Fondo de overlay de modales |
| `GLASS_PANEL` | `bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl` | Header global y paneles flotantes |
| `MASTER_SHADOW` | `shadow-xl shadow-slate-200/20 dark:shadow-none` | Sombra de contenedores principales |

### 2.3 Interacción
| Token | Valor | Uso |
|-------|-------|-----|
| `TABLE_ROW_HOVER` | `hover:bg-primary/5` | Hover de filas de tabla. NUNCA `hover:bg-muted/30`. |

---

## 3. TIPOGRAFÍA (ESCALA FIJA)

**Fuente obligatoria:** Lato (importada vía Google Fonts en `index.html`).

| Nivel | Token / Clase | Tamaño | Peso | Uso |
|-------|--------------|--------|------|-----|
| **H1 / Page Title** | `SIATC_THEME.TYPOGRAPHY.PAGE_TITLE` | `text-2xl` | `font-black` | Título principal de cada página (uno solo por página) |
| **H2 / Section Title** | `SIATC_THEME.TYPOGRAPHY.SECTION_TITLE` | `text-base` | `font-black` | Títulos de sección en sidebar y tarjetas |
| **Body** | `text-sm font-medium` | `text-sm` | `font-medium` | Texto de celdas y párrafos |
| **Caption / Subtitle** | `SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE` | `text-sm` | `font-medium` | Descripción bajo el título principal |
| **Tiny / Mono** | `SIATC_THEME.TYPOGRAPHY.TINY_MONO` | `text-[10px]` | `font-black` | IDs, fechas, etiquetas técnicas |
| **Table Header** | `SIATC_THEME.TABLE.HEADER_TH` | `text-[13px]` | `font-black uppercase` | Encabezados de columnas de tabla |
| **Badge** | `SIATC_THEME.TYPOGRAPHY.BADGE_TEXT` | `text-[10px]` | `font-black uppercase` | Texto dentro de badges de estado |
| **Footer Stats** | `SIATC_THEME.TYPOGRAPHY.FOOTER_STATS` | `text-[10px]` | `font-black uppercase` | "Total de registros" |

> ⚠️ **PROHIBIDO:** `font-semibold` en títulos de página o headers de tabla. Siempre `font-black` para etiquetas de UI, `font-medium` para texto de datos.

---

## 4. SISTEMA DE COLORES DE ESTADO

Todos los badges de estado DEBEN usar `<SIATCBadge variant="...">`.

| Estado | Variante | Color Principal |
|--------|----------|-----------------|
| Activo / Éxito | `success` | Emerald-500 |
| Advertencia | `warning` | Amber-500 |
| Error / Inactivo | `error` o `danger` | Rose-500 |
| Información | `info` | Blue-500 |
| Acento Primario | `primary` | Color primario del tema |
| Neutro | `secondary` | Slate-400 |

---

## 5. COMPONENTES DE INTERACCIÓN

### 5.1 Botones (`<SIATCButton>`)
| Variante | Cuándo usar |
|----------|-------------|
| `primary` | Acción principal (Crear, Guardar, Confirmar) |
| `secondary` | Acciones secundarias (Cancelar, Volver) |
| `success` | Confirmación de acciones positivas (Aprobar) |
| `danger` | Acciones destructivas (Eliminar, Revocar) |
| `info` | Acciones informativas (Ver detalles, Exportar) |
| `ghost` | Acciones terciarias en toolbars |

**Tamaños:**
- `sm`: Acciones dentro de celdas de tabla
- `md` (default): Acciones en headers de sección
- `lg`: CTAs principales en pantallas de bienvenida

### 5.2 Inputs en Modales
- **Altura obligatoria:** `h-12` — Siempre usar `SIATC_THEME.COMPONENTS.INPUT`
- **Wrapper:** Icon a la izquierda con `pl-10`
- **Siempre dentro de** `<SIATCModalWrapper>`

### 5.3 Modales (`<SIATCModalWrapper>`)
- `rounded-[2rem]` forzado
- `p-8` de padding interno
- Footer del modal con `border-t` y `justify-end`
- Cierre con clic en overlay y tecla `Escape`

---

## 6. TABLAS

### 6.1 Estructura Obligatoria
```tsx
<div className={SIATC_THEME.LAYOUT.CONTENT_CONTAINER}>
    {/* Toolbar */}
    <div className="px-6 py-5 border-b border-border flex items-center justify-between gap-4">
        <h2>{title}</h2>
        <SIATCButton variant="primary" icon={Plus}>Nuevo</SIATCButton>
    </div>
    {/* Área de scroll */}
    <SIATCTable>
        <thead>
            <tr className={SIATC_THEME.TABLE.HEADER_ROW}>
                <SIATCTableHeader>COLUMNA</SIATCTableHeader>
            </tr>
        </thead>
        <tbody>
            <SIATCTableRow>
                <SIATCTableCell>Dato</SIATCTableCell>
            </SIATCTableRow>
        </tbody>
    </SIATCTable>
    {/* Footer con total y paginación */}
    <SIATCTableFooter totalRecords={n} />
</div>
```

### 6.2 Reglas de Tablas
- Encabezados de columna: **SIEMPRE en MAYÚSCULAS** (se aplica con `uppercase` vía token)
- Nombres de usuario, empresas, datos: **Title Case** (primera letra mayúscula)
- IDs técnicos / códigos: usar `SIATC_THEME.TYPOGRAPHY.TINY_MONO`
- Placeholder de búsqueda: **SIEMPRE** `"Buscar por nombre, usuario o email..."`

---

## 7. LAYOUT GLOBAL

### 7.1 Sidebar
- Ancho: `w-72` (288px) en TODAS las aplicaciones
- Fondo: `SIATC_TOKENS.SIDEBAR_BG` + `rounded-[2.5rem]` con `border` y `shadow-2xl`
- Ítem activo: `bg-primary text-primary-foreground shadow-sm rounded-xl`
- Ítem hover: `hover:bg-primary/5 hover:text-primary rounded-xl`
- Logout: `text-rose-500 hover:bg-rose-500/10`

### 7.2 Header Global
- Altura: `h-20` en TODAS las aplicaciones
- Fondo: Glassmorphism (`SIATC_THEME.EFFECTS.GLASS_PANEL`)
- Ordenamiento de elementos (DE IZQ. A DER.): Logo + Nombre App → [Espacio] → Tema toggle → Config Gear → AppSwitcher → [Separador] → Avatar + Username
- Avatar: Gradiente primario con `ring-2 ring-white dark:ring-slate-900`
- Username: Visible en `md:` screens y superiores

### 7.3 Área de Contenido Principal
- Padding: `px-8 pb-8`
- Max width: `max-w-[1600px]`

---

## 8. ICONOGRAFÍA (LUCIDE-REACT)

| Función | Ícono | Tamaño |
|---------|-------|--------|
| Configuración del sistema | `Settings` | `w-5 h-5` |
| Usuarios | `Users` | `w-4 h-4` |
| Roles | `Shield` | `w-4 h-4` |
| Auditoría / Bitácora | `BookOpen` | `w-4 h-4` |
| Nuevo ítem | `Plus` | `w-4 h-4` |
| Editar | `Pencil` | `w-3.5 h-3.5` |
| Eliminar | `Trash2` | `w-3.5 h-3.5` |
| Buscar | `Search` | `w-4 h-4` |
| Refrescar | `RefreshCw` | `w-4 h-4` |
| Cerrar / Limpiar | `X` | `w-4 h-4` |
| Rol activo / ID | `Activity` | `w-3 h-3` (alineado al `text-center`) |

> ⚠️ El ícono `Activity` SIEMPRE se centra verticalmente con `items-center` en un `flex` container.

---

## 9. ANIMACIONES Y TRANSICIONES

| Elemento | Animación |
|----------|-----------|
| Carga de página | `animate-in fade-in duration-500` |
| Apertura de modal | `animate-in zoom-in-95 slide-in-from-bottom-4 duration-300` |
| Overlay de modal | `animate-in fade-in duration-200` |
| Header al cargar | `animate-in fade-in slide-in-from-right-4 duration-700` |
| Spinner de carga | `animate-spin` con `border-t-transparent` |
| Indicador activo | `animate-pulse` (solo para puntos de estado "live") |

---

## 10. CHECKLIST DE CUMPLIMIENTO (Por vista nueva)

Antes de considerar una vista como "homologada SIATC Platinum", verificar:

- [ ] Título de página usando `SIATC_THEME.TYPOGRAPHY.PAGE_TITLE`
- [ ] Subtítulo usando `SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE`
- [ ] Contenedor principal usando `SIATC_THEME.LAYOUT.CONTENT_CONTAINER`
- [ ] Tabla usando `SIATCTable`, `SIATCTableRow`, `SIATCTableCell`, `SIATCTableHeader`
- [ ] Footer con `SIATCTableFooter` mostrando total de registros
- [ ] Botones usando `<SIATCButton variant="...">`
- [ ] Badges usando `<SIATCBadge variant="...">`
- [ ] Modales usando `<SIATCModalWrapper>`
- [ ] Inputs en modales con `h-12` (via `SIATC_THEME.COMPONENTS.INPUT`)
- [ ] Placeholder de búsqueda: `"Buscar por nombre, usuario o email..."`
- [ ] Headers de tabla en MAYÚSCULAS
- [ ] No hay clases de color hardcodeadas (ej: `text-blue-600`) en estilos estructurales

---

*Este documento es generado y mantenido por el asistente de desarrollo del ecosistema SIATC.*
*Para proponer cambios al estándar, discutirlos con el equipo antes de modificar este archivo.*
