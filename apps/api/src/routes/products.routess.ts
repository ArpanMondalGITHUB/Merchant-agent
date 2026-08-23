import { Router } from "express";
import { getproducts } from "../controllers/products.controllers";

const router = Router()

router.route('/products').get(getproducts);

export default router;