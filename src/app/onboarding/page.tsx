// src/app/onboarding/page.tsx

'use client'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const [company, setCompany] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false) // New loading state
  const supabase = createClient()
  const router = useRouter()

  const handleSubmit = async () => {
    if (!company.trim()) {
      alert("Please enter a company name")
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User session not found")

      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        company_name: company.trim()
      })

      if (error) throw error

      router.push('/dashboard')
    } catch (err: any) {
      alert(err.message || "Error saving company name")
    } finally {
      setIsSubmitting(false)
    }
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
          disabled={isSubmitting}
        />
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || !company.trim()}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Finish Setup"}
        </button>
      </div>
    </div>
  )
}