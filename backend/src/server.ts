// Punto de entrada: conecta la base antes de aceptar solicitudes HTTP.
import { createServer } from 'node:http';
import { app } from './app.js';
import { closeDatabase, connectDatabase } from './config/database.js';
import { env } from './config/env.js';

// Inicia el servidor HTTP y gestiona la conexión a la base de datos.
async function startServer(): Promise<void> {
  // Espera a que la base esté lista antes de recibir solicitudes.
  await connectDatabase();
  console.info('Conexión a la base de datos establecida.');

  // Crea el servidor HTTP con las rutas y el middleware de la aplicación.
  const server = createServer(app);

  // Atiende errores que ocurran después del arranque, como un puerto ocupado.
  server.on('error', (error: Error) => {
    console.error('Error en el servidor HTTP.', error);
    process.exitCode = 1;

    // Libera la conexión a la base si el servidor no puede continuar.
    void closeDatabase().catch((databaseError: unknown) => {
      console.error('Error al cerrar la conexión con SQL Server.', databaseError);
    });
  });

  // Empieza a aceptar solicitudes en el puerto configurado.
  server.listen(env.PORT, () => {
    console.info(`ShopCart API escuchando en el puerto ${env.PORT}.`);
  });

  // Cierra primero el servidor HTTP y después la conexión a la base.
  const shutdown = (signal: NodeJS.Signals): void => {
    console.info(`Señal ${signal} recibida; cerrando el servidor.`);

    server.close((error) => {
      if (error) {
        console.error('Error al cerrar el servidor HTTP.', error);
        process.exitCode = 1;
      }

      void closeDatabase().catch((databaseError: unknown) => {
        console.error('Error al cerrar la conexión con SQL Server.', databaseError);
        process.exitCode = 1;
      });
    });
  };

  // Ejecuta el cierre ordenado cuando el proceso recibe una señal de detención.
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

// Muestra los errores ocurridos durante el arranque, como un fallo de conexión.
void startServer().catch((error: unknown) => {
  console.error('No se pudo iniciar ShopCart API.', error);
  process.exitCode = 1;
});
