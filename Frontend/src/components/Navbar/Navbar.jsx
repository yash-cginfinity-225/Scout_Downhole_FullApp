import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Upload, Settings, ChevronDown } from 'lucide-react'
import Button from '../../atoms/Button/Button'

const CATEGORIES = {
  Baker: [
    { path: '/bha-extracted', label: 'Performance Report' },
  ],
  Halliburton: [
    { path: '/bha-tally', label: 'BHA Tally' },
    { path: '/bha-report', label: 'BHA Report' },
    { path: '/motor-performance', label: 'Motor Performance Report' },
  ],
  'Scout Reports': [
    { path: '/scout-bha-report', label: 'BHA Report' },
    { path: '/scout-failure-report', label: 'Failure Report' },
    { path: '/scout-motor-performance', label: 'Motor Performance' },
  ],
}

function NavDropdown({ label, items }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = items.some(item => location.pathname === item.path)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-[0.375rem] px-[0.875rem] py-[0.5rem] text-[0.8125rem] font-medium rounded-[0.5rem] whitespace-nowrap transition-all duration-200 cursor-pointer ${isActive ? 'text-white bg-primary hover:bg-primary-dark' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-[0.4rem] min-w-[12.5rem] max-w-[20rem] bg-gray-900 border border-gray-700 rounded-[0.5rem] shadow-xl z-50 overflow-hidden">
          {items.map(({ path, label: itemLabel }) => (
            <button
              key={path}
              onClick={() => { navigate(path); setOpen(false) }}
              className={`w-full text-left px-[1rem] py-[0.625rem] text-[0.8125rem] font-medium transition-colors duration-150 cursor-pointer ${location.pathname === path ? 'text-white bg-primary' : 'text-gray-300 hover:text-white hover:bg-gray-800'}`}
            >
              {itemLabel}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center gap-[1.5rem] px-[1.5rem] h-[4rem] bg-dark text-white shadow-lg sticky top-0 z-50">
      <div className="flex flex-col shrink-0">
        <span className="text-[1.25rem] font-extrabold text-primary tracking-widest">SCOUT</span>
        <span className="text-[0.5625rem] text-gray-500 tracking-wide -mt-[0.125rem]">Steering Downhole Innovation</span>
      </div>

      <div className="flex items-center gap-[0.5rem] flex-1 px-[0.5rem]">
        <NavLink
          to="/files"
          className={({ isActive }) =>
            `flex items-center gap-[0.375rem] px-[0.875rem] py-[0.5rem] text-[0.8125rem] font-medium rounded-[0.5rem] whitespace-nowrap transition-all duration-200 ${isActive ? 'text-white bg-primary hover:bg-primary-dark' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          <Upload size={16} />
          <span className="max-lg:hidden">File Upload</span>
        </NavLink>

        {Object.entries(CATEGORIES).map(([category, items]) => (
          <NavDropdown key={category} label={category} items={items} />
        ))}

        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-[0.375rem] px-[0.875rem] py-[0.5rem] text-[0.8125rem] font-medium rounded-[0.5rem] whitespace-nowrap transition-all duration-200 ${isActive ? 'text-white bg-primary hover:bg-primary-dark' : 'text-amber-400 hover:text-white hover:bg-gray-800'}`
          }
        >
          <Settings size={16} />
          <span className="max-lg:hidden">Look Up</span>
        </NavLink>
      </div>
    </nav>
  )
}
