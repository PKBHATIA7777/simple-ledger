'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [data, setData] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    const fetchReport = async () => {
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`*, entities(name), products(name)`)
        .order('date', { ascending: false })

      if (transactions) setData(transactions)
    }

    fetchReport()
  }, [])

  /* =======================
     EXPORT LOGIC
  ======================= */

  const exportToExcel = () => {
    const excelData = data.map(item => ({
      Product: item.products?.name,
      Entity: item.entities?.name,
      Value: item.value,
      Date: item.date,
    }))

    const ws = utils.json_to_sheet(excelData)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'November Report')
    writeFile(wb, 'Business_Report_Nov.xlsx')
  }

  const exportToPDF = () => {
    const doc = new jsPDF()

    doc.text('Monthly Sales Report - November 2025', 14, 12)

    autoTable(doc, {
      startY: 18,
      head: [['Product', 'Entity', 'Value']],
      body: data.map(item => [
        item.products?.name,
        item.entities?.name,
        Number(item.value).toLocaleString(),
      ]),
    })

    doc.save('Business_Report_Nov.pdf')
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

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-xl font-bold">Report: November 2025</h1>

        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export Excel
          </button>

          <button
            onClick={exportToPDF}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      {Object.keys(groupedData).map(category => (
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
                <tr key={entry.id} className="border-t">
                  <td className="p-3 text-gray-600">
                    {entry.entities?.name}
                  </td>
                  <td className="p-3 text-right text-gray-900 font-medium">
                    {Number(entry.value).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
