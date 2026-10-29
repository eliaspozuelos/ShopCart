# ShopCart

ShopCart contiene una API REST para autenticación y gestión de usuarios, y una base de datos SQL Server. El esquema también define tablas para catálogo, carritos, cupones, pedidos, pagos, devoluciones, inventario y auditoría; esos módulos comerciales todavía no están implementados en la API.

Esta es la guía general única para instalar el proyecto, preparar la base de datos, configurar el backend, probar el inicio de sesión y conocer las tecnologías utilizadas.

## Requisitos

- Windows, PowerShell y Git.
- Node.js 24 LTS o superior.
- SQL Server 2019 o superior (SQL Server Express fue suficiente para desarrollo local).
- SQL Server Management Studio (SSMS) u otra herramienta que ejecute scripts T-SQL.
- Un inicio de sesión de SQL Server con permisos para crear la base y objetos, y para que el backend ejecute los Stored Procedures.

La instancia debe aceptar conexiones TCP. 
Ten a mano su dirección, puerto, usuario SQL y contraseña.

## Si usas una instancia con nombre de SQL Server Express, configura TCP/IP y determina el puerto TCP que le corresponde esto se usara el SQL_SERVER_PORT.

## Instalación paso a paso

### 1. Clonar el repositorio

Abre PowerShell en la carpeta donde quieres guardar el proyecto:

```powershell
git clone https://github.com/eliaspozuelos/ShopCart.git
Set-Location .\ShopCart
```

Si ya tienes el repositorio clonado, abre PowerShell directamente en su carpeta.

### 2. Instalar las dependencias del backend

Desde la raíz del repositorio:

```powershell
Set-Location .\backend
npm install
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

`npm install` instala las dependencias declaradas por el backend.
Conserva la terminal en `backend/` para los pasos siguientes.

### 3. Crear la base de datos en SQL Server

Realiza estos pasos en orden. El método recomendado usa `001_CrearBaseDatos.sql`, que crea la base `ShopCart` y todas sus tablas ejecutalo en sql server.

**No ejecutes además los scripts modulares `0001` y `002`–`008`**, porque intentarían crear objetos que ya existen.

En SSMS:

1. Conéctate a la instancia de SQL Server que usará la API.
2. Abre y ejecuta `database/001_CrearBaseDatos.sql`. Este script crea la base `ShopCart` y todas las tablas.
3. Abre y ejecuta, en este orden, los Stored Procedures:
   - `database/100_SP_Auth.sql`
   - `database/101_SP_Usuarios.sql`
   - `database/102_SP_Usuarios_Perfil.sql`
   - `database/103_SP_Direcciones.sql`
   - `database/104_SP_Auth_Contrasena.sql`

4. Por último, ejecuta `database/010_Semillas.sql`. Inserta los roles Cliente, Operador y Administrador y crea la cuenta Administrador de demostración.

Los scripts `100`–`104` requieren que ya existan las tablas.

La semilla se ejecuta al final porque usa `SP_Usuarios_CrearAdministradorInicial`, definido en `101_SP_Usuarios.sql`.

### 4. Configurar el backend

Edita `backend/.env`, creado a partir de `.env.example`. Sustituye el usuario y contraseña SQL por los de tu instancia. Genera un secreto JWT en PowerShell; copia la salida en `JWT_ACCESS_SECRET`:

```powershell
$bytes = New-Object byte[] 32; $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create(); try { $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes) } finally { $rng.Dispose() }
```

La salida es una clave aleatoria de 32 bytes (44 caracteres Base64). Configura las variables principales:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:5173
SQL_SERVER=localhost
SQL_PORT=1433
SQL_DATABASE=ShopCart
SQL_USER=tu-usuario-sql
SQL_PASSWORD=tu-contraseña-sql
SQL_ENCRYPT=true
SQL_TRUST_SERVER_CERTIFICATE=true
JWT_ACCESS_SECRET=<pega-aqui-el-secreto-generado>
JWT_ACCESS_TTL_SECONDS=900
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_SECURE=false
COOKIE_SAME_SITE=lax
```

Los valores de SQL Server deben corresponder a tu instalación.

Los valores `COOKIE_SECURE=false` y `COOKIE_SAME_SITE=lax` son para desarrollo local por HTTP.



### 5. Comprobar la conexión e iniciar la API

Desde PowerShell, si todavía estás en `backend/`, ejecuta:

```powershell
npm run db:check
```

Si estás en la raíz, primero ejecuta `cd backend`. `npm run db:check` debe finalizar sin errores de conexión. Solo después de que pase, inicia el servidor:

```powershell
npm run dev
```

El servidor de desarrollo queda activo en `http://localhost:3000`; comprueba `http://localhost:3000/health` y confirma que responde con estado `ok`. Déjalo ejecutándose mientras pruebas la API. Para detenerlo, pulsa `Ctrl+C`.

Para comprobar los tipos y compilar la versión de producción, desde `backend/` ejecuta:

```powershell
npm run typecheck
npm run build
npm start
```

Ejecuta `npm run build` antes de `npm start`; el servidor compilado se genera en `dist/`.

### 6. Probar inicio de sesión y registro

La semilla crea una cuenta de demostración **solo para desarrollo y pruebas locales**:

- **Correo:** `admin@example.com`
- **Contraseña:** `ShopCartDemo2026!`
- **Rol:** Administrador

La cuenta se crea únicamente si aún no existe un usuario Administrador.

## Pruebas atraves de postman
Para registrar un Cliente, envía `POST http://localhost:3000/api/v1/auth/register` con este cuerpo JSON:

```json
{
  "email": "cliente@example.com",
  "password": "<elige-una-contraseña-de-al-menos-8-caracteres>",
  "name": "Cliente de prueba"
}
```

Para iniciar sesión, envía `POST http://localhost:3000/api/v1/auth/login`. Usa el correo y contraseña de la cuenta Administrador demo o del Cliente registrado:

```json
{
  "email": "admin@example.com",
  "password": "ShopCartDemo2026!"
}
```

Para rutas protegidas, envía el access token de la respuesta como token Bearer. Conserva la cookie HttpOnly que devuelve el login para probar `POST /api/v1/auth/refresh` y `POST /api/v1/auth/logout`.

## Decisiones técnicas

- **Node.js, Express y TypeScript** para construir una API modular con tipado estático.
- **SQL Server y Stored Procedures** para centralizar el acceso relacional y ejecutar operaciones con parámetros; no se usa ORM.
- **Zod y bcrypt** para validar entradas/configuración y proteger las contraseñas con hashes.
- **JWT y refresh tokens rotatorios** para sesiones; el refresh token se transporta en cookie HttpOnly y se persiste en la base solo como hash.

Los detalles de la API están en [backend/README.md](./backend/README.md); 

las decisiones del esquema SQL, en [database/README.md](./database/README.md).

## Modelo de datos y estado funcional

El esquema relaciona roles con usuarios; usuarios con sesiones (refresh tokens), direcciones, carritos y pedidos; productos con categorías, variantes e inventario; pedidos con detalles, pagos, estados e historial; y devoluciones con pedidos y sus detalles. También incluye cupones y bitácora de auditoría.

El flujo de pedido definido como propuesta es: **Pendiente** (espera el pago) → **Confirmado** (pago aprobado) → **Preparando** → **Despachado** → **Entregado**. Puede cancelarse antes del despacho. Después de la entrega se puede registrar una devolución parcial o total. Según el enunciado, la reserva de existencias debe vencer a los 15 minutos. Este ciclo aún no está implementado en la API.
