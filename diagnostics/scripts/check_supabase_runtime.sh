#!/usr/bin/env bash
# ============================================================
# Détection du mode Supabase (CLI local vs Docker self-hosted)
# Script en LECTURE SEULE — ne modifie rien
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo "============================================"
echo " Diagnostic runtime Supabase — Q-Process"
echo "============================================"
echo ""

# --- 1. Fichiers de configuration ---
echo "${CYAN}1. Fichiers de configuration détectés${NC}"

HAS_CONFIG_TOML=false
HAS_DOCKER_COMPOSE=false
HAS_DOT_ENV=false
HAS_FUNCTIONS_ENV=false

if [ -f "supabase/config.toml" ]; then
  HAS_CONFIG_TOML=true
  echo -e "  ${GREEN}✓${NC} supabase/config.toml trouvé"
  # Extraire project_id
  PROJECT_ID=$(grep -E "^project_id" supabase/config.toml 2>/dev/null | cut -d'"' -f2 || echo "non trouvé")
  echo "    project_id = $PROJECT_ID"
else
  echo -e "  ${RED}✗${NC} supabase/config.toml absent"
fi

if [ -f "docker-compose.yml" ] || [ -f "docker-compose.yaml" ]; then
  HAS_DOCKER_COMPOSE=true
  echo -e "  ${GREEN}✓${NC} docker-compose.yml trouvé"
else
  echo -e "  ${YELLOW}—${NC} docker-compose.yml absent"
fi

if [ -f ".env" ]; then
  HAS_DOT_ENV=true
  echo -e "  ${GREEN}✓${NC} .env trouvé"
  # Vérifier les URLs
  SUPABASE_URL=$(grep "VITE_SUPABASE_URL" .env 2>/dev/null | cut -d'"' -f2 || echo "")
  echo "    VITE_SUPABASE_URL = ${SUPABASE_URL:-non défini}"
else
  echo -e "  ${RED}✗${NC} .env absent"
fi

if [ -f "supabase/functions/.env" ]; then
  HAS_FUNCTIONS_ENV=true
  echo -e "  ${GREEN}✓${NC} supabase/functions/.env trouvé"
else
  echo -e "  ${YELLOW}—${NC} supabase/functions/.env absent (nécessaire pour servir les fonctions localement)"
fi

echo ""

# --- 2. Analyse du mode ---
echo "${CYAN}2. Analyse du mode de déploiement${NC}"

if $HAS_DOCKER_COMPOSE; then
  echo -e "  ${YELLOW}⚠${NC} docker-compose.yml détecté → mode self-hosted probable"
  
  # Vérifier si c'est un docker-compose Supabase
  if grep -q "supabase" docker-compose.yml 2>/dev/null || grep -q "supabase" docker-compose.yaml 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} Le docker-compose semble être pour Supabase self-hosted"
  fi
fi

if $HAS_CONFIG_TOML && ! $HAS_DOCKER_COMPOSE; then
  echo -e "  ${GREEN}✓${NC} Mode détecté : Supabase CLI local ou Supabase Cloud"
  echo "    Le projet utilise supabase/config.toml sans docker-compose"
  echo "    → Compatible avec 'supabase start' (CLI) ou Lovable Cloud"
fi

if [ -n "${SUPABASE_URL:-}" ]; then
  if echo "$SUPABASE_URL" | grep -q "supabase.co"; then
    echo -e "  ${GREEN}✓${NC} URL pointe vers Supabase Cloud (*.supabase.co)"
  elif echo "$SUPABASE_URL" | grep -q "localhost"; then
    echo -e "  ${YELLOW}⚠${NC} URL pointe vers localhost → mode CLI local"
  else
    echo -e "  ${YELLOW}⚠${NC} URL custom : $SUPABASE_URL → self-hosted probable"
  fi
fi

echo ""

# --- 3. Vérifications de cohérence ---
echo "${CYAN}3. Vérifications de cohérence${NC}"

# Vérifier si les migrations contiennent des dépendances self-hosted
if grep -rl "pg_net" supabase/migrations/ >/dev/null 2>&1; then
  echo -e "  ${YELLOW}⚠${NC} Les migrations utilisent pg_net (extension spécifique Supabase Cloud)"
  echo "    → En self-hosted, vérifier que pg_net est installé"
else
  echo -e "  ${GREEN}✓${NC} Pas de dépendance pg_net dans les migrations"
fi

# Vérifier les Edge Functions
FUNC_COUNT=$(find supabase/functions -maxdepth 1 -type d | tail -n +2 | wc -l)
echo -e "  ${GREEN}✓${NC} $FUNC_COUNT Edge Functions détectées"

# Vérifier si des fonctions utilisent des URLs hardcodées
if grep -rl "supabase.co" supabase/functions/ >/dev/null 2>&1; then
  echo -e "  ${RED}✗${NC} URLs supabase.co hardcodées dans les Edge Functions"
  grep -rl "supabase.co" supabase/functions/ | while read -r f; do
    echo "    → $f"
  done
else
  echo -e "  ${GREEN}✓${NC} Pas d'URLs hardcodées dans les Edge Functions (utilise Deno.env)"
fi

# Vérifier storage buckets dans les migrations
BUCKET_COUNT=$(grep -r "storage.buckets" supabase/migrations/ 2>/dev/null | wc -l)
if [ "$BUCKET_COUNT" -gt 0 ]; then
  echo -e "  ${YELLOW}⚠${NC} $BUCKET_COUNT INSERT dans storage.buckets (peut échouer en re-exécution)"
fi

echo ""

# --- 4. Résumé ---
echo "============================================"
echo " RÉSUMÉ"
echo "============================================"

if $HAS_CONFIG_TOML && ! $HAS_DOCKER_COMPOSE; then
  echo -e " Mode principal : ${GREEN}Supabase CLI / Cloud${NC}"
  echo " Pour utiliser en local : supabase start"
  echo " Pour utiliser en cloud : supabase link --project-ref <ref>"
elif $HAS_CONFIG_TOML && $HAS_DOCKER_COMPOSE; then
  echo -e " Mode : ${YELLOW}Mixte CLI + Docker${NC} (potentiellement incohérent)"
  echo " Vérifier quel mode est effectivement utilisé"
else
  echo -e " Mode : ${RED}Indéterminé${NC}"
  echo " Fichiers de configuration manquants"
fi
