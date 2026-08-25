import dotenv from "dotenv";
dotenv.config();

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  dataBaseUrl:required("DATABASE_URL"),
  razorPayKeyId:required("RAZORPAY_KEY_ID"),
  razorPayKeySecret:required("RAZORPAY_KEY_SECRET"),
};