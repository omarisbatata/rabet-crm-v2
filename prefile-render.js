// Prefile PDF rendering — plain JS templates (no React, no build step; same
// approach as audit.js), captured via html2canvas and assembled with jsPDF.
// Fully client-side, zero network dependency beyond loading the two CDN
// libraries in prefile.html. No AI dependency anywhere in this file.
//
// Depends on globals defined in prefile.js (esc, qs, qsa, LANES) — loaded on
// the same page, same cross-script global pattern already used between
// app.js and audit.js.

const PF_PAGE_W = 794   // A4 @ 96dpi
const PF_PAGE_H = 1123
const PF_PAGE_PAD = 56

const PF_LANE_COLOR = { web: '#F84828', social: '#08B0A0', video: '#0C3A30' }

const PF_MONTHS_EN = ['January','February','March','April','May','June','July','August','September','October','November','December']
const PF_MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر']

const PF_AUDIT_INTRO = {
  en: "This audit covers what's working today, what's likely costing you inquiries, and where we'd suggest starting. No commitment attached — take what's useful.",
  ar: 'يغطي هذا التدقيق ما يعمل بشكل جيد اليوم، وما قد يكلفك فرص تواصل مع عملاء، ومن أين نقترح البدء. بدون أي التزام — خذ ما يفيدك.',
}

function formatPfDate(lang) {
  const d = new Date()
  const months = lang === 'ar' ? PF_MONTHS_AR : PF_MONTHS_EN
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

function pfLaneLabel(lane, rtl) {
  const names = {
    web:    rtl ? 'الويب والمنتج' : 'WEB & PRODUCT',
    social: rtl ? 'السوشال ميديا والمحتوى' : 'SOCIAL & CONTENT',
    video:  rtl ? 'الفيديو والإنتاج' : 'VIDEO & PRODUCTION',
  }
  return names[lane]
}

function pfLaneName(lane, rtl) {
  const names = {
    web:    rtl ? 'الويب' : 'Web',
    social: rtl ? 'السوشال ميديا' : 'Social',
    video:  rtl ? 'الفيديو' : 'Video',
  }
  return names[lane]
}

// ── Auto-composed Bottom Line (audit only) ──────────────────────────────

function composeBottomLine(checkedIssues, lanes, lang) {
  const rtl = lang === 'ar'
  const laneList = lanes.map(l => pfLaneName(l, rtl)).join(rtl ? '، ' : ', ')
  const n = checkedIssues.length
  const paragraph = rtl
    ? `راجعنا ${laneList} ووجدنا ${n} ${n === 1 ? 'مشكلة تستحق الاهتمام' : 'مشاكل تستحق الاهتمام'}. لا يوجد أي التزام هنا — خذ ما يفيدك وابدأ من حيث تريد.`
    : `We reviewed ${laneList} and found ${n} issue${n === 1 ? '' : 's'} worth addressing. No commitment here — take what's useful and start wherever makes sense.`
  const priorities = checkedIssues.slice(0, 3).map(i => i.title)
  return { paragraph, priorities }
}

// ── Pagination (measures real DOM to bucket items into page-sized chunks) ─

function paginateItems(items, itemHtmlFn, firstPageHeight, otherPageHeight, gap, rtl) {
  if (!items.length) return []
  const root = qs('#pf-render-root')
  const measure = document.createElement('div')
  measure.style.width = (PF_PAGE_W - 2 * PF_PAGE_PAD) + 'px'
  measure.style.position = 'absolute'
  measure.style.visibility = 'hidden'
  measure.style.fontFamily = rtl ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif"
  measure.dir = rtl ? 'rtl' : 'ltr'
  root.appendChild(measure)

  const pages = []
  let current = []
  let currentHeight = 0
  let availableHeight = firstPageHeight

  items.forEach(item => {
    measure.innerHTML = itemHtmlFn(item)
    const h = measure.firstElementChild.offsetHeight
    const addGap = current.length ? gap : 0
    if (current.length && currentHeight + addGap + h > availableHeight) {
      pages.push(current)
      current = []
      currentHeight = 0
      availableHeight = otherPageHeight
    }
    current.push(item)
    currentHeight += (current.length > 1 ? gap : 0) + h
  })
  if (current.length) pages.push(current)

  root.removeChild(measure)
  return pages
}

// ── Shared page fragments ────────────────────────────────────────────────

function pfCoverPageHtml({ company, docType, lang }) {
  const rtl = lang === 'ar'
  const metaLeft  = rtl ? 'وكالة رقمية' : 'DIGITAL AGENCY'
  const metaRight = rtl ? 'دمشق · العالم' : 'DAMASCUS · WORLDWIDE'
  const title = docType === 'audit'
    ? (rtl ? 'تدقيق التسويق' : 'MARKETING AUDIT')
    : (rtl ? 'قائمة الأسعار' : 'PRICE LIST')
  const pill = docType === 'audit'
    ? (rtl ? 'تدقيق مجاني — بلا التزام' : 'Free Audit — No Obligation')
    : (rtl ? 'أسعار محدثة' : 'Current Pricing')
  const clientDisplay = rtl ? (company.name || '') : (company.name || '').toUpperCase()
  const sub = rtl
    ? `أُعِدّ لـ ${esc(company.name)} من قبل وكالة رابط الرقمية، دمشق`
    : `Prepared for ${esc(company.name)} by Rabet Digital Agency, Damascus`
  const footerLeft  = rtl ? 'رابط — مبني ليصل' : 'RABET — BUILT TO CONNECT'
  const footerRight = formatPfDate(lang)

  return `
    <div class="pf-pdf-page pf-pdf-cover" dir="${rtl ? 'rtl' : 'ltr'}">
      <div class="pf-pdf-cover-meta pf-pdf-mono"><span>${metaLeft}</span><span>${metaRight}</span></div>
      <div class="pf-pdf-cover-center">
        <div class="pf-pdf-cover-mark">رابط</div>
        <div class="pf-pdf-cover-title pf-pdf-mono">${title}</div>
        <div class="pf-pdf-cover-client">${esc(clientDisplay)}</div>
        <div class="pf-pdf-cover-pill">${pill}</div>
        <div class="pf-pdf-cover-sub">${sub}</div>
      </div>
      <div class="pf-pdf-cover-footer pf-pdf-mono"><strong>${footerLeft}</strong><span>${footerRight}</span></div>
    </div>`
}

function pfHeaderHtml(company, lang, docLabel) {
  const rtl = lang === 'ar'
  const client = rtl ? (company.name || '') : (company.name || '').toUpperCase()
  const label = rtl ? `رابط — ${docLabel.ar}` : `RABET — ${docLabel.en}`
  return `<div class="pf-pdf-header pf-pdf-mono"><strong>${label}</strong><span>${esc(client)}</span></div>`
}

function pfClosingPageHtml({ company, lang }) {
  const rtl = lang === 'ar'
  const title = rtl ? 'لنبدأ' : "Let's build this"
  const sub = rtl
    ? `تواصل معنا لتحديد الخيار المناسب لـ ${esc(company.name)}، أو لطرح أي أسئلة.`
    : `Reach out to lock in the right option for ${esc(company.name)}, or just ask questions.`
  const contact = rtl
    ? 'عمر شلق · 965 779 981 963+ · oshalak@hotmail.com'
    : 'Omar Shalak · +963 981 779 965 · oshalak@hotmail.com'
  return `
    <div class="pf-pdf-page pf-pdf-closing" dir="${rtl ? 'rtl' : 'ltr'}">
      <div class="pf-pdf-cover-mark" style="margin-bottom:24px;">رابط</div>
      <div class="pf-pdf-closing-title">${title}</div>
      <div class="pf-pdf-closing-sub">${sub}</div>
      <div class="pf-pdf-closing-contact pf-pdf-mono">${contact}</div>
    </div>`
}

// ── Audit document ───────────────────────────────────────────────────────

function pfAuditItemHtml(item) {
  return `
    <div class="pf-pdf-item">
      <div class="pf-pdf-item-index pf-pdf-mono">${item._n}</div>
      <div>
        <div class="pf-pdf-item-title"><span class="pf-lane-tag lane-${item.lane}"></span>${esc(item.title)}</div>
        <div class="pf-pdf-item-body">${esc(item.body)}</div>
      </div>
    </div>`
}

function buildAuditPages({ company, lanes, items, lang }) {
  const rtl = lang === 'ar'
  const docLabel = { en: 'WEBSITE AUDIT', ar: 'تدقيق الموقع' }
  const issues = items.filter(i => i.category === 'issue').map((it, i) => ({ ...it, _n: i + 1 }))
  const recs   = items.filter(i => i.category === 'recommendation').map((it, i) => ({ ...it, _n: i + 1 }))

  const CONTENT_H = PF_PAGE_H - 2 * PF_PAGE_PAD
  const HEADER_H = 60, TAGHEAD_H = 60, INTRO_H = 90, CONTINUED_H = 30, GAP = 16

  const issuePages = paginateItems(issues, pfAuditItemHtml, CONTENT_H - HEADER_H - TAGHEAD_H - INTRO_H, CONTENT_H - HEADER_H - CONTINUED_H, GAP, rtl)
  const recPages   = paginateItems(recs, pfAuditItemHtml, CONTENT_H - HEADER_H - TAGHEAD_H, CONTENT_H - HEADER_H - CONTINUED_H, GAP, rtl)

  const pages = [pfCoverPageHtml({ company, docType: 'audit', lang })]

  const issueTag = rtl ? 'المشاكل' : 'ISSUES'
  const issueHeading = rtl ? `تم رصد ${issues.length} ${issues.length === 1 ? 'مشكلة' : 'مشاكل'}` : `${issues.length} issue${issues.length === 1 ? '' : 's'} worth addressing`
  issuePages.forEach((pageItems, pi) => {
    pages.push(`
      <div class="pf-pdf-page pf-pdf-content" dir="${rtl ? 'rtl' : 'ltr'}">
        ${pfHeaderHtml(company, lang, docLabel)}
        ${pi === 0
          ? `<div class="pf-pdf-intro">${esc(PF_AUDIT_INTRO[lang])}</div><div class="pf-pdf-tag">${issueTag}</div><div class="pf-pdf-heading">${issueHeading}</div>`
          : `<div class="pf-pdf-continued pf-pdf-mono">${issueTag} — ${rtl ? 'تابع' : 'continued'}</div>`}
        <div class="pf-pdf-items">${pageItems.map(pfAuditItemHtml).join('')}</div>
      </div>`)
  })

  const recTag = rtl ? 'التوصيات' : 'RECOMMENDATIONS'
  const recHeading = rtl ? 'ما نقترح إضافته' : 'Worth adding'
  recPages.forEach((pageItems, pi) => {
    pages.push(`
      <div class="pf-pdf-page pf-pdf-content" dir="${rtl ? 'rtl' : 'ltr'}">
        ${pfHeaderHtml(company, lang, docLabel)}
        ${pi === 0
          ? `<div class="pf-pdf-tag">${recTag}</div><div class="pf-pdf-heading">${recHeading}</div>`
          : `<div class="pf-pdf-continued pf-pdf-mono">${recTag} — ${rtl ? 'تابع' : 'continued'}</div>`}
        <div class="pf-pdf-items">${pageItems.map(pfAuditItemHtml).join('')}</div>
      </div>`)
  })

  const { paragraph, priorities } = composeBottomLine(issues, lanes, lang)
  const blTag = rtl ? 'الخلاصة' : 'BOTTOM LINE'
  const contact = rtl
    ? 'وكالة رابط الرقمية — دمشق، سوريا   عمر شلق · 965 779 981 963+ · oshalak@hotmail.com'
    : 'Rabet Digital Agency — Damascus, Syria   Omar Shalak · +963 981 779 965 · oshalak@hotmail.com'

  pages.push(`
    <div class="pf-pdf-page pf-pdf-content" dir="${rtl ? 'rtl' : 'ltr'}">
      ${pfHeaderHtml(company, lang, docLabel)}
      <div class="pf-pdf-bottomline">
        <div class="pf-pdf-tag">${blTag}</div>
        <p>${esc(paragraph)}</p>
        <div class="pf-pdf-priorities">
          ${priorities.map((p, i) => `<div class="pf-pdf-priority"><span class="pf-pdf-priority-index pf-pdf-mono">${i + 1}</span><span>${esc(p)}</span></div>`).join('')}
        </div>
      </div>
      <div class="pf-pdf-footer">${contact}</div>
    </div>`)

  return pages
}

// ── Price List document ──────────────────────────────────────────────────

function pfTierItemHtml(item) {
  const color = PF_LANE_COLOR[item.lane]
  return `
    <div class="pf-pdf-item">
      <div class="pf-pdf-item-index pf-pdf-mono" style="border-color:${color};color:${color};">${item._n}</div>
      <div>
        <div class="pf-pdf-item-title">${esc(item.title)}${item.price ? ` <span class="pf-pdf-item-price" style="color:${color};">${esc(item.price)}</span>` : ''}</div>
        <div class="pf-pdf-item-body">${esc(item.body)}</div>
      </div>
    </div>`
}

function buildPriceListPages({ company, lanes, items, lang }) {
  const rtl = lang === 'ar'
  const docLabel = { en: 'PRICE LIST', ar: 'قائمة الأسعار' }
  const CONTENT_H = PF_PAGE_H - 2 * PF_PAGE_PAD
  const HEADER_H = 60, LANEHEAD_H = 70, CONTINUED_H = 30, GAP = 16

  const pages = [pfCoverPageHtml({ company, docType: 'price_list', lang })]

  LANES.forEach(lane => {
    if (!lanes.includes(lane)) return
    const laneItems = items.filter(i => i.lane === lane).map((it, i) => ({ ...it, _n: i + 1 }))
    if (!laneItems.length) return

    const color = PF_LANE_COLOR[lane]
    const lanePages = paginateItems(laneItems, pfTierItemHtml, CONTENT_H - HEADER_H - LANEHEAD_H, CONTENT_H - HEADER_H - CONTINUED_H, GAP, rtl)

    lanePages.forEach((pageItems, pi) => {
      pages.push(`
        <div class="pf-pdf-page pf-pdf-content" dir="${rtl ? 'rtl' : 'ltr'}">
          ${pfHeaderHtml(company, lang, docLabel)}
          ${pi === 0
            ? `<div class="pf-pdf-lane-pill" style="background:${color}22;color:${color};border:1px solid ${color};">${pfLaneLabel(lane, rtl)}</div>`
            : `<div class="pf-pdf-continued pf-pdf-mono">${pfLaneLabel(lane, rtl)} — ${rtl ? 'تابع' : 'continued'}</div>`}
          <div class="pf-pdf-items">${pageItems.map(pfTierItemHtml).join('')}</div>
        </div>`)
    })
  })

  pages.push(pfClosingPageHtml({ company, lang }))
  return pages
}

// ── Export ────────────────────────────────────────────────────────────────

async function renderPrefilePdf({ company, docType, lanes, items, lang }) {
  const root = qs('#pf-render-root')
  if (document.fonts && document.fonts.ready) await document.fonts.ready

  const pagesHtml = docType === 'audit'
    ? buildAuditPages({ company, lanes, items, lang })
    : buildPriceListPages({ company, lanes, items, lang })

  root.innerHTML = pagesHtml.join('')
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  const pageEls = qsa('#pf-render-root .pf-pdf-page')
  const pdf = new jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true })
  for (let i = 0; i < pageEls.length; i++) {
    const canvas = await html2canvas(pageEls[i], { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    if (i > 0) pdf.addPage()
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297)
  }

  root.innerHTML = ''
  const docLabel = docType === 'audit' ? 'Audit' : 'Price List'
  pdf.save(`${docLabel} - ${company.name || 'Client'}.pdf`)
}
