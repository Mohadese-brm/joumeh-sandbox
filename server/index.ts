import { createDb } from './db';
import { createApp } from './app';
const port = Number(process.env.PORT ?? 3001);
createDb().then(db => createApp(db).listen(port, '127.0.0.1', () => console.log(`local API on 127.0.0.1:${port}`)));
