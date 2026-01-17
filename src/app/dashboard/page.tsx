import Link from 'next/link'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <header className="mb-8">
        <h1 className="text-xl font-bold text-gray-800">Parth Enterprises</h1>
        <p className="text-sm text-gray-500">Business Overview</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sales Action */}
        <Link href="/entry/sale" className="p-6 bg-green-600 rounded-2xl shadow-sm hover:shadow-md transition text-white">
          <h2 className="text-lg font-bold">Sales Record</h2>
          <p className="text-green-100 text-sm">Money coming in</p>
          <div className="mt-4 text-2xl">→</div>
        </Link>

        {/* Purchase Action */}
        <Link href="/entry/purchase" className="p-6 bg-blue-600 rounded-2xl shadow-sm hover:shadow-md transition text-white">
          <h2 className="text-lg font-bold">Purchase Record</h2>
          <p className="text-blue-100 text-sm">Money going out</p>
          <div className="mt-4 text-2xl">→</div>
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-3 gap-2">
        <Link href="/reports" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">Reports</Link>
        <Link href="/entities" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">Contacts</Link>
        <Link href="/products" className="p-4 bg-white border rounded-xl text-center text-sm font-medium">Products</Link>
      </div>
    </div>
  )
}