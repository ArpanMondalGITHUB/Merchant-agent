import type { Request, Response } from "express"
import { addToCartItem, createCart, createOrder, getCart, markCartCheckedOut, updateOrderPaymentLink } from "../db/queries";
import { createPaymentLink } from "../services/razorpay.services";

export const createCartHandler = async(req:Request,res:Response) => {
    try {
        const {sessionId} = req.body;
        const cartId = await createCart({sessionId});
        res.json({cartId});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create cart' });
    }

};

export const addToCartItemSHandler = async(req:Request,res:Response) => {
    try {
        const {cartId, productId, quantity} = req.body;
        await addToCartItem({cartId, productId, quantity});
        res.json({success:true})
    } catch (error:any) {
        console.error(error);
        // throw new ApiError(500,"Failed to add item");
        res.status(500).json({ error: error.message || 'Failed to add item' });
    }
};

export const createOrderHandler = async(req:Request,res:Response) => {
    try {
        const { cartId } = req.body;

        const cart = await getCart(cartId);
        if (!cart) {
            throw new Error('cart not found')
        }

         const order = await createOrder({
            cartId,
            amountPaise: cart.totalPaise,
            createdBy: 'buyer_agent'
         });
         
        const { id, url } = await createPaymentLink({
            orderId: order.id,
            amountPaise: order.amountPaise,
        });

        await updateOrderPaymentLink(order.id, id, url);
        await markCartCheckedOut(cartId);
        res.json({ orderId: order.id, paymentUrl: url });
    } catch (error:any) {
        console.error(error);

        const status = error.message?.startsWith('Cart not found') ? 404 : 400;
        res.status(status).json({
            error: error.message || 'Failed to create order'
        });
    }
};