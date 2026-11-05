# Manual técnico y de despliegue · Quadro

Versión 1.0.0 del MVP (Entregable 3). Proyecto de Ingeniería de Software, Universidad Católica Luis Amigó. Integrantes: Mariana Piedrahita y Sara Melisa Sánchez Vásquez.

## 1. Propósito del documento

Este manual explica cómo está construido Quadro y cómo instalarlo, configurarlo, ejecutarlo, modificarlo y desplegarlo. Está dirigido a quien deba mantener el sistema o evaluarlo técnicamente. Describe el código del repositorio tal como se entrega en la versión 1.0.0.

## 2. Resumen del sistema

Quadro es una aplicación web responsive para pequeños emprendimientos de dos o más personas que comparten gastos. Cada grupo registra lo que paga cada integrante, reparte el gasto en partes iguales, por porcentajes o por valores específicos, y la aplicación calcula los saldos y las deudas entre integrantes. Las deudas se saldan registrando liquidaciones.

Alcance implementado: RF-01 a RF-12, RF-17, RF-19, RF-18 en forma básica (filtro por participante), HU-01 a HU-10 y HU-13. Quedan para versiones posteriores, como lo define el Entregable 1: RF-13 (presupuesto), RF-14 a RF-16 (inventario y alertas) y RF-20 (auditoría detallada).

## 3. Tecnologías y dependencias

| Capa | Paquete | Versión | Para qué se usa |
|---|---|---|---|
| Entorno | Node.js | 22 (mínimo 20) | Ejecución del backend y de las herramientas |
| Entorno | PostgreSQL | 16 (mínimo 14) | Base de datos relacional |
| Backend | express | 5.3.0 | Servidor HTTP y rutas de la API |
| Backend | pg | 8.23.1 | Conexión a PostgreSQL con consultas parametrizadas |
| Backend | zod | 4.6.7 | Validación de datos de entrada con mensajes en español |
| Backend | bcryptjs | 3.0.3 | Hash de contraseñas |
| Backend | jsonwebtoken | 9.0.3 | Token de sesión firmado |
| Backend | cookie-parser | 1.4.7 | Lectura de la cookie de sesión |
| Backend | helmet | 8.3.0 | Cabeceras de seguridad HTTP |
| Backend | express-rate-limit | 8.7.3 | Límite de intentos de ingreso |
| Backend | multer | 2.5.0 | Recepción de comprobantes (multipart) |
| Frontend | react, react-dom | 19.3.1 | Interfaz de usuario |
| Frontend | react-router-dom | 7.18.5 | Navegación entre pantallas |
| Frontend | vite, @vitejs/plugin-react | 8.3.5, 6.2.1 | Servidor de desarrollo y compilación |
| Frontend | @fontsource-variable/schibsted-grotesk | 5.3.0 | Tipografía de la identidad, servida desde la propia app |
| Pruebas | vitest, @vitest/coverage-v8 | 5.1.0 | Pruebas unitarias e integración y cobertura |
| Pruebas | supertest | 7.3.1 | Llamadas HTTP a la API en las pruebas de integración |
| Pruebas | @playwright/test | 1.64.1 | Pruebas E2E en navegador y capturas del manual |
| Calidad | eslint | 10.14.0 | Análisis estático |

Las versiones exactas quedan fijadas en `package-lock.json`. `npm audit` reporta 4 avisos de severidad moderada en `minimatch`, que solo usa ESLint durante el desarrollo. No afectan la aplicación en ejecución.

## 4. Arquitectura

![Arquitectura de Quadro](diagramas/arquitectura.png)

Quadro sigue la arquitectura cliente-servidor en tres capas propuesta en el Entregable 2:

- **Presentación (cliente):** aplicación React de una sola página. Muestra formularios, historial, saldos y liquidaciones, y nunca accede a la base de datos.
- **Lógica de negocio (API REST):** Express con middlewares de seguridad, sesión, membresía y validación. Cada módulo se organiza en rutas → controlador → servicio → repositorio. Las reglas de cálculo están aisladas en `server/src/domain` como funciones puras.
- **Persistencia:** PostgreSQL con integridad referencial y restricciones. Las operaciones que escriben varias tablas se ejecutan en una transacción.

En producción, un solo proceso Node sirve la API (`/api/*`) y los archivos compilados del frontend. Así la cookie de sesión es del mismo origen y no hace falta configurar CORS.

### 4.1 Módulos del backend

| Módulo | Responsabilidad | HU / RF |
|---|---|---|
| `auth` | Registro, ingreso, salida y perfil | HU-01 · RF-01, RF-02 |
| `grupos` | Crear, listar, consultar y editar grupos | HU-02 · RF-03 |
| `participantes` | Agregar por correo y retirar integrantes | HU-03 · RF-04 |
| `categorias` | Categorías por grupo | HU-10 · RF-11 |
| `gastos` | Registrar, consultar, editar y anular gastos y repartos | HU-04, 05, 07, 09 · RF-05 a 07, 10, 12 |
| `saldos` | Saldos, deudas y resumen financiero | HU-06 · RF-08, RF-17 |
| `liquidaciones` | Pagos entre integrantes | HU-13 · RF-19 |
| `comprobantes` | Archivos adjuntos a gastos | HU-08 · RF-09 |

### 4.2 Recorrido de una solicitud: registrar un gasto (DS-02)

1. La interfaz envía `POST /api/grupos/:grupoId/gastos` con la cookie de sesión.
2. `requiereSesion` verifica el token (RNF-01) y `requiereMembresia` comprueba que el usuario sea integrante activo del grupo (RNF-04).
3. `validar(esquemaGasto)` revisa tipos y formatos con Zod y responde 400 con el error de cada campo si algo falla (RNF-05).
4. `gastos.service.crear` abre una transacción y bloquea la fila del grupo (`SELECT … FOR UPDATE`). Luego comprueba que la fecha no sea futura, que la categoría sea del grupo y que el pagador y los participantes estén activos. Después calcula el reparto con `domain/reparto.js`.
5. El repositorio inserta el gasto y sus repartos. Si cualquier paso falla, se hace `ROLLBACK` y no queda nada guardado.
6. La API responde 201 con el gasto completo. Los saldos se recalculan en la siguiente consulta porque siempre se derivan de los movimientos vigentes.

## 5. Estructura del código

```
server/src/
  app.js                 Construye la aplicación Express (se reutiliza en las pruebas)
  server.js              Aplica migraciones e inicia el servidor
  config/env.js          Lee y valida las variables de entorno
  db/pool.js             Pool de conexiones y transacciones
  db/migrate.js          Ejecutor de migraciones
  db/migrations/*.sql    Esquema versionado
  db/seed-demo.js        Datos de demostración
  domain/reparto.js      Distribución de gastos y regla de redondeo
  domain/saldos.js       Saldos y deudas
  middlewares/           autenticacion, membresia, validar, manejoErrores
  modules/<modulo>/      *.routes.js, *.controller.js, *.service.js, *.repository.js, *.schemas.js
  utils/                 errores, esquemas reutilizables, fechas
client/src/
  api/cliente.js         Todas las llamadas a la API y conversión de errores
  context/               Sesión y lista de grupos
  components/            Logo, Campo, Dialogo, Avisos, Estados, Marco, Icono
  pages/                 Acceso, MisGrupos, grupo/* (Saldos, Gastos, FormularioGasto, DetalleGasto, Liquidaciones, Integrantes, Categorias)
  styles/                tokens.css, base.css, componentes.css, diseno.css, paginas.css
```

## 6. Base de datos

![Modelo de datos](diagramas/modelo-datos.png)

El esquema está en `server/src/db/migrations/001_esquema_inicial.sql`. Parte de las seis clases del diagrama de clases del Entregable 2 y agrega `categoria` y `comprobante`.

| Tabla | Contenido | Restricciones principales |
|---|---|---|
| `usuario` | Cuenta: nombre, correo, hash de contraseña | Correo único y en minúsculas |
| `grupo` | Emprendimiento o grupo | Nombre de 3 caracteres o más, estado ACTIVO o ARCHIVADO |
| `participacion` | Pertenencia de un usuario a un grupo, con rol y estado | Única por (grupo, usuario); rol ADMINISTRADOR o INTEGRANTE |
| `categoria` | Categorías de gasto del grupo | Nombre único por grupo sin distinguir mayúsculas |
| `gasto` | Descripción, importe, fecha, categoría, pagador, método y estado | Importe > 0; método IGUAL, PORCENTAJE o VALOR; estado REGISTRADO, MODIFICADO o ANULADO |
| `reparto_gasto` | Parte asignada a cada participación | Única por (gasto, participación); importe ≥ 0 |
| `liquidacion` | Pago del emisor al receptor | Importe > 0; emisor ≠ receptor; estado REGISTRADA o ANULADA |
| `comprobante` | Archivo del gasto en `BYTEA` | Tipo JPG, PNG, WEBP o PDF; máximo 2 MB |

Decisiones del modelo:

- **Identificadores UUID** (`gen_random_uuid()`), como en el diagrama de clases. Evitan que se puedan adivinar.
- **Pagador, emisor, receptor y registrador apuntan a `participacion`**, no a `usuario`. Así la base de datos garantiza que pertenecen al mismo grupo del movimiento.
- **Importes en `INTEGER` (pesos enteros).** El plan de pruebas del Entregable 2 trabaja con pesos sin centavos (PU-02: 33.334, 33.333, 33.333). El límite por gasto es de $1.000.000.000.
- **Los saldos no se guardan.** Se calculan desde los gastos y liquidaciones vigentes, así nunca quedan desactualizados tras editar o anular.
- **Comprobantes dentro de PostgreSQL.** Persisten aunque el servidor se redespliegue en servicios con disco temporal, como Render gratuito.

### 6.1 Migraciones

`npm run db:migrate` ejecuta, en orden alfabético, los archivos `.sql` que aún no estén en la tabla `schema_migraciones`. Cada archivo se aplica en su propia transacción. El servidor también las ejecuta al iniciar. Para cambiar el esquema se crea un archivo nuevo (`002_…sql`); una migración ya aplicada no se edita.

## 7. Reglas de negocio

### 7.1 Reparto (RF-06, RF-07, RNF-03)

Función: `calcularReparto({ importe, metodo, participantes })` en `server/src/domain/reparto.js`.

| Método | Regla | Ejemplo |
|---|---|---|
| Partes iguales | División entera. Los pesos sobrantes van, de a uno, a los primeros participantes en orden de ingreso al grupo | $100.000 / 3 → $33.334, $33.333, $33.333 |
| Porcentajes | Máximo dos decimales, cada uno > 0 y en total 100 %. Se toma la parte entera y los sobrantes van a la mayor fracción (método del mayor residuo) | $200.000 con 50/30/20 → $100.000, $60.000, $40.000 |
| Valores | Enteros > 0 que deben sumar exactamente el importe | $45.000 → $15.000 + $30.000 |

En todos los casos la suma de los repartos es igual al importe; la prueba PU-20 lo verifica con 500 importes aleatorios. La interfaz importa esta misma función (alias `@dominio` en Vite) para mostrar la vista previa, y el servidor la vuelve a ejecutar al guardar.

### 7.2 Saldos y deudas (RF-08, RF-19)

- `saldo = pagado − asignado + liquidaciones enviadas − liquidaciones recibidas`. Si es positivo, el grupo le debe al integrante; si es negativo, el integrante debe.
- La suma de todos los saldos del grupo es 0 (PU-23).
- **Deudas por par:** en cada gasto, cada participante le debe su parte a quien pagó. Las liquidaciones reducen la deuda del emisor con el receptor y las deudas en ambos sentidos de un mismo par se compensan. La suma de las deudas de cada persona coincide con su saldo (PU-27).
- Una liquidación solo se acepta si existe una deuda pendiente del emisor con el receptor y si el importe no la supera (HU-13).

### 7.3 Estados del gasto

Siguen el diagrama de estados del Entregable 2:

```
[En edición] --guardar con datos válidos--> REGISTRADO --editar--> MODIFICADO --editar--> MODIFICADO
REGISTRADO | MODIFICADO --anular--> ANULADO (sale de los saldos y no se puede editar)
```

"Eliminar" un gasto (RF-10) se implementa como anulación lógica para conservar el historial.

### 7.4 Permisos (RNF-02)

| Acción | Quién puede |
|---|---|
| Ver datos del grupo | Integrantes activos |
| Editar el grupo, agregar o retirar integrantes, administrar categorías | Administrador |
| Registrar gastos y adjuntar comprobantes | Cualquier integrante activo |
| Editar o anular un gasto | Quien lo registró o el administrador |
| Registrar una liquidación | El emisor, el receptor o el administrador |
| Anular una liquidación | Quien la registró o el administrador |
| Eliminar un comprobante | Quien lo subió, quien registró el gasto o el administrador |

Un integrante solo se puede retirar si no tiene deudas pendientes. El administrador no puede ser retirado.

## 8. Seguridad

- **Contraseñas** con hash bcrypt (costo 10), mínimo 8 caracteres con letras y números. Nunca se devuelven en la API.
- **Sesión** con JWT firmado (`JWT_SECRET`, 8 horas) en una cookie `httpOnly`, `SameSite=Lax` y `Secure` en producción. El JavaScript de la página no puede leerla. `Authorization: Bearer` también se acepta para usar Postman.
- **Ingreso:** mensaje genérico ("Correo o contraseña incorrectos.") y comparación con un hash ficticio cuando el correo no existe, para no revelar qué cuentas existen. Máximo 10 intentos por IP cada 15 minutos (PI-12).
- **Privacidad (RNF-04):** a quien no es integrante, las rutas del grupo le responden 404, sin confirmar que el grupo existe.
- **Entrada:** todos los datos se validan con Zod. El cuerpo JSON se limita a 100 KB y las consultas SQL son parametrizadas (PI-11c).
- **Archivos (RNF-09):** el tipo se detecta por la firma binaria, no por la extensión. Los nombres se limpian y el tamaño máximo es de 2 MB.
- **Cabeceras:** Helmet con política de contenido (CSP) restrictiva y `nosniff`, sin `X-Powered-By`.
- **Secretos:** solo en variables de entorno. `.env` está en `.gitignore` y el repositorio incluye únicamente `.env.example` con valores de ejemplo.

## 9. Manejo de errores

Todas las respuestas de error tienen el mismo formato:

```json
{ "error": { "mensaje": "Revisa los datos ingresados.", "campos": { "importe": "El importe debe ser mayor que cero." } } }
```

| Código | Cuándo |
|---|---|
| 400 | Datos inválidos o regla de negocio incumplida (por ejemplo, porcentajes que no suman 100 %) |
| 401 | Sin sesión o sesión expirada |
| 403 | Integrante sin permiso para la acción |
| 404 | Recurso inexistente o grupo al que no se pertenece |
| 409 | Conflicto: correo ya registrado, integrante repetido, gasto ya anulado, deuda inexistente |
| 413 | Solicitud demasiado grande |
| 429 | Demasiados intentos de ingreso |
| 500 | Error no previsto. En producción no se muestran detalles internos |

La interfaz muestra el mensaje general arriba del formulario y el de cada campo junto a él. Al corregir un campo, su error desaparece.

## 10. API

La tabla completa de rutas, métodos y permisos está en el `README.md`, sección "API". Para probarla con Postman: `POST /api/auth/login` guarda la cookie automáticamente; las demás solicitudes la envían.

## 11. Instalación y configuración

### 11.1 Requisitos

- Node.js 20 o superior y npm 10.
- PostgreSQL 14 o superior.
- Para pruebas E2E: Google Chrome o Chromium (`npx playwright install chromium`).

### 11.2 Pasos

```bash
git clone <url-del-repositorio> quadro && cd quadro
npm install
cp .env.example .env          # editar DATABASE_URL, TEST_DATABASE_URL, E2E_DATABASE_URL y JWT_SECRET
```

Crear las bases de datos en PostgreSQL:

```sql
CREATE USER quadro_user WITH PASSWORD 'cambia_esta_clave';
CREATE DATABASE quadro OWNER quadro_user;
CREATE DATABASE quadro_test OWNER quadro_user;
CREATE DATABASE quadro_e2e OWNER quadro_user;
```

Aplicar migraciones y cargar la demostración:

```bash
npm run db:migrate
npm run db:seed
```

### 11.3 Variables de entorno

| Variable | Ejemplo | Descripción |
|---|---|---|
| `NODE_ENV` | `development` | `production` activa la cookie `Secure` y oculta detalles de errores |
| `PORT` | `4000` | Puerto HTTP |
| `DATABASE_URL` | `postgresql://usuario:clave@host:5432/quadro` | Base de datos principal |
| `DATABASE_SSL` | `false` | `true` en Neon o Render |
| `TEST_DATABASE_URL` | `…/quadro_test` | Se borra al iniciar las pruebas; debe contener "test" |
| `E2E_DATABASE_URL` | `…/quadro_e2e` | Se borra al iniciar las pruebas E2E |
| `JWT_SECRET` | 96 caracteres hexadecimales | Mínimo 32 caracteres |
| `JWT_EXPIRES_IN` | `8h` | Duración de la sesión |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Origen permitido en desarrollo |
| `APP_TZ` | `America/Bogota` | Zona para validar fechas futuras |
| `LOGIN_RATE_LIMIT` | `10` | Intentos de ingreso por IP cada 15 minutos |
| `CHROME_PATH` | `/usr/bin/google-chrome` | Opcional, navegador de Playwright |

La configuración se valida al iniciar (`server/src/config/env.js`). Si algo falta, el proceso se detiene con un mensaje que dice qué variable revisar.

## 12. Ejecución

| Modo | Comando | Dirección |
|---|---|---|
| Desarrollo | `npm run dev` | http://localhost:5173 (Vite reenvía `/api` al puerto 4000) |
| Producción local | `npm run build && NODE_ENV=production npm start` | http://localhost:4000 |
| Solo API | `npm run dev:server` | http://localhost:4000/api/salud |

Cuentas de demostración (`npm run db:seed`): `ana@demo.quadro.co` (administradora), `bruno@demo.quadro.co` y `carla@demo.quadro.co`, todas con la contraseña `Quadro2026`. El grupo "Arepas La Esquina" trae cuatro gastos (uno por porcentajes y otro por valores) y una liquidación.

## 13. Pruebas

| Comando | Qué ejecuta |
|---|---|
| `npm test` | 37 pruebas unitarias y 46 de integración contra `TEST_DATABASE_URL` |
| `npm run test:report --workspace server` | Lo anterior más cobertura (HTML en `server/tests/reports/cobertura`) y reportes JUnit/JSON |
| `npm run test:e2e` | Compila el frontend, levanta un servidor contra `E2E_DATABASE_URL` en el puerto 4100 y ejecuta 16 pruebas en Chrome (escritorio y celular) |
| `npm run test:e2e:capturas` | Igual, y regenera las capturas del manual de usuario |
| `npm run lint` | ESLint del backend y del frontend |

Los resultados y la trazabilidad están en `docs/pruebas/reporte-pruebas.md`. El flujo `.github/workflows/ci.yml` está preparado para ejecutar lint, pruebas y E2E en GitHub Actions en cada push o pull request a `main` y `develop`. Se activa al subir el repositorio a GitHub; en esta entrega no se ha ejecutado allí.

## 14. Despliegue

### 14.1 Docker Compose (un servidor propio o un computador)

```bash
echo "JWT_SECRET=<secreto de 32 caracteres o más>" > .env
docker compose up --build -d
```

- `Dockerfile` multietapa: la primera etapa instala todo y compila el frontend; la segunda contiene solo las dependencias de ejecución del backend, `server/src` y `client/dist`, y corre como usuario `node` sin privilegios.
- `docker-compose.yml` levanta PostgreSQL 16 con un volumen persistente y la aplicación en el puerto 4000, que espera a que la base de datos esté lista.
- El contenedor tiene `HEALTHCHECK` contra `/api/salud`.

Con `NODE_ENV=production` la cookie es `Secure`. Los navegadores la aceptan en `http://localhost`, pero para acceder desde otra máquina se necesita HTTPS (por ejemplo, un proxy inverso con certificado).

### 14.2 Render + Neon

1. Crear una base en Neon y copiar la cadena de conexión.
2. Subir el repositorio a GitHub.
3. En Render, crear un Web Service desde el repositorio con:
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
   - Variables: `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, `APP_TZ=America/Bogota`.
4. Al primer inicio el servidor crea las tablas. Verificar en `https://<servicio>.onrender.com/api/salud`.

`--include=dev` es necesario porque Vite, que compila la interfaz, es una dependencia de desarrollo.

### 14.3 Lista de verificación después de desplegar

- `GET /api/salud` responde `{"estado":"ok", "baseDeDatos":"conectada"}`.
- Registrar una cuenta, crear un grupo, registrar un gasto y ver los saldos.
- Recargar una página interna (por ejemplo `/grupos/…/gastos`): debe abrir la aplicación, no un 404.

## 15. Mantenimiento y modificación

- **Agregar una función:** ver la sección "Agregar una función nueva" del README (migración → módulo → validación → cliente API → página → pruebas).
- **Cambiar colores o tipografía:** todos los valores están en `client/src/styles/tokens.css`. Los derivados de la paleta se eligieron para mantener un contraste de 4,5:1 o más sobre marfil.
- **Cambiar la regla de redondeo:** solo en `server/src/domain/reparto.js`. La interfaz la toma de allí. Después se ajustan PU-01 a PU-20.
- **Agregar una categoría base:** `CATEGORIAS_BASE` en `server/src/modules/grupos/grupos.repository.js` (aplica a grupos nuevos).
- **Respaldo de datos:** `pg_dump "$DATABASE_URL" > respaldo.sql`; restaurar con `psql "$DATABASE_URL" < respaldo.sql`.

## 16. Decisiones, supuestos y correcciones al Entregable 2

| # | Hallazgo en el documento | Decisión en el MVP |
|---|---|---|
| 1 | RF-19 y HU-13 (liquidaciones) aparecían como "Posterior", aunque CU-11, la actividad 8.3 y la clase Liquidacion ya los modelan | Se incluyen en el MVP. Queda registrado como cambio de alcance según el proceso de la sección 13.2 |
| 2 | La clase Gasto no tenía categoría, método de distribución ni quién lo registró, aunque RF-05, RF-06 y RNF-02 los requieren | Se agregan `categoria_id`, `metodo_distribucion` y `registrado_por` |
| 3 | La clase Usuario no tenía contraseña, necesaria para RF-02 | Se agrega `contrasena_hash` |
| 4 | Faltaban las clases para RF-11 y RF-09 | Se agregan `categoria` y `comprobante` |
| 5 | RepartoGasto no guardaba el porcentaje elegido | Se agrega `porcentaje` (opcional) |
| 6 | Pagador, emisor y receptor apuntaban a Usuario | Apuntan a Participacion, para garantizar que pertenecen al grupo |
| 7 | En la tabla de diagramas de secuencia los números de caso de uso no coinciden con la sección 7 | DS-01 corresponde a CU-3, DS-02 a CU-5 y CU-6, y DS-03 a CU-8 |
| 8 | Errores de numeración: "4.1 Interpretación de relaciones" dentro de la sección 10 y "CU-.8" | Se corrigen como 10.1 y CU-8 en la documentación de esta entrega |
| 9 | RNF-06, RNF-07 y RNF-09 no tenían valores medibles | RNF-06: historial y saldos en menos de 500 ms con 150 gastos. RNF-07: Chrome actual en 1366 px y 390 px de ancho sin desplazamiento horizontal. RNF-09: JPG, PNG, WEBP o PDF de hasta 2 MB y máximo 5 por gasto |
| 10 | No se definía quién puede editar gastos o registrar liquidaciones | Reglas de la sección 7.4 |
| 11 | "Invitar" participantes (RF-04) no tenía mecanismo definido | Se agrega por el correo de una cuenta ya registrada. No se envían correos, porque el envío está fuera del alcance |
| 12 | "Eliminar" gasto vs. estado "Anulado (opcional)" | Eliminar = anular (eliminación lógica) |
| 13 | Retirar a un integrante con saldo pendiente dejaría deudas sin quién las pague | Solo se retira a quien no tiene deudas. La baja es lógica |

Supuestos: moneda única en pesos colombianos sin centavos, zona horaria America/Bogota para validar fechas, un único administrador por grupo (el creador) y un navegador moderno (Chrome, Edge o Firefox de los últimos dos años).

## 17. Limitaciones conocidas y trabajo futuro

- No hay recuperación de contraseña por correo ni invitaciones por enlace (requieren un servicio de correo).
- No se puede transferir el rol de administrador ni archivar grupos desde la interfaz, aunque el estado `ARCHIVADO` ya existe en la tabla.
- La auditoría detallada de cambios (RF-20) es posterior; hoy se guardan el estado y la fecha de la última modificación.
- Presupuesto, inventario y alertas (RF-13 a RF-16) no se implementan, como lo define el alcance.
- Las pruebas E2E se ejecutaron en Chrome (escritorio y celular emulado). No se probaron Firefox, Safari ni dispositivos físicos.

## 18. Estado de verificación de esta entrega

| Elemento | Estado |
|---|---|
| Instalación limpia desde el repositorio, migraciones, datos demo y ejecución en desarrollo y producción local | Verificado |
| Pruebas unitarias, de integración y E2E | Ejecutadas, ver el reporte de pruebas |
| `Dockerfile` y `docker-compose.yml` | Escritos. Los comandos que ejecuta la imagen se probaron fuera de Docker, pero la imagen no se pudo construir en el entorno de desarrollo porque el acceso a Docker Hub estaba bloqueado |
| Despliegue en Render + Neon | No realizado. Requiere las cuentas del equipo. La guía 14.2 describe los pasos |
| GitHub Actions | Configurado, no ejecutado (el repositorio aún no está en GitHub) |
