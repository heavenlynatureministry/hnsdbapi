function FormInput({ label, error, helperText, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="form-label">{label}</label>}
      <input className={`form-input ${error ? 'error' : ''}`} {...props} />
      {error && <p className="form-error">{error}</p>}
      {helperText && !error && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
    </div>
  )
}

export default FormInput