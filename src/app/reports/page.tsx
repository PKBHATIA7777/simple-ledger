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
        // Split data based on the 'type' column
        const sales = transactions.filter((t: any) => t.type === 'sale')
        const purchases = transactions.filter((t: any) => t.type === 'purchase')

        setSalesData(sales)
        setPurchaseData(purchases)
        setData(transactions) // Keeping original state for backward compatibility
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
        // Update all three states to stay in sync
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
    // Prepare Sales Data
    const excelSales = salesData.map((item) => ({
      Product: item.products?.name,
      Entity: item.entities?.name,
      Value: item.value,
      Date: item.date,
    }))

    // Prepare Purchase Data
    const excelPurchases = purchaseData.map((item) => ({
      Product: item.products?.name,
      Entity: item.entities?.name,
      Value: item.value,
      Date: item.date,
    }))

    const wb = utils.book_new()
    
    // Add Sales Sheet
    const wsSales = utils.json_to_sheet(excelSales)
    utils.book_append_sheet(wb, wsSales, 'Sales')

    // Add Purchase Sheet
    const wsPurchases = utils.json_to_sheet(excelPurchases)
    utils.book_append_sheet(wb, wsPurchases, 'Purchases')

    const fileName = `Business_Report_${selectedMonth}.xlsx`
    writeFile(wb, fileName)
  }

  const exportToPDF = () => {
    const doc = new jsPDF()
    const dateObj = new Date(selectedMonth + '-01')
    const monthName = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    doc.setFontSize(18)
    doc.text(`Monthly Business Report - ${monthName}`, 14, 15)

    // --- Sales Table ---
    doc.setFontSize(14)
    doc.setTextColor(21, 128, 61) // Green for Sales
    doc.text('Sales Report', 14, 25)
    
    autoTable(doc, {
      startY: 28,
      head: [['Product', 'Customer', 'Value', 'Date']],
      body: salesData.map((item) => [
        item.products?.name || '—',
        item.entities?.name || '—',
        `INR ${Number(item.value).toLocaleString()}`,
        item.date
      ]),
    })

    // --- Purchase Table ---
    const finalY = (doc as any).lastAutoTable.finalY || 30
    doc.setFontSize(14)
    doc.setTextColor(185, 28, 28) // Red for Purchase
    doc.text('Purchase Report', 14, finalY + 15)

    autoTable(doc, {
      startY: finalY + 18,
      head: [['Product', 'Vendor', 'Value', 'Date']],
      body: purchaseData.map((item) => [
        item.products?.name || '—',
        item.entities?.name || '—',
        `INR ${Number(item.value).toLocaleString()}`,
        item.date
      ]),
    })

    const fileName = `Report_${selectedMonth}.pdf`
    doc.save(fileName)
  }

  /* =======================
     GROUPING LOGIC (UI) - Updated
  ======================= */

  // Grouping helper function to avoid repetition
  const groupTransactions = (transactions: any[]) => {
    return transactions.reduce((acc: any, item: any) => {
      const category = item.products?.name || 'Unknown'
      if (!acc[category]) acc[category] = { items: [], total: 0 }

      acc[category].items.push(item)
      acc[category].total += Number(item.value)

      return acc
    }, {})
  }

  // Create two separate grouped objects
  const groupedSales = groupTransactions(salesData)
  const groupedPurchases = groupTransactions(purchaseData)

  // Calculate grand totals for quick reference in the UI
  const totalSales = salesData.reduce((sum, item) => sum + Number(item.value), 0)
  const totalPurchases = purchaseData.reduce((sum, item) => sum + Number(item.value), 0)

  const displayMonth = new Date(selectedMonth + '-01').toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Helper function to render grouped tables
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
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto bg-white min-h-screen">
      {/* Header Section */}
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

      {/* SALES SECTION */}
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

      {/* PURCHASE SECTION */}
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
    </div>
  )
}