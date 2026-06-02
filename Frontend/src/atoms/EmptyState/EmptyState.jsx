export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-[3.75rem] px-[1.25rem] text-center">
      {icon && <div className="text-[3rem] mb-[1rem] text-gray-400">{icon}</div>}
      <h3 className="text-[1.125rem] font-semibold text-gray-700 mb-[0.5rem]">{title || 'No Data Available'}</h3>
      {description && <p className="text-[0.875rem] text-gray-500 max-w-[25rem]">{description}</p>}
    </div>
  )
}
