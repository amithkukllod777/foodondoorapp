import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const url = new URL(process.env.DATABASE_URL);
const conn = await createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.replace('/', ''),
  ssl: { rejectUnauthorized: false },
});

const [rows] = await conn.execute('SELECT id, name, email, role FROM users LIMIT 10');
console.log('Users:', JSON.stringify(rows, null, 2));
await conn.end();
