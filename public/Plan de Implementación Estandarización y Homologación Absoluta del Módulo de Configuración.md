# Plan de Implementación: Estandarización y Homologación Absoluta del Módulo de Configuración

Este plan detalla el diseño, la re-estructuración y la estandarización absoluta de los tres submódulos compartidos de **Configuración** (**Gestión de Usuarios**, **Perfiles y Permisos**, y **Bitácora de Auditoría**) en las 6 aplicaciones del ecosistema SIATC: **Valorizaciones**, **EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control** y **Liquidaciones**.

El objetivo es lograr **paridad estructural y visual de 100%** para que los submódulos se comporten y visualicen de forma idéntica, resolviendo fallas de renderizado, diferencias en los endpoints de base de datos, avatares con números en lugar de iniciales, y tags desalineados.

---

## Modificaciones de Diseño y Experiencia de Usuario

Para asegurar la estandarización absoluta, se aplicarán las siguientes reglas en cada uno de los tres submódulos:

### 1. Gestión de Usuarios (`UsersPage.tsx`)
* **Iniciales del Avatar Reales:** Se implementará una función helper `getInitials(fullName, username)` para extraer las dos iniciales del nombre completo del colaborador (ej: "Cesar Augusto Atiro" -> "CA"). Se evitará tomar las primeras letras del ID de usuario si son números (ej: "3838" -> "38").
* **Alcance Ecosistema:** Se estandarizarán los chips del ecosistema a etiquetas de tipo mono compactas de `9px` (`px-2 py-0.5 rounded-cb-chip text-[9px] font-bold border bg-cb-blue/5 text-cb-blue border-cb-blue/10`) para prevenir que las celdas se desborden verticalmente o se encimen en pantallas medianas.
* **Resizable Headers:** Se implementará la lógica de redimensionamiento de columnas mediante el hook `useTableResizer` y el componente `<ResizableHeader>` con anchos de columna idénticos:
  ```typescript
  const { widths, onResizeStart } = useTableResizer(CACHE_KEY, {
      usuario: 250,
      email: 220,
      rol: 160,
      apps: 220
  });
  ```
* **Checkbox en Modal:** Se estandarizará el modal de creación y edición para contener el checklist completo de las **6 aplicaciones** del ecosistema en su ámbito de acceso:
  * **EBM** (EBM Central)
  * **FSM** (Gestor FSM)
  * **TCtrl** (Tablero)
  * **Liq** (Liquidaciones)
  * **VAL** (Valorizaciones)
  * **CXG** (Gestor NC-CxG)

### 2. Perfiles y Permisos (`RolesPage.tsx`)
* **Checkbox en Modal:** Al igual que en usuarios, el modal de perfil de seguridad expondrá las **6 aplicaciones** del ecosistema en su ámbito de alcance.
* **Componentes de Botones y Tarjetas:** Se unificará el uso de botones y formularios bajo las clases de `SIATC_THEME` globales, removiendo componentes envolventes específicos de cada proyecto (`SIATCButton`, `SIATCBadge`) para asegurar que no ocurran problemas de compilación locales.
* **Visualización de Facultades:** Las tarjetas de perfiles mostrarán la lista de facultades mediante badges con clase de transición y scroll interno unificado.

### 3. Bitácora de Auditoría (`AuditLogPage.tsx`)
* **Normalización de Campos de Base de Datos:** Debido a que algunos backends devuelven las propiedades en mayúscula (`Id`, `Fecha`, `UsuarioNombre`, `Accion`, `Entidad`, `EntidadID`, `Detalle`) y otros en minúscula (`id`, `created_at`, `user_name`, `user_id`, `action`, `entity`, `entity_id`, `details`), se implementará un mapeador en el frontend que normalizará los objetos a minúsculas inmediatamente después de la llamada a la API. Esto permitirá que la interfaz y el renderizado sean **100% idénticos en código**:
  ```typescript
  const normalizeLogs = (data: any[]): AuditLog[] => {
      if (!Array.isArray(data)) return [];
      return data.map((item, index) => ({
          id: item.id ?? item.Id ?? index,
          created_at: item.created_at ?? item.Fecha ?? item.fecha ?? new Date().toISOString(),
          user_id: item.user_id ?? item.UsuarioID ?? item.usuario_id ?? '',
          user_name: item.user_name ?? item.UsuarioNombre ?? item.usuario_nombre ?? item.user_id ?? item.UsuarioID ?? 'Sistema',
          action: item.action ?? item.Accion ?? item.accion ?? 'Operación',
          entity: item.entity ?? item.Entidad ?? item.entidad ?? 'General',
          entity_id: item.entity_id ?? item.EntidadID ?? item.entidad_id ?? '',
          details: item.details ?? item.Detalle ?? item.detalle ?? ''
      }));
  };
  ```
* **Pantalla de Acceso Bloqueado:** Se integrará el componente visual premium `Acceso bloqueado` con la alerta de `ShieldX` para denegar la visualización a usuarios que no posean el rol requerido.
* **Resizable Headers:** Se implementará el redimensionamiento de columnas de la bitácora con los siguientes anchos iniciales:
  ```typescript
  const { widths, onResizeStart } = useTableResizer(CACHE_KEY, {
      fecha: 180,
      usuario: 220,
      operacion: 180,
      entidad: 200,
      payload: 300
  });
  ```

### 4. Paginación Uniforme
* Todas las tablas de usuarios y bitácoras se paginarán localmente a **10 registros por página**, consumiendo de forma unificada el componente `<SIATCTableFooter>` con el formato: `Pág. X / Y` y botones interactivos de navegación.

---

## Estrategia de Git y Despliegue en EasyPanel

> [!WARNING]
> Para evitar que EasyPanel ignore los despliegues o no detecte cambios, **NO** se reutilizará el mismo mensaje de commit. 
> Cada repositorio se compilará localmente, se añadirá y se confirmará utilizando un mensaje de commit único que incluya el prefijo del proyecto y un código secuencial basado en la fecha actual (ej. `style(ebm): homologacion modulo configuracion - [2026-05-27]`).

---

## Cambios Propuestos por Archivo

A continuación se enlistan los archivos específicos a modificar en cada proyecto:

---

### [Valorizaciones](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/UsersPage.tsx)
  * Añadir helper `getInitials`.
  * Homologar tags de ecosistema a chips pequeños de `9px`.
  * Estandarizar checklist en el modal a 6 aplicaciones.
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/RolesPage.tsx)
  * Estandarizar checklist en el modal a 6 aplicaciones.
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/config/AuditLogPage.tsx)
  * Integrar normalizador de campos.
  * Añadir resizer de columnas con `useTableResizer`.

---

### [Liquidaciones](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/UsersPage.tsx)
  * Aplicar plantilla homologada de usuarios (helper `getInitials`, chips de `9px`, checklist de 6 apps).
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/RolesPage.tsx)
  * Aplicar plantilla homologada de perfiles (checklist de 6 apps).
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/config/AuditLogPage.tsx)
  * Aplicar plantilla homologada de bitácora con normalizador de campos y resizer de columnas.

---

### [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/UsersPage.tsx)
  * Aplicar plantilla homologada de usuarios.
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/RolesPage.tsx)
  * Aplicar plantilla homologada de perfiles.
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/pages/config/AuditLogPage.tsx)
  * Aplicar plantilla homologada de bitácora con normalizador de campos y resizer de columnas.

---

### [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/UsersPage.tsx)
  * Aplicar plantilla homologada de usuarios.
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/RolesPage.tsx)
  * Aplicar plantilla homologada de perfiles.
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/config/AuditLogPage.tsx)
  * Aplicar plantilla homologada de bitácora con normalizador de campos y resizer de columnas.

---

### [Gestor FSM](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/UsersPage.tsx)
  * Aplicar plantilla homologada de usuarios.
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/RolesPage.tsx)
  * Aplicar plantilla homologada de perfiles.
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/pages/config/AuditLogPage.tsx)
  * Aplicar plantilla homologada de bitácora con normalizador de campos y resizer de columnas.

---

### [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* #### [MODIFY] [UsersPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/UsersPage.tsx)
  * Aplicar plantilla homologada de usuarios.
* #### [MODIFY] [RolesPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/RolesPage.tsx)
  * Aplicar plantilla homologada de perfiles.
* #### [MODIFY] [AuditLogPage.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/config/AuditLogPage.tsx)
  * Aplicar plantilla homologada de bitácora con normalizador de campos y resizer de columnas.

---

## Plan de Verificación

### Pruebas de Compilación
Se ejecutará `npm run build` en cada una de las 6 carpetas de proyecto correspondientes para garantizar que no existan errores de TypeScript ni de empaquetado en la fase de empaquetamiento:
* `Valorizaciones`
* `Liquidaciones`
* `EBM`
* `Mesa de Atención`
* `Gestor FSM`
* `Tablero Control`

### Pruebas Manuales
Una vez desplegado mediante EasyPanel:
1. Navegar a **Configuración -> Gestión de Usuarios**:
   * Validar que los avatares calculen correctamente iniciales alfabéticas (ej: "Diego Moncada" -> "DM") y no muestren números de ID.
   * Validar que las columnas puedan redimensionarse dinámicamente arrastrando las cabeceras.
   * Confirmar que el modal de creación contenga exactamente 6 opciones del ecosistema.
2. Navegar a **Configuración -> Perfiles y Permisos**:
   * Validar que el modal de perfiles contenga las 6 opciones de ecosistema.
3. Navegar a **Configuración -> Bitácora de Auditoría / Logs de Auditoría**:
   * Validar que los datos de auditoría se carguen correctamente sin filas vacías ni fechas desalineadas (tanto en backends con mayúsculas como en minúsculas).
   * Validar la paginación a 10 registros por página.
