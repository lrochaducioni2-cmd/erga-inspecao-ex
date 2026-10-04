import { z } from "zod";

export const userRoleValues = ["ADMIN", "INSPETOR"] as const;

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres."),
  email: z.email("Informe um e-mail válido.").trim().toLowerCase(),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres."),
  role: z.enum(userRoleValues).default("INSPETOR"),
});

export const updateUserSchema = z.object({
  active: z.boolean().optional(),
  role: z.enum(userRoleValues).optional(),
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres.").optional(),
});

export const firstAccessSchema = createUserSchema.omit({ role: true }).extend({
  setupCode: z.string().trim().min(1, "Informe o código de instalação."),
});

// --- Projetos ---------------------------------------------------------------

export const projectTypeValues = ["INVENTARIO", "INSPECAO_EX"] as const;
export const gradeValues = ["VISUAL", "APURADA", "DETALHADA"] as const;
export const statusValues = ["RASCUNHO", "EM_CAMPO", "EM_REVISAO", "APROVADO", "EMITIDO"] as const;

const optionalText = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => v || null);

const projectFields = {
  pi: z.coerce.number().int("PI deve ser um número inteiro.").min(1, "PI deve ser maior que zero.").max(9_999_999),
  title: z.string().trim().min(2, "Título deve ter pelo menos 2 caracteres.").max(200),
  type: z.enum(projectTypeValues),
  grade: z.enum(gradeValues).nullish(),
  // Cliente do CRMEx (id) ou provisório (só o nome).
  crmEmpresaId: z.string().trim().max(100).nullish().transform((v) => v || null),
  clientName: z.string().trim().min(2, "Informe o cliente.").max(200),
  location: optionalText,
  technicalLead: optionalText,
  crea: optionalText,
  technicalLeadCert: optionalText,
  proposalNumber: optionalText,
  contractNumber: optionalText,
  notes: z.string().trim().max(5000).optional().transform((v) => v || null),
};

export const createProjectSchema = z
  .object(projectFields)
  .refine((p) => p.type !== "INSPECAO_EX" || p.grade, {
    message: "Escolha o grau da inspeção (Visual, Apurada ou Detalhada).",
    path: ["grade"],
  });

export const updateProjectSchema = z.object(projectFields).partial().extend({
  status: z.enum(statusValues).optional(),
});

// --- Inventário ---------------------------------------------------------------

export const zoneValues = ["ZONA_0", "ZONA_1", "ZONA_2", "ZONA_20", "ZONA_21", "ZONA_22", "NAO_CLASSIFICADA"] as const;

export const areaSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do ambiente.").max(200),
  zone: z.enum(zoneValues),
  notes: z.string().trim().max(2000).optional().transform((v) => v || null),
});

export const equipmentSchema = z.object({
  areaId: z.string().min(1, "Escolha o ambiente."),
  name: z.string().trim().min(1, "Informe o equipamento.").max(200),
  isEx: z.boolean({ error: "Diga se o equipamento é Ex ou Não Ex." }),
  quantity: z.coerce.number().int().min(1, "Quantidade mínima é 1.").max(9999).default(1),
  clientTag: z.string().trim().max(100).optional().transform((v) => v || null),
  notes: z.string().trim().max(5000).optional().transform((v) => v || null),
});
