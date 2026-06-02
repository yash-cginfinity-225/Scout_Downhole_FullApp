import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LogOut, Upload, Table2, FileBarChart, Settings, Activity } from 'lucide-react'
import Button from '../../atoms/Button/Button'

const NAV_ITEMS = [
  { path: '/files', label: 'File Upload', icon: Upload },
  { path: '/bha-tally', label: 'BHA Tally', icon: Table2 },
  { path: '/bha-report', label: 'BHA Report', icon: FileBarChart },
  { path: '/bha-extracted', label: 'Performance Reports', icon: FileBarChart },
  { path: '/motor-performance', label: 'Motor Performance', icon: Activity },
]

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="flex items-center gap-[1.5rem] px-[1.5rem] h-[4rem] bg-dark text-white shadow-lg sticky top-0 z-50">
      <div className="flex flex-col shrink-0">
        <span className="text-[1.25rem] font-extrabold text-primary tracking-widest">SCOUT</span>
        <span className="text-[0.5625rem] text-gray-500 tracking-wide -mt-[0.125rem]">Steering Downhole Innovation</span>
      </div>

      <div className="flex items-center gap-[0.5rem] flex-1 overflow-x-auto px-[0.5rem]">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-[0.375rem] px-[0.875rem] py-[0.5rem] text-[0.8125rem] font-medium rounded-[0.5rem] whitespace-nowrap transition-all duration-200 ${isActive ? 'text-white bg-primary hover:bg-primary-dark' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            <Icon size={16} />
            <span className="max-lg:hidden">{label}</span>
          </NavLink>
        ))}
        {user?.is_admin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-[0.375rem] px-[0.875rem] py-[0.5rem] text-[0.8125rem] font-medium rounded-[0.5rem] whitespace-nowrap transition-all duration-200 ${isActive ? 'text-white bg-primary hover:bg-primary-dark' : 'text-amber-400 hover:text-white hover:bg-gray-800'}`
            }
          >
            <Settings size={16} />
            <span className="max-lg:hidden">Admin</span>
          </NavLink>
        )}
      </div>

      <div className="flex items-center gap-[0.75rem] shrink-0">
        <span className="text-[0.8125rem] font-medium text-gray-400">{user?.username}</span>
        <Button variant="ghost" size="sm" onClick={logout}>
          <LogOut size={16} />
        </Button>
      </div>
    </nav>
  )
}
