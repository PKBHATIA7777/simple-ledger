// src/app/entry/[type]/page.tsx
'use client'

import { useState, use, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function EntryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const router = useRouter()
  const supabase = createClient()

  // State Management
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string } | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string } | null>(null)
  const [entitySearch, setEntitySearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [value, setValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Suggestion States
  const [entities, setEntities] = useState<{ id: string; name: string }[]>([])
  const [products, setProducts] = useState<{ id: string; name: string }[]>([])

  const isValidType = type === 'sale' || type === 'purchase'
  const entityType = type === 'sale' ? 'customer' : 'vendor'

  // Fetch suggestions on load
  useEffect(() => {
    async function loadSuggestions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch entities
      const { data: entData, error: entError } = await supabase
        .from('entities')
        .select('id, name')
        .eq('type', entityType)
        .order('name')

      if (entError) {
        console.error('Error fetching entities:', entError)
        return
      }

      // Fetch products
      const { data: prodData, error: prodError } = await supabase
        .from('products')
        .select('id, name')
        .order('name')

      if (prodError) {
        console.error('Error fetching products:', prodError)
        return
      }

      setEntities(entData || [])
      setProducts(prodData || [])
    }

    if (isValidType) {
      loadSuggestions()
    }
  }, [isValidType, entityType, supabase])

  const handleSave = async () => {
    if (!isValidType) {
      return toast.error('Invalid transaction type')
    }

    const entityName = selectedEntity?.name.trim()
    const productName = selectedProduct?.name.trim()

    if (!entityName || !productName || !value) {
      return toast.error('Please fill in all fields')
    }

    const numericValue = parseFloat(value)
    if (isNaN(numericValue) || numericValue <= 0) {
      return toast.error('Please enter a valid positive amount')
    }

    setIsSaving(true)
    const toastId = toast.loading('Saving transaction...')

    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Please log in first')

      const { error } = await supabase.rpc('create_transaction_atomic', {
        p_user_id: userId,
        p_date: date,
        p_entity_name: entityName,
        p_entity_type: entityType,
        p_product_name: productName,
        p_value: numericValue,
        p_type: type,
      })

      if (error) throw error

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} record added!`, { id: toastId })

      // ✅ Reset form but keep date
      setSelectedEntity(null)
      setSelectedProduct(null)
      setValue('')
      setEntitySearch('')
      setProductSearch('')
      // Date remains unchanged

    } catch (error: any) {
      console.error('Transaction Error:', error)
      toast.error(error.message || 'An error occurred while saving', { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isValidType) {
    return <div className="p-8 text-center">Invalid Page Type</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold mb-6 capitalize text-gray-800">
          New {type}
        </h1>

        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">DATE</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Entity Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">
              {type === 'sale' ? 'CUSTOMER NAME' : 'VENDOR NAME'}
            </label>
            {!selectedEntity ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${entityType}...`}
                  value={entitySearch}
                  onChange={(e) => setEntitySearch(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                {entitySearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {entities
                      .filter(e => e.name.toLowerCase().includes(entitySearch.toLowerCase()))
                      .map(entity => (
                        <button
                          key={entity.id}
                          onClick={() => {
                            setSelectedEntity(entity)
                            setEntitySearch('')
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          {entity.name}
                        </button>
                      ))}
                    {entities.filter(e => e.name.toLowerCase().includes(entitySearch.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-gray-500 text-sm">No results found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-blue-700 font-medium">{selectedEntity.name}</span>
                <button
                  onClick={() => setSelectedEntity(null)}
                  className="text-blue-400 hover:text-blue-600 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Product Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">PRODUCT</label>
            {!selectedProduct ? (
              <div className="relative">
                <input
                  type="text"
                  placeholder="What was sold/bought?"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                />
                {productSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
                    {products
                      .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            setSelectedProduct(product)
                            setProductSearch('')
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                        >
                          {product.name}
                        </button>
                      ))}
                    {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                      <div className="px-4 py-2 text-gray-500 text-sm">No results found</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-xl">
                <span className="text-green-700 font-medium">{selectedProduct.name}</span>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="text-green-400 hover:text-green-600 font-bold"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Value */}
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">TOTAL VALUE (₹)</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition mt-4 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Record'}
          </button>

          {/* Cancel Button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full py-2 text-gray-400 font-medium hover:text-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}