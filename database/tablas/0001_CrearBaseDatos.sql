/* ============================================================
   0001_CrearBaseDatos.sql
   Crea la base vacia ShopCart para la instalacion modular.
   ============================================================ */
USE master;
GO

IF DB_ID(N'ShopCart') IS NULL
BEGIN
    CREATE DATABASE ShopCart COLLATE Modern_Spanish_CI_AI;
END
GO
