import { buildApp } from './app';

const port = Number(process.env.PORT ?? 8080);
const app = buildApp();
await app.listen({ port, host: '0.0.0.0' });
console.log(`4thIS-world server on :${port}`);
