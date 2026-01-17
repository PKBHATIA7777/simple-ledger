'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function BulkEntry() {
  const [rows, setRows] = useState([{ id: Date.now(), entity: '', product: '', value: '' }])
  const [duration, setDuration] = useState(new Date().toISOString().slice(0, 7)) // Default: YYYY-MM
  const [isSaving, setIsSaving] = useState(false)
  
  const supabase = createClient()
  const router = useRouter()

  const addRow = () => {
    setRows([...rows, { id: Date.now(), entity: '', product: '', value: '' }])
  }

  const removeRow = (id: number) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id))
  }

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r))
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Please login first")

      const finalEntries = []

      for (const row of rows) {
        if (!row.entity || !row.product || !row.value) continue

        // 1. Upsert Entity (Customer/Vendor)
        const { data: ent } = await supabase
          .from('entities')
          .upsert(
            { name: row.entity, user_id: user.id, type: 'customer' }, // Defaulting to customer for this example
            { onConflict: 'user_id, name, type' }
          )
          .select().single()

        // 2. Upsert Product
        const { data: prod } = await supabase
          .from('products')
          .upsert(
            { name: row.product, user_id: user.id },
            { onConflict: 'user_id, name' }
          )
          .select().single()

        if (ent && prod) {
          finalEntries.push({
            user_id: user.id,
            date: `${duration}-01`, // Storing as first of the month for duration records
            entity_id: ent.id,
            product_id: prod.id,
            value: parseFloat(row.value),
            type: 'sale' // Adjust based on your toggle logic
          })
        }
      }

      // 3. Bulk Insert Transactions
      if (finalEntries.length > 0) {
        const { error } = await supabase.from('transactions').insert(finalEntries)
        if (error) throw error
        alert(`${finalEntries.length} records saved successfully!`)
        router.push('/dashboard')
      }
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Bulk Entry</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-gray-500 uppercase">Duration:</label>
          <input 
            type="month" 
            value={duration} 
            onChange={(e) => setDuration(e.target.value)}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
          />
        </div>
      </div>

      {/* Desktop View */}
      <div className="hidden md:block overflow-hidden bg-white rounded-xl shadow-md border border-gray-100">
        <table className="w-full text-left">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-600 uppercase">Customer/Vendor</th>
              <th className="p-4 text-xs font-bold text-gray-600 uppercase">Product</th>
              <th className="p-4 text-xs font-bold text-gray-600 uppercase">Value</th>
              <th className="p-4 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b last:border-0 hover:bg-blue-50/30 transition">
                <td className="p-2">
                  <input className="w-full p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-400" 
                    placeholder="Name..." value={row.entity} onChange={(e) => updateRow(row.id, 'entity', e.target.value)} />
                </td>
                <td className="p-2">
                  <input className="w-full p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-400" 
                    placeholder="Product..." value={row.product} onChange={(e) => updateRow(row.id, 'product', e.target.value)} />
                </td>
                <td className="p-2">
                  <input className="w-full p-2 bg-transparent outline-none border-b border-transparent focus:border-blue-400 font-medium" 
                    type="number" placeholder="0.00" value={row.value} onChange={(e) => updateRow(row.id, 'value', e.target.value)} />
                </td>
                <td className="p-2">
                  <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 transition p-2">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4">
        {rows.map((row, index) => (
          <div key={row.id} className="p-4 bg-white border rounded-xl shadow-sm relative">
             <button onClick={() => removeRow(row.id)} className="absolute top-2 right-2 text-gray-300">✕</button>
             <span className="text-[10px] font-bold text-gray-300 uppercase block mb-2">Record #{index + 1}</span>
             <input className="w-full mb-3 p-2 border-b outline-none focus:border-blue-500" placeholder="Customer/Vendor" 
               value={row.entity} onChange={(e) => updateRow(row.id, 'entity', e.target.value)} />
             <input className="w-full mb-3 p-2 border-b outline-none focus:border-blue-500" placeholder="Product" 
               value={row.product} onChange={(e) => updateRow(row.id, 'product', e.target.value)} />
             <input className="w-full p-2 border-b font-bold outline-none focus:border-blue-500" type="number" placeholder="Value" 
               value={row.value} onChange={(e) => updateRow(row.id, 'value', e.target.value)} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col md:flex-row gap-4">
        <button onClick={addRow} className="flex-1 py-4 border-2 border-dashed border-gray-300 rounded-2xl font-semibold text-gray-400 hover:border-blue-400 hover:text-blue-500 transition bg-white shadow-sm">
          + Add New Entry
        </button>
        <button 
          onClick={handleSaveAll} 
          disabled={isSaving}
          className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save All Entries"}
        </button>
      </div>
    </div>
  )
}