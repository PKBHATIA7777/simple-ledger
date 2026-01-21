// src/app/dashboard/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function Dashboard() {
  const [companyName, setCompanyName] = useState('Loading...')
  const [stats, setStats] = useState({ sales: 0, purchases: 0 })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      // 1. Fetch Profile and check onboarding status
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile) {
        router.push('/onboarding')
        return
      }

      setCompanyName(profile.company_name)

      // 2. Fetch Optimized Stats via RPC
      const { data, error } = await supabase.rpc('get_monthly_stats', {
        p_user_id: user.id,
      })

      if (error) {
        toast.error('Failed to load statistics')
      } else if (data && data.length > 0) {
        setStats({
          sales: Number(data[0].total_sales),
          purchases: Number(data[0].total_purchases),
        })
      }
    }

    fetchData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{companyName}</h1>
          <p className="text-sm text-gray-500">Business Overview</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-wider"
        >
          Sign Out
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/entry/sale"
          className="p-6 bg-green-600 rounded-2xl shadow-sm hover:shadow-md transition text-primary-action"
        >
          <h2 className="text-lg font-bold">Sales Record</h2>
          <p className="text-green-100 text-sm font-medium">
            This Month: ₹{stats.sales.toLocaleString()}
          </p>
          <div className="mt-4 text-2xl">→</div>
        </Link>

        <Link
          href="/entry/purchase"
          className="p-6 bg-blue-600 rounded-2xl shadow-sm hover:shadow-md transition text-primary-action"
        >
          <h2 className="text-lg font-bold">Purchase Record</h2>
          <p className="text-blue-100 text-sm font-medium">
            This Month: ₹{stats.purchases.toLocaleString()}
          </p>
          <div className="mt-4 text-2xl">→</div>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <Link
          href="/reports"
          className="p-4 bg-white border rounded-xl text-center text-sm font-medium"
        >
          Reports
        </Link>
        <Link
          href="/entities"
          className="p-4 bg-white border rounded-xl text-center text-sm font-medium"
        >
          Contacts
        </Link>
        <Link
          href="/products"
          className="p-4 bg-white border rounded-xl text-center text-sm font-medium"
        >
          Products
        </Link>
      </div>
    </div>
  )
}