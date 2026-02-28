'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

// ─── FormField wrapper ────────────────────────────────────────────────────────

interface FormFieldProps {
  children: React.ReactNode
  className?: string
}

function FormField({ children, className }: FormFieldProps) {
  return <div className={cn('flex flex-col gap-1', className)}>{children}</div>
}

// ─── Label ────────────────────────────────────────────────────────────────────

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn('text-sm font-medium text-[#374151] dark:text-[#D1D5DB]', className)}
      {...props}
    >
      {children}
      {required && <span className="text-[#DC2626] ml-0.5" aria-hidden="true">*</span>}
    </label>
  )
}

// ─── Description ──────────────────────────────────────────────────────────────

function FormDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-xs text-[#6B7280] dark:text-[#9CA3AF]', className)} {...props}>
      {children}
    </p>
  )
}

// ─── Error ────────────────────────────────────────────────────────────────────

function FormError({ children, className, id, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  if (!children) return null
  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className={cn('text-xs text-[#DC2626] dark:text-[#FCA5A5]', className)}
      {...props}
    >
      {children}
    </p>
  )
}

// ─── TextInput ────────────────────────────────────────────────────────────────

export interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  leadingIcon?: React.ReactNode
  trailingIcon?: React.ReactNode
}

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ error, leadingIcon, trailingIcon, className, id, ...props }, ref) => {
    const errorId = error && id ? `${id}-error` : undefined

    return (
      <>
        <div className="relative">
          {leadingIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            aria-describedby={errorId}
            aria-invalid={!!error}
            className={cn(
              'w-full h-10 rounded-md border px-3 text-base',
              'bg-white dark:bg-[#111827]',
              'text-[#111827] dark:text-[#F9FAFB]',
              'placeholder:text-[#9CA3AF]',
              'transition-colors duration-100',
              error
                ? 'border-[#DC2626] focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-1'
                : 'border-[#D1D5DB] dark:border-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#0A7AFF] focus:ring-offset-1',
              'disabled:bg-[#F9FAFB] dark:disabled:bg-[#1F2937] disabled:cursor-not-allowed disabled:opacity-60',
              leadingIcon && 'pl-10',
              trailingIcon && 'pr-10',
              className
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
              {trailingIcon}
            </span>
          )}
        </div>
        {error && <FormError id={errorId}>{error}</FormError>}
      </>
    )
  }
)
TextInput.displayName = 'TextInput'

// ─── PhoneInput ───────────────────────────────────────────────────────────────

export interface PhoneInputProps extends Omit<TextInputProps, 'type'> {
  countryCode?: string
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ countryCode = '+243', className, ...props }, ref) => {
    return (
      <div className="flex gap-0">
        <span className="inline-flex items-center h-10 px-3 rounded-l-md border border-r-0 border-[#D1D5DB] dark:border-[#4B5563] bg-[#F9FAFB] dark:bg-[#1F2937] text-sm text-[#374151] dark:text-[#D1D5DB] font-mono select-none">
          {countryCode}
        </span>
        <TextInput
          ref={ref}
          type="tel"
          className={cn('rounded-l-none', className)}
          {...props}
        />
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

// ─── OTP Input ────────────────────────────────────────────────────────────────

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
  error?: string
  disabled?: boolean
}

function OtpInput({ value, onChange, length = 6, error, disabled }: OtpInputProps) {
  const inputRefs = React.useRef<Array<HTMLInputElement | null>>([])

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return

    const newValue = value.split('')
    newValue[index] = char[char.length - 1] ?? ''
    const joined = newValue.join('')
    onChange(joined.slice(0, length))

    // Move focus forward
    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(pasted.padEnd(length, '').slice(0, length))
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus()
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputRefs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ''}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={disabled}
            aria-label={`OTP digit ${i + 1}`}
            className={cn(
              'w-12 h-12 text-center text-xl font-mono rounded-md border',
              'focus:outline-none focus:ring-2 focus:ring-[#0A7AFF]',
              error
                ? 'border-[#DC2626]'
                : 'border-[#D1D5DB] dark:border-[#4B5563]',
              'bg-white dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          />
        ))}
      </div>
      {error && <FormError>{error}</FormError>}
    </div>
  )
}

// ─── PasswordInput ────────────────────────────────────────────────────────────

function EyeOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12C1 12 5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function EyeClosedIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export interface PasswordInputProps extends Omit<TextInputProps, 'type' | 'trailingIcon'> {
  showToggleLabel?: string
  hideToggleLabel?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showToggleLabel = 'Show password', hideToggleLabel = 'Hide password', ...props }, ref) => {
    const [visible, setVisible] = React.useState(false)

    return (
      <TextInput
        ref={ref}
        type={visible ? 'text' : 'password'}
        trailingIcon={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="text-[#9CA3AF] hover:text-[#6B7280] dark:hover:text-[#D1D5DB] transition-colors cursor-pointer"
            aria-label={visible ? hideToggleLabel : showToggleLabel}
            tabIndex={-1}
          >
            {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
          </button>
        }
        {...props}
      />
    )
  }
)
PasswordInput.displayName = 'PasswordInput'

export { FormField, FormLabel, FormDescription, FormError, TextInput, PasswordInput, PhoneInput, OtpInput }
