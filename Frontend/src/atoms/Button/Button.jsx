const baseClasses = 'inline-flex items-center justify-center gap-[0.5rem] font-semibold border-none rounded-[0.5rem] cursor-pointer transition-all duration-200 whitespace-nowrap'

const variantClasses = {
  primary: 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50',
  secondary: 'bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50',
  outline: 'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white disabled:opacity-50',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-200 disabled:opacity-50',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
}

const sizeClasses = {
  sm: 'px-[0.75rem] py-[0.375rem] text-[0.75rem]',
  md: 'px-[1.25rem] py-[0.625rem] text-[0.875rem]',
  lg: 'px-[1.75rem] py-[0.875rem] text-[1rem]',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  type = 'button',
  className = '',
  ...props
}) {
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClasses[variant] || variantClasses.primary} ${sizeClasses[size] || sizeClasses.md} disabled:cursor-not-allowed ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
