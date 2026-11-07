import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

type FieldBase = {
  label: string
  value: string | number
  onChange: (value: string) => void
  end?: ReactNode
}

type OutlinedInputProps = FieldBase & {
  multiline?: false
} & Pick<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'autoComplete' | 'required' | 'minLength' | 'maxLength' | 'min' | 'max' | 'step' | 'inputMode' | 'disabled' | 'name'
>

type OutlinedTextareaProps = FieldBase & {
  multiline: true
} & Pick<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required' | 'minLength' | 'maxLength' | 'disabled' | 'rows' | 'name'>

export function OutlinedField(props: OutlinedInputProps | OutlinedTextareaProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const password = !props.multiline && props.type === 'password'
  const control = props.multiline ? (
    <textarea
      id={id}
      className="outlined-control"
      placeholder=" "
      name={props.name}
      required={props.required}
      minLength={props.minLength}
      maxLength={props.maxLength}
      disabled={props.disabled}
      rows={props.rows}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  ) : (
    <input
      id={id}
      className="outlined-control"
      placeholder=" "
      name={props.name}
      type={password && revealed ? 'text' : props.type}
      autoComplete={props.autoComplete}
      required={props.required}
      minLength={props.minLength}
      maxLength={props.maxLength}
      min={props.min}
      max={props.max}
      step={props.step}
      inputMode={props.inputMode}
      disabled={props.disabled}
      value={props.value}
      onChange={(event) => props.onChange(event.target.value)}
    />
  )

  return (
    <div className="outlined-field">
      {control}
      <label htmlFor={id}>{props.label}</label>
      {password ? <PasswordToggle shown={revealed} onToggle={() => setRevealed((current) => !current)} /> : props.end}
    </div>
  )
}

export function OutlinedSelect({
  label,
  value,
  required,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="outlined-field">
      <select
        id={id}
        className="outlined-control"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
      <label htmlFor={id}>{label}</label>
    </div>
  )
}

function PasswordToggle({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button className="password-toggle" type="button" aria-label={shown ? 'Ocultar contraseña' : 'Ver contraseña'} aria-pressed={shown} onClick={onToggle}>
      {shown ? <EyeOffIcon /> : <EyeIcon />}
    </button>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.5 12S6.2 6.5 12 6.5 21.5 12 21.5 12 17.8 17.5 12 17.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4.5l18 15" />
      <path d="M9.4 9.7A3 3 0 0 0 12 15a3 3 0 0 0 2.6-1.5" />
      <path d="M6.2 7.2C4 8.7 2.5 12 2.5 12S6.2 17.5 12 17.5c1.4 0 2.7-.3 3.8-.8" />
      <path d="M10.2 6.7A9.6 9.6 0 0 1 12 6.5c5.8 0 9.5 5.5 9.5 5.5a16 16 0 0 1-3.1 3.4" />
    </svg>
  )
}
