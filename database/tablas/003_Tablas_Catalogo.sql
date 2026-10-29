/* ============================================================
   003_Tablas_Catalogo.sql
   Categoria, Producto, ProductoImagen, Atributo, Variante,
   VarianteAtributo
   ============================================================ */
USE ShopCart;
GO

/* ------------------------------------------------------------
   dbo.Categoria
   Categorias disponibles para organizar los productos.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Categoria (
    IDCategoria  INT IDENTITY(1,1) NOT NULL,
    Nombre       NVARCHAR(100) NOT NULL,
    Activa       BIT NOT NULL CONSTRAINT DF_Categoria_Activa DEFAULT 1,
    CONSTRAINT PK_Categoria PRIMARY KEY (IDCategoria),
    CONSTRAINT UQ_Categoria_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Producto
   Datos generales y estado de publicacion de cada producto.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Producto (
    IDProducto   INT IDENTITY(1,1) NOT NULL,
    IDCategoria  INT NOT NULL,
    Nombre       NVARCHAR(150) NOT NULL,
    Descripcion  NVARCHAR(2000) NULL,
    Activo       BIT NOT NULL CONSTRAINT DF_Producto_Activo DEFAULT 1,
    CONSTRAINT PK_Producto PRIMARY KEY (IDProducto),
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (IDCategoria) REFERENCES dbo.Categoria (IDCategoria)
);
GO
CREATE INDEX IX_Producto_Categoria ON dbo.Producto (IDCategoria, Activo);
GO

/* ------------------------------------------------------------
   dbo.ProductoImagen
   Imagenes de producto y su orden de presentacion.
   ------------------------------------------------------------ */
CREATE TABLE dbo.ProductoImagen (
    IDProductoImagen  INT IDENTITY(1,1) NOT NULL,
    IDProducto        INT NOT NULL,
    Url               NVARCHAR(500) NOT NULL,
    Orden             INT NOT NULL CONSTRAINT DF_ProductoImagen_Orden DEFAULT 0,
    CONSTRAINT PK_ProductoImagen PRIMARY KEY (IDProductoImagen),
    CONSTRAINT FK_ProductoImagen_Producto FOREIGN KEY (IDProducto) REFERENCES dbo.Producto (IDProducto)
);
GO

/* ------------------------------------------------------------
   dbo.Atributo
   Tipos de caracteristicas que describen una variante.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Atributo (
    IDAtributo  INT IDENTITY(1,1) NOT NULL,
    Nombre      NVARCHAR(50) NOT NULL,       -- Talla, Color, etc.
    CONSTRAINT PK_Atributo PRIMARY KEY (IDAtributo),
    CONSTRAINT UQ_Atributo_Nombre UNIQUE (Nombre)
);
GO

/* ------------------------------------------------------------
   dbo.Variante
   SKU, precio y existencia fisica de una presentacion.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Variante (
    IDVariante         INT IDENTITY(1,1) NOT NULL,
    IDProducto         INT NOT NULL,
    SKU                NVARCHAR(50) NOT NULL,
    Precio             DECIMAL(18,2) NOT NULL,      -- precio publicado, IVA incluido
    ExistenciaFisica   INT NOT NULL CONSTRAINT DF_Variante_Existencia DEFAULT 0,
    Activa             BIT NOT NULL CONSTRAINT DF_Variante_Activa DEFAULT 1,
    Version            ROWVERSION NOT NULL,
    CONSTRAINT PK_Variante PRIMARY KEY (IDVariante),
    CONSTRAINT UQ_Variante_SKU UNIQUE (SKU),
    CONSTRAINT FK_Variante_Producto FOREIGN KEY (IDProducto) REFERENCES dbo.Producto (IDProducto),
    CONSTRAINT CK_Variante_Precio CHECK (Precio > 0),
    CONSTRAINT CK_Variante_Existencia CHECK (ExistenciaFisica >= 0)
);
GO
CREATE INDEX IX_Variante_Producto ON dbo.Variante (IDProducto);
GO

/* ------------------------------------------------------------
   dbo.VarianteAtributo
   Valores de atributos asignados a cada variante.
   ------------------------------------------------------------ */
CREATE TABLE dbo.VarianteAtributo (
    IDVariante  INT NOT NULL,
    IDAtributo  INT NOT NULL,
    Valor       NVARCHAR(100) NOT NULL,
    CONSTRAINT PK_VarianteAtributo PRIMARY KEY (IDVariante, IDAtributo),
    CONSTRAINT FK_VarianteAtributo_Variante FOREIGN KEY (IDVariante) REFERENCES dbo.Variante (IDVariante),
    CONSTRAINT FK_VarianteAtributo_Atributo FOREIGN KEY (IDAtributo) REFERENCES dbo.Atributo (IDAtributo)
);
GO
