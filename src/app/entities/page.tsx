'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function EntitiesPage() {
  const [entities, setEntities] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchEntities()
  }, [])

  async function fetchEntities() {
    const { data } = await supabase.from('entities').select('*').order('name', { ascending: true })
    if (data) setEntities(data)
    setLoading(false)
  }

  async function deleteEntity(id: string) {
    if (confirm("Are you sure? This will not delete transactions, but the name will be removed from suggestions.")) {
      const { error } = await supabase.from('entities').delete().eq('id', id)
      if (!error) setEntities(entities.filter(e => e.id !== id))
    }
  }

  const filtered = entities.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <button onClick={() => router.back()} className="text-blue-600 font-bold">← Back</button>
        <h1 className="text-xl font-bold">Manage Contacts</h1>
        <div className="w-10"></div>
      </div>

      <input 
        type="text" 
        placeholder="Search customers or vendors..." 
        className="w-full p-4 rounded-2xl border-none shadow-sm mb-6 outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <p className="p-10 text-center text-gray-400">Loading...</p> : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase">Name</th>
                <th className="p-4 text-[10px] font-bold text-gray-400 uppercase">Type</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entity) => (
                <tr key={entity.id} className="border-b last:border-0">
                  <td className="p-4 font-medium text-gray-800">{entity.name}</td>
                  <td className="p-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${entity.type === 'customer' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                      {entity.type}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteEntity(entity.id)} className="text-red-300 hover:text-red-500 transition">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}