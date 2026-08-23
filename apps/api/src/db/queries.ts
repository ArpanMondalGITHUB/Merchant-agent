import  pool  from "./pool";

export const getProducts = async(search?:string,category?:string,maxPrice?:number) => {
    let query = `SELECT * FROM products WHERE is_active = true`;
    const params:any[] = [];
    let paramIndex = 1;

    if(search){
        query += ` AND (name ILIKE $${paramIndex} OR ai_summary ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
    }
    if(category){
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
    }
    if(maxPrice){
        query += ` AND price_paise <= $${paramIndex}`;
        params.push(maxPrice);
    }
    const result = await pool.query(query,params);
    return result.rows;
}