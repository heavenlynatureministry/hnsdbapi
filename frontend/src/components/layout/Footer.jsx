import { Heart } from 'lucide-react'

function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          &copy; {new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Nurturing Right Leaders</span>
          <span className="hidden sm:inline">•</span>
          <span>v2.0.0</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer