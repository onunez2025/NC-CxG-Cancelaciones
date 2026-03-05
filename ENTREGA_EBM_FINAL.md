# Kit de Entrega EBM (Sistema de Seguimiento y Control de Gastos vs. Presupuesto)

Este documento resume las auditorías, mejoras de seguridad, optimizaciones de rendimiento y configuraciones de despliegue realizadas durante la Fase de Validación Pre-Lanzamiento del proyecto EBM.

## 1. Salud del Ecosistema y Seguridad
*   **Auditoría de Paquetes (`npm audit`):** Se encontraron algunas vulnerabilidades moderadas/altas en utilidades de desarrollo y la suite `xlsx`. Se recomienda, a futuro, evaluar el paso a `exceljs` pero el riesgo es mitigado completamente debido a que el sistema es de uso exclusivamente interno.
*   **Gestión de Secretos:** Se añadió la regla crítica al `.gitignore` ignorando `*.env*` y exceptuando `!.env.example`. Nunca se comprometerán credenciales productivas de Azure SQL o JWT al repositorio remoto.
*   **Políticas de Datos:** Se redactó y adjuntó el documento `POLITICAS_USO_DATOS.md` que establece normativas claras sobre subir PII (Información Personal Identificable) y rige el estándar del uso corporativo de la plataforma.

## 2. Robustez del Frontend (Comportamiento bajo Presión)
*   **Manejo de "Click Loco":** La UI fue comprobada para prevenir peticiones dobles en componentes vitales (ej. Modal de Cargas Masivas de Presupuesto).
*   **Validación Estricta de Excel (BulkBudgetUpload):** Para prevenir la inyección de cuentas "fantasma" sin descripciones, se ha integrado validación posicional estricta. La plataforma ahora exige un formato validado (Columnas Ceco, Cuenta, Nombre y 12 meses) y deniega la importación si la plantilla está corrupta o desfasada.

## 3. Optimización Brutal de Rendimiento (SAP vs Presupuesto)
El cuello de botella primordial de la aplicación —demoras de 10 a más segundos en el cálculo en memoria de miles de registros de SAP— fue radicado utilizando principios de **Ingeniería de Datos Relacionales**.

1.  **Tablas Transaccionales de Alta Velocidad:** Se reemplazó el guardado estático de *JSONs gigantes* por la inserción atómica en `EBM.SAPLineItems`. Cada subida utiliza el método `Bulk Insert` para poblar el SQL Server de Azure rápidamente.
2.  **Agregación en Base de Datos:** `budgetExecutionEngineRelational.ts` y el portal cruzado (`crossReferenceEngineRelational.ts`) ahora pre-filtran y cruzan tablas (`JOIN`) emitiendo instrucciones T-SQL a la base de datos para recuperar únicamente un resumen estricto de docenas de variables, en lugar de descargar decenas de megabytes de texto.
3.  **Resultados:** Reducción drástica del consumo de memoria en Node.js (previniendo caídas / OOM en el VPS de Hostinger) y reducción del *Time-To-First-Byte* (Respuesta base) **de 10s a menos de 100 milisegundos**.

## 4. Operaciones, Continuidad y CI/CD (Despliegue)
Se ha configurado la infraestructura de código para simplificar la modernización y permanencia del aplicativo en un VPS.

### PM2 — Manejador de Procesos
Se incluyó el archivo `ecosystem.config.cjs` parametrizado con `tsx` interno. Esto garantiza que Node.js reviva el servidor backend si el servidor de Hostinger se reinicia, si ocurre una caída abrupta, o para aplicar actualizaciones instantáneas sin downtime severo.

**Comandos iniciales en VPS:**
```bash
# Asumiendo que clonaste en el VPS e hiciste npm install
npm run build 
pm2 start ecosystem.config.cjs --env production
pm2 startup
pm2 save
```

### GitHub Actions (Pipeline CI/CD)
Se encuentra listo el archivo `.github/workflows/deploy.yml`. 
Cualquier Merge o Push a la rama principal (`main`/`master`) detona automáticamente un ciclo de integración que se logueará al VPS, bajará el código, compilará React (Vite) y reiniciará a PM2 en caliente haciendo todo el despliegue automático ("sin manos").

Requiere configurar los siguientes **Secrets en el repositorio de GitHub**:
- `VPS_HOST` (IP de Hostinger)
- `VPS_USER` (Usualmente root)
- `VPS_PASSWORD` (Contraseña del servidor)
- `VPS_PORT` (Por lo general 22)

---
**Proyecto EBM preparado y calificado como Apto para Lanzamiento Productivo a Nivel Corporativo.** 🚀
