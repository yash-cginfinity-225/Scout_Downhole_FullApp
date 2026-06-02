export default function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  className = '',
  ...props
}) {
  return (
    <div className={`flex flex-col gap-[0.375rem] w-full ${className}`}>
      {label && <label className="text-[0.875rem] font-medium text-gray-700">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`px-[0.875rem] py-[0.625rem] border rounded-[0.5rem] text-[0.875rem] text-gray-900 bg-white outline-none transition-all duration-200 focus:border-primary focus:ring-2 focus:ring-primary/10 ${error ? 'border-red-500 focus:ring-red-500/10' : 'border-gray-300'}`}
        {...props}
      />
      {error && <span className="text-[0.75rem] text-red-500">{error}</span>}
    </div>
  )
}
