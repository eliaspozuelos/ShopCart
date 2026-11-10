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
      requestTimeout: 30000,
      options: {
        encrypt: env.SQL_ENCRYPT,
        trustServerCertificate: env.SQL_TRUST_SERVER_CERTIFICATE,
        requestTimeout: 30000,
      },
      pool: {
        max: 10,
        min: 2,
        idleTimeoutMillis: 300_000,
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
