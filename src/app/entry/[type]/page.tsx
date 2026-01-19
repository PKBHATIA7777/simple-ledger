// src/app/entry/[type]/page.tsx
'use client'

import { useState, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function EntryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const router = useRouter()
  const supabase = createClient()

  // State Management
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entity, setEntity] = useState('')
  const [product, setProduct] = useState('')
  const [value, setValue] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Validate the URL parameter immediately
  const isValidType = type === 'sale' || type === 'purchase'
  const entityType = type === 'sale' ? 'customer' : 'vendor'

  const handleSave = async () => {
    if (!isValidType) {
      return toast.error('Invalid transaction type')
    }

    if (!entity.trim() || !product.trim() || !value) {
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
      if (!userId) throw new Error('Please login first')

      // Call the Atomic RPC instead of three separate calls
      const { error } = await supabase.rpc('create_transaction_atomic', {
        p_user_id: userId,
        p_date: date,
        p_entity_name: entity.trim(),
        p_entity_type: entityType,
        p_product_name: product.trim(),
        p_value: numericValue,
        p_type: type,
      })

      if (error) throw error

      toast.success('Record saved successfully!', { id: toastId })
      router.push('/dashboard')
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
          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">DATE</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">
              {type === 'sale' ? 'CUSTOMER NAME' : 'VENDOR NAME'}
            </label>
            <input
              type="text"
              placeholder="Enter name..."
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-500 mb-1">PRODUCT</label>
            <input
              type="text"
              placeholder="What was sold/bought?"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

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

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition mt-4 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Record'}
          </button>

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