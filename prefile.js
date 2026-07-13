// Prefile — catalog-driven Audit / Price List generator, standalone page,
// owner+teammate access (same redirect-gate pattern as it.html/finance.html:
// this page has a real URL, so the init() check is the actual enforcement
// layer on top of RLS). No AI dependency anywhere in this file — every
// document is built entirely from the prefile_catalog table (maintained via
// Settings → Prefile Catalog) plus the picked company/lanes/checked items.

const T = {
en: {
  pf_title: '📁 Prefile',
  back_to_crm: '← Back to CRM',
  lang_switch: 'العربية',
  loading: 'Loading…',
  pf_step1: '1. Company',
  pf_step2: '2. Document Type',
  pf_step3: '3. Lane(s)',
  pf_step4: '4. Catalog Items',
  pf_company_search: 'Search companies…',
  pf_no_matches: 'No matches.',
  pf_change: 'Change',
  tab_audit: 'Audit', tab_price_list: 'Price List',
  lane_web: 'Web & Product', lane_social: 'Social & Content', lane_video: 'Video & Production',
  cat_issue: 'Issues', cat_recommendation: 'Recommendations', cat_tier: 'Tiers',
  pc_empty: 'Nothing here — add items via Settings → Prefile Catalog.',
  pf_generate: 'Generate PDF',
  pf_generating: 'Generating…',
  pf_generated: 'Downloaded ✓',
  pf_lanes_hint: 'Pick at least one lane.',
},
ar: {
  pf_title: '📁 بريفايل',
  back_to_crm: '→ العودة إلى CRM',
  lang_switch: 'English',
  loading: 'جارٍ التحميل…',
  pf_step1: '١. الشركة',
  pf_step2: '٢. نوع المستند',
  pf_step3: '٣. المسار (المسارات)',
  pf_step4: '٤. عناصر الكتالوج',
  pf_company_search: 'ابحث عن شركة…',
  pf_no_matches: 'لا توجد نتائج.',
  pf_change: 'تغيير',
  tab_audit: 'التدقيق', tab_price_list: 'قائمة الأسعار',
  lane_web: 'الويب والمنتج', lane_social: 'السوشال ميديا والمحتوى', lane_video: 'الفيديو والإنتاج',
  cat_issue: 'المشاكل', cat_recommendation: 'التوصيات', cat_tier: 'الباقات',
  pc_empty: 'لا يوجد شيء هنا — أضف عناصر من الإعدادات ← كتالوج بريفايل.',
  pf_generate: 'إنشاء PDF',
  pf_generating: 'جارٍ الإنشاء…',
  pf_generated: 'تم التنزيل ✓',
  pf_lanes_hint: 'اختر مساراً واحداً على الأقل.',
},
}

const LANES = ['web', 'social', 'video']

let sb
let lang = localStorage.getItem('crm_lang') || 'en'
let me = null
let companies = []
let catalog = []
let pf = {
  company: null,
  docType: 'audit',
  lanes: ['web', 'social', 'video'],
  checkedIds: new Set(),
}

const t   = key => T[lang][key] || key
const qs  = sel => document.querySelector(sel)
const qsa = sel => document.querySelectorAll(sel)

function esc(str) {
  if (!str && str !== 0) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function applyLang() {
  const isAr = lang === 'ar'
  document.documentElement.lang = lang
  document.documentElement.dir  = isAr ? 'rtl' : 'ltr'
  qs('#pf-title').textContent    = t('pf_title')
  qs('#btn-pf-back').textContent = t('back_to_crm')
  qs('#btn-pf-lang').textContent = t('lang_switch')
}

async function init() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  applyLang()
  qs('#btn-pf-lang').addEventListener('click', () => {
    lang = lang === 'en' ? 'ar' : 'en'
    localStorage.setItem('crm_lang', lang)
    applyLang()
    renderShell()
  })

  qs('#pf-status').textContent = t('loading')

  const { data: { session } } = await sb.auth.getSession()
  if (!session) { window.location.href = 'index.html'; return }

  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single()
  if (error || !profile || (profile.role !== 'owner' && profile.role !== 'teammate')) {
    window.location.href = 'index.html'
    return
  }
  me = { id: session.user.id, role: profile.role, full_name: profile.full_name }

  qs('#pf-status').classList.add('hidden')
  qs('#pf-page-body').classList.remove('hidden')

  await Promise.all([loadCompanies(), loadCatalog()])
  resetChecklistDefaults()
  renderShell()
}

async function loadCompanies() {
  const { data, error } = await sb.from('companies').select('id,name,industry,contact_type,contact_value').order('name')
  companies = error ? [] : (data || [])
}

async function loadCatalog() {
  const { data, error } = await sb.from('prefile_catalog').select('*').order('sort_order')
  catalog = error ? [] : (data || [])
}

// ── Checklist data helpers ───────────────────────────────────────────────

function visibleCatalogItems() {
  if (pf.docType === 'audit') {
    return catalog.filter(r => r.doc_type === 'audit' && pf.lanes.includes(r.lane))
  }
  return catalog.filter(r => r.doc_type === 'price_list' && pf.lanes.includes(r.lane))
}

function resetChecklistDefaults() {
  pf.checkedIds = new Set(visibleCatalogItems().map(i => i.id))
}

function laneOrderThenSort(a, b) {
  const laneDiff = LANES.indexOf(a.lane) - LANES.indexOf(b.lane)
  return laneDiff !== 0 ? laneDiff : a.sort_order - b.sort_order
}

// ── Render ────────────────────────────────────────────────────────────────

function renderShell() {
  qs('#pf-body').innerHTML = `
    <div class="pf-step">
      <div class="pf-step-label">${t('pf_step1')}</div>
      <div id="pf-company-picker"></div>
    </div>
    <div class="pf-step">
      <div class="pf-step-label">${t('pf_step2')}</div>
      <div class="pf-doctype-pills" id="pf-doctype-pills"></div>
    </div>
    <div class="pf-step">
      <div class="pf-step-label">${t('pf_step3')}</div>
      <div class="pf-lane-pills" id="pf-lane-pills"></div>
    </div>
    <div class="pf-step">
      <div class="pf-step-label">${t('pf_step4')}</div>
      <div id="pf-checklist"></div>
    </div>
    <div class="pf-generate-bar">
      <button class="btn-primary" id="pf-generate-btn">${t('pf_generate')}</button>
    </div>
  `

  qs('#pf-doctype-pills').onclick = e => {
    const b = e.target.closest('button[data-doctype]')
    if (!b) return
    pf.docType = b.dataset.doctype
    resetChecklistDefaults()
    renderDoctypeStep()
    renderChecklistStep()
    updateGenerateButtonState()
  }

  qs('#pf-lane-pills').onclick = e => {
    const b = e.target.closest('button[data-lane]')
    if (!b) return
    const lane = b.dataset.lane
    pf.lanes = pf.lanes.includes(lane) ? pf.lanes.filter(l => l !== lane) : [...pf.lanes, lane]
    resetChecklistDefaults()
    renderLaneStep()
    renderChecklistStep()
    updateGenerateButtonState()
  }

  qs('#pf-checklist').onchange = e => {
    const cb = e.target.closest('input[type="checkbox"]')
    if (!cb) return
    if (cb.checked) pf.checkedIds.add(cb.dataset.id)
    else pf.checkedIds.delete(cb.dataset.id)
  }

  qs('#pf-generate-btn').addEventListener('click', handleGenerate)

  renderCompanyStep()
  renderDoctypeStep()
  renderLaneStep()
  renderChecklistStep()
  updateGenerateButtonState()
}

function renderCompanyStep() {
  const wrap = qs('#pf-company-picker')
  if (pf.company) {
    wrap.innerHTML = `
      <div class="pf-company-selected">
        <span>${esc(pf.company.name)}${pf.company.contact_value ? ' — ' + esc(pf.company.contact_value) : ''}</span>
        <button id="pf-company-change" type="button">${t('pf_change')}</button>
      </div>`
    qs('#pf-company-change').addEventListener('click', () => {
      pf.company = null
      renderCompanyStep()
      updateGenerateButtonState()
    })
    return
  }

  wrap.innerHTML = `
    <div class="pf-company-search">
      <input class="field-input" id="pf-company-input" placeholder="${t('pf_company_search')}" autocomplete="off" />
      <div class="pf-company-results hidden" id="pf-company-results"></div>
    </div>`

  const input = qs('#pf-company-input')
  const results = qs('#pf-company-results')

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase()
    if (!q) { results.classList.add('hidden'); results.innerHTML = ''; return }
    const matches = companies.filter(c => c.name.toLowerCase().includes(q)).slice(0, 8)
    results.innerHTML = matches.length
      ? matches.map(c => `<div class="pf-company-result" data-id="${c.id}">${esc(c.name)}</div>`).join('')
      : `<div class="pf-company-result field-hint">${t('pf_no_matches')}</div>`
    results.classList.remove('hidden')
  })

  results.addEventListener('click', e => {
    const row = e.target.closest('.pf-company-result[data-id]')
    if (!row) return
    pf.company = companies.find(c => c.id === row.dataset.id) || null
    renderCompanyStep()
    updateGenerateButtonState()
  })

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) results.classList.add('hidden')
  })
}

function renderDoctypeStep() {
  qs('#pf-doctype-pills').innerHTML = `
    <button type="button" class="pill-btn${pf.docType === 'audit' ? ' active' : ''}" data-doctype="audit">${t('tab_audit')}</button>
    <button type="button" class="pill-btn${pf.docType === 'price_list' ? ' active' : ''}" data-doctype="price_list">${t('tab_price_list')}</button>
  `
}

function renderLaneStep() {
  qs('#pf-lane-pills').innerHTML = LANES.map(lane => `
    <button type="button" class="pill-btn${pf.lanes.includes(lane) ? ' active' : ''}" data-lane="${lane}">
      <span class="pf-lane-tag lane-${lane}"></span> ${t('lane_' + lane)}
    </button>`).join('') + (pf.lanes.length === 0 ? `<p class="field-hint">${t('pf_lanes_hint')}</p>` : '')
}

function checkRowHtml(item) {
  const checked = pf.checkedIds.has(item.id)
  return `
    <label class="pf-check-row">
      <input type="checkbox" data-id="${item.id}" ${checked ? 'checked' : ''} />
      <div class="pf-check-row-content">
        <div class="pf-check-row-title">
          <span class="pf-lane-tag lane-${item.lane}"></span>${esc(item.title)}${item.price ? ` <span class="pc-item-price">${esc(item.price)}</span>` : ''}
        </div>
        <div class="pf-check-row-body">${esc(item.body)}</div>
      </div>
    </label>`
}

function renderAuditChecklist() {
  return ['issue', 'recommendation'].map(cat => {
    const items = catalog
      .filter(r => r.doc_type === 'audit' && r.category === cat && pf.lanes.includes(r.lane))
      .sort(laneOrderThenSort)
    return `
      <div class="pf-checklist-group">
        <div class="pf-checklist-group-title">${t('cat_' + cat)}</div>
        ${items.length ? items.map(checkRowHtml).join('') : `<div class="field-hint">${t('pc_empty')}</div>`}
      </div>`
  }).join('')
}

function renderPriceListChecklist() {
  return pf.lanes.map(lane => {
    const items = catalog
      .filter(r => r.doc_type === 'price_list' && r.category === 'tier' && r.lane === lane)
      .sort((a, b) => a.sort_order - b.sort_order)
    return `
      <div class="pf-checklist-group">
        <div class="pf-checklist-group-title"><span class="pf-lane-tag lane-${lane}"></span> ${t('lane_' + lane)}</div>
        ${items.length ? items.map(checkRowHtml).join('') : `<div class="field-hint">${t('pc_empty')}</div>`}
      </div>`
  }).join('')
}

function renderChecklistStep() {
  qs('#pf-checklist').innerHTML = pf.docType === 'audit' ? renderAuditChecklist() : renderPriceListChecklist()
}

function updateGenerateButtonState() {
  qs('#pf-generate-btn').disabled = !pf.company || pf.lanes.length === 0
}

// ── Generate ──────────────────────────────────────────────────────────────

async function handleGenerate() {
  const btn = qs('#pf-generate-btn')
  const original = btn.textContent
  btn.disabled = true
  btn.textContent = t('pf_generating')

  try {
    const items = visibleCatalogItems()
      .filter(i => pf.checkedIds.has(i.id))
      .sort(laneOrderThenSort)
    await renderPrefilePdf({ company: pf.company, docType: pf.docType, lanes: pf.lanes, items, lang })
    btn.textContent = t('pf_generated')
    setTimeout(() => { btn.textContent = original; updateGenerateButtonState() }, 2000)
  } catch (err) {
    alert('PDF generation failed: ' + err.message)
    btn.textContent = original
    updateGenerateButtonState()
  }
}

document.addEventListener('DOMContentLoaded', init)
