const variants = {
  default: 'bg-gray-200 text-gray-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-800',
  error: 'bg-red-100 text-red-800',
  primary: 'bg-red-100 text-primary',
}

export default function Badge({ children, variant = 'default' }) {
  return (
    <span className={`inline-flex items-center px-[0.5rem] py-[0.125rem] text-[0.6875rem] font-semibold rounded-full uppercase tracking-wide ${variants[variant] || variants.default}`}>
      {children}
    </span>
  )
}
