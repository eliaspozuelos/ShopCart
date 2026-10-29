# Backend de ShopCart

API REST de ShopCart desarrollada con Node.js 24+, Express y TypeScript. Actualmente implementa autenticación, sesiones, usuarios, perfiles y direcciones. El acceso a SQL Server se realiza mediante Stored Procedures.

## Requisitos

- Node.js 24 LTS o superior y npm.
- SQL Server 2019 o superior.
- Base `ShopCart`, roles y Stored Procedures instalados. Para el flujo completo de instalación, sigue el [README raíz](../README.md); para los scripts SQL, consulta [database/README.md](../database/README.md).

## Instalación y configuración

Desde PowerShell, en la raíz del repositorio:

```powershell
Set-Location .\backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`npm install` instala las dependencias de ejecución y desarrollo indicadas en `package.json` y `package-lock.json`. No instala Node.js o SQL Server ni crea la base de datos.

Edita `backend/.env` y completa los datos de conexión a tu instancia SQL Server. Genera un valor aleatorio para `JWT_ACCESS_SECRET` (mínimo 32 caracteres) con esta línea de PowerShell:

```powershell
$bytes = New-Object byte[] 32; $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); try { $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes) } finally { $rng.Dispose() }
```

Copia la salida (44 caracteres Base64) en `JWT_ACCESS_SECRET`. Las variables principales son:

```env
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=ShopCart
SQL_USER=tu-usuario-sql-server
SQL_PASSWORD=tu-contraseña-sql-server
JWT_ACCESS_SECRET=<pega-aqui-el-secreto-generado>
```

Los valores opcionales están descritos en `.env.example`. No compartas ni subas `.env`, ya que contiene credenciales locales.

## Comprobar e iniciar

Desde PowerShell, en la carpeta `backend/`:

```powershell
npm run db:check
npm run dev
```

`npm run db:check` verifica la conexión a SQL Server. Si termina sin errores, `npm run dev` inicia la API en `http://localhost:3000`. Comprueba `http://localhost:3000/health`. Para detener el servidor, usa `Ctrl+C`.

Para validar tipos y crear una compilación:

```powershell
npm run typecheck
npm run build
npm start
```

Ejecuta `npm run build` antes de `npm start`; el servidor compilado se ejecuta desde `dist/`.

## Arquitectura

El backend separa sus responsabilidades en capas:

- `routes`: declara endpoints y middleware.
- `controllers`: traduce solicitudes y respuestas HTTP.
- `services`: aplica las reglas de negocio.
- `repositories`: llama Stored Procedures mediante `mssql`.
- `schemas`: valida entradas con Zod.

## Decisiones técnicas

- **Express y TypeScript:** API HTTP modular con tipado estático.
- **Stored Procedures y `mssql`:** acceso a datos con parámetros tipados; no se usa ORM ni se concatenan entradas del usuario en consultas.
- **Zod y bcrypt:** validación de solicitudes/configuración y almacenamiento seguro de contraseñas mediante hashes.
- **JWT y refresh tokens rotatorios:** access tokens de corta duración y refresh token en cookie HttpOnly; SQL Server guarda solo el hash SHA-256 del refresh token.
- **Helmet, CORS y middleware de errores:** encabezados HTTP, orígenes permitidos configurables y respuestas consistentes ante errores.
- **`.env` local:** mantiene secretos fuera del código versionado.

## Probar la API

La guía independiente con los métodos, URLs, cuerpos JSON, autorización, cookies y credenciales de prueba está en [PRUEBAS_API.md](./PRUEBAS_API.md).
