import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import cookieParser from 'cookie-parser';
import { config } from "./config/config";
import productroutes from './routes/products.routess'
import cartroutes from './routes/cart.routess'
import { errorHandler } from "./middlewares/cart.middlewares";

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(cors(
    {
        origin: config.corsOrigin,
        credentials:true
    }
));

app.use('/api/v1/',productroutes);
app.use('/api/v1/',cartroutes);

app.get('/',(req,res) => {
  res.send("Devdraw API is running");
});

app.get('/api/v1/health',(req,res) => {
  res.json({status:"ok"});
});

app.use(errorHandler);
export default app;
