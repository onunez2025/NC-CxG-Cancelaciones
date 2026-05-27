# Plan de Implementación: Homologación y Tokenización del Módulo de Configuración

Este plan detalla la estandarización visual y la tokenización absoluta del módulo de **Configuración** en las 6 aplicaciones del ecosistema SIATC (**Valorizaciones**, **EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control** y **Liquidaciones**). 

El objetivo es alinear las interfaces al diseño de **Valorizaciones** (que es la referencia visual idéntica y libre de ruido), asegurando que todo el aspecto estético (fondos, bordes, curvas, sombras y espaciados) esté gobernado por el sistema de tokens centralizado (`siatc-theme.ts`), resolviendo por completo las inconsistencias visuales y las filtraciones de fondos claros en el modo oscuro.

---

## Análisis Técnico del Problema Visual

Al examinar los archivos y las capturas de pantalla, se identificaron dos discrepancias estructurales críticas en la maquetación del módulo de configuración de las aplicaciones frente a **Valorizaciones**:

1. **Fugas de Fondo en Modo Oscuro:**
   * En **EBM**, **Gestor FSM**, **Tablero Control** y **Liquidaciones**, el contenedor externo de `ConfigLayout.tsx` tiene clases hardcodeadas como `bg-slate-50` o `bg-slate-50/50`. En modo oscuro, esto genera una franja gris/blanquecina que se filtra por detrás y rompe la profundidad visual oscura.
2. **Estructuras de Contenedores Duplicados (Doble Borde):**
   * En los 5 proyectos (excepto en algunas vistas de Valorizaciones), tanto la envoltura de la página de configuración (`ConfigLayout.tsx`) como las subpáginas internas (como `UsersPage.tsx`, `RolesPage.tsx`, etc.) utilizan el token de contenedor principal `SIATC_THEME.LAYOUT.PAGE_WRAPPER`. 
   * Esto genera una maquetación de **tarjetas anidadas**: se renderiza una tarjeta externa de `2rem` de redondeado, y dentro del área de contenido se vuelve a renderizar otra tarjeta interna de `2rem` con sus propios bordes y sombras (`PAGE_WRAPPER`), reduciendo el espacio útil e introduciendo ruido visual innecesario.

### La Solución Estandarizada (Patrón Valorizaciones)

Para lograr un diseño limpio, profesional y consistente en todo el ecosistema:
* **Estructura Externa (Layout):** El contenedor principal de `ConfigLayout.tsx` debe ser la única envoltura que consuma `SIATC_THEME.LAYOUT.PAGE_WRAPPER` (que proporciona el fondo dinámico de la aplicación, el borde sutil y las esquinas redondeadas de `2rem`).
* **Barra Lateral de Configuración (Sidebar Interno):** Debe adoptar el token `SIATC_THEME.LAYOUT.SIDEBAR_CONTAINER` adaptado (ancho de 72px / `w-72` y fondos oscuros adaptables `bg-card`).
* **Vistas de Contenido (Subpáginas):** Todas las subpáginas del módulo de configuración (`UsersPage`, `RolesPage`, `AuditLogPage`, `ExchangeRatesPage`, etc.) deben eliminar la clase externa `PAGE_WRAPPER`. En su lugar, utilizarán un contenedor transparente fluido:
  ```tsx
  <div className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500">
  ```
  De esta forma, la cabecera de la subpágina se alinea de forma limpia arriba, y la tabla/formulario se encapsula de manera premium dentro de `SIATC_THEME.LAYOUT.CONTENT_CONTAINER` (que posee un redondeado menor de `12px` y bordes estandarizados).

---

## Cambios Propuestos

### 1. Estandarización de `ConfigLayout.tsx` (Los 6 Proyectos)
Se modificará el componente de enrutamiento y maquetación de configuración para consumir el wrapper estándar y limpiar estilos manuales:
* **Clase del Contenedor Raíz:** Cambiar de clases inline / `bg-slate-50` a `className={SIATC_THEME.LAYOUT.PAGE_WRAPPER}`.
* **Separador de Rejilla:** Usar `gap-4` en la cuadrícula de 2 columnas para una separación equilibrada del contenido.
* **Sidebar Interno:** Utilizar `SIATC_THEME.LAYOUT.SIDEBAR_CONTAINER` eliminando bordes/roundings hardcodeados y mapeando el fondo a `bg-card border-cb-border` o similar.
* **Tarjeta de Footer del Sidebar:** Mapear su fondo a `bg-cb-bg/30` y el borde a `border-cb-border` para alinearse al tema oscuro.

### 2. Refactorización de Subpáginas Internas (Eliminación de Doble Borde)
Se modificará el elemento contenedor de retorno en todos los componentes de página que viven dentro de la carpeta `src/pages/config` de cada proyecto:
* **Clase Raíz:** Reemplazar `SIATC_THEME.LAYOUT.PAGE_WRAPPER` por:
  ```tsx
  className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500"
  ```
* **Contenedor de Contenidos (Tablas y Formularios):** Asegurar el uso de `SIATC_THEME.LAYOUT.CONTENT_CONTAINER` para el recuadro de la tabla, con fondos adaptables a modo oscuro (`dark:bg-cb-bg`).

---

## Modificaciones por Proyecto y Archivo

A continuación se listan de forma explícita los archivos que serán modificados en cada repositorio:

### [Valorizaciones](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/ConfigLayout.tsx):** Estandarizar clases del aside sidebar a `bg-card` y remover opacidades fijas.
* **[MODIFY] [SettingsPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/SettingsPage.tsx):** Reemplazar `PAGE_WRAPPER` por el contenedor transparente y ajustar el formulario dentro de `CONTENT_CONTAINER`.
* **[MODIFY] [ConfigCanalInstitucionalPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/ConfigCanalInstitucionalPage.tsx):** Reemplazar `PAGE_WRAPPER` por el contenedor transparente.
* **[MODIFY] [ConfigDistritosPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/ConfigDistritosPage.tsx):** Reemplazar `PAGE_WRAPPER` por el contenedor transparente.

### [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/ConfigLayout.tsx):** Reemplazar wrapper por `PAGE_WRAPPER`, estandarizar gap a 4 y usar `SIDEBAR_CONTAINER`.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/UsersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/RolesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [CostCentersPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/CostCentersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AccountsPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/AccountsPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [ManagementsPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/ManagementsPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [ExchangeRatesPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/ExchangeRatesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/AuditLogPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.

### [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/ConfigLayout.tsx):** Reemplazar wrapper por `PAGE_WRAPPER`, estandarizar gap a 4 y usar `SIDEBAR_CONTAINER`.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/UsersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/RolesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [CostCentersPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/CostCentersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AccountsPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/AccountsPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [ManagementsPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/ManagementsPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [ExchangeRatesPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/ExchangeRatesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/AuditLogPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.

### [Gestor FSM (Gestor-de-Tickets-FSM)](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/ConfigLayout.tsx):** Reemplazar wrapper por `PAGE_WRAPPER`, estandarizar gap a 4 y usar `SIDEBAR_CONTAINER`.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/UsersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/RolesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [HolidaysPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/HolidaysPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [SmtpConfigPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/SmtpConfigPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [EmailTemplatePage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/EmailTemplatePage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/AuditLogPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.

### [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/ConfigLayout.tsx):** Reemplazar wrapper por `PAGE_WRAPPER`, estandarizar gap a 4 y usar `SIDEBAR_CONTAINER`.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/UsersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/RolesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AreasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AreasPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [SubareasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/SubareasPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [CargosPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/CargosPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [LaborColorsConfigPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/LaborColorsConfigPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AmonestacionesTiposPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AmonestacionesTiposPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [IncentivosTiposPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/IncentivosTiposPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [MotivosReservasPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/MotivosReservasPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RegisterTypesPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/RegisterTypesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AuditLogPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.

### [Liquidaciones (liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* **[MODIFY] [ConfigLayout.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/ConfigLayout.tsx):** Reemplazar wrapper por `PAGE_WRAPPER`, estandarizar gap a 4 y usar `SIDEBAR_CONTAINER`.
* **[MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/UsersPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/RolesPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.
* **[MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/AuditLogPage.tsx):** Reemplazar `PAGE_WRAPPER` por contenedor transparente.

---

## Plan de Verificación

### Pruebas Automatizadas
* Se ejecutará `npm run build` en cada uno de los 6 proyectos tras la refactorización para garantizar que no existan errores sintácticos de empaquetado o tipos de TypeScript.

### Verificación Manual
* Inspeccionar en el navegador las pantallas de Configuración en el tema oscuro:
  * El fondo debe ser uniforme `#050F1A` sin filtraciones grises/claras en los bordes.
  * El recuadro exterior del módulo debe tener un único borde y esquinas redondeadas de `2rem`.
  * La barra lateral y el contenido de la derecha deben presentarse como subpaneles internos limpios con esquinas de `12px` (estándar `rounded-cb-card`).
  * Desaparición del efecto de "doble borde" al entrar a cualquier subpágina del menú.
