'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[#F1F4FE] text-center">
      <h2 className="text-3xl font-bold text-[#4067EC] mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-6">We encountered an error while loading this page</p>
      <button
        className="px-6 py-3 bg-[#4067EC] text-white font-bold rounded transition-all duration-300 hover:bg-[#3155d4] hover:shadow-md cursor-pointer"
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Try again
      </button>
    </div>
  )
} 