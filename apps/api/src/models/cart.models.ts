import z from "zod"

export const createCartSchema = z.object({
    sessionId:z.string().min(1)
});

export const addToCartItemSchema = z.object({
    cartId: z.string().uuid(),
    productId: z.string().min(1),
    quantity: z.number().int().positive(),
});

export const checkoutSchema = z.object({
    cartId: z.string().uuid(),
});