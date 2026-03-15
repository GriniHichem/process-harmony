#!/usr/bin/env bash
# ============================================================
# Vérification de la structure du projet Q-Process
# Script en LECTURE SEULE — ne modifie rien
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

check_file() {
  local path="$1"
  local desc="$2"
  local required="${3:-true}"
  
  if [ -f "$path" ]; then
    echo -e "  ${GREEN}✓${NC} $desc ($path)"
  elif [ "$required" = "true" ]; then
    echo -e "  ${RED}✗${NC} $desc ($path) — MANQUANT"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "  ${YELLOW}?${NC} $desc ($path) — optionnel, absent"
    WARNINGS=$((WARNINGS + 1))
  fi
}

check_dir() {
  local path="$1"
  local desc="$2"
  
  if [ -d "$path" ]; then
    local count
    count=$(find "$path" -maxdepth 1 -type f | wc -l)
    echo -e "  ${GREEN}✓${NC} $desc ($path) — $count fichiers"
  else
    echo -e "  ${RED}✗${NC} $desc ($path) — MANQUANT"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "============================================"
echo " Diagnostic structure — Q-Process"
echo "============================================"
echo ""

# --- Configuration ---
echo "📋 Configuration"
check_file "package.json" "Package.json"
check_file "vite.config.ts" "Config Vite"
check_file "tailwind.config.ts" "Config Tailwind"
check_file "tsconfig.json" "Config TypeScript"
check_file ".env" "Variables d'environnement"
check_file "index.html" "Point d'entrée HTML"
echo ""

# --- Supabase ---
echo "🗄️  Supabase"
check_file "supabase/config.toml" "Config Supabase"
check_dir "supabase/migrations" "Dossier migrations"
check_dir "supabase/functions" "Dossier Edge Functions"
echo ""

# --- Edge Functions ---
echo "⚡ Edge Functions"
check_file "supabase/functions/admin-create-user/index.ts" "admin-create-user"
check_file "supabase/functions/admin-reset-password/index.ts" "admin-reset-password"
check_file "supabase/functions/admin-save-smtp-password/index.ts" "admin-save-smtp-password"
check_file "supabase/functions/send-test-email/index.ts" "send-test-email"
check_file "supabase/functions/send-notification-email/index.ts" "send-notification-email"
check_file "supabase/functions/send-survey-copy/index.ts" "send-survey-copy"
check_file "supabase/functions/check-deadlines/index.ts" "check-deadlines"
echo ""

# --- Frontend ---
echo "🖥️  Frontend"
check_file "src/main.tsx" "Point d'entrée React"
check_file "src/App.tsx" "Composant racine"
check_file "src/integrations/supabase/client.ts" "Client Supabase"
check_file "src/integrations/supabase/types.ts" "Types Supabase"
check_file "src/contexts/AuthContext.tsx" "Contexte Auth"
check_file "src/components/ProtectedRoute.tsx" "Route protégée"
check_file "src/components/RoleGuard.tsx" "Garde de rôle"
check_file "src/lib/defaultPermissions.ts" "Permissions par défaut"
echo ""

# --- Pages clés ---
echo "📄 Pages clés"
check_file "src/pages/Login.tsx" "Page login"
check_file "src/pages/Dashboard.tsx" "Dashboard"
check_file "src/pages/Utilisateurs.tsx" "Gestion utilisateurs"
check_file "src/pages/SuperAdmin.tsx" "Super Admin"
check_file "src/pages/Processus.tsx" "Processus"
echo ""

# --- Fichiers optionnels ---
echo "📎 Fichiers optionnels"
check_file "supabase/functions/.env" "Env Edge Functions local" "false"
check_file "docker-compose.yml" "Docker Compose (self-hosted)" "false"
echo ""

# --- Résumé ---
echo "============================================"
if [ $ERRORS -eq 0 ]; then
  echo -e " ${GREEN}✓ Structure OK${NC} — $WARNINGS avertissements"
  exit 0
else
  echo -e " ${RED}✗ $ERRORS fichiers essentiels manquants${NC} — $WARNINGS avertissements"
  exit 1
fi
