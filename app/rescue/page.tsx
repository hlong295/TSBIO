import Link from "next/link"

export default function RescuePage() {
  return (
    <main className="min-h-[60vh] bg-white">
      <div className="container max-w-md mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-green-800">Cứu vườn</h1>
        <p className="mt-2 text-sm text-gray-600">
          Khu vực này sẽ kết nối hỗ trợ kỹ thuật và nhật ký cứu vườn.
        </p>
        <div className="mt-4">
          <Link
            href="/support-experts"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-[#f4af47] text-white"
          >
            Mở hỗ trợ kỹ thuật
          </Link>
        </div>
      </div>
    </main>
  )
}
