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

const [rows] = await conn.execute('SELECT id, name, email, role, openId FROM users LIMIT 10');
console.log('Users in DB:', JSON.stringify(rows, null, 2));
console.log('\nOWNER_OPEN_ID env:', process.env.OWNER_OPEN_ID);
console.log('OWNER_NAME env:', process.env.OWNER_NAME);

// Check if any user openId matches OWNER_OPEN_ID
const ownerOpenId = process.env.OWNER_OPEN_ID;
const matchingUser = rows.find(r => r.openId === ownerOpenId);
console.log('\nMatching user for OWNER_OPEN_ID:', matchingUser ? matchingUser.name : 'NONE - this is the problem!');

await conn.end();
