#!/bin/bash
# =============================================================================
# stop_app.sh – Detiene la aplicación Aeroméxico
# =============================================================================
# Programar con cron para apagar automáticamente:
#
#   crontab -e
#
#   Apagar lunes a viernes a las 11:00 PM:
#   0 23 * * 1-5  /ruta/aeromexico/stop_app.sh >> /var/log/aeromexico.log 2>&1
#
#   Apagar todos los días a las 10:00 PM:
#   0 22 * * *    /ruta/aeromexico/stop_app.sh >> /var/log/aeromexico.log 2>&1
# =============================================================================

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] Deteniendo Aeroméxico...${NC}"

docker compose down

if [ $? -eq 0 ]; then
  echo -e "${GREEN} Aeroméxico detenida correctamente${NC}"
else
  echo -e "${RED} Error al detener los contenedores${NC}"
  exit 1
fi
