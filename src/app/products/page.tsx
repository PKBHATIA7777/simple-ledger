// src/app/products/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication error or no user found:', authError)
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id) // Only show products belonging to this user
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching products:', error)
      setProducts([])
    } else if (data) {
      setProducts(data)
    }
    setLoading(false)
  }

  async function deleteProduct(id: string) {
    if (confirm("Remove this product from your catalog?")) {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (!error) setProducts(products.filter(p => p.id !== id))
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="text-blue-600 font-bold">
          ← Back
        </button>
        <h1 className="text-xl font-bold">Product Catalog</h1>
        <div className="w-10"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <p className="col-span-full text-center py-10 text-gray-400">Fetching products...</p>
        ) : products.length > 0 ? (
          products.map((product) => (
            <div
              key={product.id}
              className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center hover:border-blue-300 cursor-pointer transition"
              onClick={() => router.push(`/products/${product.id}`)}
            >
              <span className="font-semibold text-gray-700">{product.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevents navigating to details when deleting
                  deleteProduct(product.id);
                }}
                className="text-xs text-red-400 hover:text-red-600 font-bold uppercase tracking-tighter"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="col-span-full p-20 text-center bg-white rounded-3xl border-2 border-dashed">
            <p className="text-gray-400">
              No products saved yet. They will appear here once you make an entry.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}