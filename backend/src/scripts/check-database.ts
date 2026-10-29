// Comprueba que SQL Server acepte conexiones con la configuración del .env.
import { closeDatabase, connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';

async function checkDatabaseConnection(): Promise<void> {
  const pool = await connectDatabase();

  if (!pool.connected || !pool.healthy) {
    throw new Error('The SQL Server connection pool did not become healthy.');
  }

  console.info(
    `Connected to SQL Server at ${env.SQL_SERVER}:${env.SQL_PORT}, database "${env.SQL_DATABASE}".`,
  );
  await closeDatabase();
}

void checkDatabaseConnection().catch(async (error: unknown) => {
  console.error('Could not connect to SQL Server.', error);
  try {
    await closeDatabase();
  } catch (closeError: unknown) {
    console.error('Could not close the SQL Server connection pool.', closeError);
  }
  process.exitCode = 1;
});
