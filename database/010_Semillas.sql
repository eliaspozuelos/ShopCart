/* ============================================================
   010_Semillas.sql
   Inserta los roles base y crea una cuenta Administrador de
   demostracion si aun no existe uno. Ejecutar despues de crear
   las tablas y los Stored Procedures.
   ============================================================ */
USE ShopCart;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre = N'Administrador')
  INSERT INTO dbo.Rol (Nombre) VALUES (N'Administrador');

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre = N'Operador')
  INSERT INTO dbo.Rol (Nombre) VALUES (N'Operador');

IF NOT EXISTS (SELECT 1 FROM dbo.Rol WHERE Nombre =  N'Cliente')
  INSERT INTO dbo.Rol (Nombre) VALUES ( N'Cliente');

/*
  Cuenta publica de demostracion. Solo para desarrollo y pruebas locales.
*/
DECLARE @AdminCorreo NVARCHAR(256) = N'admin@example.com';
DECLARE @AdminContrasenaHash NVARCHAR(255) = N'$2b$12$W0jWVhUK.iN/4pYFS1Jpgu0SPUkeke8n5kZUDJFTLUWB/Y7Q5ZAN2';
DECLARE @AdminNombre NVARCHAR(100) = N'Administrador de prueba';

IF OBJECT_ID(N'dbo.SP_Usuarios_CrearAdministradorInicial', N'P') IS NULL
BEGIN
  THROW 51002, N'No existe SP_Usuarios_CrearAdministradorInicial. Ejecute primero los Stored Procedures del backend.', 1;
END

IF NOT EXISTS (
  SELECT 1
  FROM dbo.Usuario AS u
  INNER JOIN dbo.Rol AS r ON r.IDRol = u.IDRol
  WHERE r.Nombre = N'Administrador'
)
BEGIN
  EXEC dbo.SP_Usuarios_CrearAdministradorInicial
    @Correo = @AdminCorreo,
    @ContrasenaHash = @AdminContrasenaHash,
    @Nombre = @AdminNombre;
END
ELSE
BEGIN
  PRINT N'Ya existe un Administrador. No se creo otro usuario.';
END
GO
