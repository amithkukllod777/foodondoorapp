import { drizzle } from 'drizzle-orm/mysql2/promise';
import mysql from 'mysql2/promise';
import { products, productImages } from './drizzle/schema.ts';
import { eq, sql, and, isNull } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const poolConnection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'nutriwow',
});

const db = drizzle(poolConnection);

async function fixProductImages() {
  try {
    console.log('Starting product image fix using Drizzle...');
    
    // Get all products with their first image
    const result = await db.execute(sql`
      SELECT p.id, p.image, pi.url
      FROM products p
      LEFT JOIN productImages pi ON p.id = pi.productId
      WHERE pi.id = (
        SELECT MIN(id) FROM productImages WHERE productId = p.id
      )
      AND (p.image IS NULL OR p.image = '' OR p.image LIKE '%screenshot%' OR p.image LIKE '%WhatsApp%')
    `);
    
    const productsToFix = result[0] || [];
    console.log(`Found ${productsToFix.length} products to fix`);
    
    let updated = 0;
    for (const product of productsToFix) {
      if (product.url) {
        await db.update(products)
          .set({ image: product.url })
          .where(eq(products.id, product.id));
        updated++;
        console.log(`✓ Product ${product.id}: image updated`);
      }
    }
    
    console.log(`\n✅ Fixed ${updated} products`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await poolConnection.end();
  }
}

fixProductImages();
