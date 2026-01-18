// src/app/dashboard/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Dashboard() {
  const [companyName, setCompanyName] = useState('Loading...')
  const [stats, setStats] = useState({ sales: 0, purchases: 0 }) // New state for totals
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setCompanyName('Guest')
        return
      }

      // 1. Fetch Profile Name
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .single()

      if (profile?.company_name) {
        setCompanyName(profile.company_name)
      } else {
        setCompanyName('My Business')
      }

      // 2. Fetch current month's transactions for stats
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const { data: transactions } = await supabase
        .from('transactions')
        .select('value, type')
        .eq('user_id', user.id)
        .gte('date', startOfMonth)

      if (transactions) {
        const totals = transactions.reduce(
          (acc, curr) => {
            if (curr.type === 'sale') {
              acc.sales += Number(curr.value)
            } else if (curr.type === 'purchase') {
              acc.purchases += Number(curr.value)
            }
            return acc
          },
          { sales: 0, purchases: 0 }
        )
        setStats(totals)
      }
    }

    fetchData()
  }, [])

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
        {/* Sales Action */}
        <Link
          href="/entry/sale"
          className="p-6 bg-green-600 rounded-2xl shadow-sm hover:shadow-md transition text-white"
        >
          <h2 className="text-lg font-bold">Sales Record</h2>
          <p className="text-green-100 text-sm font-medium">
            This Month: ₹{stats.sales.toLocaleString()}
          </p>
          <div className="mt-4 text-2xl">→</div>
        </Link>

        {/* Purchase Action */}
        <Link
          href="/entry/purchase"
          className="p-6 bg-blue-600 rounded-2xl shadow-sm hover:shadow-md transition text-white"
        >
          <h2 className="text-lg font-bold">Purchase Record</h2>
          <p className="text-blue-100 text-sm font-medium">
            This Month: ₹{stats.purchases.toLocaleString()}
          </p>
          <div className="mt-4 text-2xl">→</div>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <Link href="/reports" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">
          Reports
        </Link>
        <Link href="/entities" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">
          Contacts
        </Link>
        <Link href="/products" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">
          Products
        </Link>
      </div>
    </div>
  )
}