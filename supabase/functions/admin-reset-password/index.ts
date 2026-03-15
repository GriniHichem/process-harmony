import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return jsonResponse({ error: 'Configuration serveur manquante (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY). Vérifiez vos variables d\'environnement.' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'En-tête Authorization manquant. Veuillez vous reconnecter.' }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      console.error('Auth error:', userErr?.message || 'No user found for token');
      return jsonResponse({ error: 'Session invalide ou expirée. Veuillez vous reconnecter.' }, 401);
    }

    const { data: isAdmin, error: adminCheckErr } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'admin' });
    const { data: isSuperAdmin, error: superCheckErr } = await supabaseAdmin.rpc('has_role', { _user_id: user.id, _role: 'super_admin' });

    if (adminCheckErr || superCheckErr) {
      console.error('Role check error:', adminCheckErr?.message || superCheckErr?.message);
      return jsonResponse({
        error: 'Erreur lors de la vérification des permissions. La fonction has_role() ou la table user_roles est peut-être manquante. Exécutez les migrations.',
        detail: adminCheckErr?.message || superCheckErr?.message,
      }, 500);
    }

    if (!isAdmin && !isSuperAdmin) {
      return jsonResponse({ error: 'Rôle admin ou super_admin requis.' }, 403);
    }

    let body: Record<string, string>;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Corps de requête JSON invalide.' }, 400);
    }

    const { user_id, new_password } = body;
    if (!user_id || !new_password) {
      return jsonResponse({ error: 'user_id et new_password sont requis.' }, 400);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password: new_password });
    if (error) {
      console.error('Reset password error:', error.message);
      return jsonResponse({ error: error.message }, 400);
    }

    return jsonResponse({ success: true });
  } catch (e) {
    console.error('Unexpected error:', e);
    return jsonResponse({ error: e.message || 'Erreur interne du serveur' }, 500);
  }
});
