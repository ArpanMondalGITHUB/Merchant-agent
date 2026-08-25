import { Router } from "express";
import {
    createCartHandler,
    addToCartItemSHandler,
    createOrderHandler
} from '../controllers/cart.controllers'
import { validate } from "../middlewares/cart.middlewares";
import {
    addToCartItemSchema,
    createCartSchema,
    checkoutSchema
} from "../models/cart.models";
const router = Router()

router.route('/cart').post(validate(createCartSchema), createCartHandler);
router.route('/cart/items').post(validate(addToCartItemSchema), addToCartItemSHandler);
router.route('/cart/checkout').post(validate(checkoutSchema), createOrderHandler);

export default router;