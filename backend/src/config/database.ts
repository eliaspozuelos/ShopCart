import sql from 'mssql';
import { env } from './env.js';

let connectionPromise: Promise<sql.ConnectionPool> | undefined;

// Conecta a la base de datos SQL Server y devuelve un pool de conexiones.
export function connectDatabase(): Promise<sql.ConnectionPool> {
  if (!connectionPromise) {
    const pool = new sql.ConnectionPool({
      server: env.SQL_SERVER,
      port: env.SQL_PORT,
      database: env.SQL_DATABASE,
      user: env.SQL_USER,
      password: env.SQL_PASSWORD,
      options: {
        encrypt: env.SQL_ENCRYPT,
        trustServerCertificate: env.SQL_TRUST_SERVER_CERTIFICATE,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30_000,
      },
    });

    connectionPromise = pool.connect().catch((error: unknown) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}
 // Devuelve el pool de conexiones a la base de datos SQL Server.
export async function getDatabase(): Promise<sql.ConnectionPool> {
  return connectDatabase();
}

// Cierra la conexión a la base de datos SQL Server.
export async function closeDatabase(): Promise<void> {
  if (!connectionPromise) {
    return;
  }

  const connection = await connectionPromise;
  await connection.close();
  connectionPromise = undefined;
}
