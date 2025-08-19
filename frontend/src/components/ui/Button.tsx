import { ButtonHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className,
  disabled,
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 transform focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-dark-bg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'

  const variantClasses = {
    primary: 'bg-gradient-primary text-white hover:shadow-neon hover:scale-[1.02] active:scale-[0.98]',
    secondary: 'bg-dark-surface text-white border border-dark-border hover:bg-dark-card hover:border-primary-500/50',
    ghost: 'text-gray-300 hover:text-white hover:bg-white/10',
    danger: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-lg',
    glass: 'glassmorphism-dark text-white hover:bg-white/10 border border-white/20'
  }

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-5 h-5'
  }

  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <div className={clsx(
            'animate-spin border-2 border-current border-t-transparent rounded-full mr-2',
            iconSizeClasses[size]
          )} />
          Loading...
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <span className={clsx('mr-2', iconSizeClasses[size])}>
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className={clsx('ml-2', iconSizeClasses[size])}>
              {icon}
            </span>
          )}
        </>
      )}
    </button>
  )
})

Button.displayName = 'Button'

export default Button