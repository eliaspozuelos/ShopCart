/* ============================================================
   110_SP_Bitacora.sql
   Consulta administrativa de auditorÃ­a.
   ============================================================ */
USE ShopCart;
GO
CREATE OR ALTER PROCEDURE dbo.SP_Bitacora_Listar
  @Modulo NVARCHAR(30)=NULL, @Pagina INT=1, @TamanoPagina INT=20
AS
BEGIN
  SET NOCOUNT ON;
  SELECT COUNT(*) AS TotalRegistros FROM dbo.Bitacora WHERE @Modulo IS NULL OR Modulo=@Modulo;
  SELECT b.IDBitacora,b.IDUsuario,u.Correo,b.Modulo,b.Entidad,b.IDEntidad,b.Accion,b.ValorAnterior,b.ValorNuevo,b.Fecha
  FROM dbo.Bitacora b JOIN dbo.Usuario u ON u.IDUsuario=b.IDUsuario
  WHERE @Modulo IS NULL OR b.Modulo=@Modulo ORDER BY b.Fecha DESC
  OFFSET (@Pagina-1)*@TamanoPagina ROWS FETCH NEXT @TamanoPagina ROWS ONLY;
END;
GO

