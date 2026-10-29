/* ============================================================
   002_Tablas_Seguridad.sql
   creamos las tablas de seguridad:
   Rol, Usuario, RefreshToken, Direccion
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Rol
   Catalogo de roles disponibles para los usuarios.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Rol (
    IDRol   INT IDENTITY(1,1) NOT NULL,
    Nombre  NVARCHAR(30) NOT NULL,
    CONSTRAINT PK_Rol PRIMARY KEY (IDRol),
    CONSTRAINT UQ_Rol_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Usuario
   Cuentas de acceso, su rol y sus datos de perfil.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Usuario (
    IDUsuario       INT IDENTITY(1,1) NOT NULL,
    IDRol           INT NOT NULL,
    Correo          NVARCHAR(256) NOT NULL,
    ContrasenaHash  NVARCHAR(255) NOT NULL,
    Nombre          NVARCHAR(100) NOT NULL,
    Activo          BIT NOT NULL CONSTRAINT DF_Usuario_Activo DEFAULT 1,
    FechaCreacion   DATETIME2(0) NOT NULL CONSTRAINT DF_Usuario_FechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Usuario PRIMARY KEY (IDUsuario),
    CONSTRAINT UQ_Usuario_Correo UNIQUE (Correo),
    CONSTRAINT FK_Usuario_Rol FOREIGN KEY (IDRol) REFERENCES dbo.Rol (IDRol)
);
GO

/* ------------------------------------------------------------
   dbo.RefreshToken
   Hashes de refresh tokens y su ciclo de vida por familia.
   ------------------------------------------------------------ */
CREATE TABLE dbo.RefreshToken (
    IDRefreshToken    INT IDENTITY(1,1) NOT NULL,
    IDUsuario         INT NOT NULL,
    TokenHash         CHAR(64) NOT NULL,            -- SHA-256 en hexadecimal; nunca el token en claro
    IDFamilia         UNIQUEIDENTIFIER NOT NULL,    -- agrupa los tokens rotados de una misma sesion
    ExpiraEn          DATETIME2(0) NOT NULL,
    RevocadoEn        DATETIME2(0) NULL,
    IDReemplazadoPor  INT NULL,
    FechaCreacion     DATETIME2(0) NOT NULL CONSTRAINT DF_RefreshToken_FechaCreacion DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_RefreshToken PRIMARY KEY (IDRefreshToken),
    CONSTRAINT UQ_RefreshToken_TokenHash UNIQUE (TokenHash),
    CONSTRAINT FK_RefreshToken_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT FK_RefreshToken_Reemplazo FOREIGN KEY (IDReemplazadoPor) REFERENCES dbo.RefreshToken (IDRefreshToken)
);
GO
CREATE INDEX IX_RefreshToken_Usuario ON dbo.RefreshToken (IDUsuario, IDFamilia);
GO

/* ------------------------------------------------------------
   dbo.Direccion
   Direcciones de envio asociadas a cada usuario.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Direccion (
    IDDireccion   INT IDENTITY(1,1) NOT NULL,
    IDUsuario     INT NOT NULL,
    Alias         NVARCHAR(50) NOT NULL,
    Linea1        NVARCHAR(200) NOT NULL,
    Linea2        NVARCHAR(200) NULL,
    Municipio     NVARCHAR(100) NOT NULL,
    Departamento  NVARCHAR(100) NOT NULL,
    Telefono      NVARCHAR(20) NOT NULL,
    Activa        BIT NOT NULL CONSTRAINT DF_Direccion_Activa DEFAULT 1,
    CONSTRAINT PK_Direccion PRIMARY KEY (IDDireccion),
    CONSTRAINT FK_Direccion_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario)
);
GO
CREATE INDEX IX_Direccion_Usuario ON dbo.Direccion (IDUsuario) WHERE Activa = 1;
GO
