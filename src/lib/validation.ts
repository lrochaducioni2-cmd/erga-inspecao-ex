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
