import { TextareaHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  variant?: 'default' | 'glass'
  fullWidth?: boolean
  resize?: boolean
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  helperText,
  variant = 'default',
  fullWidth = false,
  resize = true,
  className,
  ...props
}, ref) => {
  const baseClasses = 'block px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses = {
    default: 'bg-dark-surface border border-dark-border rounded-xl hover:border-primary-500/50',
    glass: 'input-glass'
  }

  return (
    <div className={clsx(fullWidth && 'w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-200 mb-2">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          fullWidth && 'w-full',
          !resize && 'resize-none',
          error && 'border-red-500 focus:ring-red-500'
        )}
        {...props}
      />
      
      {(error || helperText) && (
        <p className={clsx(
          'mt-1 text-sm',
          error ? 'text-red-400' : 'text-gray-400'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
})

Textarea.displayName = 'Textarea'

export default Textarea