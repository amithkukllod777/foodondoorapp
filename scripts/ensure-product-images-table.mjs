/**
 * Ensures productImages table exists in production DB.
 * Run: node scripts/ensure-product-images-table.mjs
 */
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection({
  uri: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  // Check if table already exists
  const [rows] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'productImages'"
  );
  const exists = rows[0].cnt > 0;

  if (exists) {
    console.log('✅ productImages table already exists');
  } else {
    console.log('Creating productImages table...');
    await conn.execute(`
      CREATE TABLE productImages (
        id INT NOT NULL AUTO_INCREMENT,
        productId INT NOT NULL,
        url TEXT NOT NULL,
        fileKey TEXT NOT NULL,
        isHero BOOLEAN NOT NULL DEFAULT false,
        sortOrder INT NOT NULL DEFAULT 0,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_productId (productId),
        CONSTRAINT fk_productImages_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ productImages table created successfully');
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
} finally {
  await conn.end();
}
