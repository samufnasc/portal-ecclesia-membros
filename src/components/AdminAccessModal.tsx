import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { DEPARTMENTS } from "../data/members";
import { cn } from "../lib/utils";
import { X, Plus, Save, ShieldCheck, RefreshCw, Ban, CheckCircle2 } from "lucide-react";

type AccessRole = "admin" | "pastor" | "leader";
type AccessUser = {
  user_id: string;
  display_name: string;
  email: string | null;
  role: AccessRole;
  is_active: boolean;
  departments: string[];
};

function usernameFromName(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
}

export default function AdminAccessModal({ isDarkMode, onClose }: { isDarkMode: boolean; onClose: () => void }) {
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AccessRole>("leader");
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState("");

  const selectedUser = users.find((user) => user.user_id === selectedId) ?? null;

  async function loadUsers() {
    if (!supabase) {
      setError("Supabase não está configurado neste ambiente.");
      setLoadingUsers(false);
      return;
    }
    setLoadingUsers(true);
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id, display_name, email, role, is_active")
      .order("display_name");
    if (profileError) {
      setError("Não foi possível carregar os acessos. Confirme a sessão de administrador e a migração do banco.");
      setLoadingUsers(false);
      return;
    }
    const { data: links, error: linksError } = await supabase
      .from("department_leaders")
      .select("leader_user_id, department");
    if (linksError) {
      setError("Contas carregadas, mas não foi possível carregar os departamentos.");
      setLoadingUsers(false);
      return;
    }
    const mapped = (profiles ?? []).map((profile: any) => ({
      ...profile,
      role: profile.role as AccessRole,
      is_active: profile.is_active !== false,
      departments: (links ?? [])
        .filter((link: any) => link.leader_user_id === profile.user_id)
        .map((link: any) => link.department as string),
    })) as AccessUser[];
    setUsers(mapped);
    setLoadingUsers(false);
  }

  useEffect(() => { void loadUsers(); }, []);

  function clearForm() {
    setSelectedId("");
    setDisplayName("");
    setPassword("");
    setRole("leader");
    setDepartments([]);
    setError("");
  }

  function selectUser(user: AccessUser) {
    setSelectedId(user.user_id);
    setDisplayName(user.display_name);
    setPassword("");
    setRole(user.role);
    setDepartments(user.departments);
    setError("");
  }

  function toggleDepartment(department: string) {
    setDepartments((current) => current.includes(department)
      ? current.filter((item) => item !== department)
      : [...current, department]);
  }

  async function callAdminFunction(body: Record<string, unknown>) {
    if (!supabase) throw new Error("Supabase não está configurado.");
    const { data, error: invokeError } = await supabase.functions.invoke("admin-manage-user", { body });
    if (invokeError) throw new Error(invokeError.message || "Não foi possível concluir a operação.");
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (role === "leader" && departments.length === 0) throw new Error("Selecione pelo menos um departamento para o líder.");
      if (selectedUser) {
        await callAdminFunction({ action: "update", userId: selectedUser.user_id, displayName, role, departments });
        if (password.length > 0) {
          if (password.length < 7) throw new Error("A senha deve ter pelo menos 7 caracteres.");
          await callAdminFunction({ action: "reset_password", userId: selectedUser.user_id, password });
        }
      } else {
        if (password.length < 7) throw new Error("A senha deve ter pelo menos 7 caracteres.");
        await callAdminFunction({ action: "create", displayName, password, role, departments });
      }
      setPassword("");
      await loadUsers();
      clearForm();
      alert(selectedUser ? "Acesso atualizado com sucesso." : "Conta criada com sucesso.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocorreu um erro ao salvar o acesso.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(user: AccessUser) {
    const action = user.is_active ? "deactivate" : "activate";
    const confirmation = user.is_active
      ? "Deseja bloquear o acesso de " + user.display_name + "?"
      : "Deseja reativar o acesso de " + user.display_name + "?";
    if (!window.confirm(confirmation)) return;
    setError("");
    setLoading(true);
    try {
      await callAdminFunction({ action, userId: user.user_id });
      await loadUsers();
      if (selectedId === user.user_id) clearForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o acesso.");
    } finally {
      setLoading(false);
    }
  }

  const fieldClass = cn("w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-sky-500/20",
    isDarkMode ? "bg-slate-900 border-white/10 text-white" : "bg-white border-slate-200 text-slate-800");
  const mutedClass = isDarkMode ? "text-slate-400" : "text-slate-500";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm">
      <div className={cn("flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl",
        isDarkMode ? "bg-[#0f172a] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800")}>
        <div className={cn("flex items-center justify-between border-b p-5", isDarkMode ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50")}>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-500/15 p-2.5 text-sky-400"><ShieldCheck className="h-5 w-5" /></div>
            <div>
              <h2 className="font-bold">Gerenciar acessos</h2>
              <p className={cn("text-xs", mutedClass)}>Crie contas, atribua departamentos e redefina senhas.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="Fechar"><X className="h-5 w-5" /></button>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[0.9fr_1.1fr]">
          <section className={cn("border-b p-4 md:border-b-0 md:border-r", isDarkMode ? "border-white/10" : "border-slate-200")}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider">Contas cadastradas</h3>
              <button type="button" onClick={clearForm} className="flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" /> Nova conta</button>
            </div>
            {loadingUsers ? <p className={cn("py-6 text-sm", mutedClass)}>Carregando contas…</p> : users.length === 0 ? <p className={cn("py-6 text-sm", mutedClass)}>Nenhuma conta gerenciada encontrada.</p> : (
              <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
                {users.map((user) => (
                  <div key={user.user_id} className={cn("flex items-start gap-2 rounded-xl border p-3", selectedId === user.user_id ? "border-sky-500/50 bg-sky-500/10" : isDarkMode ? "border-white/5 bg-slate-800/40" : "border-slate-200 bg-slate-50")}>
                    <button type="button" onClick={() => selectUser(user)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold">{user.display_name}</span>
                      <span className={cn("block truncate text-xs", mutedClass)}>{usernameFromName(user.display_name)}</span>
                      <span className={cn("mt-1 block text-[10px] uppercase tracking-wider", user.is_active ? "text-emerald-500" : "text-rose-500")}>{user.role} · {user.is_active ? "Ativo" : "Bloqueado"}</span>
                      {user.departments.length > 0 && <span className={cn("mt-1 block text-[10px]", mutedClass)}>{user.departments.join(" · ")}</span>}
                    </button>
                    <button type="button" disabled={loading} onClick={() => void toggleActive(user)} title={user.is_active ? "Bloquear acesso" : "Reativar acesso"} className={cn("rounded-lg p-2 disabled:opacity-50", user.is_active ? "text-rose-400 hover:bg-rose-500/10" : "text-emerald-400 hover:bg-emerald-500/10")}>
                      {user.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="p-4 md:p-5">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-wider">{selectedUser ? "Editar conta" : "Criar nova conta"}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <label className="block space-y-1.5"><span className={cn("text-xs font-semibold", mutedClass)}>Nome de exibição</span><input className={fieldClass} required value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Nome do líder ou pastor" /></label>
              <label className="block space-y-1.5"><span className={cn("text-xs font-semibold", mutedClass)}>Nome de usuário para entrar</span><input className={fieldClass} type="text" value={usernameFromName(displayName)} readOnly placeholder="Gerado a partir do nome" /></label>
              <label className="block space-y-1.5"><span className={cn("text-xs font-semibold", mutedClass)}>{selectedUser ? "Nova senha (opcional)" : "Senha inicial"}</span><input className={fieldClass} type="password" minLength={7} required={!selectedUser} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 7 caracteres" autoComplete="new-password" /></label>
              <label className="block space-y-1.5"><span className={cn("text-xs font-semibold", mutedClass)}>Perfil de acesso</span><select className={fieldClass} value={role} onChange={(e) => setRole(e.target.value as AccessRole)}><option value="leader">Líder de departamento</option><option value="pastor">Pastor congregacional</option><option value="admin">Administrador</option></select></label>
              {role === "leader" && (
                <div className="space-y-2">
                  <p className={cn("text-xs font-semibold", mutedClass)}>Departamentos autorizados</p>
                  <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto rounded-xl border p-3" style={{ borderColor: isDarkMode ? "rgba(255,255,255,.1)" : "#e2e8f0" }}>
                    {DEPARTMENTS.map((department) => (
                      <label key={department} className="flex cursor-pointer items-center gap-2 text-xs">
                        <input type="checkbox" checked={departments.includes(department)} onChange={() => toggleDepartment(department)} />
                        <span>{department}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {error && <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">{error}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                <button type="submit" disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
                  {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {loading ? "Salvando…" : selectedUser ? "Salvar alterações" : "Criar acesso"}
                </button>
                {selectedUser && <button type="button" onClick={clearForm} className={cn("rounded-xl border px-4 py-3 text-sm font-semibold", isDarkMode ? "border-white/10 text-slate-300" : "border-slate-200 text-slate-600")}>Cancelar edição</button>}
              </div>
              <p className={cn("text-[10px] leading-relaxed", mutedClass)}>As senhas não são exibidas nem armazenadas nesta tela. O nome de usuário é gerado a partir do nome informado. O administrador define e pode redefinir a senha.</p>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
