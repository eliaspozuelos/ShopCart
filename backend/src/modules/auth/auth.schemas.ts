// Valida cuerpos HTTP antes de entrar a la lógica de autenticación.
import { z } from 'zod';

const registrationPasswordSchema = z.string()
  .min(8)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes.',
  });

const loginPasswordSchema = z.string()
  .min(1)
  // Se permite login con contraseñas antiguas; el límite evita bcrypt truncation.
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes.',
  });

const passwordSchema = z.string()
  .min(8)
  .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
    message: 'La contraseña no puede superar 72 bytes.',
  });

export const registerSchema = z.object({
  email: z.string().trim().email().max(256).transform((email) => email.toLowerCase()),
  password: registrationPasswordSchema,
  name: z.string().trim().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(256).transform((email) => email.toLowerCase()),
  password: loginPasswordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
}).refine((input) => input.currentPassword !== input.newPassword, {
  path: ['newPassword'],
  message: 'La nueva contraseña debe ser diferente a la actual.',
});
