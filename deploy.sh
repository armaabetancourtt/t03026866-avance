#!/bin/bash
# =============================================================================
# deploy.sh – Despliegue completo de Aeroméxico – Sistema de Reservas
# =============================================================================
# Uso:
#   ./deploy.sh                        → despliega desde el directorio actual
#   ./deploy.sh https://github.com/... → clona el repo y despliega
#
# Cron – encender a las 7 AM y apagar a las 11 PM de lunes a viernes:
#   0 7  * * 1-5  /ruta/aeromexico/start_app.sh  >> /var/log/aeromexico.log 2>&1
#   0 23 * * 1-5  /ruta/aeromexico/stop_app.sh   >> /var/log/aeromexico.log 2>&1
# =============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

APP_NAME="Aeroméxico"
APP_DIR="aeromexico-app"
LOG_FILE="/var/log/aeromexico-deploy.log"

log() {
  echo -e "$1"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE" 2>/dev/null || true
}

log "${CYAN}============================================${NC}"
log "${CYAN}     ${APP_NAME} - Deploy Automático     ${NC}"
log "${CYAN}============================================${NC}"

# ── 1. Verificar dependencias ─────────────────────────────────────────────────
log "\n${YELLOW}[1/5] Verificando dependencias...${NC}"

if ! command -v docker &> /dev/null; then
  log "${RED} Docker no encontrado. Instálalo: https://docs.docker.com/get-docker/${NC}"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  log "${RED} Docker Compose no disponible.${NC}"
  exit 1
fi

if ! command -v git &> /dev/null; then
  log "${RED} Git no encontrado. Instálalo con: sudo apt install git${NC}"
  exit 1
fi

log "${GREEN} Docker, Docker Compose y Git disponibles${NC}"

# ── 2. Clonar o actualizar repositorio ───────────────────────────────────────
log "\n${YELLOW}[2/5] Preparando código fuente...${NC}"

if [ -n "$1" ]; then
  if [ -d "$APP_DIR" ]; then
    log "Directorio '$APP_DIR' ya existe. Actualizando..."
    cd "$APP_DIR"
    git pull origin main 2>/dev/null || git pull origin master 2>/dev/null || true
    log "${GREEN} Repositorio actualizado${NC}"
  else
    log "Clonando repositorio: $1"
    git clone "$1" "$APP_DIR"
    cd "$APP_DIR"
    log "${GREEN} Repositorio clonado en '$APP_DIR'${NC}"
  fi
else
  log "Usando directorio actual: $(pwd)"
  log "${GREEN} Directorio listo${NC}"
fi

# ── 3. Detener contenedores previos si existen ───────────────────────────────
log "\n${YELLOW}[3/5] Limpiando despliegue anterior...${NC}"

if docker compose ps -q 2>/dev/null | grep -q .; then
  log "Deteniendo contenedores activos..."
  docker compose down
  log "${GREEN} Contenedores anteriores detenidos${NC}"
else
  log "No hay contenedores previos corriendo"
fi

# ── 4. Construir imágenes ────────────────────────────────────────────────────
log "\n${YELLOW}[4/5] Construyendo imágenes Docker...${NC}"
log "Esto puede tomar unos minutos en el primer despliegue..."

docker compose build --no-cache
log "${GREEN} Imágenes construidas correctamente${NC}"

# ── 5. Levantar contenedores ─────────────────────────────────────────────────
log "\n${YELLOW}[5/5] Iniciando contenedores...${NC}"

docker compose up -d

# Esperar a que el backend responda
log "Esperando que los servicios estén listos..."
sleep 8

if docker compose ps | grep -q "Up"; then
  log "${GREEN} Contenedores corriendo${NC}"
else
  log "${RED}  Algunos contenedores no iniciaron correctamente${NC}"
  docker compose ps
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
log "\n${GREEN}============================================${NC}"
log "${GREEN}     ¡Despliegue completado exitosamente!  ${NC}"
log "${GREEN}============================================${NC}"
log "\n Aplicación:  ${CYAN}http://localhost:8080${NC}"
log " API:         ${CYAN}http://localhost:8080/api/flights${NC}"
log " Health:      ${CYAN}http://localhost:8080/api/health${NC}"
log "\n${YELLOW}Comandos útiles:${NC}"
log "  Ver logs:      docker compose logs -f"
log "  Iniciar:       ./start.sh"
log "  Detener:       ./stop.sh"
log "  Backup:        ./backup.sh\n"
