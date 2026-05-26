'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface LogEntry {
  id: number
  time: string
  type: 'track' | 'custom'
  name: string
  params?: Record<string, unknown>
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    dataLayer?: Record<string, unknown>[]
  }
}

const STAY_THRESHOLDS   = [15, 30, 60]
const SCROLL_THRESHOLDS = [25, 50, 75, 90]

export default function Page() {
  const [events,     setEvents]     = useState<LogEntry[]>([])
  const [timerFired, setTimerFired] = useState<Set<number>>(new Set())
  const [debugOpen,  setDebugOpen]  = useState(true)
  const scrollFired = useRef<Set<number>>(new Set())
  const idRef       = useRef(0)

  const log = useCallback((type: 'track' | 'custom', name: string, params?: Record<string, unknown>) => {
    setEvents(p => [...p, { id: ++idRef.current, time: new Date().toTimeString().slice(0, 8), type, name, params }])
  }, [])

  const track       = useCallback((name: string, params?: Record<string, unknown>) => {
    log('track',  name, params)
    window.fbq?.('track', name, params ?? {})
  }, [log])

  const trackCustom = useCallback((name: string, params?: Record<string, unknown>) => {
    log('custom', name, params)
    window.fbq?.('trackCustom', name, params ?? {})
  }, [log])

  // PageView + ViewContent on mount
  useEffect(() => {
    log('track', 'PageView', {})
    track('ViewContent', { content_name: window.location.pathname })
  }, [log, track])

  // Stay time
  useEffect(() => {
    let secs = 0
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      secs++
      STAY_THRESHOLDS.forEach(s => {
        if (secs >= s) setTimerFired(p => {
          if (p.has(s)) return p
          trackCustom('StayTime', { seconds: s, page_path: window.location.pathname })
          return new Set([...p, s])
        })
      })
    }, 1000)
    return () => clearInterval(t)
  }, [trackCustom])

  // Scroll depth
  useEffect(() => {
    const fn = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      if (!h) return
      const pct = Math.floor(window.scrollY / h * 100)
      SCROLL_THRESHOLDS.forEach(t => {
        if (pct >= t && !scrollFired.current.has(t)) {
          scrollFired.current.add(t)
          trackCustom('ScrollDepth', { scroll_percent: t, page_path: window.location.pathname })
        }
      })
    }
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [trackCustom])

  // CTA click
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>('[data-cta]')
      if (!el) return
      trackCustom('ClickCTA', { click_text: el.textContent?.trim(), cta_id: el.dataset.cta, page_path: window.location.pathname })
    }
    document.addEventListener('click', fn)
    return () => document.removeEventListener('click', fn)
  }, [trackCustom])

async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = e.currentTarget
    track('Lead', { form_id: 'contact-form', page_path: window.location.pathname })
    track('CompleteRegistration', { page_path: window.location.pathname })
    const data = {
      name:        (f.elements.namedItem('name')         as HTMLInputElement).value,
      email:       (f.elements.namedItem('email')        as HTMLInputElement).value,
      serviceType: (f.elements.namedItem('service_type') as HTMLSelectElement).value,
      message:     (f.elements.namedItem('message')      as HTMLTextAreaElement).value,
    }
    await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    f.reset()
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto', padding: '40px 24px 200px' }}>
      <h1 style={{ marginBottom: 32 }}>Pixel 測試頁</h1>

      {/* CTA */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>CTA — ClickCTA</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <button data-cta="primary" style={btnStyle('#1877f2')}>主要 CTA</button>
          <button data-cta="secondary" style={btnStyle('#555')}>次要 CTA</button>
        </div>
      </section>

{/* Form */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>表單送出 — Lead + CompleteRegistration</h2>
        <form id="contact-form" onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
          <input name="name"    placeholder="姓名" required style={inputStyle} />
          <input name="email"   placeholder="Email" type="email" required style={inputStyle} />
          <select name="service_type" style={inputStyle}>
            <option value="ads">廣告投放</option>
            <option value="pixel">Pixel 設定</option>
          </select>
          <textarea name="message" placeholder="訊息" rows={3} style={inputStyle} />
          <button type="submit" style={btnStyle('#1877f2')}>送出</button>
        </form>
      </section>

      {/* Stay time */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>停留時間 — StayTime</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {STAY_THRESHOLDS.map(s => (
            <span key={s} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: timerFired.has(s) ? '#c6f6d5' : '#f0f0f0', color: timerFired.has(s) ? '#276749' : '#555', border: '1px solid', borderColor: timerFired.has(s) ? '#9ae6b4' : '#ddd' }}>
              {timerFired.has(s) ? '✓' : '⏱'} {s}s
            </span>
          ))}
        </div>
      </section>

      {/* Scroll depth — spacer */}
      <section>
        <h2 style={{ fontSize: 14, color: '#888', marginBottom: 12 }}>滾動深度 — ScrollDepth（往下滾）</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          {SCROLL_THRESHOLDS.map(t => (
            <span key={t} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, background: scrollFired.current.has(t) ? '#bee3f8' : '#f0f0f0', color: scrollFired.current.has(t) ? '#2b6cb0' : '#555', border: '1px solid', borderColor: scrollFired.current.has(t) ? '#90cdf4' : '#ddd' }}>
              {t}%
            </span>
          ))}
        </div>
        {/* height needed to enable scrolling */}
        <div style={{ height: 800, background: 'repeating-linear-gradient(180deg, #f8f8f8 0px, #f8f8f8 40px, #f0f0f0 40px, #f0f0f0 41px)', borderRadius: 8 }} />
      </section>

      {/* Debug panel */}
      <div style={{ position: 'fixed', bottom: 16, right: 16, width: 340, maxHeight: 360, background: '#1a1a1a', color: '#e0e0e0', borderRadius: 12, fontFamily: 'Menlo, Consolas, monospace', fontSize: 12, boxShadow: '0 4px 24px rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div onClick={() => setDebugOpen(o => !o)} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', background: '#2a2a2a', cursor: 'pointer' }}>
          <span style={{ color: '#4fc3f7', fontWeight: 700 }}>Pixel Debug</span>
          <span style={{ color: '#888' }}>{events.length} events · {debugOpen ? '▼' : '▲'}</span>
        </div>
        {debugOpen && (
          <>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {events.map(e => (
                <div key={e.id} style={{ padding: '5px 14px', borderBottom: '1px solid #2a2a2a' }}>
                  <span style={{ color: '#888' }}>{e.time} </span>
                  <span style={{ color: e.type === 'track' ? '#81c784' : '#ff8a65', fontWeight: 700 }}>{e.type === 'track' ? 'track' : 'custom'} </span>
                  <span style={{ color: '#fff' }}>{e.name}</span>
                  {e.params && Object.keys(e.params).length > 0 && (
                    <div style={{ color: '#b0bec5', paddingLeft: 8, fontSize: 11 }}>{JSON.stringify(e.params)}</div>
                  )}
                </div>
              ))}
            </div>
            <div onClick={() => setEvents([])} style={{ padding: '5px 14px', background: '#2a2a2a', color: '#888', cursor: 'pointer', textAlign: 'center' }}>清除</div>
          </>
        )}
      </div>
    </div>
  )
}

const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '10px 20px', background: bg, color: '#fff', border: 'none',
  borderRadius: 6, fontWeight: 600, cursor: 'pointer', fontSize: 14,
})

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, fontSize: 14, width: '100%',
}
