import { getProducts } from '@/api/products.api';
import { useEffect, useState } from 'react';

interface Product {
  id: string;
  name: string;
  price_paise: number;
  stock: number;
  expiry_date: string | null;
  is_active: boolean;
  category: string;
}

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
       .then(setProducts)
       .finally(() => setLoading(false))
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-blue-800 font-medium">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 sticky top-0 z-10">
        <div className="max-w-[1440px] mx-auto px-6 py-4">
          <h1 className="text-2xl font-semibold text-blue-900">Raw-Gent Commerce</h1>
          <p className="text-sm text-slate-600 mt-1">Merchant Dashboard</p>
        </div>
      </header>

      <main className="max-w-[1440px] mx-auto px-6 py-6 space-y-6">
        {/* Revenue Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-blue-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="text-sm font-medium text-slate-600 mb-2">Total Revenue Today</div>
            <div className="text-4xl font-bold text-blue-900">₹0.00</div>
            <div className="text-xs text-slate-500 mt-2">No orders yet</div>
          </div>
          <div className="bg-white rounded-lg border border-blue-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="text-sm font-medium text-slate-600 mb-2">Agent-Recovered Revenue</div>
            <div className="text-4xl font-bold text-amber-600">₹0.00</div>
            <div className="text-xs text-slate-500 mt-2">Awaiting Growth Agent actions</div>
          </div>
        </section>

        {/* Pending Recommendations */}
        <section className="bg-white rounded-lg border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-900">Pending Recommendations</h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
              0 pending
            </span>
          </div>
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-sm">No pending recommendations</p>
            <p className="text-xs text-slate-400 mt-1">Growth Agent will suggest actions here</p>
          </div>
        </section>

        {/* Live Orders */}
        <section className="bg-white rounded-lg border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-900">Live Orders</h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-full">
              0 orders
            </span>
          </div>
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="text-sm">No orders yet</p>
            <p className="text-xs text-slate-400 mt-1">Orders will appear here once Buyer Agent completes checkout</p>
          </div>
        </section>

        {/* Product Inventory */}
        <section className="bg-white rounded-lg border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-blue-900">Product Inventory</h2>
            <span className="px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {products.length} products
            </span>
          </div>
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr className="text-left">
                  <th className="pb-3 pr-4 font-semibold text-slate-700">Name</th>
                  <th className="pb-3 pr-4 font-semibold text-slate-700">Category</th>
                  <th className="pb-3 pr-4 font-semibold text-slate-700 text-right">Price</th>
                  <th className="pb-3 pr-8 font-semibold text-slate-700 text-right">Stock</th>
                  <th className="pb-3 pr-6 font-semibold text-slate-700">Expiry</th>
                  <th className="pb-3 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                  >
                    <td className="py-3 pr-4 font-medium text-blue-900">{p.name}</td>
                    <td className="py-3 pr-4 text-slate-600 capitalize">{p.category}</td>
                    <td className="py-3 pr-4 text-right text-slate-900 font-mono">
                      ₹{(p.price_paise / 100).toFixed(2)}
                    </td>
                    <td className="py-3 pr-10 text-right">
                      <span className={`font-medium ${p.stock < 15 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="py-3 pr-4 pl-3 text-slate-600 text-sm">
                      {p.expiry_date ? (
                        <span className={new Date(p.expiry_date) < new Date(Date.now() + 7*24*60*60*1000) ? 'text-amber-600 font-medium' : ''}>
                          {new Date(p.expiry_date).toLocaleDateString()}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        p.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="bg-white rounded-lg border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No activity yet</p>
            <p className="text-xs text-slate-400 mt-1">Events and actions will be logged here</p>
          </div>
        </section>
      </main>
    </div>
  );
}
