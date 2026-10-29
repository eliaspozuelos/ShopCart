/* ============================================================
   008_Tablas_Auditoria.sql
   Bitacora, Configuracion
   La bitacora se escribe explicitamente desde los procedimientos.
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Bitacora
   Eventos de auditoria con los valores anteriores y nuevos.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Bitacora (
    IDBitacora      BIGINT IDENTITY(1,1) NOT NULL,
    IDUsuario       INT NOT NULL,
    Modulo          NVARCHAR(30) NOT NULL,      -- PRODUCTOS, PRECIOS, INVENTARIO, CUPONES, PEDIDOS
    Entidad         NVARCHAR(50) NOT NULL,
    IDEntidad       INT NOT NULL,
    Accion          NVARCHAR(20) NOT NULL,      -- Incluye eventos de sesion
    ValorAnterior   NVARCHAR(MAX) NULL,         -- JSON
    ValorNuevo      NVARCHAR(MAX) NULL,         -- JSON
    Fecha           DATETIME2(0) NOT NULL CONSTRAINT DF_Bitacora_Fecha DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Bitacora PRIMARY KEY (IDBitacora),
    CONSTRAINT FK_Bitacora_Usuario FOREIGN KEY (IDUsuario) REFERENCES dbo.Usuario (IDUsuario),
    CONSTRAINT CK_Bitacora_Accion CHECK (Accion IN (
        N'CREAR', N'MODIFICAR', N'DESACTIVAR', N'CAMBIO_ESTADO',
        N'INICIAR_SESION', N'CERRAR_SESION', N'RENOVAR_SESION',
        N'TOKEN_REUTILIZADO', N'CAMBIO_CONTRASENA', N'CAMBIAR_CONTRASENA'
    )),
    CONSTRAINT CK_Bitacora_ValorAnterior_Json CHECK (ValorAnterior IS NULL OR ISJSON(ValorAnterior) = 1),
    CONSTRAINT CK_Bitacora_ValorNuevo_Json CHECK (ValorNuevo IS NULL OR ISJSON(ValorNuevo) = 1)
);
GO
CREATE INDEX IX_Bitacora_Modulo ON dbo.Bitacora (Modulo, Fecha DESC);
GO

/* ------------------------------------------------------------
   dbo.Configuracion
   Parametros configurables del sistema.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Configuracion (
    Clave        NVARCHAR(50) NOT NULL,
    Valor        NVARCHAR(100) NOT NULL,
    Descripcion  NVARCHAR(200) NULL,
    CONSTRAINT PK_Configuracion PRIMARY KEY (Clave)
);
GO
