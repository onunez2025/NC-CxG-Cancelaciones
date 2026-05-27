# Plan de Implementación: Homologación, Tokenización Completa y Paginación del Módulo de Configuración

Este plan detalla el diseño y la estandarización absoluta de todas las pantallas, tablas y componentes internos que residen bajo el módulo de **Configuración** de las 6 aplicaciones del ecosistema SIATC (**Valorizaciones**, **EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control** y **Liquidaciones**), unificando además el fondo de los logotipos de los sidebars en modo oscuro.

---

## Objetivos Generales

1. **Estandarización Estructural y Estética:** Modificar todas las subpáginas de configuración en las 6 aplicaciones para consumir única y exclusivamente el sistema de diseño centralizado en `siatc-theme.ts` (`SIATC_THEME`), eliminando estilos locales, opacidades fijas, colores hardcodeados o dimensiones asimétricas.
2. **Paginación Uniforme en Tablas:** Implementar paginación lógica estricta a un máximo de **10 registros por página** en todas las vistas de listados que puedan exceder este número, consumiendo el componente `<SIATCTableFooter>` con sus botones interactivos de navegación (`Pág. X / Y` con flechas).
3. **Integración del Componente de Tabla Unificada (`SIATCTable`):** Exportar y copiar el componente unificado de tablas `<SIATCTable>` (con sus subcomponentes `SIATCTableRow`, `SIATCTableCell`, `SIATCTableHeader` y `SIATCTableFooter`) a los 4 proyectos que carecen de él.
4. **Logotipos del Sidebar Adaptables:** Corregir el color de fondo blanco de los logotipos en los sidebars principales en modo oscuro, removiendo la clase hardcodeada `bg-white` y aplicando el diseño transparente utilizado en **Valorizaciones**.

---

## Cambios Propuestos por Componente

### 1. Componente Común de Tablas (`SIATCTable.tsx`)
Recrear el archivo [SIATCTable.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/siatc/table/SIATCTable.tsx) en los directorios de componentes de los 4 proyectos restantes. Este componente encapsulará:
* `<SIATCTable>`: Reemplazo para la etiqueta `<table>` nativa con la clase de área de scroll estándar.
* `<SIATCTableHeader>`: Estilo unificado para las cabeceras `<th>`.
* `<SIATCTableRow>`: Control de filas `<tr>` con altura estandarizada de 64px y transiciones dinámicas.
* `<SIATCTableCell>`: Estilos comunes para las celdas `<td>`.
* `<SIATCTableFooter>`: Barra inferior estandarizada con lógica interna de paginación y controles.

### 2. Logotipos en la Barra Lateral (`Sidebar.tsx`)
En los 5 proyectos (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control** y **Liquidaciones**), modificar el archivo `Sidebar.tsx` para remover el fondo blanco hardcodeado (`bg-white rounded-2xl shadow-lg border p-1.5`) de la envoltura de la etiqueta `<img>`, adoptando el contenedor limpio y adaptable de **Valorizaciones**:
```tsx
<div className="w-12 h-12 flex items-center justify-center shrink-0 overflow-hidden transition-transform hover:scale-105">
    <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
</div>
```

### 3. Homologación de Subpáginas Internas (Users, Roles, Audit Logs, etc.)
Modificar todas las páginas internas de configuración para alinearse al diseño de **Valorizaciones** (referencia visual) aplicando las siguientes pautas:
* **Estructura Raíz:** Contenedor de página transparente y animado sin doble borde:
  ```tsx
  <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
  ```
* **Cabecera de Página:** Consumir estrictamente los tokens del sistema:
  * Contenedor: `SIATC_THEME.LAYOUT.HEADER_WRAPPER`
  * Título: `SIATC_THEME.TYPOGRAPHY.PAGE_TITLE`
  * Subtítulo: `SIATC_THEME.TYPOGRAPHY.PAGE_SUBTITLE`
  * Botón Nuevo: `SIATC_THEME.COMPONENTS.BUTTON_PRIMARY` (reemplazar texto variable por el estándar "+ Nuevo Usuario" o "+ Nuevo").
* **Buscador / Filtros:** Consumir el token `SIATC_THEME.LAYOUT.SEARCH_BAR_WRAPPER` y el input unificado `SIATC_THEME.COMPONENTS.INPUT`. Homologar el placeholder a `"Buscar por nombre, usuario o email..."`.
* **Tabla Principal:**
  * Reemplazar etiquetas `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<td>` por los componentes `<SIATCTable>`, `<SIATCTableHeader>`, `<SIATCTableRow>` y `<SIATCTableCell>`.
  * Forzar a las cabeceras `<th>` a envolver sus textos en `<span className={SIATC_THEME.TYPOGRAPHY.TABLE_HEADER}>` para heredar la fuente, espaciado y color correctos.
  * Eliminar iconos específicos locales no pertenecientes al estándar (como el icono de carta `Mail` en la celda de correos de Tablero de Control).
  * Limpiar filtros de columna locales (como los embudos en Mesa de Atención) para estandarizar el comportamiento de filtrado general.
  * Estandarizar badges de rol (`SIATCBadge` o `SIATC_THEME.STATES.BADGE_BASE` + `SIATC_THEME.STATES.PRIMARY`) y chips de ecosistema (`SIATC_THEME.STATES.INFO` o `rounded-cb-chip`).
* **Paginación Lógica en el Footer:**
  * Implementar el estado local de página activa `currentPage` y el fragmentador `slice`:
    ```typescript
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;
    const paginatedRecords = filtered.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage);
    ```
  * Reemplazar los pies de tabla manuales por el componente común:
    ```tsx
    <SIATCTableFooter 
        totalRecords={filtered.length} 
        currentPage={currentPage}
        totalPages={Math.ceil(filtered.length / recordsPerPage)}
        onPageChange={setCurrentPage}
    />
    ```
  * Eliminar logotipos hardcodeados de bases de datos (como el database icon de Liquidaciones).

---

## Modificaciones por Proyecto y Archivo

A continuación se detallan los archivos específicos a intervenir:

### 1. [Valorizaciones](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* **[NEW] [SIATCTable.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/components/siatc/table/SIATCTable.tsx):** Implementación del componente común.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/UsersPage.tsx):** Refactorizar tabla para usar componentes comunes y paginación lógica.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/RolesPage.tsx):** Refactorizar tabla para usar componentes comunes y paginación lógica.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/AuditLogPage.tsx):** Refactorizar tabla para usar componentes comunes y paginación lógica.
* **[MODIFY] [ConfigCanalInstitucionalPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/ConfigCanalInstitucionalPage.tsx):** Refactorizar tabla para usar componentes comunes y paginación lógica.
* **[MODIFY] [ConfigDistritosPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/ConfigDistritosPage.tsx):** Refactorizar tabla para usar componentes comunes y paginación lógica.
* **[MODIFY] [SettingsPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/SettingsPage.tsx):** Ajustar formularios y espaciados para homogeneidad absoluta.

### 2. [Liquidaciones](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* **[NEW] [SIATCTable.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/components/siatc/table/SIATCTable.tsx):** Registrar el componente común.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/components/layout/Sidebar.tsx):** Quitar el fondo blanco del logotipo.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/UsersPage.tsx):** Refactorizar a componentes comunes, usar tokens en cabecera de página y toolbar, e implementar paginación (eliminar footer hardcodeado "SIATC Core Engine").
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/RolesPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/AuditLogPage.tsx):** Refactorizar a componentes comunes y paginación.

### 3. [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/components/layout/Sidebar.tsx):** Quitar el fondo blanco del logotipo.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/UsersPage.tsx):** Homologar textos del table header con la clase de tipografía unificada y estandarizar badges de roles y ecosistema.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/RolesPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.
* **[MODIFY] [CostCentersPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/CostCentersPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.
* **[MODIFY] [AccountsPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/AccountsPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.
* **[MODIFY] [ManagementsPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/ManagementsPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.
* **[MODIFY] [ExchangeRatesPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/ExchangeRatesPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/AuditLogPage.tsx):** Refactorizar tabla para usar cabeceras de tipografía del sistema y paginación.

### 4. [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/layout/Sidebar.tsx):** Quitar el fondo blanco del logotipo.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/UsersPage.tsx):** Eliminar embudos locales de cabecera y refactorizar a clases estándar de tokens en inputs, botones y badges.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/RolesPage.tsx):** Estandarizar markup y tokens en cabeceras de tabla, botones e inputs.
* **[MODIFY] [CostCentersPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/CostCentersPage.tsx):** Estandarizar markup y tokens.
* **[MODIFY] [AccountsPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/AccountsPage.tsx):** Estandarizar markup y tokens.
* **[MODIFY] [ManagementsPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/ManagementsPage.tsx):** Estandarizar markup y tokens.
* **[MODIFY] [ExchangeRatesPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/ExchangeRatesPage.tsx):** Estandarizar markup y tokens.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/AuditLogPage.tsx):** Estandarizar markup y tokens.

### 5. [Gestor FSM](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* **[NEW] [SIATCTable.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/components/siatc/table/SIATCTable.tsx):** Registrar el componente común.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/components/layout/Sidebar.tsx):** Quitar el fondo blanco del logotipo.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/UsersPage.tsx):** Implementar paginación, refactorizar a componentes comunes, usar tokens en cabecera de página y toolbar (reemplazar tokens locales `UI.xxx` por los globales `SIATC_THEME`).
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/RolesPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [HolidaysPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/HolidaysPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [SmtpConfigPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/SmtpConfigPage.tsx):** Ajustar formularios e inputs a tokens globales.
* **[MODIFY] [EmailTemplatePage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/EmailTemplatePage.tsx):** Ajustar maquetación e inputs a tokens globales.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/AuditLogPage.tsx):** Refactorizar a componentes comunes y paginación.

### 6. [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* **[NEW] [SIATCTable.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/components/siatc/table/SIATCTable.tsx):** Registrar el componente común.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/components/layout/Sidebar.tsx):** Quitar el fondo blanco del logotipo.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/UsersPage.tsx):** Eliminar icono `Mail` de la celda de correo, quitar badges con alturas/dimensiones personalizadas hardcodeadas, refactorizar textos (eliminar toTitleCase redundantes) e implementar paginación lógica y footer común.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/RolesPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [AreasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AreasPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [SubareasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/SubareasPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [CargosPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/CargosPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [LaborColorsConfigPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/LaborColorsConfigPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [AmonestacionesTiposPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AmonestacionesTiposPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [IncentivosTiposPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/IncentivosTiposPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [MotivosReservasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/MotivosReservasPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [RegisterTypesPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/RegisterTypesPage.tsx):** Refactorizar a componentes comunes y paginación.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AuditLogPage.tsx):** Refactorizar a componentes comunes y paginación.

---

## Plan de Verificación

### Pruebas de Compilación
Se ejecutará `npm run build` en cada uno de los 6 directorios de proyectos correspondientes para asegurar que la compilación de producción resulte limpia, sin advertencias ni errores en TypeScript relacionados con imports, variables no utilizadas o tipados incompatibles:
* **EBM**
* **Mesa de Atención**
* **Gestor FSM**
* **Tablero Control**
* **Liquidaciones**
* **Valorizaciones**

### Pruebas Visuales Manuales
Se auditará directamente la interfaz del navegador tras las actualizaciones de EasyPanel:
* Validar que el logotipo del sidebar en modo oscuro en las 6 aplicaciones ya no posea el fondo blanco cuadrado/redondeado y se fusione de manera transparente con el fondo principal de la aplicación.
* Comprobar que al navegar por los diferentes submódulos de **Configuración** de todas las aplicaciones:
  * El diseño se mantenga idéntico en tipografía de cabeceras, botones, colores y badges.
  * Todas las tablas con más de 10 registros expongan los controles interactivos de paginación `< Pág. 1 / Y >` de manera fluida y con comportamiento unificado.
  * Se mantenga la ausencia total del efecto de doble borde en todas las subpáginas.
