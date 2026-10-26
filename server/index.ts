import { createDb } from './db.js';
import { createApp } from './app.js';
const port = Number(process.env.PORT ?? 3001);
// admin-demo: JOUMEH_ADMIN_DEMO=1 enables the SMS-free demo admin login (local only).
createDb().then(db => createApp(db).listen(port, '127.0.0.1', () => console.log(`local API on 127.0.0.1:${port}${process.env.JOUMEH_ADMIN_DEMO === '1' ? ' · ADMIN DEMO on' : ''}`)));
