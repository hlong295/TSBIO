import Link from "next/link"

export default function NewsPage() {
  return (
    <main className="min-h-[60vh] bg-white">
      <div className="container max-w-md mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-green-800">Tin tức</h1>
        <p className="mt-2 text-sm text-gray-600">
          Khu vực Tin tức CMS sẽ được triển khai theo Phase B.
        </p>
        <div className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold bg-green-700 text-white"
          >
            Về Trang chủ
          </Link>
        </div>
      </div>
    </main>
  )
}
