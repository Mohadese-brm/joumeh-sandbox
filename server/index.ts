import { createDb } from './db.js';
import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
createDb().then(db => createApp(db).listen(port, '127.0.0.1', () => console.log(`local API on 127.0.0.1:${port}`)));
