# Walkthrough: Estandarización Estructural y Tokenización de Layouts (Crypto Blue)

En esta fase de ejecución, hemos completado la migración estructural del diseño de la plataforma **NC-CxG-Cancelaciones** para adoptar el sistema de diseño **Crypto Blue** (de EBM), centralizando la maquetación y la UI/UX en un único punto, solucionando los errores de compilación, homologando el Sidebar con tokens en ambas aplicaciones, estandarizando los títulos un 50% más pequeños y ajustando los botones a una altura unificada de 36px y con etiquetas cortas de una sola palabra en ambos proyectos, desplegando todo a productivo.

Asimismo, hemos refinado y estandarizado la fila de títulos de todas las tablas, las barras inferiores de resumen (footers) y optimizado el espacio de pantalla reduciendo el padding inferior de los layouts a un tercio de su valor original en ambos proyectos.

En una actualización reciente específica para la aplicación **NC-CxG-Cancelaciones**, hemos implementado ajustes textuales, reordenamiento de botones y la funcionalidad de ocultado/colapsado dinámico de las tarjetas métricas (KPIs).

---

## Cambios Realizados y Corrección de Errores

### 1. Refinamiento y Estandarización de Fila de Títulos (Table Headers)
* **Reducción de Altura y Tamaño:** Se disminuyó el relleno vertical (`py-4` a `py-2.5`) de las celdas de encabezado y se redujo el tamaño de fuente un 10% (de `12px` a `11px`).
* **Mejora del Contraste:** Se cambió el tono de color gris claro de `text-cb-neutral` (`#8A919E`) a un tono más oscuro y legible `text-cb-slate` (`#5B616E`).
* **Tokenización Centralizada:**
  * **[siatc-theme.ts (GAC)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/utils/siatc-theme.ts) & [siatc-theme.ts (EBM)](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts):** Se actualizaron los tokens `TABLE.HEADER_TH` y `TYPOGRAPHY.TABLE_HEADER` para reflejar estas especificaciones exactas de diseño.
  * **Eliminación de Clases Hardcodeadas:** Se reemplazaron las etiquetas raw `<th>` por `<SIATCTableHeader>` en todas las páginas de configuración de **NC-CxG-Cancelaciones** (`AccountsPage.tsx`, `CostCentersPage.tsx`, `ManagementsPage.tsx`, `UsersPage.tsx`, `AuditLogPage.tsx`).
  * **Estandarización de Cabeceras Redimensionables:** Se actualizaron los componentes [ResizableHeader.tsx (GAC)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/common/ResizableHeader.tsx) y [ResizableHeader.tsx (EBM)](file:///D:/diego/Documentos/Antigravity/EBM/src/components/common/ResizableHeader.tsx) para importar e integrar directamente el token `SIATC_THEME.TABLE.HEADER_TH`.

### 2. Reducción de Barra Inferior de Resumen (Table Footers) un 50%
* **Optimización de Espacio:** Se modificó la barra inferior de resumen (`TABLE.FOOTER` en ambos temas) reduciendo su padding de `py-4` a `py-2` (reducción exacta del 50% en altura vertical).
* **Contraste de Texto:** Se actualizó `TYPOGRAPHY.FOOTER_STATS` para usar el color `text-cb-slate` con una opacidad del `95%` garantizando que los textos de resumen ("MOSTRANDO X DE Y REGISTROS") y paginación sean legibles y refinados.

### 3. Reducción del Padding Inferior del Viewport a 1/3
* **Tokenización de Viewport:** Se agregó el token de maquetación `LAYOUT.VIEWPORT` en el sistema de diseño central de ambos repositorios.
* **Integración en Layouts Principales:** Se modificaron los archivos [MainLayout.tsx (GAC)](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/components/layout/MainLayout.tsx) y [MainLayout.tsx (EBM)](file:///D:/diego/Documentos/Antigravity/EBM/src/components/layout/MainLayout.tsx) para consumir `<main className={SIATC_THEME.LAYOUT.VIEWPORT}>` en lugar de la clase hardcodeada que aplicaba un espaciado excesivo de `pb-8` (32px).
* **Ajuste en Envoltorios de Página:** Se actualizó `LAYOUT.PAGE_WRAPPER` para usar `pb-1.5` (6px) en lugar de `pb-4` (16px).
* **Resultado Visual:** La separación inferior de la pantalla pasó de un total de `48px` (`32px` + `16px`) a únicamente `16px` (`10px` + `6px`), reduciéndose exactamente a **1/3** de su altura anterior. Esto permite que las tablas ocupen mayor espacio en pantalla.

### 4. Ajustes Específicos del Módulo "Cambios por Garantías" (Solo GAC)
En [CxGNCPage.tsx](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/pages/cxg-nc/CxGNCPage.tsx), se implementaron los siguientes cambios visuales y funcionales solicitados:
* **Corrección de Textos:**
  * **Título:** Cambiado de `'Cambios por Garantías y Notas de Crédito'` a `'Cambios por Garantía y Notas de Crédito'`.
  * **Subtítulo:** Cambiado de `'Gestión y procesamiento de documentos financieros (Cambios por Garantías y Notas de Crédito).'` a `'Gestión de Cambios por Garantía y Notas de Crédito.'`.
* **Reordenamiento y Diseño de Botones:**
  * Se reposicionó el botón **Registrar** como la tercera acción del bloque principal.
  * El botón **Columnas** se convirtió en un botón de solo icono (`Columns`) con un ancho cuadrado proporcional (`!px-2.5`) y un tooltip/título de accesibilidad, moviéndose a la cuarta posición.
  * Se creó un nuevo botón de **Tarjetas** (`LayoutGrid`) al extremo derecho que permite colapsar/desplegar la franja de métricas. El botón cambia su fondo de forma sutil a `bg-primary/10` para señalar cuando las tarjetas están activas (visibles).
  * El orden final es: **Sincronizar $\rightarrow$ Exportar $\rightarrow$ Registrar $\rightarrow$ Columnas (solo icono) $\rightarrow$ Tarjetas (solo icono)**.
* **Sección de KPIs Colapsable:**
  * Se envolvió la franja de tarjetas métricas en un contenedor de transición dinámica (`transition-all duration-300 ease-in-out` con control de `max-h` y `opacity`) para un ocultado y despliegue completamente fluido que no desestabilice el layout.

---

## Verificación de Compilación y Calidad

### Pruebas de Integración y Construcción
1. **Validación de Compilación en GAC:** Se ejecutó `npm run build` obteniendo resultados exitosos sin ninguna advertencia o error de tipo en TypeScript:
   ```bash
   vite v7.3.3 building client environment for production...
   ✓ 2704 modules transformed.
   dist/index.html                             1.90 kB │ gzip:   0.69 kB
   dist/assets/index-CGZQa5W8.css            113.59 kB │ gzip:  22.00 kB
   dist/assets/index-E57Q-psB.js             891.90 kB │ gzip: 246.00 kB
   ✓ built in 10.65s
   ```

2. **Commit & Push (GAC):** Los cambios se guardaron y empujaron a la rama `main` de GitHub en `NC-CxG-Cancelaciones`:
   ```bash
   To https://github.com/onunez2025/NC-CxG-Cancelaciones.git
      9f25c37..0b83013  main -> main
   ```

---

## Actualizaciones Recientes (24 de Mayo, 2026)

### Modificación del Subtítulo de Inicio de Sesión
Se modificó la traducción del subtítulo del Login en los repositorios de **EBM** y **Mesa de Atención** para homologar por completo la experiencia de usuario de acuerdo con la última solicitud:

* **Texto modificado:** `'Ingresa tus credenciales para continuar'` $\rightarrow$ `'Ingresa tus credenciales para acceder al sistema'`.
* **Archivos modificados:**
  * **EBM:** [es.json](file:///D:/diego/Documentos/Antigravity/EBM/public/locales/es.json)
  * **Mesa de Atención:** [es.json](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/public/locales/es.json) y [es-PE.json](file:///D:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/public/locales/es-PE.json)

### Validación y Despliegue
* Ambas aplicaciones se compilaron exitosamente con `npm run build`.
* Los cambios se confirmaron y enviaron a las ramas remotas de ambos repositorios:
  * **EBM:** Enviado a `develop` y unificado/fusionado en `main`.
  * **Mesa de Atención:** Enviado a `main`.

---

### Estandarización de Mensaje de Sesión Expirada (Naranja/Ámbar)
Se implementó y unificó el sistema de alertas de sesión expirada para homologar el comportamiento visto en **Valorizaciones** en los tres proyectos (**EBM**, **Mesa de Atención** y **Gestor FSM**), integrando la regla de estilo en el núcleo de tokenización común:

* **Token de Visualización Centralizado:**
  * Se agregó el token `ALERT_EXPIRED` a `LOGIN_LAYOUT` en [siatc-theme.ts (EBM)](file:///d:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts), [siatc-theme.ts (Mesa de Atención)](file:///d:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/utils/siatc-theme.ts) y [siatc-theme.ts (Gestor FSM)](file:///d:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/utils/siatc-theme.ts):
    ```typescript
    ALERT_EXPIRED: "p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
    ```
* **Detección y Redirección (API Client & Auth Hook):**
  - Los interceptores `apiClient.ts` se modificaron para redireccionar a `/login?expired=true` al recibir un código de estado `401 Unauthorized` después de vaciar la sesión local.
  - Se modificaron los hooks de autenticación [useAuth.tsx (EBM)](file:///d:/diego/Documentos/Antigravity/EBM/src/hooks/useAuth.tsx), [useAuth.tsx (Mesa de Atención)](file:///d:/diego/Documentos/Antigravity/CxG%20y%20NC/NC-CxG-Cancelaciones/src/hooks/useAuth.tsx), [useAuth.tsx (Gestor FSM)](file:///d:/diego/Documentos/Antigravity/Gestor%20FSM/Gestor-de-Tickets-FSM/src/hooks/useAuth.tsx) y [useAuth.tsx (Tablero Control)](file:///d:/diego/Documentos/Antigravity/Tablero%20Control/src/hooks/useAuth.tsx) para que, en caso de **desconexión por inactividad** (inactivity timeout) o **fallo en la validación del token en segundo plano**, se realice una redirección explícita a `/login?expired=true` en vez de una redirección limpia sin parámetros.
  - **Resolución de Condición de Carrera (Race Condition Fix):** Para evitar que la transición del estado local de React (`setUser(null)`) gatille de forma instantánea una navegación limpia en `<Navigate to="/login" replace />` desde `ProtectedRoute` (lo cual borraba el parámetro de la URL `?expired=true`), **eliminamos la modificación reactiva del estado del usuario antes del redireccionamiento por inactividad**. Ahora el hook remueve las credenciales de `localStorage` y ejecuta un redireccionamiento rígido (`window.location.href = '/login?expired=true'`) inmediatamente. Al cargar la nueva instancia de la página sin credenciales válidas, el sistema entra al Login preservando la URL con el parámetro intacto de forma indefinida, garantizando que el banner naranja se muestre y no desaparezca de manera imprevista.
* **Componente de Inicio de Sesión (`LoginPage.tsx`):**
  * Se integró `useSearchParams` de `react-router-dom` para detectar el parámetro `expired=true`.
  * Si la sesión ha expirado, se despliega la tarjeta naranja estilizada con el icono de candado (`Lock`) de `lucide-react` y la animación de deslizamiento.
  * **Internacionalización:** En **EBM** y **Mesa de Atención**, los textos ("Sesión expirada" / "Por seguridad, tu sesión ha finalizado...") consumen las llaves de traducción del archivo i18n (`auth.sessionExpired`), mientras que en **Gestor FSM** y **Tablero Control** se definieron de forma directa en español manteniendo la homogeneidad visual exacta.
  * **Estandarización de Layout (Tarjeta):** La vista de Login de [LoginPage.tsx (Tablero Control)](file:///d:/diego/Documentos/Antigravity/Tablero%20Control/src/pages/LoginPage.tsx) se actualizó por completo para envolver el formulario en la clase de tarjeta de inicio de sesión (`SIATC_THEME.LOGIN_LAYOUT.CARD`), adoptar la tipografía de títulos y consumir los tokens unificados para inputs y botones, homologando al 100% su interfaz con la de las demás aplicaciones.

### Validación y Despliegue de Alerta
* Se ejecutó la compilación de producción en los cuatro repositorios exitosamente (`npm run build`).
* Los cambios se confirmaron e introdujeron en las ramas remotas de producción (`main`/`develop` para EBM y Tablero Control, `main` para Mesa de Atención y Gestor FSM).

---

## Actualizaciones de Homologación en Valorizaciones (24 de Mayo, 2026)

Hemos homologado el comportamiento de expiración de sesión e inactividad en la aplicación **Valorizaciones** (`d:\diego\Documentos\Antigravity\Valorizaciones\valorizaciones`), alineándola al 100% con los estándares definidos:

### 1. Control de Inactividad de 5 Minutos y Validación de Tokens
* **Archivo modificado:** [useAuth.tsx (Valorizaciones)](file:///d:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/hooks/useAuth.tsx)
* **Temporizador de Inactividad:** Se añadió un `useEffect` que escucha los eventos de interacción del usuario (`mousemove`, `keydown`, `mousedown`, `touchstart`, `scroll`) y arranca un temporizador de 5 minutos. Si se cumple el tiempo, limpia de forma segura el almacenamiento local y realiza un redireccionamiento rígido a `/login?expired=true`.
* **Redirección de Validación en Segundo Plano:** En caso de que falle la petición a `/auth/me`, se reemplazó la llamada reactiva a `logout()` para prevenir la condición de carrera con `react-router-dom`, realizando en su lugar la limpieza directa y redireccionamiento rígido a `/login?expired=true`.

### 2. Estandarización de Login y Alerta
* **Archivo modificado:** [LoginPage.tsx (Valorizaciones)](file:///d:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/LoginPage.tsx)
* Se comprobó la correcta implementación de la alerta ámbar de sesión expirada usando `SIATC_THEME.LOGIN_LAYOUT.ALERT_EXPIRED`, y la estructuración del login en formato de tarjeta (`SIATC_THEME.LOGIN_LAYOUT.CARD`), logrando que la interfaz sea visualmente idéntica al estándar.

### 3. Validación y Despliegue
* Se ejecutó exitosamente `npm run build` en el directorio de **Valorizaciones** comprobando que no existan errores de tipos o fallas en el empaquetado.
* Se staged, commited y empujaron los cambios a la rama principal `main` en su repositorio de GitHub: `https://github.com/onunez2025/valorizaciones.git`.

---

## Actualizaciones de Homologación en Liquidaciones (25 de Mayo, 2026)

Hemos homologado el comportamiento de expiración de sesión e inactividad en la aplicación **Liquidaciones** (`d:\diego\Documentos\Antigravity\Liquidaciones\liquidaciones`), alineándola al 100% con los estándares del ecosistema:

### 1. Control de Inactividad de 5 Minutos y Validación de Tokens
* **Archivo modificado:** [useAuth.tsx (Liquidaciones)](file:///d:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/hooks/useAuth.tsx)
* **Temporizador de Inactividad:** Se configuró el `useEffect` para detectar interacción y arrancar un temporizador de 5 minutos, redirigiendo de forma rígida a `/login?expired=true` sin estados reactivos intermedios.
* **Redirección de Validación en Segundo Plano:** Modificada la respuesta al fallo de sesión en `validateSession` para limpiar la sesión local e ir directamente a `/login?expired=true`.

### 2. Estandarización de Login y Alerta
* **Archivo modificado:** [LoginPage.tsx (Liquidaciones)](file:///d:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/pages/LoginPage.tsx)
* Se integró `useSearchParams` para detectar la expiración y se renderizó condicionalmente el banner ámbar de sesión expirada usando `SIATC_THEME.LOGIN_LAYOUT.ALERT_EXPIRED`.

### 3. Validación y Despliegue
* Se ejecutó exitosamente `npm run build` en el directorio de **Liquidaciones**.
* Se guardaron y empujaron los cambios a la rama principal `main` en GitHub: `https://github.com/onunez2025/liquidaciones.git`.

---

## Estandarización del Selector de Aplicaciones (App Switcher) del Ecosistema (25 de Mayo, 2026)

Hemos unificado y homogeneizado el módulo de Ecosistema de Aplicaciones (**App Switcher**) en los 6 proyectos basados en React (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**), registrando las 7 aplicaciones oficiales de la plataforma (incluyendo **S-Project**, que corre en Angular):

### 1. Registro de las 7 Aplicaciones del Ecosistema
Estandarizamos el arreglo común de aplicaciones con la siguiente información:
* **S-Project (Angular):** ID: `s-project`, URL: `https://gac-sole-sproject.jppsfv.easypanel.host/`
* **Mesa de Atención (React):** ID: `mesa-atencion`, URL: `https://gac-sole-nc-cxg-cancelaciones.jppsfv.easypanel.host/`
* **Gestor FSM (React):** ID: `gestor-fsm`, URL: `https://gac-sole-gestor-de-tickets-fsm.jppsfv.easypanel.host/`
* **Liquidaciones (React):** ID: `liquidaciones`, URL: `https://gac-sole-liquidaciones.jppsfv.easypanel.host/`
* **Tablero Control (React):** ID: `tablero-control`, URL: `https://gac-sole-tablero-control.jppsfv.easypanel.host/`
* **EBM (React):** ID: `ebm`, URL: `https://gac-sole-ebm.jppsfv.easypanel.host/`
* **Valorizaciones (React):** ID: `valorizaciones`, URL: `https://gac-sole-valorizaciones.jppsfv.easypanel.host/`

### 2. Tokenización en `siatc-theme.ts`
Centralizamos todo el diseño visual en la constante de tokens `SIATC_THEME` mediante la clave `APP_SWITCHER`. Esto garantiza que los estilos de Tailwind estén unificados en un solo lugar en todos los proyectos.

### 3. Homogeneización en 4 Columnas con Filas Indefinidas
* **Archivos modificados:** `AppSwitcher.tsx` en los 6 repositorios React.
* **Maquetación Premium:** Se migró el diseño del selector a una cuadrícula vertical de **4 columnas** (`grid-cols-4`) con ancho expandido a `540px` para albergar cómodamente las celdas en formato vertical (logotipo centrado en la parte superior y nombre del proyecto debajo).
* **Filtrado Dinámico:** Se configuró el switcher para ocultar la propia aplicación activa pasando el prop `currentAppId` correspondiente (desde `MainLayout.tsx`). De este modo, los usuarios ven exactamente 6 aplicaciones (las 5 restantes y S-Project de Angular).

### 4. Corrección de Logotipos Rotos
* Se copiaron los logotipos oficiales `valorizaciones.png` y `mesa-atencion.png` a las carpetas `public/ecosystem-logos` de todos los proyectos para garantizar que carguen correctamente en cualquier app.

### 5. Compilación y Despliegue
* Se ejecutó `npm run build` en todos los repositorios para garantizar cero errores de tipado o compilación (incluyendo la eliminación de dependencias e importaciones sin usar como `ChevronRight`).
* Se staged, commited y empujaron los cambios en los 6 repositorios a sus respectivas ramas de producción.

---

## Estandarización y Tokenización de "Mi Perfil" en el Ecosistema SIATC (26 de Mayo, 2026)

Hemos unificado, estandarizado y tokenizado por completo el módulo de **Mi Perfil** en las 6 aplicaciones del ecosistema (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**), garantizando que consuma el sistema común de tokens de diseño y tenga el mismo aspecto visual premium (basado en EBM):

### 1. Tokenización Absoluta de Colores, Bordes, Fuentes e Iconos
* **Archivo modificado:** `siatc-theme.ts` en los 6 proyectos.
* **Tokens de Perfil (`PROFILE_LAYOUT`):** Se creó e integró un esquema de tokens exhaustivo bajo `SIATC_THEME.PROFILE_LAYOUT` para evitar estilos locales hardcodeados:
  * **Estructura y Rejillas:** Contenedores de página, tarjetas de información, espaciados y rejillas responsivas de 3 columnas (columna izquierda para foto/tarjeta resumen y datos de contacto, columna derecha de doble ancho para configuración del formulario).
  * **Tipografía y Letras:** Estilos tipográficos específicos para títulos de secciones, subtítulos de configuración, notas de pie, etiquetas de formularios y textos de alerta.
  * **Bordes y Colores:** Tokens que definen los colores de fondo de los inputs activos y deshabilitados, colores de borde de error (`border-[#DF2935]`), colores y fondos de los iconos rápidos (gerencia en morado, estado en esmeralda), y los degradados del banner del avatar.
  * **Estados de Alerta:** Clases estandarizadas para las alertas de éxito/error de guardado (`bg-[#E6F6EF]`, `bg-[#FDECEE]`, etc.) y alertas de solo lectura.

### 2. Implementación de ProfilePage Idéntica en los 6 Proyectos
* **Archivos modificados/creados:** `ProfilePage.tsx` en los 6 repositorios.
* **Estructura de Componente Homogénea:**
  * Adoptan el diseño en dos columnas con un banner de degradado premium.
  * Gestión de avatar con previsualización y **compresión automática de imagen** (Base64 JPEG max 256px, garantizando archivos ligeros de ~10-30KB).
  * Campos de Cuenta (Usuario y Correo) en modo solo lectura con advertencia informativa.
  * Campos de Seguridad (Contraseña y Confirmar Contraseña) con validaciones interactivas (mínimo 4 caracteres y validación en tiempo real de coincidencia de password con coloración de borde rojo en caso de discrepancia).
  * Compatibilidad de exportación dual (`export function ProfilePage` y `export default ProfilePage`) para ser consumido indistintamente por los ruteadores de cada proyecto.

### 3. Registro e Integración en Valorizaciones
* **Archivos modificados/creados:** [App.tsx (Valorizaciones)](file:///d:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/App.tsx) y [ProfilePage.tsx (Valorizaciones)](file:///d:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/pages/ProfilePage.tsx).
* Se importó perezosamente (`lazy`) el nuevo componente de perfil y se registró bajo la ruta protegida de `MainLayout`:
  ```tsx
  <Route path="/profile" element={<ProfilePage />} />
  ```
* Esto habilitó inmediatamente la navegación interactiva desde el avatar del header (que ya apuntaba a `/profile` en `MainLayout.tsx`) de forma nativa.

### 4. Compilación y Despliegue Exitoso
* Se ejecutó la compilación de producción (`npm run build`) en todos los repositorios para corroborar la ausencia de cualquier tipo de error de TypeScript, confirmando la homogeneidad y compatibilidad total.
* Se staged, commited y empujaron las modificaciones a las respectivas ramas remotas:
  * **EBM:** Ramas `develop` y `main` (despliegue activo)
  * **Mesa de Atención:** Rama `main` (despliegue activo)
  * **Gestor FSM:** Rama `main` (despliegue activo)
  * **Tablero Control:** Ramas `develop` y `main` (despliegue activo)
  * **Liquidaciones:** Rama `main` (despliegue activo)
  * **Valorizaciones:** Rama `main` (despliegue activo)

---

## Homologación de Datos de Usuario en Backends de Valorizaciones y Liquidaciones (26 de Mayo, 2026)

Hemos solucionado el problema por el cual el correo electrónico aparecía vacío, la gerencia mostraba "Sin gerencia" y la foto de perfil mostraba las iniciales "DM" en **Valorizaciones** y **Liquidaciones** a pesar de compartir la misma base de datos.

### 1. Causa del Error
Al comparar los backends de las aplicaciones que sí funcionaban bien (**Tablero Control**, **Mesa de Atención** y **EBM**) con los de las que fallaban, identificamos que:
* Las consultas SQL de login y validación de sesión (`/api/auth/login` y `/api/auth/me`) en **Valorizaciones** y **Liquidaciones** no realizaban el `LEFT JOIN` con la tabla `EBM.Managements`, lo que impedía recuperar el nombre de la gerencia (`ManagementName`).
* Al momento de estructurar la respuesta JSON final, el objeto `user` devuelto se construía manualmente y omitía los campos `email`, `management_id`, `management_name` y `avatar_url`, descartándolos de la carga útil del frontend.

### 2. Cambios Realizados
* **Archivos modificados:**
  * [server.ts (Valorizaciones)](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/server.ts)
  * [server.ts (Liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/server.ts)
* **Corrección de Queries SQL:** Se actualizó la sentencia para incluir el `LEFT JOIN EBM.Managements m ON u.ManagementId = m.Id` y recuperar la columna `m.Name as ManagementName`.
* **Corrección del JSON de Respuesta:** Se incluyeron de forma explícita las propiedades `email: user.Email`, `management_id: user.ManagementId`, `management_name: user.ManagementName`, y `avatar_url: user.AvatarUrl` en las respuestas de login y de sesión activa (`/api/auth/me`).

### 3. Compilación y Despliegue
* En **Valorizaciones**, se compiló nuevamente el servidor ejecutando `npm run build` sin errores, generando de forma satisfactoria el archivo de producción transpilado `dist-server/server.js`.
* Se staged, commited y empujaron las correcciones en ambos repositorios a la rama `main`:
  * **Valorizaciones:** `3e0214f..main` (empujado a origin).
  * **Liquidaciones:** `48e43af..main` (empujado a origin).

## Auditoría y Estandarización del Modo Oscuro (26 de Mayo, 2026)

Hemos realizado una auditoría exhaustiva y estandarización del Modo Oscuro en los 6 proyectos del ecosistema (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**), asegurando la completa coherencia y previniendo filtraciones de fondos y colores claros en ambos modos (claro y oscuro), todo completamente integrado al sistema de tokenización.

### 1. Homogeneización en `siatc-theme.ts` (Los 6 Proyectos)
Se actualizaron los tokens visuales para utilizar variables CSS semánticas auto-adaptables de Tailwind en lugar de clases estáticas que rompían el modo oscuro:
* **`LAYOUT.CONTENT_CONTAINER`:** Cambiado de `bg-white` a `bg-card` (se adapta automáticamente al modo oscuro).
* **`TABLE.HEADER_ROW`:** Cambiado de `bg-white/95` a `bg-card/95`.
* **`COMPONENTS.INPUT` y `PROFILE_LAYOUT.INPUT_ACTIVE`:** Cambiados de `bg-white` a `bg-card text-cb-text-primary`.
* **`COMPONENTS.MODAL_CONTENT`:** Cambiado de `bg-white` a `bg-card text-cb-text-primary`.
* **`COMPONENTS.BUTTON_SECONDARY`:** Cambiado de `hover:bg-cb-bg` a `hover:bg-cb-bg/50`.
* **`COMPONENTS.CARD_CONTAINER` y `COMPONENTS.KPI_CARD_CONTAINER`:** Cambiados de `bg-white dark:bg-cb-bg` a `bg-card`.

### 2. Corrección de Estilos Claras Estáticas en Componentes y Layouts
Se revisaron las vistas y layouts en todos los proyectos para corregir el uso de clases duras como `bg-white`, `bg-slate-50`, `border-slate-200`, `text-black` y similares en componentes clave:
* **Mesa de Atención:** Corregidos fondos de dashboards (`FSMDashboardPage.tsx`), modales y tablas de configuración (`AccountsPage.tsx`, `CostCentersPage.tsx`, `ManagementsPage.tsx`, `UsersPage.tsx`, `AuditLogPage.tsx`).
* **EBM:** Estandarización de fondos en las vistas de Roles, Cuentas, Usuarios e Historial de Auditoría.
* **Tablero Control:** Corregido el dropdown del `Combobox.tsx` y la vista de Roles para soportar de manera fluida el tema oscuro.
* **Liquidaciones:** Estandarización del panel de filtros, campos de entrada, botones de paginación en `TicketsV2Page.tsx`, y el panel de detalle de pagos en `PaymentsPage.tsx`.
* **Valorizaciones:** Refactorizado el fondo de las pestañas inactivas, modales y tablas en `ValuationsPage.tsx`, así como la sobreescritura de clases en `SettingsPage.tsx`.

### 3. Validación de Compilación de Producción
Se ejecutaron pruebas de compilación en los 6 proyectos mediante `npm run build`, certificando un empaquetado 100% libre de errores sintácticos o discrepancias en TypeScript:
* **EBM:** Compilación exitosa en 20.92s.
* **Mesa de Atención:** Compilación exitosa en 34.85s.
* **Gestor FSM:** Compilación exitosa en 18.98s.
* **Tablero Control:** Compilación exitosa en 28.98s.
* **Liquidaciones:** Compilación exitosa en 17.28s.
* **Valorizaciones:** Compilación exitosa en 10.36s.

### 4. Resguardo e Integración en Control de Versiones
Los cambios correspondientes a cada repositorio fueron agregados, confirmados (`commit`) y enviados (`push`) de forma satisfactoria a sus respectivas ramas remotas (`main`/`develop`), asegurando que todos los entornos queden homologados.

### 5. Plan de Corrección para Homologación Completa
Posteriormente, se llevó a cabo un ajuste exhaustivo en las variables CSS y configuraciones de compilación para homologar discrepancias puntuales observadas en las capturas de Login:
* **EBM y Mesa de Atención:** Se dinamizó la paleta de colores de Tailwind v3 en `tailwind.config.js` mapeándola a variables dinámicas CSS en `src/index.css`. Esto corrigió de manera global el color de las etiquetas de texto de los inputs en modo oscuro (pasando de un gris oscuro ilegible a blanco/gris claro `#F9FAFB`). Asimismo, al dinamizar el token del borde, se eliminó el borde blanco brillante en la caja de login de **Mesa de Atención**, asimilándolo al fondo oscuro de la interfaz.
* **Valorizaciones:** Se cambió la variable `--primary-foreground` en modo oscuro de `#FFFFFF` a `#050F1A` en [index.css (Valorizaciones)](file:///D:/diego/Documentos/Antigravity/Valorizaciones/valorizaciones/src/index.css) para corregir el contraste del botón primario "Iniciar Sesión", logrando que la fuente sea oscura sobre fondo claro de acuerdo al estándar.
* **Liquidaciones:** Se alineó el color de la caja y del fondo del login en modo oscuro a la paleta estándar (`--background: #050F1A` y `--card: #0A1929` en [index.css (Liquidaciones)](file:///D:/diego/Documentos/Antigravity/Liquidaciones/liquidaciones/src/index.css)), y se reconfiguró el botón primario para usar el fondo claro con texto oscuro estándar (`--primary: #707F99` y `--primary-foreground: #050F1A`).

## Redondeado de Contenedores y Contraste de Tarjetas (27 de Mayo, 2026)

Hemos implementado con éxito el plan para resolver las dos inconsistencias visuales en el ecosistema de las 6 aplicaciones (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**):

### 1. Panel de Contenido Flotante Redondeado
* **Margen en Viewport:** En [MainLayout.tsx](file:///D:/diego/Documentos/Antigravity/EBM/src/components/layout/MainLayout.tsx) (y los archivos correspondientes en los otros 5 proyectos), se agregó la clase `pr-4 pb-4` al contenedor principal del viewport (`<div className="flex-1 flex flex-col min-w-0 overflow-hidden relative pr-4 pb-4">`). Esto alinea simétricamente los bordes del contenido con el Sidebar flotante de la izquierda.
* **Tokenización de Bordes Redondeados:** Se actualizó el token `LAYOUT.PAGE_WRAPPER` en [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts) (y los otros 5 proyectos) para incluir `rounded-[2rem] border border-cb-border overflow-hidden shadow-cb-level-1`. Esto dota a todas las páginas de un contenedor con esquinas redondeadas premium y bordes finos.

### 2. Jerarquía y Contraste de Tarjetas en Modo Oscuro
* **Alineación de Fondo:** Se modificó la variable `--cb-bg` en modo oscuro en `index.css` de los 6 proyectos, pasándola de `#0A1929` a `#050F1A`.
* **Profundidad Visual:** Al establecer el fondo del panel al mismo color oscuro que la base de la aplicación (`#050F1A`), las tarjetas interiores (`bg-card`, que usan `--card` establecido en `#0A1929`) y las tablas ahora resaltan de forma clara y nítida, logrando un contraste perfecto en el tema oscuro.

### 3. Validación de Compilación de Producción
Se ejecutaron builds de producción en los 6 proyectos, obteniendo empaquetados 100% exitosos sin ningún error de compilación.

### 4. Control de Versiones y Despliegue
Los cambios fueron confirmados y enviados a sus ramas remotas correspondientes:
* **EBM** y **Tablero Control:** Fusionados en la rama `main` y empujados a `origin`.
* **Mesa de Atención**, **Gestor FSM**, **Liquidaciones** y **Valorizaciones:** Empujados a `main` en sus respectivos repositorios.

## Homologación del Fondo del Sidebar (27 de Mayo, 2026)

Hemos homologado y unificado el fondo de la barra lateral (Sidebar) en las 6 aplicaciones del ecosistema (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**) para eliminar bloques asimétricos de color y limpiar el aspecto general de la interfaz:

### 1. Unificación de Fondo Dinámico
* **Modificación de Token:** Cambiamos el token `SIDEBAR_BG` en [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts) (y los archivos homólogos en los otros 5 proyectos) de `"bg-card"` a `"bg-cb-bg"`.
* **Resultado Estético:** Esto hace que el Sidebar tome el color de fondo dinámico de la aplicación (`#050F1A` en modo oscuro y `#F9FAFB` en modo claro), eliminando el ruido visual que producía el bloque azul más claro (`#0A1929`) en el lateral izquierdo. Las cápsulas de menú activas y los efectos hover ahora flotan de forma limpia y moderna.

### 2. Validación y Despliegue
* Se compiló con éxito en producción (`npm run build`) en todos los 6 proyectos.
* Se confirmaron (`commit`) y empujaron (`push`) las modificaciones a sus respectivas ramas de control de versiones remotas para iniciar las actualizaciones en EasyPanel.

## Homologación y Tokenización Completa del Sidebar (27 de Mayo, 2026)

Hemos culminado con éxito la homologación y tokenización del componente `Sidebar` en los 6 proyectos (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**), asegurando la eliminación definitiva de estilos locales e inline y permitiendo un diseño completamente gobernado por tokens centralizados.

### 1. Creación e Integración de Token de Estructura Interna
* **Nuevo Token:** Declaramos el token `SIATC_THEME.LAYOUT.SIDEBAR_INNER` con el valor `"flex flex-col h-full bg-transparent text-cb-text-primary transition-all duration-500"` en [siatc-theme.ts](file:///D:/diego/Documentos/Antigravity/EBM/src/utils/siatc-theme.ts) (y los homólogos de las otras 5 aplicaciones).
* **Consumo del Token:** Refactorizamos `Sidebar.tsx` en los 6 proyectos para consumir `SIATC_THEME.LAYOUT.SIDEBAR_INNER`, removiendo el borde estático derecho (`border-r border-border/50`) y los fondos hardcodeados (`bg-card`/`bg-white`).
* **Estandarización de Textos y Fuentes:**
  * En **Tablero Control**, cambiamos el texto del Sidebar de `"Tablero Control"` a `"T. Control"` para evitar que la cadena larga se trunque de forma inadecuada.
  * En **Mesa de Atención**, cambiamos el texto de `"Mesa de Atención"` a `"M. Atención"` y elevamos el tamaño de fuente de `text-[13px]` a `text-lg` para unificar el tamaño visual con el de las otras 5 aplicaciones, aplicando además la clase `truncate` para consistencia estructural.
* **Limpieza de Código:** Eliminamos variables y hooks sin utilizar como `useTheme` y `theme` para cumplir con las reglas de compilación estricta de TypeScript (`noUnusedLocals`).

### 2. Control de Versiones y Despliegue
* Confirmamos y empujamos las modificaciones en todos los repositorios:
  * **EBM** y **Tablero Control:** Los cambios se commitearon y subieron a `develop`, se integraron a la rama `main` mediante fast-forward merge y se subieron a `origin main`, regresando posteriormente a la rama de desarrollo `develop`.
  * **Mesa de Atención**, **Gestor FSM**, **Liquidaciones** y **Valorizaciones:** Los cambios se guardaron y empujaron directamente en la rama principal `main`.

---

## Homologación y Tokenización del Módulo de Configuración (27 de Mayo, 2026)

Hemos homologado y unificado el diseño visual y la tokenización del módulo de **Configuración** en las 6 aplicaciones del ecosistema (**EBM**, **Mesa de Atención**, **Gestor FSM**, **Tablero Control**, **Liquidaciones** y **Valorizaciones**), eliminando filtraciones de color claro en modo oscuro y el efecto de "doble borde" en las subpáginas:

### 1. Reconfiguración Estructural del Layout de Configuración
* **Fondo Dinámico en Modo Oscuro:** Modificamos el contenedor raíz de `ConfigLayout.tsx` en los proyectos para consumir el token `SIATC_THEME.LAYOUT.PAGE_WRAPPER`, eliminando fondos estáticos claros (`bg-slate-50`, `bg-slate-50/50`) y resolviendo las fugas grises del modo oscuro.
* **Espaciado y Sidebar:** Estandarizamos el espaciado de rejilla principal a `gap-4` y aplicamos el token de contenedor del sidebar `SIATC_THEME.LAYOUT.SIDEBAR_CONTAINER` mapeado a `bg-card border-cb-border` en todos los paneles laterales de configuración.

### 2. Eliminación de Doble Borde en Subpáginas
* **Layout Transparente:** Removimos la clase de contenedor principal `PAGE_WRAPPER` de todas las subpáginas de configuración (`UsersPage`, `RolesPage`, `AuditLogPage`, `ExchangeRatesPage`, `ManagementsPage`, `CostCentersPage`, `AccountsPage`, etc.).
* En su lugar, se implementó un contenedor transparente y animado:
  ```tsx
  className="flex flex-col h-full space-y-4 min-h-0 animate-in fade-in duration-500"
  ```
* **Contenedores de Contenido:** Forzamos el uso de `SIATC_THEME.LAYOUT.CONTENT_CONTAINER` para encerrar tablas y formularios, lo que reduce el redondeado a `12px` (`rounded-cb-card`) y mantiene un solo borde limpio exterior.
* **Footer de Tabla:** En **Gestor FSM**, reestructuramos el archivo `UsersPage.tsx` para colocar los totales y estadísticas del pie de tabla dentro del `CONTENT_CONTAINER`, evitando que queden huérfanos fuera del borde de la tarjeta.

### 3. Validación de Compilación de Producción (6 Proyectos)
Se realizaron pruebas de build en todos los repositorios para certificar la compatibilidad y correcto tipado:
* **EBM:** Compiló exitosamente.
* **Mesa de Atención:** Compiló exitosamente.
* **Gestor FSM:** Compiló exitosamente.
* **Tablero Control:** Compiló exitosamente.
* **Liquidaciones:** Compiló exitosamente.
* **Valorizaciones:** Compiló exitosamente.

### 4. Git Commit & Push (6 Proyectos)
Todos los cambios fueron staged, commited y empujados de manera exitosa en sus respectivas ramas de despliegue (`main` / `develop`).
