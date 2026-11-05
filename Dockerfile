# ------------------------------------------------------------
# Quadro · Imagen de producción (API + frontend compilado)
# Etapa 1: instala dependencias y compila el frontend con Vite.
# Etapa 2: imagen liviana solo con lo necesario para ejecutar.
# ------------------------------------------------------------
FROM node:22-alpine AS construccion
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci
COPY server server
COPY client client
RUN npm run build

FROM node:22-alpine AS produccion
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
# Solo las dependencias de ejecución del backend.
RUN npm ci --omit=dev --workspace server && npm cache clean --force
COPY server/src server/src
COPY --from=construccion /app/client/dist client/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://localhost:4000/api/salud || exit 1
# Al iniciar aplica las migraciones pendientes y luego atiende solicitudes.
CMD ["node", "server/src/server.js"]
