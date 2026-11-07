# Quadro · Gestión de gastos compartidos

Quadro es una aplicación web responsive para pequeños emprendimientos de dos o más personas. Permite registrar quién pagó cada gasto, repartirlo entre los integrantes y saber en todo momento cuánto aportó cada uno, cuánto le corresponde y quién le debe a quién.

Proyecto académico de Ingeniería de Software, Universidad Católica Luis Amigó (Entregable 3: MVP). Integrantes: Mariana Piedrahita y Sara Melisa Sánchez Vásquez.

 **Demo en línea:** https://quadro-qry3.onrender.com (plan gratuito de Render: si lleva 15 minutos sin uso, la primera carga tarda cerca de un minuto). Cuenta de prueba: ana@demo.quadro.co · Quadro2026.
 
## Funciones del MVP

| Historia | Función | Requisitos |
|---|---|---|
| HU-01 | Registro, inicio y cierre de sesión | RF-01, RF-02, RNF-01 |
| HU-02 | Crear y editar grupos (el creador queda como administrador) | RF-03 |
| HU-03 | Agregar y retirar integrantes (solo el administrador) | RF-04, RNF-02 |
| HU-04 | Registrar gastos con descripción, importe, fecha, categoría, pagador y participantes | RF-05 |
| HU-05 | Reparto en partes iguales, por porcentajes o por valores, con vista previa | RF-06, RF-07, RNF-03 |
| HU-06 | Saldos individuales, deudas entre integrantes y resumen del grupo | RF-08, RF-17, RNF-04 |
| HU-07 | Historial con filtros por fecha, categoría y participante | RF-12, RF-18 (básico) |
| HU-08 | Comprobantes adjuntos (JPG, PNG, WEBP o PDF de hasta 2 MB) | RF-09, RNF-09 |
| HU-09 | Editar y anular gastos según permisos; los saldos se recalculan | RF-10 |
| HU-10 | Administrar categorías del grupo | RF-11 |
| HU-13 | Registrar y anular liquidaciones (pagos entre integrantes) | RF-19 |

Fuera del alcance de esta versión, como lo define el Entregable 1: presupuestos (RF-13), inventario y alertas (RF-14 a RF-16) y auditoría detallada de cambios (RF-20).

## Tecnologías

| Capa | Tecnología |
|---|---|
| Interfaz | React 19, React Router 7, Vite 8, CSS propio con tokens de diseño, Schibsted Grotesk |
| API | Node.js 22, Express 5, Zod 4 (validación), bcryptjs, JSON Web Token en cookie httpOnly, Helmet, express-rate-limit, Multer |
| Base de datos | PostgreSQL 16 con migraciones SQL versionadas (`pg`) |
| Pruebas | Vitest 5 + Supertest (unitarias e integración), Playwright 1.64 (E2E en escritorio y celular), cobertura V8 |
| Calidad | ESLint 10, Gitflow, commits convencionales con la HU |
| Despliegue | Dockerfile multietapa, Docker Compose, guía para Render + Neon |

## Estructura del repositorio

```
quadro/
├── client/                  Interfaz web (React + Vite)
│   └── src/
│       ├── api/             Cliente HTTP de la API
│       ├── components/      Logo, campos, diálogos, avisos, marco de la app
│       ├── context/         Sesión y lista de grupos
│       ├── pages/           Acceso, Mis grupos y pestañas del grupo
│       └── styles/          Tokens, base, componentes, diseño y páginas
├── server/                  API (Express) por módulos
│   ├── src/
│   │   ├── config/          Variables de entorno validadas
│   │   ├── db/              Conexión, migraciones SQL y datos de demostración
│   │   ├── domain/          Reglas puras: reparto y saldos (sin base de datos)
│   │   ├── middlewares/     Sesión, membresía, validación y errores
│   │   ├── modules/         auth, grupos, participantes, categorias, gastos,
│   │   │                    saldos, liquidaciones, comprobantes
│   │   │                    (rutas → controlador → servicio → repositorio)
│   │   └── utils/
│   └── tests/               unit/ (PU-xx) e integration/ (PI-xx)
├── e2e/                     Pruebas E2E con Playwright (E2E-xx)
├── docs/                    Arquitectura, manuales, reporte y evidencias de pruebas
├── Dockerfile · docker-compose.yml · playwright.config.js
└── .env.example             Variables de entorno de ejemplo (sin credenciales)
```

## Instalación local

Requisitos: Node.js 20 o superior (probado con 22), npm 10 y PostgreSQL 14 o superior (probado con 16).

1. Clona el repositorio e instala las dependencias de todo el proyecto:

   ```bash
   git clone <url-del-repositorio> quadro
   cd quadro
   npm install
   ```

2. Crea las bases de datos (una para usar la app y otra para las pruebas):

   ```sql
   CREATE USER quadro_user WITH PASSWORD 'cambia_esta_clave';
   CREATE DATABASE quadro OWNER quadro_user;
   CREATE DATABASE quadro_test OWNER quadro_user;
   CREATE DATABASE quadro_e2e OWNER quadro_user;
   ```

3. Copia el archivo de variables y edítalo con tus datos:

   ```bash
   cp .env.example .env
   ```

   Como mínimo cambia `DATABASE_URL`, `TEST_DATABASE_URL` y `JWT_SECRET`. Para generar un secreto:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

4. Aplica las migraciones y, si quieres, carga los datos de demostración:

   ```bash
   npm run db:migrate
   npm run db:seed      # cuentas ana@, bruno@ y carla@demo.quadro.co · contraseña Quadro2026
   ```

5. Ejecuta en modo desarrollo (API en el puerto 4000 y Vite en el 5173):

   ```bash
   npm run dev
   ```

   Abre http://localhost:5173. Vite reenvía las llamadas `/api` a la API, así la cookie de sesión funciona sin configurar CORS.

### Ejecutar como en producción

```bash
npm run build                 # compila la interfaz en client/dist
NODE_ENV=production npm start # la API sirve también la interfaz en http://localhost:4000
```

Al iniciar, el servidor aplica las migraciones pendientes.

## Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `NODE_ENV` | No | `development`, `test` o `production` (en producción la cookie de sesión es `Secure`) |
| `PORT` | No | Puerto de la API (por defecto 4000) |
| `DATABASE_URL` | Sí | Conexión a PostgreSQL |
| `DATABASE_SSL` | No | `true` para proveedores que exigen SSL (Neon, Render) |
| `TEST_DATABASE_URL` | Para pruebas | Base de pruebas de integración. Se borra en cada ejecución y debe incluir "test" en el nombre |
| `E2E_DATABASE_URL` | Para E2E | Base de las pruebas E2E. También se borra en cada ejecución |
| `JWT_SECRET` | Sí | Secreto de al menos 32 caracteres para firmar la sesión |
| `JWT_EXPIRES_IN` | No | Duración de la sesión (por defecto `8h`) |
| `CLIENT_ORIGIN` | No | Origen del frontend en desarrollo (por defecto `http://localhost:5173`) |
| `APP_TZ` | No | Zona horaria para validar que las fechas no sean futuras (por defecto `America/Bogota`) |
| `LOGIN_RATE_LIMIT` | No | Intentos de ingreso por IP cada 15 minutos (por defecto 10) |
| `CHROME_PATH` | No | Navegador para Playwright. Si se omite, ejecuta `npx playwright install chromium` |

Si falta una variable obligatoria, la API se detiene al iniciar y dice cuál.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | API con recarga automática y frontend con Vite |
| `npm run build` | Compila el frontend |
| `npm start` | Inicia la API (y sirve `client/dist` si existe) |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga el grupo de demostración "Arepas La Esquina" |
| `npm test` | Pruebas unitarias e integración del backend |
| `npm run test:unit` / `npm run test:integration` | Solo un tipo de prueba |
| `npm run test:report --workspace server` | Pruebas con cobertura y reportes JUnit/JSON en `server/tests/reports` |
| `npm run test:e2e` | Compila y ejecuta las pruebas E2E (escritorio y celular) |
| `npm run test:e2e:capturas` | Igual, y guarda las capturas del manual en `docs/manual/capturas` |
| `npm run lint` | ESLint en backend y frontend |

## API

Todas las rutas, salvo registro, ingreso y salud, requieren sesión. Las rutas de un grupo solo responden a sus integrantes activos (a los demás les responde 404). Los errores tienen la forma `{ "error": { "mensaje": "…", "campos": { "campo": "…" } } }`.

| Método | Ruta | Descripción | Permiso |
|---|---|---|---|
| POST | `/api/auth/registro` | Crea la cuenta y abre sesión | Público |
| POST | `/api/auth/login` · `/api/auth/logout` | Abre o cierra la sesión | Público |
| GET | `/api/auth/me` | Usuario de la sesión | Sesión |
| GET · POST | `/api/grupos` | Mis grupos con mi saldo · crear grupo | Sesión |
| GET · PATCH | `/api/grupos/:grupoId` | Detalle · editar nombre y descripción | Integrante · Administrador |
| GET · POST | `/api/grupos/:grupoId/participantes` | Listar · agregar por correo | Integrante · Administrador |
| DELETE | `/api/grupos/:grupoId/participantes/:id` | Retirar (sin deudas pendientes) | Administrador |
| GET · POST | `/api/grupos/:grupoId/categorias` | Listar · crear | Integrante · Administrador |
| PATCH · DELETE | `/api/grupos/:grupoId/categorias/:id` | Renombrar · eliminar (sin gastos) | Administrador |
| GET · POST | `/api/grupos/:grupoId/gastos` | Historial con filtros `desde`, `hasta`, `categoriaId`, `participanteId`, `incluirAnulados` · registrar | Integrante |
| GET · PUT | `/api/grupos/:grupoId/gastos/:gastoId` | Detalle · editar | Integrante · Quien lo registró o administrador |
| PATCH | `/api/grupos/:grupoId/gastos/:gastoId/anular` | Anular (sale de los saldos) | Quien lo registró o administrador |
| GET · POST | `/api/grupos/:grupoId/gastos/:gastoId/comprobantes` | Listar · adjuntar (`multipart`, campo `archivo`) | Integrante |
| GET | `…/comprobantes/:id/archivo` | Ver o descargar el archivo | Integrante |
| DELETE | `…/comprobantes/:id` | Eliminar | Quien lo subió, quien registró el gasto o administrador |
| GET | `/api/grupos/:grupoId/saldos` | Saldos, deudas pendientes y resumen | Integrante |
| GET · POST | `/api/grupos/:grupoId/liquidaciones` | Historial · registrar | Integrante · Emisor, receptor o administrador |
| PATCH | `/api/grupos/:grupoId/liquidaciones/:id/anular` | Anular | Quien la registró o administrador |
| GET | `/api/salud` | Estado de la API y la base de datos | Público |

## Reglas de negocio clave

- **Importes:** pesos colombianos enteros, mayores que 0 y hasta $1.000.000.000 por gasto.
- **Redondeo (RNF-03):** en partes iguales, los pesos sobrantes se asignan de a uno a los primeros participantes en orden de ingreso al grupo ($100.000 entre 3 queda en $33.334, $33.333 y $33.333). En porcentajes (máximo dos decimales, deben sumar 100 %) se usa el método del mayor residuo. Los valores específicos deben sumar exactamente el importe. La función está en `server/src/domain/reparto.js` y la interfaz la reutiliza para la vista previa.
- **Saldo:** lo que pagó − lo que le corresponde + liquidaciones enviadas − liquidaciones recibidas. La suma de los saldos de un grupo siempre es 0.
- **Deudas:** cada participante le debe su parte a quien pagó, y las deudas cruzadas entre dos personas se compensan. Una liquidación no puede superar la deuda pendiente entre emisor y receptor.
- **Eliminar un gasto es anularlo:** queda en el historial con estado Anulado y deja de contar en los saldos (diagrama de estados del Entregable 2).
- **Retirar a un integrante** solo es posible si no tiene deudas pendientes. Su historial se conserva.

## Pruebas

```bash
npm test                 # 83 pruebas: 37 unitarias (PU) y 46 de integración (PI) contra PostgreSQL
npm run test:e2e         # 16 pruebas E2E (15 en escritorio y 1 en celular de 390 px)
```

Cada prueba lleva en su nombre el ID del plan (PU-xx, PI-xx, E2E-xx) y la historia o requisito que verifica. El reporte con resultados, cobertura y defectos corregidos está en `docs/pruebas/`.

## Despliegue

### Docker Compose

```bash
echo "JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" > .env
docker compose up --build
```

Levanta PostgreSQL 16 y la aplicación en http://localhost:4000.

### Render + Neon (gratuito)

1. Crea una base de datos en https://neon.tech y copia la cadena de conexión.
2. Sube el repositorio a GitHub.
3. En https://render.com crea un **Web Service** desde el repositorio:
   - Build command: `npm ci --include=dev && npm run build`
   - Start command: `npm start`
   - Variables: NODE_ENV=production, NODE_VERSION=22, DATABASE_URL=<cadena de Neon>, DATABASE_SSL=true, JWT_SECRET=<secreto>, APP_TZ=America/Bogota
4. Render asigna una URL https. La primera vez, el servidor crea las tablas solo.
5. Para cargar los datos de demostración, cambia una vez el Start command a npm run db:seed && npm start, despliega y vuelve a dejar npm start.

Como opción, Render también acepta el `Dockerfile` del proyecto.

## Cómo contribuir (Gitflow)

- `main`: versión entregada · `develop`: integración · `feature/<HU o tema>` sale de develop y vuelve a develop · `release/vX.Y.Z` prepara la entrega · `hotfix/vX.Y.Z` sale de main.
- Commits con la historia: `feat(HU-05): calcular reparto por porcentajes`, `fix: …`, `test: …`, `docs: …`.
- Antes de unir una rama: `npm run lint && npm test && npm run test:e2e`.

### Agregar una función nueva

1. Si cambia la base de datos, crea `server/src/db/migrations/00N_descripcion.sql` (nunca edites una migración ya aplicada).
2. Crea o amplía un módulo en `server/src/modules/<modulo>/` con sus archivos `*.routes.js`, `*.controller.js`, `*.service.js` y `*.repository.js`, y regístralo en `grupos.routes.js` o `app.js`.
3. Valida la entrada con un esquema Zod y lanza `AppError` o `ErrorDominio` para los errores esperados.
4. Agrega el método en `client/src/api/cliente.js` y la pantalla en `client/src/pages/`.
5. Escribe las pruebas PU, PI o E2E con el ID de la historia.

## Documentación

- `docs/arquitectura.md`: arquitectura, modelo de datos, decisiones y supuestos.
- `docs/manual-tecnico.md`: manual técnico y de despliegue.
- `docs/manual-usuario.md`: manual de usuario con capturas reales.
- `docs/pruebas/reporte-pruebas.md`: reporte de pruebas y trazabilidad.
- `docs/sustentacion/guion-demo.md`: guion de la demostración en vivo.
