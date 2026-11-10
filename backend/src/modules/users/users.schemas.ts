// Reglas de entrada para crear, filtrar y cambiar el estado de usuarios.
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes.',
  });

export const createInternalUserSchema = z.object({
  email: z.string().trim().email().max(256).transform((email) => email.toLowerCase()),
  password: passwordSchema,
  name: z.string().trim().min(1).max(100),
  role: z.enum(['Operador', 'Administrador']),
  line1: z.string().trim().min(1).max(200),
  municipality: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
  role: z.enum(['Cliente', 'Operador', 'Administrador']).optional(),
  active: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
});

export const changeUserStatusSchema = z.object({
  active: z.boolean(),
});

export const userIdParamsSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email().max(256).transform((email) => email.toLowerCase()).optional(),
}).refine((input) => input.name !== undefined || input.email !== undefined, {
  message: 'Debes indicar al menos un campo para actualizar.',
});

export const updateAddressSchema = z.object({
  alias: z.string().trim().min(1).max(50),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable(),
  municipality: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
});

export const createAddressSchema = z.object({
  alias: z.string().trim().min(1).max(50),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  municipality: z.string().trim().min(1).max(100),
  department: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(20),
});

export const addressIdParamsSchema = z.object({
  addressId: z.coerce.number().int().positive(),
});
