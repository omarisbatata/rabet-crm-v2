// ── Audit PDF generator ──────────────────────────────────────────────────
// Client-side only: no server-side rendering, no third-party PDF API, no
// added cost. The form is populated by hand or drafted via the shared
// ai-assist Edge Function (task: draft_audit) — either way every field is
// editable before "Generate PDF" runs; nothing here auto-sends or
// auto-finalizes anything.
//
// Layout/copy mirrors the existing Haseeb Coffee reference audit: 3 pages
// (cover / Fix Now / What to Add + Bottom Line), IBM Plex Sans / Plex Sans
// Arabic / Plex Mono, brand palette (Ink #141312, Paper #F4F1EA,
// Signal #FF4D2E, Link #0FB5A1, Forest #07312B, Mist #BFEDE5, Stone
// #79746B) — see style.css's "Audit PDF — export render template" block.

const AUDIT_MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const AUDIT_MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

function formatAuditDate(dateStr, rtl) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || '')
  if (!m) return dateStr || ''
  const months = rtl ? AUDIT_MONTHS_AR : AUDIT_MONTHS_EN
  const monthName = months[parseInt(m[2], 10) - 1] || ''
  return `${monthName} ${m[1]}`
}

let auditState = null

function defaultAuditState(company) {
  return {
    company,
    lang: 'en',
    client_name: company.name || '',
    date: today(),
    intro_line: '',
    fix_now: Array.from({ length: 6 }, () => ({ title: '', body: '' })),
    what_to_add: Array.from({ length: 5 }, () => ({ title: '', body: '' })),
    bottom_line: { paragraph: '', priorities: ['', '', ''] },
  }
}

// ── Editor modal (CRM dark theme) ────────────────────────────────────────

function auditItemRowHtml(prefix, idx, item) {
  return `
    <div class="audit-item-row">
      <div class="audit-item-num">${String(idx + 1).padStart(2, '0')}</div>
      <div>
        <input class="field-input" id="${prefix}-title-${idx}" placeholder="${t('audit_item_title')}" value="${esc(item?.title || '')}" />
        <textarea class="field-textarea" id="${prefix}-body-${idx}" placeholder="${t('audit_item_body')}">${esc(item?.body || '')}</textarea>
      </div>
    </div>`
}

function auditFormHtml() {
  const s = auditState
  return `
    <div class="audit-lang-toggle">
      <label class="field-label" style="align-self:center;margin:0;">${t('audit_lang_label')}</label>
      <div class="pill-group" id="audit-lang-pills">
        <button type="button" class="pill-btn${s.lang === 'en' ? ' active' : ''}" data-lang="en">English</button>
        <button type="button" class="pill-btn${s.lang === 'ar' ? ' active' : ''}" data-lang="ar">العربية</button>
      </div>
    </div>
    <div class="field-group">
      <label class="field-label">${t('audit_f_client')}</label>
      <input class="field-input" id="audit-f-client" value="${esc(s.client_name)}" />
    </div>
    <div class="field-group">
      <label class="field-label">${t('audit_f_date')}</label>
      <input class="field-input" id="audit-f-date" placeholder="YYYY-MM-DD" value="${esc(s.date)}" />
    </div>
    <div class="field-group">
      <label class="field-label">${t('audit_f_intro')}</label>
      <textarea class="field-textarea" id="audit-f-intro">${esc(s.intro_line)}</textarea>
    </div>

    <div class="audit-section">
      <div class="audit-section-title">${t('audit_fix_now')}</div>
      ${s.fix_now.map((item, i) => auditItemRowHtml('audit-fix', i, item)).join('')}
    </div>

    <div class="audit-section">
      <div class="audit-section-title">${t('audit_what_to_add')}</div>
      ${s.what_to_add.map((item, i) => auditItemRowHtml('audit-add', i, item)).join('')}
    </div>

    <div class="audit-section">
      <div class="audit-section-title">${t('audit_bottom_line')}</div>
      <div class="field-group">
        <label class="field-label">${t('audit_f_paragraph')}</label>
        <textarea class="field-textarea" id="audit-bl-paragraph">${esc(s.bottom_line.paragraph)}</textarea>
      </div>
      ${[0, 1, 2].map(i => `
        <div class="audit-priority-row">
          <div class="audit-item-num">${i + 1}.</div>
          <input class="field-input" id="audit-bl-priority-${i}" placeholder="${t('audit_f_priority')} ${i + 1}" value="${esc(s.bottom_line.priorities[i] || '')}" />
        </div>`).join('')}
    </div>

    <div class="audit-modal-actions">
      <div class="audit-modal-actions-left">
        <button class="btn-ghost" id="audit-draft-ai-btn" type="button">${t('ai_draft_btn')}</button>
      </div>
      <div class="audit-modal-actions-right">
        <button class="btn-primary" id="audit-generate-btn" type="button">${t('audit_generate_btn')}</button>
      </div>
    </div>
  `
}

function renderAuditForm() {
  qs('#audit-body').innerHTML = auditFormHtml()

  qs('#audit-lang-pills').addEventListener('click', e => {
    const b = e.target.closest('.pill-btn')
    if (!b) return
    auditState.lang = b.dataset.lang
    qsa('#audit-lang-pills .pill-btn').forEach(x => x.classList.remove('active'))
    b.classList.add('active')
  })
  qs('#audit-draft-ai-btn').addEventListener('click', handleAuditDraftAI)
  qs('#audit-generate-btn').addEventListener('click', handleAuditGeneratePDF)
}

function openAuditModal(company) {
  auditState = defaultAuditState(company)
  renderAuditForm()
  qs('#audit-overlay').classList.remove('hidden')
}

function closeAuditModal() {
  qs('#audit-overlay').classList.add('hidden')
}

qs('#audit-close').addEventListener('click', closeAuditModal)
qs('#audit-overlay').addEventListener('click', e => { if (e.target === qs('#audit-overlay')) closeAuditModal() })

function collectAuditFormValues() {
  auditState.client_name = qs('#audit-f-client').value.trim()
  auditState.date = qs('#audit-f-date').value.trim()
  auditState.intro_line = qs('#audit-f-intro').value.trim()
  auditState.fix_now = auditState.fix_now.map((_, i) => ({
    title: qs(`#audit-fix-title-${i}`).value.trim(),
    body: qs(`#audit-fix-body-${i}`).value.trim(),
  }))
  auditState.what_to_add = auditState.what_to_add.map((_, i) => ({
    title: qs(`#audit-add-title-${i}`).value.trim(),
    body: qs(`#audit-add-body-${i}`).value.trim(),
  }))
  auditState.bottom_line = {
    paragraph: qs('#audit-bl-paragraph').value.trim(),
    priorities: [0, 1, 2].map(i => qs(`#audit-bl-priority-${i}`).value.trim()),
  }
}

// ── AI draft ──────────────────────────────────────────────────────────────

async function handleAuditDraftAI() {
  const btn = qs('#audit-draft-ai-btn')
  btn.disabled = true
  btn.textContent = t('ai_draft_generating')

  const { data, error } = await sb.functions.invoke('ai-assist', {
    body: { task: 'draft_audit', context: { company_id: auditState.company.id, lang: auditState.lang } },
  })

  btn.disabled = false
  btn.textContent = t('ai_draft_btn')

  if (error || (data && data.error)) {
    sbar(t('ai_draft_failed') + (error?.message || data.error))
    return
  }

  auditState.client_name = data.client_name || auditState.client_name
  auditState.date = data.date || auditState.date
  auditState.intro_line = data.intro_line || ''
  if (Array.isArray(data.fix_now) && data.fix_now.length === 6) auditState.fix_now = data.fix_now
  if (Array.isArray(data.what_to_add) && data.what_to_add.length === 5) auditState.what_to_add = data.what_to_add
  if (data.bottom_line) auditState.bottom_line = data.bottom_line

  renderAuditForm()
}

// ── PDF export ────────────────────────────────────────────────────────────

async function handleAuditGeneratePDF() {
  collectAuditFormValues()
  const btn = qs('#audit-generate-btn')
  btn.disabled = true
  btn.textContent = t('audit_generating')
  try {
    await renderAuditPdf(auditState)
    showToast(t('audit_pdf_saved'))
  } catch (err) {
    sbar('PDF generation failed: ' + err.message)
  }
  btn.disabled = false
  btn.textContent = t('audit_generate_btn')
}

function auditPage1Html(s, rtl) {
  const metaLeft  = rtl ? 'وكالة رقمية' : 'DIGITAL AGENCY'
  const metaRight = rtl ? 'دمشق · العالم' : 'DAMASCUS · WORLDWIDE'
  const title     = rtl ? 'تدقيق الموقع الإلكتروني' : 'WEBSITE AUDIT'
  const pill      = rtl ? 'تدقيق مجاني — بلا التزام' : 'Free Audit — No Obligation'
  const clientDisplay = rtl ? (s.client_name || '') : (s.client_name || '').toUpperCase()
  const prepared  = rtl
    ? `أُعِدّ لـ ${esc(s.client_name)} من قبل وكالة رابط الرقمية، دمشق`
    : `Prepared for ${esc(s.client_name)} by Rabet Digital Agency, Damascus`
  const footerLeft  = rtl ? 'رابط — مبني ليصل' : 'RABET — BUILT TO CONNECT'
  const footerRight = formatAuditDate(s.date, rtl)

  return `
    <div class="audit-page audit-page-cover" dir="${rtl ? 'rtl' : 'ltr'}">
      <div class="audit-cover-meta audit-mono">
        <span>${metaLeft}</span><span>${metaRight}</span>
      </div>
      <div class="audit-cover-center">
        <div class="audit-cover-mark">رابط</div>
        <div class="audit-cover-title audit-mono">${title}</div>
        <div class="audit-cover-client">${esc(clientDisplay)}</div>
        <div class="audit-cover-pill">${pill}</div>
        <div class="audit-cover-prepared">${prepared}</div>
      </div>
      <div class="audit-cover-footer audit-mono">
        <strong>${footerLeft}</strong><span>${footerRight}</span>
      </div>
    </div>`
}

function auditContentHeaderHtml(s, rtl) {
  const client = rtl ? (s.client_name || '') : (s.client_name || '').toUpperCase()
  const label = rtl ? `رابط — تدقيق الموقع` : `RABET — WEBSITE AUDIT`
  return `<div class="audit-content-header audit-mono"><strong>${label}</strong><span>${esc(client)}</span></div>`
}

function auditPage2Html(s, rtl) {
  const tag     = rtl ? 'إصلاح الآن' : 'FIX NOW'
  const heading = rtl ? 'ستة أخطاء تكلفك عملاء' : 'Six issues costing you inquiries'
  const itemsHtml = s.fix_now.map((item, i) => `
    <div class="audit-item">
      <div class="audit-item-index audit-mono">${i + 1}</div>
      <div>
        <div class="audit-item-title">${esc(item.title)}</div>
        <div class="audit-item-body">${esc(item.body)}</div>
      </div>
    </div>`).join('')

  return `
    <div class="audit-page audit-page-content" dir="${rtl ? 'rtl' : 'ltr'}">
      ${auditContentHeaderHtml(s, rtl)}
      <div class="audit-intro">${esc(s.intro_line)}</div>
      <div class="audit-tag">${tag}</div>
      <div class="audit-heading">${heading}</div>
      <div class="audit-items">${itemsHtml}</div>
    </div>`
}

function auditPage3Html(s, rtl) {
  const tag     = rtl ? 'ما يجب إضافته' : 'WHAT TO ADD'
  const heading = rtl ? 'خمس فجوات تستحق الإغلاق' : 'Five gaps worth closing'
  const blTag   = rtl ? 'الخلاصة' : 'BOTTOM LINE'
  const contact = rtl
    ? 'وكالة رابط الرقمية — دمشق، سوريا   عمر شلق · 965 779 981 963+ · oshalak@hotmail.com'
    : 'Rabet Digital Agency — Damascus, Syria   Omar Shalak · +963 981 779 965 · oshalak@hotmail.com'

  const itemsHtml = s.what_to_add.map((item, i) => `
    <div class="audit-item">
      <div class="audit-item-index audit-mono">${i + 1}</div>
      <div>
        <div class="audit-item-title">${esc(item.title)}</div>
        <div class="audit-item-body">${esc(item.body)}</div>
      </div>
    </div>`).join('')

  const prioritiesHtml = s.bottom_line.priorities.map((p, i) => `
    <div class="audit-priority">
      <span class="audit-priority-index audit-mono">${i + 1}</span>
      <span>${esc(p)}</span>
    </div>`).join('')

  return `
    <div class="audit-page audit-page-content" dir="${rtl ? 'rtl' : 'ltr'}">
      ${auditContentHeaderHtml(s, rtl)}
      <div class="audit-tag">${tag}</div>
      <div class="audit-heading">${heading}</div>
      <div class="audit-items">${itemsHtml}</div>
      <div class="audit-bottomline">
        <div class="audit-tag">${blTag}</div>
        <p>${esc(s.bottom_line.paragraph)}</p>
        <div class="audit-priorities">${prioritiesHtml}</div>
      </div>
      <div class="audit-content-footer">${contact}</div>
    </div>`
}

async function renderAuditPdf(s) {
  const rtl = s.lang === 'ar'
  const root = qs('#audit-render-root')
  root.innerHTML = auditPage1Html(s, rtl) + auditPage2Html(s, rtl) + auditPage3Html(s, rtl)

  if (document.fonts && document.fonts.ready) await document.fonts.ready
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  const pages = qsa('#audit-render-root .audit-page')
  const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true })
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
  }

  root.innerHTML = ''
  pdf.save(`Audit - ${s.client_name || 'Client'}.pdf`)
}
