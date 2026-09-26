import { useEffect, useState } from 'react'
import { Autocomplete, TextField } from '@mui/material'
import { companiesApi, type Company } from '../api/resources'

type Option = Pick<Company, 'id' | 'legalName'>

// Búsqueda paginada en Core; nunca carga el catálogo completo en el navegador.
export function CompanyPicker({ value, onChange, disabled, required }: { value: Option | null; onChange: (value: Option | null) => void; disabled?: boolean; required?: boolean }) {
  const [input, setInput] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      companiesApi.list({ page: 1, limit: 20, status: 'ACTIVE', ...(input.trim() ? { search: input.trim() } : {}) })
        .then((result) => { if (active) setOptions(result.data.map(({ id, legalName }) => ({ id, legalName }))) })
        .catch(() => { if (active) setOptions([]) })
        .finally(() => { if (active) setLoading(false) })
    }, 250)
    return () => { active = false; window.clearTimeout(timer) }
  }, [input])
  return <Autocomplete value={value} options={value && !options.some((option) => option.id === value.id) ? [value, ...options] : options}
    getOptionLabel={(option) => option.legalName} isOptionEqualToValue={(option, selected) => option.id === selected.id}
    loading={loading} disabled={disabled} filterOptions={(items) => items} onInputChange={(_, next) => setInput(next)} onChange={(_, next) => onChange(next)}
    noOptionsText="Sin empresas activas para esa búsqueda" loadingText="Buscando…"
    renderInput={(params) => <TextField {...params} label="Empresa" required={required} />} />
}
