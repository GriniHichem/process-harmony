#!/bin/bash
# ============================================================
# Script d'installation rapide Q-Process Self-Hosted
# Supabase Docker sur Ubuntu
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Q-Process Self-Hosting Setup${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Vérification des prérequis...${NC}"

command -v docker >/dev/null 2>&1 || { echo -e "${RED}Docker non trouvé. Installez Docker d'abord.${NC}"; exit 1; }
command -v docker compose >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}Docker Compose non trouvé.${NC}"; exit 1; }
command -v node >/dev/null 2>&1 || { echo -e "${RED}Node.js non trouvé. Installez Node.js 18+.${NC}"; exit 1; }

echo -e "${GREEN}✅ Tous les prérequis sont installés${NC}"

# Step 1: Supabase Docker
echo -e "\n${YELLOW}Étape 1: Installation de Supabase Docker...${NC}"
SUPABASE_DIR="/opt/supabase"

if [ ! -d "$SUPABASE_DIR" ]; then
  sudo git clone --depth 1 https://github.com/supabase/supabase.git $SUPABASE_DIR
  echo -e "${GREEN}✅ Supabase cloné dans $SUPABASE_DIR${NC}"
else
  echo -e "${GREEN}✅ Supabase déjà installé dans $SUPABASE_DIR${NC}"
fi

cd $SUPABASE_DIR/docker

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "${YELLOW}⚠️  Fichier .env créé. Vous DEVEZ le configurer avant de continuer.${NC}"
  echo -e "${YELLOW}   Editez: $SUPABASE_DIR/docker/.env${NC}"
  echo -e "${YELLOW}   Configurez au minimum: JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY${NC}"
  echo -e "${YELLOW}   Puis relancez ce script.${NC}"
  exit 0
fi

# Step 2: Start Supabase
echo -e "\n${YELLOW}Étape 2: Démarrage de Supabase...${NC}"
docker compose up -d
echo -e "${GREEN}✅ Supabase démarré${NC}"

# Wait for DB
echo -e "${YELLOW}Attente de la base de données...${NC}"
sleep 10

# Step 3: Run migrations
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "\n${YELLOW}Étape 3: Exécution des migrations...${NC}"

docker compose exec -T db psql -U postgres -d postgres < "$SCRIPT_DIR/migrations/001_complete_schema.sql"
echo -e "${GREEN}✅ Schéma créé${NC}"

# Step 4: Build frontend
echo -e "\n${YELLOW}Étape 4: Build du frontend...${NC}"
cd "$SCRIPT_DIR/.."

if [ ! -f .env ]; then
  # Extract values from Supabase .env
  source $SUPABASE_DIR/docker/.env
  cat > .env << EOF
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
EOF
  echo -e "${GREEN}✅ .env frontend créé${NC}"
fi

npm install
npm run build
echo -e "${GREEN}✅ Frontend buildé dans dist/${NC}"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation terminée !${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "Prochaines étapes:"
echo -e "  1. Créez un utilisateur dans le Dashboard: ${YELLOW}http://localhost:8000${NC}"
echo -e "  2. Copiez son UUID et éditez ${YELLOW}selfhost/migrations/002_seed_admin.sql${NC}"
echo -e "  3. Exécutez: ${YELLOW}docker compose -f /opt/supabase/docker/docker-compose.yml exec -T db psql -U postgres -d postgres < selfhost/migrations/002_seed_admin.sql${NC}"
echo -e "  4. Servez dist/ avec Nginx ou Caddy"
echo -e ""
