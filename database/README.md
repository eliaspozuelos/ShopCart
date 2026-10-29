# Base de datos de ShopCart

Scripts T-SQL para crear la base `ShopCart`, sus tablas, roles y Stored Procedures. El esquema incluye entidades comerciales que todavía no tienen funcionalidad implementada en la API.


## 🚀 Componentes

- `001_CrearBaseDatos.sql`: instalación consolidada de base y todas las tablas.
- `010_Semillas.sql`: roles base y cuenta de Administrador de demostración para desarrollo/pruebas.
- `100_SP_Auth.sql` a `104_SP_Auth_Contrasena.sql`: Stored Procedures implementados para autenticación y usuarios.


## ⚡ Preparar la base de datos

Esta guía cubre cómo preparar la base de datos de ShopCart en SQL Server. Para el orden general (clonar el repositorio, instalar dependencias y después iniciar la API), sigue el [flujo completo del README raíz](../README.md).

Elige **una** de estas formas de crear las tablas. No combines la instalación consolidada y la modular, porque se duplicarán objetos.

### Opción A: instalación consolidada (recomendada)

En SSMS, conectado a la instancia deseada, ejecuta en este orden:

1. `001_CrearBaseDatos.sql`: crea `ShopCart` y todas las tablas.
2. `100_SP_Auth.sql`: crea los procedimientos de registro, login y sesiones.
3. `101_SP_Usuarios.sql`: crea los procedimientos de usuarios y el alta del Administrador inicial.
4. `102_SP_Usuarios_Perfil.sql`: procedimientos de perfil.
5. `103_SP_Direcciones.sql`: procedimientos de direcciones.
6. `104_SP_Auth_Contrasena.sql`: procedimientos de cambio de contraseña.
7. Ejecuta `010_Semillas.sql`: inserta los roles base y crea la cuenta Administrador de demostración si todavía no existe un Administrador.

### Opción B: instalación modular

En SSMS ejecuta los siguientes scripts en orden:

1. `0001_CrearBaseDatos.sql`: crea la base vacía.
2. `002_Tablas_Seguridad.sql`.
3. `003_Tablas_Catalogo.sql`.
4. `004_Tablas_Cupones.sql`.
5. `005_Tablas_Carrito.sql`.
6. `006_Tablas_Pedidos.sql`.
7. `007_Tablas_Inventario.sql`.
8. `008_Tablas_Auditoria.sql`.
9. `100_SP_Auth.sql`, `101_SP_Usuarios.sql`, `102_SP_Usuarios_Perfil.sql`, `103_SP_Direcciones.sql` y `104_SP_Auth_Contrasena.sql`, en ese orden.
10. Ejecuta `010_Semillas.sql` para insertar los roles base y crear la cuenta Administrador de demostración si todavía no existe un Administrador.


## 👤 Usuarios y credenciales de prueba

`010_Semillas.sql` crea los roles Cliente, Operador y Administrador, además de una cuenta de demostración:

- **Correo:** `admin@example.com`
- **Contraseña:** `ShopCartDemo2026!`
- **Rol:** Administrador

Estas credenciales son públicas y se incluyen únicamente para desarrollo y pruebas locales.

Para probar el rol Cliente, regístralo desde `POST /api/v1/auth/register`

siguiendo [backend/README.md](../backend/README.md).

La semilla no crea un segundo Administrador si ya existe uno. Por tanto, en una base que ya tenga un Administrador, estas credenciales demo no necesariamente podrán iniciar sesión.

Con la base de datos preparada, vuelve al [paso 6 del flujo principal](../README.md) para configurar y arrancar el backend. Las instrucciones detalladas de configuración y pruebas de la API están en [backend/README.md](../backend/README.md).


## 🧠 Decisiones de datos

- **Relaciones y restricciones SQL Server** protegen la integridad referencial y los valores válidos.

- **Stored Procedures** son la interfaz de acceso del backend; reciben parámetros tipados y evitan consultas armadas con entradas de usuario.

- **Sesiones:** se almacena el hash SHA-256 del refresh token, no el token original.

- **Tablas de pedidos, inventario y auditoría** forman parte del modelo previsto.

## Errores de Stored Procedures

Los Stored Procedures señalan errores de negocio con `THROW` y traducen los errores SQL `2601` y `2627` de correo duplicado a `50101`. Se usan códigos SQL personalizados (mayores que `50000`) para que el backend identifique el tipo de error de forma estable, sin depender del texto del mensaje de SQL Server.

La numeración es una convención del proyecto, no una clasificación impuesta por SQL Server. Se agruparon los códigos por área para que sea más fácil ubicarlos y mantenerlos:

- `50101`: correo duplicado, compartido por los flujos que crean o actualizan usuarios.
- `50110`–`50114`: autenticación, sesiones y estado de la cuenta.
- `50120`–`50128`: permisos y operaciones de administración de usuarios, perfiles y direcciones.
- `50190`: configuración incompleta de la base, como roles de semilla faltantes.
- `51002`: error de orden de instalación; la semilla no encuentra un procedimiento que debía instalarse antes.

El backend traduce cada código conocido a un estado HTTP y a un código de API legible por el cliente. Así, la aplicación puede responder de forma consistente aunque cambie el texto del error SQL. `50121` se comparte entre acciones administrativas no autorizadas y el intento de crear un Administrador inicial cuando ya existe uno, porque ambos casos impiden la operación; por eso el backend los comunica como `403 ACTION_NOT_ALLOWED`.

| Código SQL | Significado | Respuesta HTTP del backend |
| --- | --- | --- |
| `50101` | El correo ya está registrado. | `409 EMAIL_ALREADY_REGISTERED` |
| `50110` | Datos de sesión inválidos: hash del token mal formado o fecha de expiración inválida. | `400 INVALID_SESSION_DATA` |
| `50111` | Refresh token inválido. | `401 INVALID_REFRESH_TOKEN` |
| `50112` | Se reutilizó un refresh token; la sesión fue revocada. | `401 REFRESH_TOKEN_REUSED` |
| `50113` | Refresh token expirado. | `401 REFRESH_TOKEN_EXPIRED` |
| `50114` | La cuenta del usuario está inactiva. | `403 USER_INACTIVE` |
| `50120` | Rol solicitado no permitido para crear un usuario interno. | `400 ROLE_NOT_ALLOWED` |
| `50121` | Acción administrativa no autorizada. También se usa si se intenta crear otro Administrador inicial cuando ya existe uno. | `403 ACTION_NOT_ALLOWED` |
| `50122` | Usuario no encontrado. | `404 USER_NOT_FOUND` |
| `50123` | Se intenta desactivar la propia cuenta. | `409 CANNOT_DEACTIVATE_SELF` |
| `50124` | No se indicó el estado requerido para activar o desactivar una cuenta. | `400 USER_STATUS_REQUIRED` |
| `50125` | Se intenta desactivar al último Administrador activo. | `409 LAST_ADMINISTRATOR` |
| `50126` | Faltan datos válidos para actualizar un perfil. | `400 PROFILE_DATA_REQUIRED` |
| `50127` | La dirección activa indicada no existe. | `404 ADDRESS_NOT_FOUND` |
| `50128` | No se indicó la nueva contraseña. | `400 PASSWORD_REQUIRED` |
| `50190` | Configuración incompleta: falta un rol requerido en la tabla `Rol`. | No está mapeado explícitamente; el backend responde `500 INTERNAL_SERVER_ERROR`. |
| `51002` | Se ejecutó la semilla sin haber instalado `SP_Usuarios_CrearAdministradorInicial`. | Error de instalación SQL; debe ejecutarse primero `101_SP_Usuarios.sql`. |

El middleware y el mapeo HTTP se mantienen en `backend/src/middlewares/error.middleware.ts`.

## ✅ Verificación

En SSMS, comprueba los roles y procedimientos:

```sql
USE ShopCart;
GO

SELECT IDRol, Nombre
FROM dbo.Rol
ORDER BY IDRol;

SELECT name
FROM sys.procedures
WHERE name IN (
  'SP_Auth_RegistrarCliente',
  'SP_Auth_CrearSesion',
  'SP_Auth_RotarRefreshToken',
  'SP_Auth_CerrarSesion',
  'SP_Usuarios_CrearAdministradorInicial'
)
ORDER BY name;
```

Si falta un rol o procedimiento, revisa **Mensajes** en SSMS y confirma que ejecutaste los scripts en la base `ShopCart` y en la misma instancia configurada en `backend/.env`.
