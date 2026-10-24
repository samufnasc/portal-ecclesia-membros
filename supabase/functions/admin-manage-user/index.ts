import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sessão ausente." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Configuração interna incompleta no servidor." }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sessão inválida." }, 401);

  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileError) return json({ error: "Não foi possível validar as permissões." }, 500);
  if (profile?.role !== "admin") return json({ error: "Somente o administrador pode gerenciar acessos." }, 403);

  let body: {
    action?: string;
    userId?: string;
    email?: string;
    password?: string;
    displayName?: string;
    role?: "admin" | "pastor" | "leader";
    departments?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Corpo da requisição inválido." }, 400);
  }

  const action = body.action;
  const validRoles = ["admin", "pastor", "leader"];
  const departments = Array.isArray(body.departments)
    ? [...new Set(body.departments.map((d) => String(d).trim()).filter(Boolean))]
    : [];

  if (action === "create") {
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() ?? "";
    if (!email || !displayName || password.length < 10 || !validRoles.includes(body.role ?? "")) {
      return json({ error: "Informe nome, e-mail, perfil e uma senha com pelo menos 10 caracteres." }, 400);
    }
    if (body.role === "leader" && departments.length === 0) {
      return json({ error: "Associe pelo menos um departamento ao líder." }, 400);
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });
    if (createError || !created.user) {
      return json({ error: createError?.message ?? "Não foi possível criar a conta." }, 400);
    }

    const userId = created.user.id;
    const { error: profileInsertError } = await adminClient.from("user_profiles").insert({
      user_id: userId,
      display_name: displayName,
      email,
      role: body.role,
      is_active: true,
    });

    if (profileInsertError) {
      await adminClient.auth.admin.deleteUser(userId);
      return json({ error: "A conta foi revertida porque o perfil não pôde ser criado." }, 500);
    }

    if (body.role === "leader") {
      const { error: departmentsError } = await adminClient.from("department_leaders").insert(
        departments.map((department) => ({ department, leader_user_id: userId })),
      );
      if (departmentsError) {
        await adminClient.from("user_profiles").delete().eq("user_id", userId);
        await adminClient.auth.admin.deleteUser(userId);
        return json({ error: "A conta foi revertida porque os departamentos não puderam ser vinculados." }, 500);
      }
    }

    return json({ userId, displayName, role: body.role, departments });
  }

  if (action === "update" || action === "reset_password" || action === "deactivate" || action === "activate") {
    const userId = body.userId?.trim();
    if (!userId) return json({ error: "Identificador do usuário obrigatório." }, 400);

    if (action === "deactivate") {
      if (userId === authData.user.id) return json({ error: "O administrador não pode desativar a própria conta." }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: "876000h" });
      if (error) return json({ error: error.message }, 400);
      const { error: profileUpdateError } = await adminClient
        .from("user_profiles")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (profileUpdateError) return json({ error: "Conta bloqueada, mas o perfil não pôde ser atualizado." }, 500);
      return json({ userId, deactivated: true });
    }

    if (action === "activate") {
      const { error } = await adminClient.auth.admin.updateUserById(userId, { ban_duration: "none" });
      if (error) return json({ error: error.message }, 400);
      const { error: profileUpdateError } = await adminClient
        .from("user_profiles")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      if (profileUpdateError) return json({ error: "Conta reativada, mas o perfil não pôde ser atualizado." }, 500);
      return json({ userId, activated: true });
    }

    if (action === "reset_password") {
      const password = body.password ?? "";
      if (password.length < 10) return json({ error: "A nova senha precisa ter pelo menos 10 caracteres." }, 400);
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password, ban_duration: "none" });
      if (error) return json({ error: error.message }, 400);
      return json({ userId, passwordUpdated: true });
    }

    const displayName = body.displayName?.trim();
    const email = body.email?.trim().toLowerCase();
    const role = body.role;
    if (!displayName || !validRoles.includes(role ?? "")) {
      return json({ error: "Informe nome e perfil válidos." }, 400);
    }
    if (role === "leader" && departments.length === 0) {
      return json({ error: "Associe pelo menos um departamento ao líder." }, 400);
    }

    const { error: profileUpdateError } = await adminClient
      .from("user_profiles")
      .update({ display_name: displayName, ...(email ? { email } : {}), role, is_active: true, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    if (profileUpdateError) return json({ error: profileUpdateError.message }, 400);
    if (email) {
      const { error: authEmailError } = await adminClient.auth.admin.updateUserById(userId, { email, email_confirm: true });
      if (authEmailError) return json({ error: "Perfil atualizado, mas o e-mail de autenticação não foi atualizado." }, 500);
    }

    const { error: deleteDepartmentsError } = await adminClient
      .from("department_leaders")
      .delete()
      .eq("leader_user_id", userId);
    if (deleteDepartmentsError) return json({ error: "Perfil atualizado, mas não foi possível atualizar os departamentos." }, 500);

    if (role === "leader") {
      const { error: insertDepartmentsError } = await adminClient.from("department_leaders").insert(
        departments.map((department) => ({ department, leader_user_id: userId })),
      );
      if (insertDepartmentsError) return json({ error: "Perfil atualizado, mas não foi possível salvar os departamentos." }, 500);
    }

    return json({ userId, displayName, role, departments: role === "leader" ? departments : [] });
  }

  return json({ error: "Ação desconhecida." }, 400);
});
