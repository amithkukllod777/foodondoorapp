import { createConnection } from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL not set');

const conn = await createConnection(url);
try {
  // Create productImages table
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`productImages\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`productId\` int NOT NULL,
      \`url\` text NOT NULL,
      \`fileKey\` varchar(500) NOT NULL,
      \`isHero\` boolean NOT NULL DEFAULT false,
      \`sortOrder\` int NOT NULL DEFAULT 0,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      CONSTRAINT \`productImages_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log('✅ productImages table created (or already exists)');

  // Mark migration as applied in drizzle journal table
  await conn.execute(`
    INSERT IGNORE INTO \`__drizzle_migrations\` (hash, created_at)
    VALUES ('0013_wet_microbe', UNIX_TIMESTAMP() * 1000)
  `).catch(() => {
    // Table might not exist or different schema - ignore
  });

  // Verify table exists
  const [rows] = await conn.execute("SHOW TABLES LIKE 'productImages'");
  console.log('Table verified:', rows.length > 0 ? 'EXISTS' : 'NOT FOUND');
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
} finally {
  await conn.end();
}
