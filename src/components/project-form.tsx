"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GRADE_LABELS, PROJECT_TYPE_LABELS, formatPi } from "@/lib/projects";

export type ProjectFormValues = {
  id?: string;
  pi: string;
  title: string;
  type: string;
  grade: string;
  crmEmpresaId: string | null;
  clientName: string;
  location: string;
  technicalLead: string;
  crea: string;
  proposalNumber: string;
  contractNumber: string;
  notes: string;
};

const input = "mt-1 h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none";
const label = "block text-sm font-semibold";

const TYPE_HINTS: Record<string, string> = {
  INVENTARIO: "Cadastro rápido: Ex ou Não Ex, foto e observação. Gera plano de ação.",
  INSPECAO_EX: "Checklist ABNT NBR IEC 60079-17 com fotos de evidência.",
};

export function ProjectForm({ initial, crmConfigured }: { initial: ProjectFormValues; crmConfigured: boolean }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const isEditing = Boolean(initial.id);

  const set = <K extends keyof ProjectFormValues>(key: K, value: ProjectFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.clientName.trim()) {
      setError("Escolha o cliente no CRMEx ou digite o nome do cliente provisório.");
      return;
    }
    setSaving(true);
    setError(null);
    const { id, ...payload } = values;
    const res = await fetch(isEditing ? `/api/projetos/${id}` : "/api/projetos", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, grade: values.type === "INSPECAO_EX" ? values.grade || null : null }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError((data as { error?: string }).error ?? "Não foi possível salvar o projeto.");
      return;
    }
    router.push(`/projetos/${(data as { id: string }).id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className={label}>Tipo de projeto</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(PROJECT_TYPE_LABELS).map(([value, text]) => {
            const selected = values.type === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                onClick={() => set("type", value)}
                className={`rounded-2xl p-4 text-left ${
                  selected ? "border-2 border-brand bg-brand-soft" : "border border-line bg-white"
                }`}
              >
                <span className="block text-base font-bold">{text}</span>
                <span className="mt-1 block text-sm leading-snug text-muted">{TYPE_HINTS[value]}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {values.type === "INSPECAO_EX" && (
        <fieldset className="space-y-2">
          <legend className={label}>Grau da inspeção</legend>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(GRADE_LABELS).map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={values.grade === value}
                onClick={() => set("grade", value)}
                className={`h-12 rounded-xl border text-[15px] font-semibold ${
                  values.grade === value ? "border-brand bg-brand text-white" : "border-line bg-white"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <ClientPicker
        crmConfigured={crmConfigured}
        crmEmpresaId={values.crmEmpresaId}
        clientName={values.clientName}
        onChange={(crmEmpresaId, clientName) => setValues((v) => ({ ...v, crmEmpresaId, clientName }))}
      />

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <label className={label}>
          Nº PI
          <input
            required
            inputMode="numeric"
            pattern="[0-9]*"
            value={values.pi}
            onChange={(e) => set("pi", e.target.value.replace(/\D/g, ""))}
            className={`${input} font-mono`}
          />
          <span className="mt-1 block text-xs font-normal text-muted">
            Etiquetas: EX-INSP-{values.pi ? formatPi(Number(values.pi)) : "PI…"}-0001
          </span>
        </label>
        <label className={label}>
          Título
          <input
            required
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex.: Inventário pós-estudo de classificação"
            className={input}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>
          Local da inspeção
          <input value={values.location} onChange={(e) => set("location", e.target.value)} className={input} />
        </label>
        <label className={label}>
          Responsável técnico
          <input value={values.technicalLead} onChange={(e) => set("technicalLead", e.target.value)} className={input} />
        </label>
        <label className={label}>
          CREA do responsável
          <input value={values.crea} onChange={(e) => set("crea", e.target.value)} className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            Nº proposta
            <input value={values.proposalNumber} onChange={(e) => set("proposalNumber", e.target.value)} className={input} />
          </label>
          <label className={label}>
            Nº contrato
            <input value={values.contractNumber} onChange={(e) => set("contractNumber", e.target.value)} className={input} />
          </label>
        </div>
      </div>

      <label className={label}>
        Observações
        <textarea
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="mt-1 w-full rounded-xl border border-line bg-white px-4 py-3 text-base focus:border-brand focus:outline-none"
        />
      </label>

      {error && <p className="rounded-xl border border-nc bg-nc-soft px-4 py-3 text-[15px] text-nc-ink">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="h-12 rounded-xl px-6 text-base font-semibold text-brand hover:bg-brand-soft"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-14 rounded-xl bg-brand px-8 text-base font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar projeto"}
        </button>
      </div>
    </form>
  );
}

type CrmOption = { id: string; label: string; cnpj: string | null };

function ClientPicker({
  crmConfigured,
  crmEmpresaId,
  clientName,
  onChange,
}: {
  crmConfigured: boolean;
  crmEmpresaId: string | null;
  clientName: string;
  onChange: (crmEmpresaId: string | null, clientName: string) => void;
}) {
  // Sem CRMEx configurado, só existe o cliente provisório (nome digitado).
  const [manual, setManual] = useState(!crmConfigured || (!crmEmpresaId && Boolean(clientName)));
  const [busca, setBusca] = useState("");
  const [options, setOptions] = useState<CrmOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searching = crmConfigured && !manual && !crmEmpresaId;

  useEffect(() => {
    if (!searching) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/crm/empresas?busca=${encodeURIComponent(busca)}`, { signal: controller.signal });
        const data = (await res.json()) as { empresas: CrmOption[]; error?: string };
        setOptions(data.empresas ?? []);
        if (data.error) setError(data.error);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Não foi possível consultar o CRMEx.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [busca, searching]);

  return (
    <fieldset className="space-y-2">
      <legend className="block text-sm font-semibold">Cliente</legend>

      {crmEmpresaId ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-soft p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold">{clientName}</div>
            <div className="text-sm text-muted">Cadastro do CRMEx</div>
          </div>
          <button
            type="button"
            onClick={() => onChange(null, "")}
            className="h-11 shrink-0 rounded-xl border border-line bg-white px-4 text-[15px] font-semibold"
          >
            Trocar
          </button>
        </div>
      ) : manual ? (
        <div className="space-y-2">
          <input
            required
            value={clientName}
            onChange={(e) => onChange(null, e.target.value)}
            placeholder="Nome do cliente"
            aria-label="Nome do cliente"
            className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
          />
          <p className="rounded-xl bg-accent-soft px-4 py-3 text-sm leading-snug text-accent-ink">
            <strong>Cliente provisório.</strong>{" "}
            {crmConfigured
              ? "Prefira o cadastro do CRMEx para não digitar de novo."
              : "Quando a integração com o CRMEx estiver ligada, vincule este projeto ao cadastro do cliente."}
          </p>
          {crmConfigured && (
            <button
              type="button"
              onClick={() => {
                setManual(false);
                onChange(null, "");
              }}
              className="h-11 text-[15px] font-semibold text-brand underline"
            >
              Buscar no CRMEx
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, fantasia ou CNPJ"
            aria-label="Buscar cliente no CRMEx"
            className="h-12 w-full rounded-xl border border-line bg-white px-4 text-base focus:border-brand focus:outline-none"
          />
          {error && <p className="text-sm text-nc">{error}</p>}
          <ul className="space-y-2">
            {options.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => onChange(option.id, option.label)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-left hover:border-brand"
                >
                  <span className="block text-base font-semibold">{option.label}</span>
                  {option.cnpj && <span className="block text-sm text-muted">{option.cnpj}</span>}
                </button>
              </li>
            ))}
          </ul>
          {!loading && !error && options.length === 0 && (
            <p className="text-sm text-muted">Nenhum cliente encontrado.</p>
          )}
          <button
            type="button"
            onClick={() => setManual(true)}
            className="h-11 text-[15px] font-semibold text-brand underline"
          >
            Cliente não está no CRMEx? Digitar nome (provisório)
          </button>
        </div>
      )}
    </fieldset>
  );
}
