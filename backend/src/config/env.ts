// Carga y valida la configuración al iniciar; falla pronto si falta un valor.
import "dotenv/config";
import { z } from "zod";

// Definicion de esquema de validación para las variables de entorno.
const environmentSchema = z
  .object({
    // Aquí se definen las variables que usa el backend y sus valores por defecto.
    NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

    PORT: z.coerce.number().int().min(1).max(65535).default(3000),

    CORS_ORIGINS: z.string().default("http://localhost:5173"),

    SQL_SERVER: z.string().trim().min(1),
    SQL_PORT: z.coerce.number().int().min(1).max(65535).default(1433),
    SQL_DATABASE: z.string().trim().min(1),
    SQL_USER: z.string().trim().min(1),
    SQL_PASSWORD: z.string().min(1),

    SQL_ENCRYPT: z.stringbool().default(true),
    SQL_TRUST_SERVER_CERTIFICATE: z.stringbool().default(false),

    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_ACCESS_TTL_SECONDS: z.coerce

    .number()
    .int()
    .min(60)
    .max(3600)
    .default(900),

    REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(90)
    .default(7),

    COOKIE_SECURE: z.stringbool().default(false),
    COOKIE_SAME_SITE: z
    .enum(["strict", "lax", "none"])
    .default("lax"),
})
.superRefine((configuration, context) => {
    // Estas reglas dependen de la combinación de varias variables.
    if (
    configuration.COOKIE_SAME_SITE === "none" &&
    !configuration.COOKIE_SECURE
    ) {
    context.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.",
    });
    }

    if (
    configuration.NODE_ENV === "production" &&
    !configuration.COOKIE_SECURE
    ) {
    context.addIssue({
        code: "custom",
        path: ["COOKIE_SECURE"],
        message: "COOKIE_SECURE must be true in production.",
    });
    }

    if (
    configuration.CORS_ORIGINS.split(",").every(
        (origin) => origin.trim() === "",
    )
    ) {
    context.addIssue({
        code: "custom",
        path: ["CORS_ORIGINS"],
        message: "At least one allowed origin must be configured.",
    });
    }
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
// se detiene el servidor aquí, y no arranca con una configuración incompleta.
const details = parsedEnvironment.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = {
...parsedEnvironment.data,
// Permite definir varios orígenes en una sola variable separados por comas.
CORS_ORIGINS: parsedEnvironment.data.CORS_ORIGINS
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
};
