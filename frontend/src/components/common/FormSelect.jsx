function FormSelect({ label, error, options = [], className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label className="form-label">{label}</label>}
      <select className={`form-input ${error ? 'error' : ''}`} {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}

export default FormSelect