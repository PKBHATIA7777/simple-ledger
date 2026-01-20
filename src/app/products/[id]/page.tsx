'use client'
import { useEffect, useState, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

// Define the structure of the joined data to fix the errors
interface TransactionWithEntity {
  value: number;
  type: 'sale' | 'purchase';
  entities: {
    name: string;
    type: 'customer' | 'vendor';
  };
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [product, setProduct] = useState<any>(null)
  const [stats, setStats] = useState({ totalSales: 0, totalPurchases: 0 })
  const [partners, setPartners] = useState<{ customers: string[], vendors: string[] }>({
    customers: [],
    vendors: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProductData() {
      // 1. Get Product Info
      const { data: prod } = await supabase.from('products').select('*').eq('id', id).single()
      if (prod) setProduct(prod)

      // 2. Get Transaction Analytics with explicit typing
      const { data, error } = await supabase
        .from('transactions')
        .select('value, type, entities(name, type)')
        .eq('product_id', id)

      // Cast the data to our interface
      const trans = data as unknown as TransactionWithEntity[]

      if (trans && !error) {
        const totals = trans.reduce((acc, curr) => {
          if (curr.type === 'sale') acc.totalSales += Number(curr.value)
          else acc.totalPurchases += Number(curr.value)
          return acc
        }, { totalSales: 0, totalPurchases: 0 })

        // Now TypeScript knows exactly what .entities.type and .entities.name are
        const customers = Array.from(new Set(
          trans.filter(t => t.entities?.type === 'customer').map(t => t.entities.name)
        ))
        
        const vendors = Array.from(new Set(
          trans.filter(t => t.entities?.type === 'vendor').map(t => t.entities.name)
        ))

        setStats(totals)
        setPartners({ customers, vendors })
      }
      setLoading(false)
    }
    fetchProductData()
  }, [id, supabase])

  if (loading) return <div className="p-20 text-center text-gray-400">Analyzing product data...</div>

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <button onClick={() => router.back()} className="text-blue-600 font-bold mb-6">← Back</button>
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">{product?.name}</h1>
        <p className="text-gray-500 text-sm">Product Performance Insights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Lifetime Sales</p>
          <p className="text-2xl font-bold text-green-600">₹{stats.totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500">
          <p className="text-xs font-bold text-gray-400 uppercase">Lifetime Purchases</p>
          <p className="text-2xl font-bold text-blue-600">₹{stats.totalPurchases.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Top Customers</h3>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {partners.customers.length > 0 ? partners.customers.map((name, i) => (
              <div key={i} className="p-4 border-b last:border-0 text-gray-700 font-medium">{name}</div>
            )) : <p className="p-8 text-center text-gray-400 text-sm italic">No sales recorded</p>}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider">Active Vendors</h3>
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {partners.vendors.length > 0 ? partners.vendors.map((name, i) => (
              <div key={i} className="p-4 border-b last:border-0 text-gray-700 font-medium">{name}</div>
            )) : <p className="p-8 text-center text-gray-400 text-sm italic">No purchases recorded</p>}
          </div>
        </div>
      </div>
    </div>
  )
}