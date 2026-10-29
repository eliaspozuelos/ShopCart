# Pruebas de la API ShopCart

Guía para probar manualmente las rutas disponibles con Postman. Antes de empezar, inicia SQL Server y el backend siguiendo el [README del backend](./README.md). La API debe estar activa en `http://localhost:3000`.

## Preparar Postman

- Usa como base `http://localhost:3000/api/v1`.
- Para solicitudes con cuerpo, selecciona **Body → raw → JSON** y envía el encabezado `Content-Type: application/json`.
- Para rutas autenticadas, selecciona **Authorization → Bearer Token** y pega el `accessToken` obtenido en el login.
- Mantén habilitado el cookie jar de Postman: las rutas de renovación y cierre de sesión usan la cookie HttpOnly `shopcart_refresh`, guardada al iniciar sesión.

La cuenta Administrador de demostración creada por la semilla es:

- **Correo:** `admin@example.com`
- **Contraseña:** `ShopCartDemo2026!`

Úsala únicamente en desarrollo y pruebas locales; nunca en producción. La semilla no la crea si la base ya tiene un Administrador.

## Autenticación

### Registrar un Cliente

`POST /auth/register` es público y siempre registra el rol Cliente. No se envía un campo `role`.

```json
{
  "email": "cliente@example.com",
  "password": "ClientePrueba123!",
  "name": "Cliente de prueba"
}
```

La contraseña debe tener entre 8 y 72 bytes.

### Iniciar sesión

`POST /auth/login` es público. Usa las credenciales demo del Administrador o las de un Cliente registrado:

```json
{
  "email": "admin@example.com",
  "password": "ShopCartDemo2026!"
}
```

La respuesta incluye `data.accessToken` y los datos del usuario. La cookie `shopcart_refresh` llega en el encabezado `Set-Cookie`; Postman debe guardarla automáticamente.

### Renovar sesión

`POST /auth/refresh` no requiere cuerpo ni access token, pero sí la cookie `shopcart_refresh`. Postman la reenvía desde su cookie jar. La respuesta incluye un nuevo access token y reemplaza la cookie de refresh.

### Cerrar sesión

`POST /auth/logout` no requiere cuerpo; envía la cookie `shopcart_refresh`. Revoca esa sesión y borra la cookie del cliente.

### Cambiar contraseña

`PATCH /auth/password` requiere el Bearer token y la cookie de sesión:

```json
{
  "currentPassword": "ClientePrueba123!",
  "newPassword": "NuevaClave456!"
}
```

La contraseña nueva debe tener entre 8 y 72 bytes y ser distinta de la actual. Al cambiarla, inicia sesión otra vez.

## Perfil y direcciones propias

Todas estas rutas requieren el Bearer token. El ID del usuario se obtiene del token, por lo que no se incluye en el cuerpo.

### Consultar perfil

`GET /users/me`: sin cuerpo.

### Actualizar perfil

`PATCH /users/me`: envía al menos uno de estos campos:

```json
{
  "name": "Nombre actualizado",
  "email": "cliente.nuevo@example.com"
}
```

### Crear dirección

`POST /users/me/addresses`:

```json
{
  "alias": "Casa",
  "line1": "Avenida Central 123",
  "line2": null,
  "municipality": "Ciudad",
  "department": "Departamento",
  "phone": "55551234"
}
```

`line2` es opcional al crear la dirección.

### Actualizar dirección

`PUT /users/me/addresses/:addressId`: reemplaza `:addressId` por el ID real de la dirección y envía los campos siguientes. En esta ruta `line2` es obligatorio, aunque puede ser `null`.

```json
{
  "alias": "Casa",
  "line1": "Avenida Central 123",
  "line2": null,
  "municipality": "Ciudad",
  "department": "Departamento",
  "phone": "55551234"
}
```

## Administración de usuarios

Todas estas rutas requieren un Bearer token de un usuario con rol Administrador.

### Crear Operador o Administrador

`POST /users`:

```json
{
  "email": "operador@example.com",
  "password": "OperadorPrueba123!",
  "name": "Operador de prueba",
  "role": "Operador"
}
```

`role` debe ser `Operador` o `Administrador`. La contraseña debe tener entre 8 y 72 bytes.

### Listar usuarios

`GET /users` no requiere cuerpo. Los filtros son opcionales:

```text
GET /users?page=1&pageSize=20&search=operador&role=Operador&active=true
```

- `page`: número de página, desde 1 (predeterminado: 1).
- `pageSize`: cantidad de resultados, entre 1 y 100 (predeterminado: 20).
- `search`: texto para buscar.
- `role`: `Cliente`, `Operador` o `Administrador`.
- `active`: `true` o `false`.

### Consultar detalle

`GET /users/:userId`: reemplaza `:userId` por el ID numérico. No requiere cuerpo.

### Actualizar usuario

`PATCH /users/:userId`: reemplaza `:userId` y envía al menos uno de los campos:

```json
{
  "name": "Nombre actualizado",
  "email": "usuario.nuevo@example.com"
}
```

### Activar o desactivar usuario

`PATCH /users/:userId/status`: reemplaza `:userId` por el ID numérico y envía:

```json
{
  "active": false
}
```

Usa `true` para activar una cuenta.

## Referencia rápida de rutas

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/auth/register` | Público |
| `POST` | `/auth/login` | Público |
| `POST` | `/auth/refresh` | Cookie HttpOnly |
| `POST` | `/auth/logout` | Cookie HttpOnly |
| `PATCH` | `/auth/password` | Bearer token y cookie |
| `GET` | `/users/me` | Bearer token |
| `PATCH` | `/users/me` | Bearer token |
| `POST` | `/users/me/addresses` | Bearer token |
| `PUT` | `/users/me/addresses/:addressId` | Bearer token |
| `POST` | `/users` | Administrador |
| `GET` | `/users` | Administrador |
| `GET` | `/users/:userId` | Administrador |
| `PATCH` | `/users/:userId` | Administrador |
| `PATCH` | `/users/:userId/status` | Administrador |
