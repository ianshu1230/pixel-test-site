'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────
interface LogEntry {
  id: number
  time: string
  type: 'track' | 'custom'
  name: string
  params?: Record<string, unknown>
}

type FormStatus = 'idle' | 'sending' | 'sent' | 'error'

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    dataLayer?: Record<string, unknown>[]
  }
}

// ── Service cards data ─────────────────────────────
const SERVICES = [
  { id: 'SVC-001', name: '品牌廣告投放', desc: 'Facebook / Instagram 廣告規劃與執行。' },
  { id: 'SVC-002', name: '再行銷受眾',   desc: '根據 Pixel 事件建立精準再行銷受眾。' },
  { id: 'SVC-003', name: '轉換最佳化',   desc: '以 Lead / Purchase 事件進行廣告最佳化。' },
]

const STAY_THRESHOLDS   = [15, 30, 60]
const SCROLL_THRESHOLDS = [25, 50, 75, 90]

// ── Component ──────────────────────────────────────
export default function PixelTestPage() {
  const [events,      setEvents]      = useState<LogEntry[]>([])
  const [timerFired,  setTimerFired]  = useState<Set<number>>(new Set())
  const [debugOpen,   setDebugOpen]   = useState(true)
  const [formStatus,  setFormStatus]  = useState<FormStatus>('idle')
  const scrollFired = useRef<Set<number>>(new Set())
  const eventIdRef  = useRef(0)

  // ── Pixel wrappers ──────────────────────────────
  const logEvent = useCallback((type: 'track' | 'custom', name: string, params?: Record<string, unknown>) => {
    const time = new Date().toTimeString().slice(0, 8)
    setEvents(prev => [...prev, { id: ++eventIdRef.current, time, type, name, params }])
  }, [])

  const track = useCallback((name: string, params?: Record<string, unknown>) => {
    logEvent('track', name, params)
    if (typeof window.fbq === 'function') window.fbq('track', name, params ?? {})
  }, [logEvent])

  const trackCustom = useCallback((name: string, params?: Record<string, unknown>) => {
    logEvent('custom', name, params)
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params ?? {})
  }, [logEvent])

  // ── Initial: ViewContent ────────────────────────
  useEffect(() => {
    track('ViewContent', { content_type: 'page', content_name: window.location.pathname || '/' })
  }, [track])

  // ── Stay time ───────────────────────────────────
  useEffect(() => {
    let activeSeconds = 0

    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      activeSeconds++

      STAY_THRESHOLDS.forEach(sec => {
        if (activeSeconds >= sec) {
          setTimerFired(prev => {
            if (prev.has(sec)) return prev
            trackCustom('StayTime', { seconds: sec, page_path: window.location.pathname })
            return new Set([...prev, sec])
          })
        }
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [trackCustom])

  // ── Scroll depth ────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      if (scrollable <= 0) return
      const pct = Math.floor((window.scrollY / scrollable) * 100)

      SCROLL_THRESHOLDS.forEach(threshold => {
        if (pct >= threshold && !scrollFired.current.has(threshold)) {
          scrollFired.current.add(threshold)
          trackCustom('ScrollDepth', { scroll_percent: threshold, page_path: window.location.pathname })
        }
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [trackCustom])

  // ── CTA click ───────────────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLElement>('.cta-button')
      if (!el) return
      trackCustom('ClickCTA', {
        page_path:  window.location.pathname,
        click_text: el.textContent?.trim() ?? '',
        cta_id:     el.dataset.cta ?? '',
      })
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [trackCustom])

  // ── Contact link click ──────────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const el = (e.target as Element).closest<HTMLAnchorElement>('a[href]')
      if (!el) return
      const href = el.getAttribute('href') ?? ''
      const text = el.textContent?.trim()
      const path = window.location.pathname

      if      (href.startsWith('tel:'))    track('Contact', { contact_method: 'phone', click_text: text, page_path: path })
      else if (href.startsWith('mailto:')) track('Contact', { contact_method: 'email', click_text: text, page_path: path })
      else if (href.includes('line.me'))   track('Contact', { contact_method: 'line',  click_text: text, page_path: path })
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [track])

  // ── Handlers ────────────────────────────────────
  function handleItemClick(itemId: string, itemName: string) {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: 'click_item', item_id: itemId })
    trackCustom('ClickItem', { item_id: itemId, item_name: itemName, page_path: window.location.pathname })
  }

  function handleSearch() {
    const keyword  = (document.getElementById('search-input')    as HTMLInputElement)?.value.trim()
    const category = (document.getElementById('search-category') as HTMLSelectElement)?.value
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: 'site_search', search_keyword: keyword, category })
    track('Search', { search_string: keyword, category, page_path: window.location.pathname })
  }

  function handleFilterChange(filterName: string, filterValue: string) {
    if (!filterValue) return
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: 'filter_change', filter_name: filterName, filter_value: filterValue })
    trackCustom('FilterChange', { filter_name: filterName, filter_value: filterValue, page_path: window.location.pathname })
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormStatus('sending')
    const form = e.currentTarget
    const data = {
      name:        (form.elements.namedItem('name')         as HTMLInputElement).value,
      email:       (form.elements.namedItem('email')        as HTMLInputElement).value,
      serviceType: (form.elements.namedItem('service_type') as HTMLSelectElement).value,
      message:     (form.elements.namedItem('message')      as HTMLTextAreaElement).value,
    }

    track('Lead',                 { form_type: data.serviceType, form_id: 'contact-form', page_path: window.location.pathname })
    track('CompleteRegistration', { content_name: 'contact_form', page_path: window.location.pathname })

    try {
      const res = await fetch('/api/contact', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      setFormStatus(res.ok ? 'sent' : 'error')
      if (res.ok) form.reset()
    } catch {
      setFormStatus('error')
    }
  }

  // ── Render ──────────────────────────────────────
  return (
    <>
      {/* Hero */}
      <div className="hero">
        <h1>Meta Pixel 測試網站</h1>
        <p>測試所有 Meta Pixel 追蹤功能：點擊、滾動、停留時間、表單送出。</p>
        <a href="#contact" className="btn btn-white cta-button" data-cta="hero-primary">立即諮詢</a>
        <a href="#services" className="btn btn-secondary cta-button" data-cta="hero-secondary" style={{ marginLeft: 12 }}>了解更多</a>
      </div>

      {/* Stay time */}
      <section id="staytime">
        <h2>停留時間追蹤</h2>
        <p>分頁可見時才計時（visibilityState），達到門檻後 badge 變綠並觸發 <code>StayTime</code>。</p>
        <div className="timer-bar">
          {STAY_THRESHOLDS.map(sec => (
            <div key={sec} className={`timer-badge${timerFired.has(sec) ? ' fired' : ''}`}>
              {timerFired.has(sec) ? '✓' : '⏱'} {sec} 秒
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services">
        <h2>服務項目（ClickItem）</h2>
        <p>點擊卡片透過 <code>dataLayer.push()</code> 觸發自訂事件，帶入 <code>item_id</code>。</p>
        <div className="card-grid">
          {SERVICES.map(svc => (
            <div key={svc.id} className="card" onClick={() => handleItemClick(svc.id, svc.name)}>
              <h3>{svc.name}</h3>
              <p>{svc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Search / Filter */}
      <section id="search">
        <h2>搜尋與篩選（Search / FilterChange）</h2>
        <p>送出搜尋觸發 <code>Search</code>；改變篩選選單觸發 <code>FilterChange</code>。</p>
        <div className="search-bar">
          <input type="text" id="search-input" placeholder="輸入搜尋關鍵字…" />
          <select id="search-category">
            <option value="">所有分類</option>
            <option value="branding">品牌</option>
            <option value="performance">成效</option>
            <option value="creative">創意</option>
          </select>
          <button className="btn btn-primary cta-button" data-cta="search-submit" onClick={handleSearch}>搜尋</button>
        </div>
        <div className="filter-row">
          <select id="filter-price" onChange={e => handleFilterChange('price', e.target.value)}>
            <option value="">不限價格</option>
            <option value="0-10000">$0–$10,000</option>
            <option value="10000-50000">$10,000–$50,000</option>
            <option value="50000+">$50,000+</option>
          </select>
          <select id="filter-sort" onChange={e => handleFilterChange('sort_by', e.target.value)}>
            <option value="relevance">相關性排序</option>
            <option value="price_asc">價格低到高</option>
            <option value="price_desc">價格高到低</option>
          </select>
        </div>
      </section>

      {/* Long content for scroll test */}
      <section id="content" className="long-content">
        <h2>頁面內容（滾動深度測試）</h2>
        <p>滾動到 25%、50%、75%、90% 時依序觸發 <code>ScrollDepth</code>，Debug 面板即時顯示。</p>
        {[
          '品牌廣告的核心不在於曝光次數，而在於正確的人在正確的時間看到正確的訊息。Meta Pixel 讓我們能夠量測這個交叉點，把廣告費用轉換成可衡量的商業成果。',
          '再行銷受眾是數位廣告中投報率最高的策略之一。當使用者曾經瀏覽過你的產品頁面，或是在購物車中加入了商品卻沒有完成結帳，Pixel 事件讓你能夠精準鎖定這些高意圖受眾。',
          '轉換最佳化需要足夠的事件數據才能讓 Meta 演算法有效運作。一般建議每個廣告組每週至少累積 50 個轉換事件，才能進入穩定的學習階段並開始發揮最佳化效果。',
          '自訂受眾的保留期間設定會直接影響受眾規模與精準度之間的平衡。保留期間越短，受眾越精準但規模越小；保留期間越長，規模越大但意圖信號會稀釋。',
          '排除受眾是避免廣告費用浪費的重要手段。把已完成轉換的用戶從主力受眾中排除，不只能降低 CPL，也能改善用戶體驗，避免對已購買的客戶重複投放。',
          '事件參數是區分相似事件的關鍵工具。同樣是 Lead 事件，透過 form_type 參數就能區分諮詢表單、預約表單與試用申請，讓廣告後台能夠針對不同類型的潛在客戶分別最佳化。',
          '滾動深度事件讓你能夠識別高投入讀者。一個滾動超過 75% 的使用者和一個只瀏覽了標題的使用者，應該被不同的廣告策略對待，前者更適合被轉化為購買意圖。',
          '停留時間和滾動深度的組合是衡量內容品質最直接的方式。如果大多數使用者在 15 秒內離開且滾動不超過 25%，這是內容需要改善的明確信號。',
          'Meta Pixel 的 Conversions API（CAPI）是 Pixel 的伺服器端補充，能夠在 iOS 14+ 限制 Cookie 追蹤的環境下保持事件準確性，通常與瀏覽器端 Pixel 搭配使用以提高比對率。',
        ].map((text, i) => <p key={i}>{text}</p>)}
      </section>

      {/* CTA */}
      <section id="cta-section">
        <h2>CTA 按鈕（ClickCTA）</h2>
        <p>帶有 <code>cta-button</code> class 的元素被點擊時觸發 <code>ClickCTA</code>，帶入 <code>click_text</code> 與 <code>cta_id</code>。</p>
        <div className="cta-group">
          <button className="btn btn-primary cta-button"   data-cta="free-trial">免費試用 30 天</button>
          <button className="btn btn-secondary cta-button" data-cta="download-case">下載案例</button>
          <button className="btn btn-green cta-button"     data-cta="line-cta">加 LINE 諮詢</button>
        </div>
      </section>

      {/* Contact */}
      <section id="contact">
        <h2>聯絡方式（Contact / Lead）</h2>
        <p>點擊電話、Email、Line 觸發 <code>Contact</code>；送出表單觸發 <code>Lead</code> + <code>CompleteRegistration</code>。</p>

        <div className="contact-links">
          <a href="tel:0912345678" className="link-phone">📞 0912-345-678</a>
          <a href="mailto:hello@example.com" className="link-email">✉️ hello@example.com</a>
          <a href="https://line.me/ti/p/example" className="link-line" target="_blank" rel="noreferrer">💬 加 LINE</a>
        </div>

        {formStatus === 'sent' && (
          <div className="form-success">表單已送出，資料已儲存至資料庫。</div>
        )}
        {formStatus === 'error' && (
          <div className="form-error">送出失敗，請確認資料庫連線設定（Pixel 事件已觸發）。</div>
        )}

        <form id="contact-form" onSubmit={handleFormSubmit}>
          <label htmlFor="name">姓名</label>
          <input type="text" id="name" name="name" placeholder="您的姓名" required />

          <label htmlFor="email">Email</label>
          <input type="email" id="email" name="email" placeholder="your@email.com" required />

          <label htmlFor="service-type">諮詢項目</label>
          <select id="service-type" name="service_type">
            <option value="ads">廣告投放</option>
            <option value="pixel">Pixel 設定</option>
            <option value="audience">受眾規劃</option>
            <option value="other">其他</option>
          </select>

          <label htmlFor="message">訊息</label>
          <textarea id="message" name="message" placeholder="請描述您的需求…" />

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={formStatus === 'sending'}>
            {formStatus === 'sending' ? '送出中…' : '送出諮詢'}
          </button>
        </form>
      </section>

      {/* Debug Panel */}
      <div className="debug-panel">
        <div className="debug-header" onClick={() => setDebugOpen(o => !o)}>
          <span>🔍 Pixel Debug</span>
          <small>{events.length} events</small>
          <span>{debugOpen ? '▼' : '▲'}</span>
        </div>

        {debugOpen && (
          <>
            <div className="debug-log">
              {events.map(entry => (
                <div key={entry.id} className="log-entry">
                  <span className="log-time">{entry.time}</span>
                  <span className={entry.type === 'track' ? 'log-track' : 'log-custom'}>
                    {entry.type === 'track' ? 'track' : 'trackCustom'}
                  </span>{' '}
                  <span className="log-name">{entry.name}</span>
                  {entry.params && Object.keys(entry.params).length > 0 && (
                    <span className="log-params">
                      {JSON.stringify(entry.params)}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="debug-clear" onClick={() => setEvents([])}>清除記錄</div>
          </>
        )}
      </div>
    </>
  )
}
