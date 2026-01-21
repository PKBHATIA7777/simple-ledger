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
  const [reportType, setReportType] = useState<'sale' | 'purchase'>('sale')

  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchReportData()
  }, [startDate, endDate, reportType])

  async function fetchReportData() {
    setLoading(true)
    const { data, error } = await supabase
      .from('transactions')
      .select('*, entities(name), products(name)')
      .eq('type', reportType)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })

    if (error) {
      toast.error(`Failed to load ${reportType} report`)
      setTransactions([])
    } else {
      console.log("Fetched transactions:", data);
      setTransactions(data || [])
      
      data?.forEach((t, i) => {
        if (!t.products?.id) {
          console.warn(`Transaction ${i + 1}: Missing products.id →`, t);
        }
        if (!t.entities?.id) {
          console.warn(`Transaction ${i + 1}: Missing entities.id →`, t);
        }
      });
    }
    setLoading(false)
  }

  // === FIXED Grouping and Sorting Logic (Robust Version) ===
  const groupedData = (() => {
    if (!transactions.length) return { products: [], grandTotal: 0 };

    const productMap: Record<string, any> = {};
    let grandTotal = 0;

    transactions.forEach((t) => {
      const productId = t.products?.id ?? 'unknown_' + Math.random().toString(36).substr(2, 9);
      const productName = t.products?.name?.trim() || 'Unknown Product';
      const entityId = t.entities?.id ?? 'unknown_' + Math.random().toString(36).substr(2, 9);
      const entityName = t.entities?.name?.trim() || 'Unknown Entity';
      const amount = Number(t.value);

      grandTotal += amount;

      if (!productMap[productId]) {
        productMap[productId] = {
          name: productName,
          totalAmount: 0,
          entities: {}
        };
      }

      productMap[productId].totalAmount += amount;

      if (!productMap[productId].entities[entityId]) {
        productMap[productId].entities[entityId] = {
          name: entityName,
          amount: 0,
          count: 0
        };
      }
      productMap[productId].entities[entityId].amount += amount;
      productMap[productId].entities[entityId].count += 1;
    });

    const sortedProducts = Object.values(productMap)
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .map((product) => ({
        ...product,
        entities: Object.values(product.entities).sort((a: any, b: any) => b.amount - a.amount)
      }));

    return { products: sortedProducts, grandTotal };
  })();

  // === Updated Excel Export Function ===
  const exportToExcel = () => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const reportMonth = monthNames[new Date(startDate).getMonth()];
    const reportYear = new Date(startDate).getFullYear();
    const reportHeading = `${reportType === 'sale' ? 'Sales' : 'Purchase'} - ${reportMonth} ${reportYear}`;

    const summaryRows = [
      [reportHeading],
      [`Total ${reportType === 'sale' ? 'Sales' : 'Purchases'}: Rs. ${groupedData.grandTotal}`],
      [],
      ['S.No', 'Product Name', 'Total Amount'],
      ...groupedData.products.map((p, i) => [i + 1, p.name, `Rs. ${p.totalAmount}`])
    ];

    const detailRows: any[] = [[]];

    groupedData.products.forEach((product) => {
      detailRows.push([]);
      detailRows.push([product.name]); // ← Only product name
      detailRows.push(['S.No', reportType === 'sale' ? 'Customer Name' : 'Vendor Name', 'Amount']);
      
      product.entities.forEach((ent: any, index: number) => {
        const amountDisplay = ent.count > 1 
          ? `Rs. ${ent.amount.toLocaleString()} (${ent.count})` 
          : `Rs. ${ent.amount}`;
        detailRows.push([index + 1, ent.name, amountDisplay]);
      });
    });

    const finalData = [...summaryRows, ...detailRows];
    const worksheet = XLSX.utils.aoa_to_sheet(finalData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, `${reportHeading.replace(/\s+/g, '_')}.xlsx`);
  }

  const exportToPDF = () => {
    const doc = new jsPDF();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    
    const reportMonth = monthNames[new Date(startDate).getMonth()];
    const reportYear = new Date(startDate).getFullYear();
    const title = `${reportType === 'sale' ? 'Sales' : 'Purchase'} - ${reportMonth} ${reportYear}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 15);
    doc.setFontSize(12);
    doc.text(`Total ${reportType === 'sale' ? 'Sales' : 'Purchases'}: Rs. ${groupedData.grandTotal.toLocaleString()}`, 14, 22);

    autoTable(doc, {
      startY: 30,
      head: [['S.No', 'Product Name', 'Total Amount']],
      body: groupedData.products.map((p: any, index: number) => [
        index + 1,
        p.name,
        `Rs. ${p.totalAmount.toLocaleString()}`
      ]),
      headStyles: { fillColor: [75, 85, 99], textColor: [255, 255, 255] },
      margin: { bottom: 10 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 15;

    groupedData.products.forEach((product: any) => {
      if (finalY > 240) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(product.name, 14, finalY); // ← Only product name

      autoTable(doc, {
        startY: finalY + 5,
        head: [['S.No', reportType === 'sale' ? 'Customer Name' : 'Vendor Name', 'Amount']],
        body: product.entities.map((ent: any, index: number) => [
          index + 1,
          ent.name,
          ent.count > 1 
            ? `Rs. ${ent.amount.toLocaleString()} (${ent.count})` 
            : `Rs. ${ent.amount.toLocaleString()}`
        ]),
        headStyles: { fillColor: [209, 213, 219], textColor: [0, 0, 0] },
        styles: { fontSize: 10 },
        margin: { bottom: 15 }
      });

      finalY = (doc as any).lastAutoTable.finalY + 15;
    });

    doc.save(`${title.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <button onClick={() => router.back()} className="text-blue-600 font-bold mb-2 block">
            ← Back
          </button>
          <h1 className="text-2xl font-bold capitalize">{reportType} Reports</h1>
        </div>

        {/* Report Type Selector */}
        <div className="flex bg-white border rounded-xl p-1 shadow-sm">
          <button
            onClick={() => setReportType('sale')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              reportType === 'sale' ? 'bg-green-600 text-white' : 'text-gray-500'
            }`}
          >
            Sales
          </button>
          <button
            onClick={() => setReportType('purchase')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              reportType === 'purchase' ? 'bg-blue-600 text-white' : 'text-gray-500'
            }`}
          >
            Purchases
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportToExcel}
            className="p-2 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase"
          >
            Download Excel
          </button>
          <button
            onClick={exportToPDF}
            className="p-2 bg-red-100 text-red-700 rounded-lg text-xs font-bold uppercase"
          >
            Download PDF
          </button>
        </div>
      </header>

      {/* Date Range & Summary Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
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
        <div
          className={`p-4 rounded-xl shadow-sm text-white ${
            reportType === 'sale' ? 'bg-green-600' : 'bg-blue-600'
          }`}
        >
          <p className="text-[10px] font-bold opacity-80 uppercase">
            Total {reportType === 'sale' ? 'Sales' : 'Purchases'}
          </p>
          <p className="text-xl font-bold">Rs. {groupedData.grandTotal.toLocaleString()}</p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase">
            <tr>
              <th className="p-4">S.No</th>
              <th className="p-4">{reportType === 'sale' ? 'Customer' : 'Vendor'}</th>
              <th className="p-4">Product</th>
              <th className="p-4 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-400">
                  Fetching {reportType} report...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-500 italic">
                  No {reportType} transactions found in this date range.
                </td>
              </tr>
            ) : (
              transactions.map((t, index) => (
                <tr key={t.id}>
                  <td className="p-4 text-gray-500">{index + 1}</td>
                  <td className="p-4 font-bold">{t.entities?.name || '—'}</td>
                  <td className="p-4">{t.products?.name || '—'}</td>
                  <td className={`p-4 text-right font-bold`}>
                    Rs. {Number(t.value).toLocaleString()}
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