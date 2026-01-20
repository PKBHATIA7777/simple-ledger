// src/app/reports/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { utils, writeFile } from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export default function ReportsPage() {
  const [data, setData] = useState<any[]>([])
  const [salesData, setSalesData] = useState<any[]>([])
  const [purchaseData, setPurchaseData] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // e.g., "2026-01"
  )
  const [exportType, setExportType] = useState<'all' | 'sale' | 'purchase'>('all')
  const supabase = createClient()

  useEffect(() => {
    const fetchReport = async () => {
      const startDate = `${selectedMonth}-01`
      const endDate = `${selectedMonth}-31`

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`*, entities(name), products(name)`)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error fetching transactions:', error)
        return
      }

      if (transactions) {
        const sales = transactions.filter((t: any) => t.type === 'sale')
        const purchases = transactions.filter((t: any) => t.type === 'purchase')

        setSalesData(sales)
        setPurchaseData(purchases)
        setData(transactions)
      }
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
        setData((prev) => prev.filter((item) => item.id !== id))
        setSalesData((prev) => prev.filter((item) => item.id !== id))
        setPurchaseData((prev) => prev.filter((item) => item.id !== id))
      } else {
        alert('Error deleting transaction')
      }
    }
  }

  /* =======================
     EXPORT LOGIC - UPDATED
  ======================= */

  const exportToExcel = () => {
    const wb = utils.book_new()

    // Helper to map data without the 'Date' field
    const mapData = (items: any[]) =>
      items.map((item) => ({
        Product: item.products?.name || '—',
        Entity: item.entities?.name || '—',
        Value: item.value,
      }))

    // Conditionally add Sales sheet
    if (exportType === 'all' || exportType === 'sale') {
      const wsSales = utils.json_to_sheet(mapData(salesData))
      utils.book_append_sheet(wb, wsSales, 'Sales')
    }

    // Conditionally add Purchase sheet
    if (exportType === 'all' || exportType === 'purchase') {
      const wsPurchases = utils.json_to_sheet(mapData(purchaseData))
      utils.book_append_sheet(wb, wsPurchases, 'Purchases')
    }

    // Dynamic filename based on selection
    const typeLabel = exportType === 'all' ? 'Full' : exportType === 'sale' ? 'Sales' : 'Purchases'
    const fileName = `${typeLabel}_Report_${selectedMonth}.xlsx`

    writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const dateObj = new Date(selectedMonth + '-01')
    const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    doc.setFontSize(18)
    doc.text(`Monthly Business Report - ${monthName}`, 14, 15)

    let currentY = 25

    // --- Sales Table (Conditional) ---
    if (exportType === 'all' || exportType === 'sale') {
      doc.setFontSize(14)
      doc.setTextColor(21, 128, 61)
      doc.text('Sales Report', 14, currentY)

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Product', 'Customer', 'Value']],
        body: salesData.map((item) => [
          item.products?.name || '—',
          item.entities?.name || '—',
          `INR ${Number(item.value).toLocaleString()}`,
        ]),
      })
      currentY = (doc as any).lastAutoTable.finalY + 15
    }

    // --- Purchase Table (Conditional) ---
    if (exportType === 'all' || exportType === 'purchase') {
      doc.setFontSize(14)
      doc.setTextColor(185, 28, 28)
      doc.text('Purchase Report', 14, currentY)

      autoTable(doc, {
        startY: currentY + 3,
        head: [['Product', 'Vendor', 'Value']],
        body: purchaseData.map((item) => [
          item.products?.name || '—',
          item.entities?.name || '—',
          `INR ${Number(item.value).toLocaleString()}`,
        ]),
      })
    }

    const typeLabel = exportType === 'all' ? 'Full' : exportType === 'sale' ? 'Sales' : 'Purchases'
    const fileName = `${typeLabel}_Report_${selectedMonth}.pdf`
    doc.save(fileName)
  }

  /* =======================
     GROUPING LOGIC (UI)
  ======================= */

  const groupTransactions = (transactions: any[]) => {
    return transactions.reduce((acc: any, item: any) => {
      const category = item.products?.name || 'Unknown'
      if (!acc[category]) acc[category] = { items: [], total: 0 }

      acc[category].items.push(item)
      acc[category].total += Number(item.value)

      return acc
    }, {})
  }

  const groupedSales = groupTransactions(salesData)
  const groupedPurchases = groupTransactions(purchaseData)

  const totalSales = salesData.reduce((sum, item) => sum + Number(item.value), 0)
  const totalPurchases = purchaseData.reduce((sum, item) => sum + Number(item.value), 0)

  const displayMonth = new Date(selectedMonth + '-01').toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  function renderTables(groupedObj: any) {
    return Object.keys(groupedObj).map((category) => (
      <div key={category} className="mb-6 border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 font-bold text-gray-700">{category}</th>
              <th className="p-3 text-right font-bold text-gray-700">
                ₹{groupedObj[category].total.toLocaleString()}
              </th>
            </tr>
          </thead>
          <tbody>
            {groupedObj[category].items.map((entry: any) => (
              <tr key={entry.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-3 text-gray-600">{entry.entities?.name || '—'}</td>
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
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
        <div>
          <h1 className="text-xl font-bold">Business Report</h1>
          <div className="flex gap-2 mt-1">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="p-2 border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={exportType}
              onChange={(e) => setExportType(e.target.value as any)}
              className="p-2 border rounded-lg text-sm font-medium bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Export: All</option>
              <option value="sale">Export: Sales Only</option>
              <option value="purchase">Export: Purchases Only</option>
            </select>
          </div>
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

      {/* SALES SECTION */}
      {(exportType === 'all' || exportType === 'sale') && (
        <section className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-black text-green-700 uppercase tracking-tight">Sales Report</h2>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-bold uppercase">Total Sales</p>
              <p className="text-xl font-bold text-gray-900">₹{totalSales.toLocaleString()}</p>
            </div>
          </div>

          {Object.keys(groupedSales).length > 0 ? (
            renderTables(groupedSales)
          ) : (
            <p className="text-gray-500 italic border rounded-lg p-4 bg-gray-50">
              No sales recorded for {displayMonth}.
            </p>
          )}
        </section>
      )}

      {/* PURCHASE SECTION */}
      {(exportType === 'all' || exportType === 'purchase') && (
        <section className="mb-12">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-2xl font-black text-red-700 uppercase tracking-tight">Purchase Report</h2>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-bold uppercase">Total Purchases</p>
              <p className="text-xl font-bold text-gray-900">₹{totalPurchases.toLocaleString()}</p>
            </div>
          </div>

          {Object.keys(groupedPurchases).length > 0 ? (
            renderTables(groupedPurchases)
          ) : (
            <p className="text-gray-500 italic border rounded-lg p-4 bg-gray-50">
              No purchases recorded for {displayMonth}.
            </p>
          )}
        </section>
      )}
    </div>
  )
}