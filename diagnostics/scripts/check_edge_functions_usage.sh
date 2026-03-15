#!/usr/bin/env bash
# ============================================================
# Analyse des Edge Functions — Q-Process
# Script en LECTURE SEULE — ne modifie rien
# ============================================================

set -euo pipefail

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FUNCTIONS_DIR="supabase/functions"

echo "============================================"
echo " Analyse des Edge Functions — Q-Process"
echo "============================================"
echo ""

if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo "❌ Dossier $FUNCTIONS_DIR introuvable"
  exit 1
fi

# --- 1. Liste des fonctions ---
echo "${CYAN}1. Edge Functions détectées${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  
  if [ -f "$index_file" ]; then
    lines=$(wc -l < "$index_file")
    echo -e "  ${GREEN}✓${NC} $func_name ($lines lignes)"
  else
    echo -e "  ${YELLOW}⚠${NC} $func_name — pas de index.ts"
  fi
done

echo ""

# --- 2. Utilisation de SUPABASE_URL ---
echo "${CYAN}2. Utilisation de SUPABASE_URL${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  count=$(grep -c "SUPABASE_URL" "$index_file" 2>/dev/null || true)
  if [ "$count" -gt 0 ]; then
    echo "  $func_name : $count occurrence(s)"
  fi
done

echo ""

# --- 3. Utilisation de SUPABASE_ANON_KEY ---
echo "${CYAN}3. Utilisation de SUPABASE_ANON_KEY${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  count=$(grep -c "SUPABASE_ANON_KEY" "$index_file" 2>/dev/null || true)
  if [ "$count" -gt 0 ]; then
    echo "  $func_name : $count occurrence(s)"
  fi
done

echo ""

# --- 4. Utilisation de SUPABASE_SERVICE_ROLE_KEY ---
echo "${CYAN}4. Utilisation de SUPABASE_SERVICE_ROLE_KEY${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  count=$(grep -c "SUPABASE_SERVICE_ROLE_KEY" "$index_file" 2>/dev/null || true)
  if [ "$count" -gt 0 ]; then
    echo "  $func_name : $count occurrence(s)"
  fi
done

echo ""

# --- 5. Recherche SMTP / mail / email ---
echo "${CYAN}5. Références SMTP / mail / email${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  smtp_count=$(grep -ci "smtp" "$index_file" 2>/dev/null || true)
  mail_count=$(grep -ci "mail\|email" "$index_file" 2>/dev/null || true)
  denomailer_count=$(grep -c "denomailer" "$index_file" 2>/dev/null || true)
  
  if [ "$smtp_count" -gt 0 ] || [ "$mail_count" -gt 0 ] || [ "$denomailer_count" -gt 0 ]; then
    echo "  $func_name :"
    [ "$smtp_count" -gt 0 ] && echo "    SMTP: $smtp_count occurrence(s)"
    [ "$mail_count" -gt 0 ] && echo "    mail/email: $mail_count occurrence(s)"
    [ "$denomailer_count" -gt 0 ] && echo "    denomailer: $denomailer_count import(s)"
  fi
done

echo ""

# --- 6. Vérification auth (Authorization header) ---
echo "${CYAN}6. Vérification d'authentification dans chaque fonction${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  has_auth=$(grep -c "Authorization" "$index_file" 2>/dev/null || true)
  has_getUser=$(grep -c "getUser\|auth.getUser" "$index_file" 2>/dev/null || true)
  has_role_check=$(grep -c "has_role\|user_roles" "$index_file" 2>/dev/null || true)
  
  echo "  $func_name :"
  if [ "$has_auth" -gt 0 ]; then
    echo "    ✓ Vérifie Authorization header"
  else
    echo "    ✗ PAS de vérification Authorization"
  fi
  if [ "$has_getUser" -gt 0 ]; then
    echo "    ✓ Appelle getUser()"
  fi
  if [ "$has_role_check" -gt 0 ]; then
    echo "    ✓ Vérifie les rôles (has_role/user_roles)"
  fi
done

echo ""

# --- 7. Tables accédées ---
echo "${CYAN}7. Tables accédées par les Edge Functions${NC}"
echo ""

for func_dir in "$FUNCTIONS_DIR"/*/; do
  func_name=$(basename "$func_dir")
  index_file="$func_dir/index.ts"
  [ -f "$index_file" ] || continue
  
  tables=$(grep -oE '\.from\("([^"]+)"\)' "$index_file" 2>/dev/null | sed 's/\.from("//;s/")//' | sort -u | tr '\n' ', ' | sed 's/,$//')
  
  if [ -n "$tables" ]; then
    echo "  $func_name : $tables"
  fi
done

echo ""
echo "============================================"
echo " Analyse terminée"
echo "============================================"
