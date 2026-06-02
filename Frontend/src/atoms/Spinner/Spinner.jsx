const sizeClasses = {
  sm: 'w-[1rem] h-[1rem] border-2',
  md: 'w-[2rem] h-[2rem] border-[3px]',
  lg: 'w-[3rem] h-[3rem] border-[3px]',
}

export default function Spinner({ size = 'md' }) {
  return (
    <div className={`${sizeClasses[size] || sizeClasses.md} border-gray-300 border-t-primary rounded-full animate-spin`}
      style={{ borderTopColor: '#C8102E' }}
    ></div>
  )
}
