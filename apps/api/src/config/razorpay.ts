import Razorpay from "razorpay";
import { config } from "./config";

export const razorpay = new Razorpay({
    key_id:config.razorPayKeyId,
    key_secret:config.razorPayKeySecret,
});

