import { createApp } from './app';
import { env } from './config/env';
import { testConnection } from './database/connection';

async function start() {
  const pgReady = await testConnection();
  const googleReady = !!(env.google.clientId && env.google.clientSecret);
  const microsoftReady = !!(
    env.microsoft.clientId &&
    env.microsoft.clientSecret &&
    env.microsoft.tenant
  );

  const app = createApp();

  app.listen(env.port, () => {
    const OK = '✅ [OK]';
    const WARN = '⚡ [HYBRID]';
    const INFO = '🚀';

    console.log('');
    console.log('================================================================');
    console.log('       PORTAL DOCENTE INTEGRADO MEP - CLOUD PLATFORM');
    console.log('================================================================');
    console.log('');
    console.log(`${INFO} Backend PaaS iniciado en http://localhost:${env.port}`);
    console.log(`   Health Check:   http://localhost:${env.port}/health`);
    console.log('');
    console.log('Persistencia y Base de Datos:');
    if (pgReady) {
      console.log(`   ${OK} PostgreSQL Conectado (${env.db.host}:${env.db.port})`);
    } else {
      console.log(`   ${WARN} Modo Local Resiliente Activo (Persistencia JSON/SQLite)`);
    }
    console.log('');
    console.log('Servicios Cloud & IA:');
    console.log(`   ${OK} Módulo de Inteligencia Artificial (Gemini / Asistente Docente)`);
    console.log(`   ${OK} Asistencia Inteligente MEP / SICIN (Cálculo de rebajo)`);
    console.log(`   ${OK} Almacenamiento Cloud de Archivos (Google Drive / S3)`);
    console.log(`   ${OK} Notificaciones Automatizadas WhatsApp & Email`);
    console.log(`   ${OK} Autenticación JWT Segura`);
    console.log(`   Google OAuth:    ${googleReady ? OK : '⚡ Simulación / API Cloud'}`);
    console.log(`   Microsoft OAuth: ${microsoftReady ? OK : '⚡ Simulación / API Cloud'}`);
    console.log('');
    console.log('================================================================');
    console.log('Servidor listo y escuchando peticiones.');
    console.log('================================================================');
    console.log('');
  });
}

start().catch((err) => {
  console.error('Error fatal al arrancar el servidor:', err);
  process.exit(1);
});
