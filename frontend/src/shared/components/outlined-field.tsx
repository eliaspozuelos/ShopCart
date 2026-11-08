import { Eye, EyeOff } from 'lucide-react'
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
      {shown ? <EyeOff /> : <Eye />}
    </button>
  )
}

