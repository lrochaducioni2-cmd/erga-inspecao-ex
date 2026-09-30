"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const input = "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none";

export function FirstAccessForm({ configured }: { configured: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ setupCode: "", name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (form.password !== form.confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    setError(null);
    const { confirm: _confirm, ...payload } = form;
    void _confirm;
    const res = await fetch("/api/primeiro-acesso", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      setError((data as { error?: string }).error ?? "Não foi possível criar o administrador.");
      if (res.status === 409) router.push("/login");
      return;
    }
    await signIn("credentials", { email: form.email, password: form.password, redirect: false });
    router.push("/projetos");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-xl font-bold text-accent">
            Ex
          </div>
          <div>
            <div className="text-lg font-bold">Inspeção Ex</div>
            <div className="text-sm text-muted">Primeiro acesso</div>
          </div>
        </div>

        {!configured ? (
          <p className="rounded-2xl border border-accent bg-accent-soft p-5 text-[15px] leading-relaxed text-accent-ink">
            Para criar o administrador, defina a variável <strong>SETUP_CODE</strong> na hospedagem (Vercel ›
            Settings › Environment Variables) e publique de novo.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-line bg-white p-6">
            <div>
              <h1 className="text-xl font-semibold">Criar administrador</h1>
              <p className="mt-1 text-sm text-muted">Só aparece uma vez, enquanto o sistema não tem usuários.</p>
            </div>
            <label className="block text-sm font-semibold">
              Código de instalação
              <input
                required
                autoComplete="off"
                value={form.setupCode}
                onChange={(e) => setForm({ ...form, setupCode: e.target.value })}
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold">
              Seu nome
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} />
            </label>
            <label className="block text-sm font-semibold">
              E-mail
              <input
                required
                type="email"
                inputMode="email"
                autoComplete="username"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold">
              Senha (mín. 8 caracteres)
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold">
              Repita a senha
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className={input}
              />
            </label>
            {error && <p className="text-sm font-medium text-nc">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-xl bg-brand text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {loading ? "Criando..." : "Criar administrador e entrar"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
