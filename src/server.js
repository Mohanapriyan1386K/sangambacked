const fs = require('node:fs');
const path = require('node:path');
function loadEnv() {
  const file = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[1].startsWith('#') || (process.env[match[1]] !== undefined && process.env[match[1]] !== '')) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}
loadEnv();
const app = require('./app');
const port = Number(process.env.PORT) || 5000;

async function start() {
  if (!process.env.JWT_SECRET) {
    const length = (process.env.JWT_SECRET || '').length;
    throw new Error(`JWT_SECRET is required (loaded Backend/.env; current value length: ${length}). Set it in Backend/.env or the process environment.`);
  }
  await app.locals.initializeDatabase();
  const server = app.listen(port, () => console.log(`Sangam API listening on port ${port}`));
  const shutdown = (signal) => {
    console.log(`${signal} received; closing server`);
    server.close(async () => { await require('mongoose').disconnect(); process.exit(0); });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
start().catch((error) => { console.error('Startup failed:', error); process.exit(1); });
