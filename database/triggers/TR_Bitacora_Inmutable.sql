/* ============================================================
   TR_Bitacora_Inmutable.sql
   Impide modificar o eliminar registros de auditoria.
   ============================================================ */
USE ShopCart;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER TRIGGER dbo.TR_Bitacora_Inmutable
ON dbo.Bitacora
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 51004, N'La bitacora es inmutable; no se permiten UPDATE ni DELETE.', 1;
END;
GO
