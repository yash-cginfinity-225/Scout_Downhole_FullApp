import { Outlet } from 'react-router-dom'
import Navbar from './Navbar/Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-[1.5rem] py-[1.5rem] max-w-[100rem] w-full mx-auto">
        <Outlet />
      </main>
    </div>
  )
}
