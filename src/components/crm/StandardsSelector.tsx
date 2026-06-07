'use client'

import { useState, useMemo } from 'react'
import { APPRENTICESHIP_STANDARDS, ALL_STANDARDS } from '@/lib/crm-data'

interface Props {
  selected: string[]
  onChange: (standards: string[]) => void
  placeholder?: string
}

export default function StandardsSelector({ selected, onChange, placeholder = 'Search apprenticeship standards...' }: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (!search) return APPRENTICESHIP_STANDARDS
    const q = search.toLowerCase()
    return APPRENTICESHIP_STANDARDS.map(route => ({
      ...route,
      standards: route.standards.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.ref.toLowerCase().includes(q) ||
        route.route.toLowerCase().includes(q)
      ),
    })).filter(r => r.standards.length > 0)
  }, [search])

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter(s => s !== name))
    } else {
      onChange([...selected, name])
    }
  }

  function removeSelected(name: string) {
    onChange(selected.filter(s => s !== name))
  }

  return (
    <div className="standards-selector">
      {/* Selected badges */}
      {selected.length > 0 && (
        <div className="standards-selected">
          {selected.map(s => {
            const std = ALL_STANDARDS.find(a => a.name === s)
            return (
              <span key={s} className="standards-badge">
                {s} {std && <span style={{ opacity: 0.6, fontSize: 10 }}>L{std.level}</span>}
                <button className="standards-badge-remove" onClick={() => removeSelected(s)}>✕</button>
              </span>
            )
          })}
        </div>
      )}

      {/* Search trigger */}
      <div className="standards-search-wrap">
        <input
          type="text"
          className="crm-input"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        {selected.length > 0 && (
          <span className="standards-count">{selected.length} selected</span>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <>
          <div className="standards-backdrop" onClick={() => setOpen(false)} />
          <div className="standards-dropdown">
            {filtered.length === 0 && (
              <p className="standards-empty">No standards match your search.</p>
            )}
            {filtered.map(route => (
              <div key={route.route} className="standards-route-group">
                <p className="standards-route-label">{route.route}</p>
                {route.standards.map(std => (
                  <button
                    key={std.ref + std.name}
                    className={`standards-option${selected.includes(std.name) ? ' selected' : ''}`}
                    onClick={() => toggle(std.name)}
                    type="button"
                  >
                    <span className="standards-option-name">{std.name}</span>
                    <span className="standards-option-meta">L{std.level} · {std.ref}</span>
                    {selected.includes(std.name) && <span className="standards-option-tick">✓</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}