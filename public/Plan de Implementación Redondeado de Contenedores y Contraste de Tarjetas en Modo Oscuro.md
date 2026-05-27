# Plan de Implementación: Redondeado de Contenedores y Contraste de Tarjetas en Modo Oscuro

Este plan detalla los cambios estructurales y de color para estandarizar los contenedores principales de las páginas, dotarlos de bordes redondeados y corregir el contraste de las tarjetas en modo oscuro en los 6 proyectos basados en React (**EBM**, **Gestor FSM**, **Tablero Control**, **Valorizaciones**, **Mesa de Atención** y **Liquidaciones**).

---

## Cambios Propuestos

Para resolver simultáneamente las dos inconsistencias de diseño detectadas, se aplicarán las siguientes modificaciones coordinadas:

### 1. Estructura de Panel Flotante Redondeado (Layout)
Para que el contenedor de las páginas no se pegue a los bordes de la pantalla con esquinas rectas y haga juego con la estética flotante del Sidebar y el Header:
* **En `MainLayout.tsx` (los 6 proyectos):** 
  Se agregará un espaciado de margen a la derecha y al fondo (`pr-4 pb-4`) en el contenedor que aloja el viewport principal (`<main>`). Esto creará una franja de separación uniforme que muestra el fondo oscuro general de la aplicación.
* **En `siatc-theme.ts` (los 6 proyectos):** 
  Se actualizará el token de diseño `LAYOUT.PAGE_WRAPPER` para incluir bordes redondeados premium (`rounded-[2rem]`), un borde sutil (`border border-cb-border`) y ocultado de desbordamiento (`overflow-hidden`).

### 2. Corrección del Contraste y Unificación del Color de Fondo
Para restablecer la jerarquía y profundidad visual, haciendo que las tarjetas y tablas resalten sobre el fondo:
* **En `index.css` (los 6 proyectos):** 
  Se reconfigurará la variable `--cb-bg` en modo oscuro para que tome el color azul/negro profundo (`#050F1A` o `#020617` según corresponda), mientras que `--card` mantendrá el color azul oscuro más claro (`#0A1929` o `#071424`).
  Esto unificará el fondo del panel principal con la aplicación, y permitirá que las tarjetas (`bg-card`) sobresalgan visualmente al ser más claras.

---

## Modificaciones por Proyecto

Se realizarán cambios idénticos en los archivos correspondientes de cada uno de los 6 proyectos:

### [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/EBM/src/index.css):** Cambiar `--cb-bg` en `.dark` de `#0A1929` a `#050F1A`.

### [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/index.css):** Cambiar `--cb-bg` en `.dark` de `#0A1929` a `#050F1A`.

### [Gestor FSM (Gestor-de-Tickets-FSM)](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/index.css):** Cambiar `--cb-bg` in `.dark` de `#0A1929` a `#050F1A`.

### [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/index.css):** Cambiar `--cb-bg` in `.dark` de `#0A1929` a `#050F1A`.

### [Liquidaciones (liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/index.css):** Cambiar `--cb-bg` en `.dark` de `#0A1929` a `#050F1A`.

### [Valorizaciones (valorizaciones)](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* **[MODIFY] [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/components/layout/MainLayout.tsx):** Agregar espaciado alrededor del viewport `<main>`.
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/utils/siatc-theme.ts):** Añadir `rounded-[2rem] border border-cb-border bg-cb-bg overflow-hidden shadow-cb-level-1` a `LAYOUT.PAGE_WRAPPER`.
* **[MODIFY] [index.css](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/index.css):** Cambiar `--cb-bg` en `.dark` de `#0A1929` a `#050F1A`.

---

## Plan de Verificación

### Pruebas Automatizadas
* Se correrá `npm run build` en los 6 proyectos para verificar que no existan errores de compilación de TypeScript ni Tailwind.

### Verificación Manual
* El usuario validará los despliegues en EasyPanel comprobando la simetría de redondeados de la página y el contraste visual de las tarjetas contra el fondo.
