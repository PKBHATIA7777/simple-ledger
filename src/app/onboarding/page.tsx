'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const [company, setCompany] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      company_name: company
    })

    if (!error) router.push('/dashboard')
    else alert("Error saving company name")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h2 className="text-xl font-semibold mb-4">Complete your Profile</h2>
        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
        <input 
          type="text" 
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. Acme Threads"
        />
        <button 
          onClick={handleSubmit}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Finish Setup
        </button>
      </div>
    </div>
  )
}