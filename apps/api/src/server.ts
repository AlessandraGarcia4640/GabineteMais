import { createApp } from './app.js';
import { env } from './lib/env.js';

const app = createApp();

app.listen(env.API_PORT, () => {
  console.log(`API Gabinete+ disponível em http://localhost:${String(env.API_PORT)}`);
});
