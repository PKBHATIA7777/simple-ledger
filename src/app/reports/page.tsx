// src/app/reports/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [data, setData] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g., "2026-01"
  )
  const supabase = createClient()

  useEffect(() => {
    const fetchReport = async () => {
      const startDate = `${selectedMonth}-01`
      const endDate = `${selectedMonth}-31`

      const { data: transactions } = await supabase
        .from('transactions')
        .select(`*, entities(name), products(name)`)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (transactions) setData(transactions)
    }

    fetchReport()
  }, [selectedMonth])

  /* =======================
     DELETE LOGIC
  ======================= */

  async function deleteTransaction(id: string) {
    if (confirm('Are you sure you want to delete this entry?')) {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)

      if (!error) {
        setData((prevData) => prevData.filter((item) => item.id !== id))
      } else {
        alert('Error deleting transaction')
      }
    }
  }

  /* =======================
     EXPORT LOGIC
  ======================= */

  const exportToExcel = () => {
    const excelData = data.map((item) => ({
      Product: item.products?.name,
      Entity: item.entities?.name,
      Value: item.value,
      Date: item.date,
    }))

    const ws = utils.json_to_sheet(excelData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Monthly Report')

    const fileName = `Report_${selectedMonth}.xlsx`
    writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    const dateObj = new Date(selectedMonth + '-01')
    const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })
    doc.text(`Monthly Sales Report - ${monthName}`, 14, 12)

    autoTable(doc, {
      startY: 18,
      head: [['Product', 'Entity', 'Value']],
      body: data.map((item) => [
        item.products?.name || '—',
        item.entities?.name || '—',
        Number(item.value).toLocaleString(),
      ]),
    })

    const fileName = `Report_${selectedMonth}.pdf`
    doc.save(fileName)
  }

  /* =======================
     GROUPING LOGIC (UI)
  ======================= */

  const groupedData = data.reduce((acc: any, item: any) => {
    const category = item.products?.name || 'Unknown'
    if (!acc[category]) acc[category] = { items: [], total: 0 }

    acc[category].items.push(item)
    acc[category].total += Number(item.value)

    return acc
  }, {})

  const displayMonth = new Date(selectedMonth + '-01').toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold">Business Report</h1>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="mt-1 p-2 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition"
          >
            Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
          >
            Export PDF
          </button>
        </div>
      </div>

      {Object.keys(groupedData).length > 0 ? (
        Object.keys(groupedData).map((category) => (
          <div key={category} className="mb-8 border rounded-lg overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 font-bold text-gray-700">{category}</th>
                  <th className="p-3 text-right font-bold text-gray-700">
                    {groupedData[category].total.toLocaleString()}
                  </th>
                </tr>
              </thead>

              <tbody>
                {groupedData[category].items.map((entry: any) => (
                  <tr key={entry.id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-600">
                      <div className="text-xs text-gray-400 mb-1">{entry.date}</div>
                      {entry.entities?.name || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <div className="text-gray-900 font-medium">
                        ₹{Number(entry.value).toLocaleString()}
                      </div>
                      <button
                        onClick={() => deleteTransaction(entry.id)}
                        className="text-[10px] text-red-400 hover:text-red-600 font-bold uppercase mt-1"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p className="text-gray-500 italic">No transactions found for {displayMonth}.</p>
      )}
    </div>
  )
}