import axiosInstance from "./axios.config";

export async function getProducts() {
  const res = await axiosInstance.get('/api/v1/products');
  return res.data.products;
}