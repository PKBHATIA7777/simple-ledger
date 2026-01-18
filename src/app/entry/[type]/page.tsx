// src/app/entry/[type]/page.tsx

'use client'

import { useState, use } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function EntryPage({ params }: { params: Promise<{ type: string }> }) {
  // Unwrap the params using React.use()
  const { type } = use(params)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [entity, setEntity] = useState('')
  const [product, setProduct] = useState('')
  const [value, setValue] = useState('')

  const entityType = type === 'sale' ? 'customer' : 'vendor'
  const supabase = createClient()

  const handleSave = async () => {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) return alert('Please login first')

    // Get or Create Entity
    const { data: ent, error: entErr } = await supabase
      .from('entities')
      .upsert(
        { name: entity, type: entityType, user_id: userId },
        { onConflict: 'user_id,name,type' }
      )
      .select()
      .single()

    // Get or Create Product
    const { data: prod, error: prodErr } = await supabase
      .from('products')
      .upsert({ name: product, user_id: userId }, { onConflict: 'user_id,name' })
      .select()
      .single()

    if (ent && prod) {
      // Save Transaction
      const { error } = await supabase.from('transactions').insert({
        user_id: userId,
        date: date,
        entity_id: ent.id,
        product_id: prod.id,
        value: parseFloat(value),
        type: type, // Use unwrapped 'type'
      })

      if (!error) {
        alert('Saved successfully!')
        setEntity('')
        setProduct('')
        setValue('')
      } else {
        alert('Error saving transaction')
      }
    } else {
      alert('Failed to create entity or product')
    }
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
              placeholder="0.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg"
            />
          </div>

          <button
            onClick={handleSave}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition mt-4"
          >
            Save Record
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full py-2 text-gray-400 font-medium hover:text-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}