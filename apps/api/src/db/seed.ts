import pool from './pool'
import products from '../data/products.json'  with { type: 'json' };;

async function seed() {
    console.log('Seeding products...');

    for(const product of products){
        await pool.query(
            `INSERT INTO products (
                id,name,description,category,price_paise,cost_price_paise,
                max_discount_pct,stock,tags,ai_summary,best_for,expiry_date,margin_pct,internal_notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            ON CONFLICT (id) DO NOTHING
            `, [
            product.id, product.name, product.description, product.category, product.price_paise, product.cost_price_paise, product.max_discount_pct,
            product.stock, product.tags, product.ai_summary, product.best_for, product.expiry_date, product.margin_pct, product.internal_notes
            ]);
    }
    console.log(`Seeded ${products.length} products`);
    await pool.end();
}
seed().catch(console.error);