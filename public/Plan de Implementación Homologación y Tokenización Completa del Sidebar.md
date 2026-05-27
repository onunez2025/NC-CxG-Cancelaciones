# Plan de Implementación: Homologación y Tokenización Completa del Sidebar

Este plan detalla la estandarización del componente `Sidebar` mediante el sistema de tokenización centralizado (`siatc-theme.ts`) de los 6 proyectos basados en React (**EBM**, **Gestor FSM**, **Tablero Control**, **Valorizaciones**, **Mesa de Atención** y **Liquidaciones**). 

Para cumplir rigurosamente con la directiva de **cero estilos hardcodeados**, introduciremos un nuevo token de decisión en el tema y eliminaremos los condicionales y clases físicas de los archivos de componentes.

---

## Cambios Propuestos

Para asegurar que todo el diseño esté gobernado por la tokenización sin clases estáticas en el componente, aplicaremos el siguiente cambio coordinado:

### 1. Definición del Token en `siatc-theme.ts` (Los 6 Proyectos)
Se agregará el token `LAYOUT.SIDEBAR_INNER` para centralizar la estructura transparente y el color de texto adaptable de la barra lateral:
```typescript
SIDEBAR_INNER: "flex flex-col h-full bg-transparent text-cb-text-primary transition-all duration-500",
```

### 2. Consumo del Token en `Sidebar.tsx` (Los 6 Proyectos)
Se modificará el componente `Sidebar.tsx` para eliminar la clase de borde hardcodeada y el condicional de tema. En su lugar, el componente consumirá el token del sistema.

#### Cambio en el Marcado:
```diff
-        <div className={cn(
-            "flex flex-col h-full border-r border-border/50 transition-all duration-500",
-            theme === 'dark' ? "bg-card text-card-foreground" : "bg-white text-slate-800",
-            className
-        )}>
+        <div className={cn(
+            SIATC_THEME.LAYOUT.SIDEBAR_INNER,
+            className
+        )}>
```

---

## Modificaciones por Proyecto

Se realizarán los cambios coordinados en `siatc-theme.ts` y `Sidebar.tsx` de cada uno de los 6 proyectos:

### [EBM](file:///D:/diego/Documentos/Antigravity/EBM)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

### [Mesa de Atención (NC-CxG-Cancelaciones)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

### [Gestor FSM (Gestor-de-Tickets-FSM)](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

### [Tablero Control](file:///D:/diego/Documentos/Antigravity/Tablero%20Control)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Tablero%20Control/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

### [Liquidaciones (liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

### [Valorizaciones (valorizaciones)](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones)
* **[MODIFY] [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/utils/siatc-theme.ts):** Definir token `LAYOUT.SIDEBAR_INNER`.
* **[MODIFY] [Sidebar.tsx](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/components/layout/Sidebar.tsx):** Consumir el nuevo token y limpiar condicionales de tema.

---

## Plan de Verificación

### Pruebas Automatizadas
* Se ejecutará `npm run build` en los 6 proyectos para certificar la compilación sin errores sintácticos de TypeScript/Vite.

### Verificación Manual
* El usuario comprobará que en el Sidebar de los entornos desplegados desaparezcan el color azul claro `#0A1929` y la línea vertical del borde derecho, mostrándose uniforme con el fondo `#050F1A` en modo oscuro y `#F9FAFB` en modo claro.
