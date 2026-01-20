// src/app/reports/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchReportData()
  }, [startDate, endDate])

  async function fetchReportData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, entities(name), products(name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      toast.error('Failed to load report')
      setTransactions([])
    } else {
      setTransactions(data || [])
    }
    setLoading(false)
  }

  const totals = transactions.reduce(
    (acc, curr) => {
      const value = Number(curr.value)
      if (curr.type === 'sale') acc.sales += value
      else acc.purchases += value
      return acc
    },
    { sales: 0, purchases: 0 }
  )

  // Export to Excel
  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      transactions.map((t) => ({
        Date: t.date,
        Type: t.type.toUpperCase(),
        Entity: t.entities?.name || '—',
        Product: t.products?.name || '—',
        Amount: t.value,
      }))
    )
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions')
    XLSX.writeFile(workbook, `Report_${startDate}_to_${endDate}.xlsx`)
  }

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF()
    const title = `Business Report (${startDate} to ${endDate})`
    doc.setFontSize(16)
    doc.text(title, 14, 15)

    autoTable(doc, {
      startY: 25,
      head: [['Date', 'Type', 'Entity', 'Product', 'Amount']],
      body: transactions.map((t) => [
        t.date,
        t.type.toUpperCase(),
        t.entities?.name || '—',
        t.products?.name || '—',
        `₹${Number(t.value).toLocaleString()}`,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold' },
    })

    doc.save(`Report_${startDate}_to_${endDate}.pdf`)
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex justify-between items-center mb-8">
        <button onClick={() => router.back()} className="text-blue-600 font-bold">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">Financial Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase"
          >
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase"
          >
            PDF
          </button>
        </div>
      </header>

      {/* Date Range & Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border">
          <label className="block text-[10px] font-bold text-gray-400 mb-1">DATE RANGE</label>
          <div className="flex gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-sm outline-none w-full"
            />
            <span>-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-sm outline-none w-full"
            />
          </div>
        </div>
        <div className="bg-green-600 p-4 rounded-xl shadow-sm text-white">
          <p className="text-[10px] font-bold opacity-80 uppercase">Total Sales</p>
          <p className="text-xl font-bold">₹{totals.sales.toLocaleString()}</p>
        </div>
        <div className="bg-blue-600 p-4 rounded-xl shadow-sm text-white">
          <p className="text-[10px] font-bold opacity-80 uppercase">Total Purchases</p>
          <p className="text-xl font-bold">₹{totals.purchases.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase">
            <tr>
              <th className="p-4">Date</th>
              <th className="p-4">Entity</th>
              <th className="p-4">Product</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-400">
                  Fetching report...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-500 italic">
                  No transactions found in this date range.
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td className="p-4 text-gray-500">{t.date}</td>
                  <td className="p-4 font-bold">{t.entities?.name || '—'}</td>
                  <td className="p-4">{t.products?.name || '—'}</td>
                  <td
                    className={`p-4 text-right font-bold ${
                      t.type === 'sale' ? 'text-green-600' : 'text-blue-600'
                    }`}
                  >
                    {t.type === 'sale' ? '+' : '-'} ₹{Number(t.value).toLocaleString()}
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