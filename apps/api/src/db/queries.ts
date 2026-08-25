import { randomUUID } from "crypto";
import  pool  from "./pool";

export interface Carts{
    id: string;
    sessionId: string;
    status: "active" | "checkout_created" | "paid" | "abandoned";
    totalPaise: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface Orders{
  id:string;
  cartId:string;
  amountPaise:number;
  status:string;
  createdBy:string;
}

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

export const createCart = async (
  input: { sessionId: string; status?: string }
): Promise<Pick<Carts, "id" | "sessionId" | "status" | "totalPaise" | "createdAt">> => {
  const cartId = randomUUID();
    await pool.query(
    'INSERT INTO buyer_sessions (id) VALUES ($1) ON CONFLICT (id) DO NOTHING',
    [input.sessionId]
  );

  const { rows } = await pool.query<Pick<Carts, "id" | "sessionId" | "status" | "totalPaise" | "createdAt">>(
    `INSERT INTO carts (id, session_id, status)
     VALUES ($1, $2, $3)
     RETURNING id, session_id AS "sessionId", status, total_paise AS "totalPaise", created_at AS "createdAt"`,
    [cartId, input.sessionId, input.status ?? "active"]
  );
  return rows[0]!;
};


export const addToCartItem = async (input:{cartId: string, productId: string, quantity: number}) => {
  // Get product price
  const product = await pool.query('SELECT price_paise FROM products WHERE id = $1', [input.productId]);
  if (!product.rows[0]) throw new Error('Product not found');

  const unitPrice = product.rows[0].price_paise;

  // Insert or update cart item
  await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_paise)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (cart_id, product_id) DO UPDATE SET quantity = cart_items.quantity + $3`,
    [input.cartId, input.productId, input.quantity, unitPrice]
  );

  // Update cart total
  await pool.query(
    `UPDATE carts SET total_paise = (
      SELECT COALESCE(SUM(quantity * unit_price_paise), 0) FROM cart_items WHERE cart_id = $1
    ) WHERE id = $1`,
    [input.cartId]
  );
};

export const createOrder = async (
  input:{
    cartId:string,
    amountPaise:number,
    createdBy:string,
  }):Promise<Pick<Orders, "id" | "cartId" | "amountPaise" | "status" | "createdBy">>  => {
    const cartExists = await pool.query(
      `SELECT 1 FROM carts WHERE id = $1`,
      [input.cartId]
    );

    if (cartExists.rowCount === 0) {
      throw new Error(`Cart not found: ${input.cartId}`);
    }

    const existingOrder = await pool.query(
      `SELECT 1 FROM orders WHERE cart_id = $1 LIMIT 1`,
      [input.cartId]
    )

    if (existingOrder.rowCount && existingOrder.rowCount > 0) {
      throw new Error(`Cart already checked out: ${input.cartId}`)
    }
    
    const orderId = randomUUID();
    const {rows} = await pool.query(
      `INSERT INTO orders (id,cart_id,amount_paise,status,created_by)
       VALUES ($1, $2, $3,'payment_pending', $4)
      RETURNING id, cart_id as "cartId", amount_paise as "amountPaise", status, created_by as "createdBy"`,
      [orderId,input.cartId,input.amountPaise,input.createdBy]
    );
    return rows[0];
};

export const updateOrderPaymentLink = async (
  orderId: string,
  paymentLinkId: string,
  paymentLinkUrl: string
) => {
  const { rows } = await pool.query(
    `UPDATE orders
     SET razorpay_payment_link_id = $2,
         razorpay_payment_link_url = $3,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, cart_id as "cartId", amount_paise as "amountPaise", status, created_by as "createdBy"`,
    [orderId, paymentLinkId, paymentLinkUrl]
  );

  return rows[0];
};

export const markCartCheckedOut = async (cartId: string) => {
  await pool.query(
    `UPDATE carts
     SET status = 'checked_out', updated_at = NOW()
     WHERE id = $1`,
    [cartId]
  );
};

export const getCart = async (cartId: string) => {
  const { rows } = await pool.query(
    'SELECT id, total_paise as "totalPaise", status FROM carts WHERE id = $1 ',
    [cartId]
  );
  return rows[0];
};