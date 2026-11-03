/* ============================================================
   TR_Pedido_ValidarTransicionEstado.sql
   Valida los cambios de estado contra TransicionEstadoPedido.
   ============================================================ */
USE ShopCart;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

CREATE OR ALTER TRIGGER dbo.TR_Pedido_ValidarTransicionEstado
ON dbo.Pedido
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted AS i
        INNER JOIN deleted AS d ON d.IDPedido = i.IDPedido
        WHERE i.IDEstadoPedido <> d.IDEstadoPedido
          AND NOT EXISTS (
              SELECT 1
              FROM dbo.TransicionEstadoPedido AS t
              WHERE t.IDEstadoOrigen = d.IDEstadoPedido
                AND t.IDEstadoDestino = i.IDEstadoPedido
          )
    )
    BEGIN
        THROW 50222, N'La transicion de estado del pedido no esta permitida.', 1;
    END
END;
GO
