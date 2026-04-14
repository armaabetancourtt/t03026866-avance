#!/bin/bash
# =============================================================================
# start_app.sh – Inicia la aplicación Aeroméxico
# =============================================================================
# Programar con cron para encender automáticamente:
#
#   crontab -e
#
#   Encender lunes a viernes a las 7:00 AM:
#   0 7 * * 1-5  /ruta/aeromexico/start_app.sh >> /var/log/aeromexico.log 2>&1
#
#   Encender todos los días a las 8:00 AM:
#   0 8 * * *    /ruta/aeromexico/start_app.sh >> /var/log/aeromexico.log 2>&1
# =============================================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando Aeroméxico...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}Docker no encontrado.${NC}"
  exit 1
fi

docker compose up -d

if [ $? -eq 0 ]; then
  echo -e "${GREEN} Aeroméxico iniciada correctamente${NC}"
  echo -e " Accede en: ${CYAN}http://localhost:8080${NC}"
else
  echo -e "${RED} Error al iniciar los contenedores${NC}"
  exit 1
fi
