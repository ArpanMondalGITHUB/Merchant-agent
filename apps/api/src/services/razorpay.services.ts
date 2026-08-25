import { razorpay } from "../config/razorpay";

export const createPaymentLink = async(order:{orderId: string, amountPaise: number}) => {
  const link = await razorpay.paymentLink.create({
    amount: order.amountPaise,
    currency: 'INR',
    description: `Order ${order.orderId}`,
    reference_id: order.orderId,
  } as any);

  return {
    id: link.id,
    url: link.short_url,
  };
};