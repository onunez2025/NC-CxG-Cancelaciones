# Plan de Implementación: Homologación del Fondo del Sidebar en Modo Oscuro

Este plan detalla el ajuste de color en el Sidebar para unificarlo con el fondo dinámico general de la aplicación (`bg-cb-bg`), eliminando el bloque de color de contraste (`bg-card`) que genera ruido visual en los 6 proyectos basados en React (**EBM**, **Gestor FSM**, **Tablero Control**, **Valorizaciones**, **Mesa de Atención** y **Liquidaciones**).

---

## Cambios Propuestos

### 1. Modificación en `siatc-theme.ts` (Los 6 Proyectos)
Se cambiará el token de fondo de la barra lateral `SIDEBAR_BG` para que use el color de fondo dinámico general de la aplicación (`bg-cb-bg`) en lugar del fondo de tarjeta (`bg-card`).
* **Antes:** `SIDEBAR_BG: "bg-card"`
* **Después:** `SIDEBAR_BG: "bg-cb-bg"`

Esto unificará el fondo del Sidebar con el fondo general `#050F1A` en modo oscuro (y `#F9FAFB` en modo claro), haciendo que las cápsulas activas y de hover floten de manera limpia y sin ruido visual de fondo.

---

## Modificaciones por Proyecto

Se aplicará este cambio en `siatc-theme.ts` para cada uno de los 6 proyectos:

### [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

### [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

### [Gestor FSM (Gestor-de-Tickets-FSM)](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

### [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

### [Liquidaciones (liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

### [Valorizaciones (valorizaciones)](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/utils/siatc-theme.ts):** Cambiar `SIDEBAR_BG` a `"bg-cb-bg"`.

---

## Plan de Verificación

### Pruebas Automatizadas
* Se ejecutará `npm run build` en los 6 proyectos para certificar que el tipado y empaquetado de Vite/React compile sin errores.

### Verificación Manual
* El usuario comprobará el aspecto visual del Sidebar en los entornos desplegados, validando que el fondo sea uniforme con el layout y se elimine el contraste excesivo del bloque izquierdo.
