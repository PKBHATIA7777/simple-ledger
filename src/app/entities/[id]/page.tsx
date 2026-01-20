'use client'
import { useEffect, useState, use } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function EntityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [entity, setEntity] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Date Filter State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    fetchData()
  }, [id, startDate, endDate])

  async function fetchData() {
    setLoading(true)
    // 1. Fetch Entity Info
    const { data: ent } = await supabase.from('entities').select('*').eq('id', id).single()
    if (ent) setEntity(ent)

    // 2. Fetch Transactions for this entity within date range
    const { data: trans, error } = await supabase
      .from('transactions')
      .select('*, products(name)')
      .eq('entity_id', id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) toast.error("Failed to load transactions")
    else setTransactions(trans || [])
    
    setLoading(false)
  }

  if (!entity && !loading) return <div className="p-8 text-center">Contact not found</div>

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto bg-gray-50 min-h-screen">
      <header className="mb-6 flex justify-between items-center">
        <button onClick={() => router.back()} className="text-blue-600 font-bold">← Back</button>
        <div className="text-right">
          <h1 className="text-2xl font-bold">{entity?.name || 'Loading...'}</h1>
          <span className="text-xs font-bold uppercase text-gray-400">{entity?.type} Ledger</span>
        </div>
      </header>

      {/* Date Filter Controls */}
      <div className="bg-white p-4 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1">FROM</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="p-2 bg-gray-50 border rounded-lg text-sm outline-none" />
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 mb-1">TO</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="p-2 bg-gray-50 border rounded-lg text-sm outline-none" />
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-gray-400">Total in Period</p>
          <p className="text-lg font-bold text-blue-600">
            ₹{transactions.reduce((acc, curr) => acc + Number(curr.value), 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Product</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={3} className="p-10 text-center text-gray-400">Loading records...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan={3} className="p-10 text-center text-gray-400">No transactions found for this period.</td></tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="text-sm">
                  <td className="p-4 text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="p-4 font-medium">{t.products?.name}</td>
                  <td className={`p-4 text-right font-bold ${t.type === 'sale' ? 'text-green-600' : 'text-blue-600'}`}>
                    ₹{Number(t.value).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}