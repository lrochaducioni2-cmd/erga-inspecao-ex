"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UserRow = { id: string; name: string; email: string; role: string; active: boolean };

const ROLE_LABELS: Record<string, string> = { ADMIN: "Administrador", INSPETOR: "Inspetor" };

async function send(url: string, method: "POST" | "PATCH", body: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string }).error ?? "Não foi possível salvar.";
}

export function UsuariosClient({ users, meId }: { users: UserRow[]; meId: string }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "INSPETOR" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const err = await send("/api/usuarios", "POST", form);
    setSaving(false);
    if (err) {
      setError(err);
      return;
    }
    setForm({ name: "", email: "", password: "", role: "INSPETOR" });
    router.refresh();
  }

  async function toggleActive(user: UserRow) {
    setBusyId(user.id);
    setError(null);
    const err = await send(`/api/usuarios/${user.id}`, "PATCH", { active: !user.active });
    setBusyId(null);
    if (err) setError(err);
    router.refresh();
  }

  const input = "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="mt-1 text-[15px] text-muted">Quem pode entrar no sistema. Só o administrador vê esta tela.</p>
      </div>

      {error && <p className="rounded-xl border border-nc bg-nc-soft px-4 py-3 text-[15px] text-nc-ink">{error}</p>}

      <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
        {users.map((user) => (
          <li key={user.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">
                {user.name} {user.id === meId && <span className="text-sm font-normal text-muted">(você)</span>}
              </div>
              <div className="truncate text-sm text-muted">{user.email}</div>
            </div>
            <span className="rounded-lg bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
              {ROLE_LABELS[user.role]}
            </span>
            {!user.active && (
              <span className="rounded-lg bg-nc-soft px-3 py-1 text-sm font-semibold text-nc-ink">Desativado</span>
            )}
            {user.id !== meId && (
              <button
                onClick={() => toggleActive(user)}
                disabled={busyId === user.id}
                className="h-11 rounded-xl border border-line px-4 text-[15px] font-semibold hover:border-brand disabled:opacity-60"
              >
                {user.active ? "Desativar" : "Reativar"}
              </button>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={create} className="space-y-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg font-bold">Novo usuário</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Nome
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
          </label>
          <label className="block text-sm font-semibold">
            E-mail
            <input
              required
              type="email"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={input}
            />
          </label>
          <label className="block text-sm font-semibold">
            Senha inicial (mín. 8 caracteres)
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={input}
            />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Papel</legend>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.role === value}
                  onClick={() => setForm({ ...form, role: value })}
                  className={`h-12 rounded-xl border text-[15px] font-semibold ${
                    form.role === value ? "border-brand bg-brand text-white" : "border-line bg-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl bg-brand px-6 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Criar usuário"}
        </button>
      </form>
    </div>
  );
}
