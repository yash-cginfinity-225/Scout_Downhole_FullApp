import { Search } from 'lucide-react'

export default function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative flex items-center max-w-[25rem] w-full">
      <Search size={18} className="absolute left-[0.75rem] text-gray-500 pointer-events-none z-10" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-[2.5rem] pr-[0.875rem] py-[0.625rem] border border-gray-300 rounded-[0.5rem] text-[0.875rem] text-gray-900 bg-white outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
    </div>
  )
}
