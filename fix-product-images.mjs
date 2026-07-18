import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 1,
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'nutriwow',
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelayMs: 0,
});

async function fixProductImages() {
  const connection = await pool.getConnection();
  
  try {
    console.log('Starting product image fix...');
    
    // Get all products with their first image
    const [products] = await connection.query(`
      SELECT p.id, p.image, pi.url
      FROM products p
      LEFT JOIN productImages pi ON p.id = pi.productId
      WHERE pi.id = (
        SELECT MIN(id) FROM productImages WHERE productId = p.id
      )
      AND (p.image IS NULL OR p.image = '' OR p.image LIKE '%screenshot%' OR p.image LIKE '%WhatsApp%')
    `);
    
    console.log(`Found ${products.length} products to fix`);
    
    let updated = 0;
    for (const product of products) {
      if (product.url) {
        await connection.query(
          'UPDATE products SET image = ? WHERE id = ?',
          [product.url, product.id]
        );
        updated++;
        console.log(`✓ Product ${product.id}: image updated to ${product.url.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n✅ Fixed ${updated} products`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
    await pool.end();
  }
}

fixProductImages();
