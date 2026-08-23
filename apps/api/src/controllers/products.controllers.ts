import type { Request, Response } from 'express'
import {getProducts} from '../db/queries'

export const getproducts = async(req:Request,res:Response) => {
    const { search,category,maxPrice} = req.query;

    try {
        const products = await getProducts(
            search as string,
            category as string,
            maxPrice ? parseInt(maxPrice as string) : undefined
        );
    res.json({products});
    } catch (error) {
         res.status(500).json({ error: 'Failed to fetch products' });
    }
}