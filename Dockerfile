# ==============================================================================
# Dockerfile Multi-Stage: Plataforma Docente MEP en la Nube
# UTN - Computación en la Nube 2026
# ==============================================================================

# ETAPA 1: Construcción del Frontend (React + Vite + TypeScript)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ETAPA 2: Construcción del Backend (Node.js + Express + TypeScript)
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# ETAPA 3: Imagen Final de Producción Ligera (Node 20 Alpine)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar dependencias de producción del backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copiar código transpilado del backend
COPY --from=backend-builder /app/backend/dist ./dist

# Copiar assets estáticos del frontend para servirlos opcionalmente
COPY --from=frontend-builder /app/frontend/dist ./public

# Exponer el puerto
EXPOSE 3000

# Comando de inicio del servidor
CMD ["node", "dist/server.js"]
