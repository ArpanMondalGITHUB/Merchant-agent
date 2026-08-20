import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import cookieParser from 'cookie-parser';
import { config } from "./config/config";

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


app.get('/',(req,res) => {
  res.send("Devdraw API is running");
});

app.get('/api/v1/health',(req,res) => {
  res.json({status:"ok"});
});

export default app;