# Reporte de pruebas · Quadro MVP v1.0.0

Todos los resultados de este reporte provienen de ejecuciones reales de la suite del repositorio. Los archivos de evidencia (JUnit, JSON, cobertura, reporte HTML de Playwright y mediciones de rendimiento) están en `docs/pruebas/evidencias/` y se pueden regenerar con los comandos de la sección 11.

## 1. Objetivo y alcance

El objetivo es verificar que el MVP cumple los requisitos y criterios de aceptación de las historias HU-01 a HU-10 y HU-13 (Entregables 1 y 2), incluidos los casos de error y los requisitos no funcionales que se pueden medir. Siguiendo el plan preliminar (sección 13.1 del Entregable 2), solo se prueban funciones del MVP. Se usan los mismos datos de prueba del plan: un grupo con Ana (administradora), Bruno y Carla.

## 2. Entorno de ejecución

| Elemento | Valor |
|---|---|
| Ejecución final | 5 de noviembre de 2026, 09:22 (hora de Bogotá), rama `release/v1.0.0`, commit `fec79e8`, sobre un clon limpio del repositorio (`npm ci` desde cero) |
| Sistema | Linux (Ubuntu 24.04), Node.js 22.23.4, npm 10.9.9 |
| Base de datos | PostgreSQL 16.15 local, bases independientes `quadro_test` y `quadro_e2e`, que se borran al iniciar cada ejecución |
| Navegador E2E | Chrome for Testing 153 (escritorio 1366 × 860 y celular emulado Pixel 7 de 390 × 844) |
| Herramientas | Vitest 5.1.0, Supertest 7.3.1, Playwright 1.64.1, cobertura V8, ESLint 10.14.0 |

## 3. Estrategia

| Nivel | Qué verifica | Herramienta | Archivos |
|---|---|---|---|
| Unitarias (PU) | Reglas puras: reparto, redondeo, saldos, deudas y validaciones de entrada y de archivos | Vitest | `server/tests/unit/*.test.js` |
| Integración (PI) | Las tres capas juntas a través de la API real: permisos, transacciones, privacidad y errores | Vitest + Supertest + PostgreSQL | `server/tests/integration/*.test.js` |
| Extremo a extremo (E2E) | Flujos completos en el navegador, como los haría una persona, en escritorio y celular | Playwright + Chrome | `e2e/*.spec.js` |
| No funcionales | RNF-01 a RNF-07 y RNF-09 con umbrales definidos (sección 8) | Incluidas en PI y E2E | — |
| Estática | Errores de código y malas prácticas | ESLint | `npm run lint` |

Los ID PU-01 a PU-08 y PI-01 a PI-07 son los del plan del Entregable 2; los siguientes (PU-09 en adelante, PI-08 en adelante y E2E-01 a E2E-16) amplían la cobertura a las historias que el plan no detallaba.

## 4. Resumen de resultados

| Nivel | Pruebas | Pasaron | Fallaron |
|---|---|---|---|
| Unitarias | 37 | 37 | 0 |
| Integración | 46 | 46 | 0 |
| E2E escritorio | 15 | 15 | 0 |
| E2E celular | 1 | 1 | 0 |
| **Total** | **99** | **99** | **0** |

Las unitarias y de integración tardaron 12,9 s con medición de cobertura; las 16 E2E, 31,5 s con la compilación del frontend. ESLint terminó sin errores ni advertencias en el backend y el frontend.

### 4.1 Cobertura del backend (V8)

| Métrica | Total | `domain/reparto.js` | `domain/saldos.js` |
|---|---|---|---|
| Líneas | 93,3 % | 98,1 % | 100 % |
| Sentencias | 90,2 % | 98,5 % | 97,9 % |
| Ramas | 80,2 % | 97,4 % | 92,0 % |
| Funciones | 95,5 % | 100 % | 100 % |

Se excluyen de la medición `server.js` (arranque) y `seed-demo.js` (datos de demostración). El detalle por archivo está en `evidencias/cobertura/index.html`.

### 4.2 Comprobación de que las pruebas detectan fallos (mutación manual)

Para confirmar que las pruebas no pasan "por defecto", se introdujeron dos errores a propósito, se ejecutaron las pruebas y luego se revirtió el cambio:

| Error introducido | Pruebas que fallaron |
|---|---|
| El sobrante del reparto igual se asigna al último participante en lugar del primero | PU-02, PU-09 y PI-04a (3 fallos) |
| Se elimina la verificación de permisos para editar o anular gastos | PI-06b (1 fallo) |

## 5. Matriz de trazabilidad

| Requisito | Historia | Unitarias | Integración | E2E | Estado |
|---|---|---|---|---|---|
| RF-01 Registrar usuarios | HU-01 | PU-29, PU-30 | PI-01a, PI-01b, PI-01c | E2E-01 | Cumple |
| RF-02 Iniciar y cerrar sesión | HU-01 | — | PI-01d, PI-01e, PI-01g, PI-12 | E2E-15 | Cumple |
| RF-03 Crear grupo | HU-02 | PU-08, PU-28 | PI-02a, PI-02b, PI-02c, PI-02d | E2E-02 | Cumple |
| RF-04 Gestionar participantes | HU-03 | — | PI-03a a PI-03e | E2E-03 | Cumple |
| RF-05 Registrar gastos | HU-04 | PU-05, PU-31 a PU-33, PU-37 | PI-04a, PI-04d, PI-04e | E2E-04 | Cumple |
| RF-06 Método de distribución | HU-05 | PU-01, PU-03, PU-04, PU-11 a PU-16, PU-18, PU-19 | PI-04b, PI-04c | E2E-05 | Cumple |
| RF-07 Parte de cada participante | HU-05 | PU-01, PU-02, PU-09, PU-10, PU-20 | PI-04a | E2E-04, E2E-05 | Cumple |
| RF-08 Aportes, obligaciones y saldo | HU-06 | PU-06, PU-07, PU-21 a PU-23 | PI-05a, PI-05c | E2E-06 | Cumple |
| RF-09 Comprobantes | HU-08 | PU-34 a PU-36 | PI-10a a PI-10d | E2E-07 | Cumple |
| RF-10 Editar y eliminar (anular) gastos | HU-09 | PU-21 | PI-06a, PI-06b, PI-06c | E2E-09, E2E-10 | Cumple |
| RF-11 Categorías | HU-10 | — | PI-09a, PI-09b, PI-09c | E2E-11 | Cumple |
| RF-12 Historial con filtros | HU-07 | — | PI-07a, PI-07b | E2E-08 | Cumple |
| RF-17 Resumen financiero | HU-06 | — | PI-05a, PI-02c | E2E-06 | Cumple (sin presupuesto, que es posterior) |
| RF-18 Movimientos por participante | HU-07 | — | PI-07a (filtro por participante) | — | Cumple en forma básica |
| RF-19 Liquidaciones | HU-13 | PU-22, PU-24 a PU-27 | PI-08a a PI-08e | E2E-12 | Cumple |
| RNF-01 Autenticación | HU-01 | — | PI-01f | E2E-14 | Cumple |
| RNF-02 Autorización | HU-03, HU-09 | — | PI-02d, PI-03b, PI-06b, PI-08d, PI-09b, PI-10c | — | Cumple |
| RNF-03 Integridad y redondeo | HU-05 | PU-02, PU-09, PU-11, PU-12, PU-20 | PI-04a, PI-04c | E2E-05 | Cumple |
| RNF-04 Privacidad | HU-06 | — | PI-05b, PI-03d | E2E-13 | Cumple |
| RNF-05 Mensajes de error comprensibles | Todas | PU-08, PU-29, PU-32 | PI-01b, PI-02b, PI-04d, PI-11a | E2E-01, E2E-02, E2E-05 | Cumple |
| RNF-06 Rendimiento | HU-06, HU-07 | — | RNF-06 | — | Cumple (sección 8) |
| RNF-07 Compatibilidad | Todas | — | — | E2E-16 y suite de escritorio | Cumple en Chrome. Otros navegadores no se probaron |
| RNF-08 Mantenibilidad | — | — | — | — | Cumple: código por módulos, lógica de cálculo documentada, ESLint sin errores |
| RNF-09 Archivos adjuntos | HU-08 | PU-34, PU-35, PU-36 | PI-10b | E2E-07 | Cumple |

## 6. Detalle de las pruebas del plan del Entregable 2

| ID | HU / Requisito | Caso | Resultado esperado | Resultado obtenido |
|---|---|---|---|---|
| PU-01 | HU-05 / RF-06, RF-07 | $90.000 en partes iguales entre 3 | Tres repartos de $30.000 | Pasó |
| PU-02 | HU-05 / RNF-03 | $100.000 en partes iguales entre 3 | $33.334, $33.333 y $33.333 (suman $100.000) | Pasó |
| PU-03 | HU-05 / RF-06 | $200.000 con 50 %, 30 % y 20 % | $100.000, $60.000 y $40.000 | Pasó |
| PU-04 | HU-05 / RF-06 | Porcentajes que suman 90 % | Se rechaza: "Los porcentajes deben sumar 100 %. Actualmente suman 90 %." | Pasó |
| PU-05 | HU-04 / RF-05 | Importe en $0 o negativo | Se rechaza el gasto | Pasó |
| PU-06 | HU-06 / RF-08 | Ana paga $90.000 repartidos entre 3 | Ana +$60.000, Bruno −$30.000, Carla −$30.000 | Pasó |
| PU-07 | HU-06 / RF-08 | Grupo sin gastos | Todos los saldos en $0 | Pasó |
| PU-08 | HU-02 / RF-03 | Crear grupo sin nombre | Se rechaza, con el mensaje del campo | Pasó |
| PI-01 | HU-01 / RF-01, RF-02, RNF-01 | Registrarse, ingresar y entrar a una función privada sin sesión (PI-01a a PI-01g) | Con datos válidos entra; sin sesión se niega el acceso (401) | Pasó (7 casos) |
| PI-02 | HU-02 / RF-03 | Crear grupo (DS-01) (PI-02a a PI-02d) | Se guardan el grupo y la participación del creador como ADMINISTRADOR | Pasó (4 casos) |
| PI-03 | HU-03 / RF-04 | Agregar participante como administrador y como integrante (PI-03a a PI-03e) | Solo el administrador puede hacerlo (403 para el integrante) | Pasó (5 casos) |
| PI-04 | HU-04, HU-05 / RF-05 a RF-07 | Registrar gasto con reparto (DS-02) (PI-04a a PI-04e) | Estado REGISTRADO y repartos que suman el importe; si algo falla no se guarda nada | Pasó (5 casos) |
| PI-05 | HU-06 / RF-08, RNF-04 | Consultar saldos como integrante y como usuario de otro grupo (PI-05a a PI-05c) | El integrante ve los saldos; el externo recibe 404 sin datos | Pasó (3 casos) |
| PI-06 | HU-09 / RF-10 | Editar el importe de un gasto (PI-06a a PI-06c) | Estado MODIFICADO y saldos recalculados | Pasó (3 casos) |
| PI-07 | HU-07 / RF-12 | Filtrar el historial por fecha (PI-07a, PI-07b) | Solo aparecen los gastos de esas fechas (y de la categoría o participante elegidos) | Pasó (2 casos) |

## 7. Pruebas adicionales

### 7.1 Unitarias (PU-09 a PU-37)

| ID | Caso | Resultado |
|---|---|---|
| PU-09 | $100.001 entre 3: los dos pesos sobrantes van a los dos primeros | Pasó |
| PU-10 | Un solo participante asume todo el gasto | Pasó |
| PU-11 | Porcentajes 33,33 / 33,33 / 33,34 de $100.000 conservan el total | Pasó |
| PU-12 | $10.001 por porcentajes: la suma sigue siendo exacta (mayor residuo) | Pasó |
| PU-13 | Porcentaje cero, negativo o con tres decimales se rechaza | Pasó |
| PU-14 | Valores que suman el importe se aceptan | Pasó |
| PU-15 | Valores que no suman el importe se rechazan con el detalle | Pasó |
| PU-16 | Valores con decimales o en cero se rechazan | Pasó |
| PU-17 | Importe con centavos se rechaza | Pasó |
| PU-18 | Sin participantes o con participantes repetidos se rechaza | Pasó |
| PU-19 | Método de distribución desconocido se rechaza | Pasó |
| PU-20 | 500 importes aleatorios entre 1 y 12 personas: la suma siempre es el total y la diferencia máxima es $1 | Pasó |
| PU-21 | Los gastos anulados no afectan los saldos | Pasó |
| PU-22 | Una liquidación de Bruno a Ana ajusta ambos saldos | Pasó |
| PU-23 | Invariante: la suma de los saldos del grupo es 0 | Pasó |
| PU-24 | Cada participante le debe su parte a quien pagó | Pasó |
| PU-25 | Deudas cruzadas entre dos personas se compensan | Pasó |
| PU-26 | Una liquidación total cancela la deuda; las anuladas no cuentan | Pasó |
| PU-27 | Las deudas son coherentes con los saldos netos | Pasó |
| PU-28 | El nombre del grupo se recorta y la descripción vacía queda en null | Pasó |
| PU-29 | El registro inválido informa el error de cada campo | Pasó |
| PU-30 | El correo se normaliza a minúsculas | Pasó |
| PU-31 | Un gasto completo es válido | Pasó |
| PU-32 | Gasto sin descripción ni categoría y con fecha imposible: errores por campo | Pasó |
| PU-33 | Importe en texto con centavos se rechaza | Pasó |
| PU-34 | El tipo real del archivo se detecta por su firma (PNG, JPG, PDF, WEBP) | Pasó |
| PU-35 | Un texto renombrado como imagen no se acepta | Pasó |
| PU-36 | El nombre del archivo se limpia de rutas y caracteres peligrosos | Pasó |
| PU-37 | Solo se aceptan fechas reales AAAA-MM-DD | Pasó |

### 7.2 Integración (PI-08 a PI-12 y RNF-06)

| ID | HU / Requisito | Caso | Resultado |
|---|---|---|---|
| PI-08a | HU-13 / RF-19 | Liquidación válida queda guardada y actualiza los saldos | Pasó |
| PI-08b | HU-13 | Pago parcial deja el resto pendiente | Pasó |
| PI-08c | HU-13 | Importe mayor que la deuda (400), deuda inexistente (409), emisor igual al receptor (400) | Pasó |
| PI-08d | HU-13 / RNF-02 | Un integrante no involucrado recibe 403; el administrador sí puede registrarla | Pasó |
| PI-08e | HU-13 | Anular una liquidación devuelve la deuda | Pasó |
| PI-09a | HU-10 / RF-11 | Categoría nueva disponible para clasificar gastos | Pasó |
| PI-09b | HU-10 | Nombre corto (400), repetido (409), integrante sin permiso (403) | Pasó |
| PI-09c | HU-10 | Renombrar; no se elimina si tiene gastos (409) | Pasó |
| PI-10a | HU-08 / RF-09 | PNG y PDF adjuntos, listados y descargados byte a byte | Pasó |
| PI-10b | HU-08 / RNF-09 | Archivo disfrazado, de más de 2 MB o ausente se rechaza | Pasó |
| PI-10c | HU-08 / RNF-02 | Solo personas autorizadas eliminan comprobantes | Pasó |
| PI-10d | HU-08 | No se adjunta a un gasto anulado | Pasó |
| PI-11a | RNF-05 | JSON mal formado, ruta inexistente e identificadores inválidos dan mensajes claros | Pasó |
| PI-11b | Seguridad | Cabeceras CSP y `nosniff`, sin `X-Powered-By` | Pasó |
| PI-11c | Seguridad | Un intento de inyección SQL se guarda como texto literal | Pasó |
| PI-12 | Seguridad | Tras 3 intentos fallidos de ingreso, el siguiente recibe 429 | Pasó |
| RNF-06 | RNF-06 | Historial y saldos con 150 gastos en menos de 500 ms | Pasó |

### 7.3 Extremo a extremo (E2E)

| ID | HU / Requisito | Flujo en el navegador | Resultado |
|---|---|---|---|
| E2E-01 | HU-01 | Registro vacío muestra un error por campo; con datos válidos crea la cuenta y abre "Mis grupos" | Pasó |
| E2E-02 | HU-02 | Crear grupo sin nombre muestra error; con nombre queda creado y el usuario es administrador | Pasó |
| E2E-03 | HU-03 | Correo sin cuenta muestra error; Bruno y Carla quedan agregados | Pasó |
| E2E-04 | HU-04, HU-05 | Gasto de $90.000 en partes iguales con vista previa de $30.000 por persona | Pasó |
| E2E-05 | HU-05, RNF-03 | Porcentajes 50/30/10 rechazados en la vista previa y por el servidor; con 50/30/20 se guarda | Pasó |
| E2E-06 | HU-06 | Balanza: Ana +$160.000, Bruno −$90.000, Carla −$70.000, y dos deudas pendientes | Pasó |
| E2E-07 | HU-08 | Adjuntar un PNG desde el detalle del gasto | Pasó |
| E2E-08 | HU-07 | Filtro por categoría y botón "Limpiar filtros" | Pasó |
| E2E-09 | HU-09 | Editar el importe a $120.000: estado "Modificado" y saldos recalculados (Ana +$180.000) | Pasó |
| E2E-10 | HU-09 | Anular con confirmación: sale del historial y de los saldos y aparece con "Mostrar gastos anulados" | Pasó |
| E2E-11 | HU-10 | "insumos" repetido se rechaza; "Publicidad" se crea | Pasó |
| E2E-12 | HU-13 | Bruno ve su deuda de $100.000, intenta pagar $200.000 (rechazado), paga $50.000 y su saldo queda en −$50.000 | Pasó |
| E2E-13 | RNF-04 | Un usuario externo abre la dirección del grupo y ve "No encontramos este grupo" sin datos | Pasó |
| E2E-14 | RNF-01 | Sin sesión, `/grupos` redirige a "Ingresar" | Pasó |
| E2E-15 | HU-01 | Contraseña incorrecta muestra "Correo o contraseña incorrectos." | Pasó |
| E2E-16 | RNF-07 | En 390 px: menú, saldos y registro de gasto sin desplazamiento horizontal | Pasó |

## 8. Requisitos no funcionales con umbral definido

El Entregable 1 dejó pendientes los valores de RNF-06, RNF-07 y RNF-09 hasta elegir la tecnología. Se fijaron así antes de ejecutar las pruebas:

| RNF | Umbral | Medición | Resultado |
|---|---|---|---|
| RNF-06 | Historial y saldos de un grupo con 150 gastos y 3 integrantes en menos de 500 ms (peor de 5 mediciones, PostgreSQL local) | Peor tiempo en la ejecución final: saldos 20,1 ms, historial 18,2 ms (`evidencias/rnf06-rendimiento.json`) | Cumple |
| RNF-07 | Chrome actual, en escritorio (1366 px) y celular (390 px), sin desplazamiento horizontal | 15 E2E en escritorio y E2E-16 en celular | Cumple en Chrome |
| RNF-09 | JPG, PNG, WEBP o PDF; máximo 2 MB; máximo 5 por gasto | PU-34, PU-35, PI-10b | Cumple |

## 9. Defectos encontrados y corregidos

Todos los defectos se encontraron durante el desarrollo o la verificación final de esta entrega y se corrigieron antes de la ejecución final. Después de cada corrección se volvió a ejecutar la suite completa.

| ID | Detectado por | Descripción | Corrección | Verificación |
|---|---|---|---|---|
| DEF-01 | Primera ejecución de integración (advertencia de `pg`) | El cálculo de saldos lanzaba consultas en paralelo sobre la misma conexión dentro de una transacción | Consultas en secuencia en `saldos.service.js` | 83/83 sin advertencias |
| DEF-02 | Revisión visual a 390 px | La pestaña Saldos se desbordaba horizontalmente (unos 810 px) porque la tabla forzaba el ancho de la rejilla | `min-width: 0` en los elementos de la rejilla | E2E-16 comprueba el ancho ≤ 390 px |
| DEF-03 | E2E-12 (falló) | El servidor escribía "$ 100.000" y la interfaz "$100.000" | Formato colombiano unificado en `domain/reparto.js` | E2E-12 pasa |
| DEF-04 | Revisión de capturas | Los formularios conservaban el error de un campo después de corregirlo | El error se borra al editar el campo | Capturas 04 y 15 |
| DEF-05 | Revisión de capturas | El saldo del menú lateral no cambiaba al registrar gastos o liquidaciones | Se recarga la lista tras cada cambio | Capturas 09 y 10 |
| DEF-06 | Revisión visual | Las cifras tabulares de la fuente separaban los puntos de miles, y la marca del logotipo era invisible sobre el fondo verde | Cifras proporcionales y variante clara del logotipo | Capturas |
| DEF-07 | Diseño de PU-32 | Concordancia de género incorrecta: "La categoría es obligatorio." | Mensajes generados según el artículo | PU-32 pasa |
| DEF-08 | ESLint | Un error relanzado perdía su causa original (`preserve-caught-error`) | `{ cause: error }` en `migrate.js` | Lint sin errores |
| DEF-09 | Revisión visual | El mismo error de reparto aparecía tres veces en el formulario de gasto | Mensaje general corto y uno solo junto al reparto | Captura 07 |
| DEF-10 | Revisión visual | Fechas largas ("1 de nov de 2026") partidas en dos líneas; texto "le debe a ti" | Formato "1 nov 2026" y textos "te debe" y "Le debes a" | Capturas 09 y 10 |
| DEF-11 | Revisión de seguridad durante la verificación final | La política de contenido en producción incluía `upgrade-insecure-requests`, que podía impedir cargar la app en `http://localhost` (Docker Compose) | Se retira la directiva; en Render el proveedor ya fuerza HTTPS | Ingreso y saldos en Chrome en modo producción por `http://localhost`, sin solicitudes fallidas |
| DEF-12 | Verificación final (Playwright no leía `.env`) | `CHROME_PATH` definido en `.env` no llegaba a la configuración de Playwright | `playwright.config.js` carga `.env` | `npm run test:e2e` en el clon limpio |

Ajustes a los guiones de prueba (no eran defectos del producto):

- E2E-01 esperaba "Ingresa un correo electrónico válido." con el correo vacío, pero el sistema responde correctamente "El correo es obligatorio." Se corrigió la expectativa.
- PI-08d se rediseñó antes de su primera ejecución: el administrador del caso original también era el receptor, así que no probaba el permiso del administrador no involucrado.
- E2E-05 falló una vez en el clon limpio porque el aviso "Gasto registrado" del paso anterior seguía en pantalla y había dos avisos iguales. La prueba dependía del tiempo; ahora espera el aviso más reciente. Después del ajuste la suite E2E se ejecutó cuatro veces seguidas con 16 de 16 aprobadas.

## 10. Lo que no se probó

- Navegadores distintos de Chrome (Firefox, Safari, Edge) y dispositivos físicos: el celular se emuló.
- Construcción de la imagen Docker: Docker Hub no estaba disponible en el entorno de pruebas. Los comandos que ejecuta el `Dockerfile` (`npm ci`, `npm run build`, `npm ci --omit=dev --workspace server` y el arranque) se probaron sin Docker.
- Despliegue en un servidor público (Render + Neon) y pruebas de carga con usuarios simultáneos.
- Accesibilidad con lectores de pantalla reales. Se aplicaron etiquetas, foco visible y contraste AA, pero sin auditoría con un lector.

## 11. Cómo reproducir

```bash
npm install
cp .env.example .env        # configurar TEST_DATABASE_URL, E2E_DATABASE_URL y JWT_SECRET
npm run lint
npm run test:report --workspace server   # unitarias + integración + cobertura → server/tests/reports
npm run test:e2e                         # E2E → e2e/output (JUnit, JSON y reporte HTML)
```

## 12. Evidencias incluidas

| Archivo | Contenido |
|---|---|
| `evidencias/junit-backend.xml`, `evidencias/resultados-backend.json` | Resultado de las 83 pruebas de backend |
| `evidencias/cobertura/` | Reporte HTML de cobertura y `coverage-summary.json` |
| `evidencias/rnf06-rendimiento.json` | Mediciones de RNF-06 |
| `evidencias/junit-e2e.xml`, `evidencias/resultados-e2e.json` | Resultado de las 16 pruebas E2E |
| `evidencias/reporte-e2e-html/` | Reporte HTML de Playwright (abrir `index.html`) |
| `evidencias/salida-consola.txt` | Salida de consola de la ejecución final |
| `../manual/capturas/` | Capturas reales tomadas por las pruebas E2E |
