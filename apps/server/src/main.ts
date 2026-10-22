import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';

const config = loadConfig();
if (config.sessionSecret.length < 32) {
  console.warn('SESSION_SECRET은 32자 이상을 권장합니다.');
}
const db = openDb(config.dbPath);
const app = buildApp({ config, db });

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`${signal} 받음, 서버를 닫습니다`);
  try {
    await app.close();
  } finally {
    db.close();
  }
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`4thIS-world server on :${config.port} (db: ${config.dbPath})`);
