/**
 * Export Academic Report Card to Print/PDF
 * CSS Grid A4 layout – Single page guaranteed for both Portrait & Landscape
 * Uses letter-head.jpg + ReportCardWM.jpg as full-page template background
 *
 * Replace: frontend/src/utils/exportReportCard.js
 */

// =========================================================================
// PUBLIC API
// =========================================================================

export const exportReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) { console.error('No report data to export'); return }
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const isLandscape = orientation === 'landscape'
  const printWindow = window.open('', '_blank', `width=${isLandscape ? 1100 : 900},height=${isLandscape ? 800 : 700}`)
  if (!printWindow) { alert('Please allow pop-ups to print report card'); return }
  const { student, results, term, academic_year, school, verify_url } = reportData
  printWindow.document.write(buildSingleTerm(student, results, term, academic_year, school, letterheadUrl, watermarkUrl, verify_url, orientation))
  finishAndPrint(printWindow)
}

export const exportAnnualReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) { console.error('No report data to export'); return }
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const isLandscape = orientation === 'landscape'
  const printWindow = window.open('', '_blank', `width=${isLandscape ? 1100 : 900},height=${isLandscape ? 800 : 700}`)
  if (!printWindow) { alert('Please allow pop-ups to print report card'); return }
  const { student, term1, term2, term3, academic_year, school, verify_url, annual_summary } = reportData
  const html = orientation === 'landscape'
    ? buildAnnualLandscape(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary)
    : buildAnnualPortrait(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary)
  printWindow.document.write(html)
  finishAndPrint(printWindow)
}

// =========================================================================
// HELPERS
// =========================================================================

function finishAndPrint(win) {
  win.document.close()
  win.onload = () => { win.focus(); setTimeout(() => win.print(), 600) }
  setTimeout(() => { win.focus(); win.print() }, 1500)
}

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function getRemark(grade) {
  const m = { A:'Excellent', B:'Very Good', C:'Good', D:'Satisfactory', F:'Needs Improvement' }
  return m[grade] || ''
}

function getUniqueSubjects(t1, t2, t3) {
  const s = new Set()
  ;[t1,t2,t3].forEach(t => (t?.subjects||[]).forEach(x => { if(x.name) s.add(x.name) }))
  return [...s]
}

// =========================================================================
// SHARED GRID CSS – True A4, never overflows
// =========================================================================
const GRID_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; margin:0; padding:0; }
    .no-print { display:none !important; }
  }
  *,*::before,*::after { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Georgia','Times New Roman',serif;
    font-size:13px;
    color:#1a1a1a;
    background:#e5e7eb;
    padding:10px;
    line-height:1.45;
  }

  .page-wrapper { margin:0 auto; }

  /* Absolute positioned watermark */
  .page {
    position:relative;
    overflow:hidden;
    background:#fff;
  }
  .watermark {
    position:absolute; inset:0; z-index:0;
  }
  .watermark img {
    width:100%; height:100%; object-fit:fill; opacity:1; display:block;
  }

  /* Grid fills entire page exactly */
  .grid {
    position:absolute; inset:0; z-index:5;
    display:grid;
    background:transparent;
  }

  /* Shared children */
  .letterhead {
    text-align:center;
    padding-bottom:2px;
    border-bottom:1.5px double #1a56db;
    overflow:hidden;
  }
  .letterhead img {
    width:100%;
    max-height:38mm;
    object-fit:contain;
    display:block;
  }
  .letterhead-fallback { display:none; text-align:center; padding:2mm 0; }

  .title {
    text-align:center;
    font-size:16px;
    font-weight:bold;
    text-transform:uppercase;
    letter-spacing:3px;
    color:#1a3a6b;
  }
  .subtitle {
    text-align:center;
    font-size:12px;
    color:#555;
  }

  .info-grid {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:2px;
    font-size:12px;
    padding:4px 8px;
    background:transparent;
  }
  .info-item { display:flex; align-items:center; padding:1px 0; }
  .info-label { font-weight:bold; width:72px; font-size:11px; color:#444; }

  table { width:100%; border-collapse:collapse; font-size:12px; }
  th {
    background:rgba(20,60,140,.92); color:#fff;
    padding:4px 6px; text-align:left; font-size:9px;
    text-transform:uppercase; letter-spacing:1px;
  }
  th.center { text-align:center; }
  td { padding:3px 6px; border-bottom:1px solid #bbb; font-size:12px; }
  td.center { text-align:center; }
  tr:nth-child(even) { background:rgba(248,249,250,.5); }
  .total-row {
    font-weight:bold; background:rgba(26,86,219,.12)!important; font-size:13px;
  }
  .total-row td { padding:4px 6px; border-top:2px solid #1a56db; }

  .summary-section { display:flex; gap:8px; }
  .summary-box { flex:1; padding:4px 8px; background:transparent; font-size:12px; }
  .summary-item { display:flex; padding:2px 0; border-bottom:1px dotted #bbb; }
  .summary-item:last-child { border-bottom:none; }
  .summary-label { font-weight:bold; width:76px; font-size:10px; }
  .remarks-box { flex:1; padding:4px 8px; font-size:12px; background:transparent; }
  .remarks-box p { margin-top:3px; line-height:1.35; }

  .verify-section { padding:3px 8px; background:transparent; text-align:center; font-size:9px; }
  .verify-link { font-family:'Courier New',monospace; font-weight:bold; color:#1a56db; word-break:break-all; font-size:10px; }

  .signatures { display:flex; justify-content:space-between; font-size:11px; padding:0 8px; }
  .sig-box { text-align:center; width:40%; }
  .sig-line { border-bottom:1.5px solid #000; margin-bottom:3px; height:18px; }

  .next-term { text-align:center; font-size:9px; color:#555; font-weight:bold; }
  .footer { text-align:center; font-size:8px; padding-top:2px; border-top:1px solid #bbb; color:#666; }

  .pass { color:#059669; font-weight:bold; }
  .fail { color:#dc2626; font-weight:bold; }
  .promoted { color:#059669; font-weight:bold; }
  .repeat { color:#dc2626; font-weight:bold; }

  .print-toolbar { text-align:center; padding:8px; margin-top:10px; background:#f0f0f0; border-radius:6px; }
  .btn { padding:9px 18px; border:none; border-radius:5px; cursor:pointer; font-size:12px; font-weight:bold; margin:3px; }
  .btn-print { background:#2563eb; color:#fff; }
  .btn-close { background:#6b7280; color:#fff; }
`

// =========================================================================
// PORTRAIT GRID TEMPLATE (fixed row heights = exact A4)
// =========================================================================
const PORTRAIT_GRID = `
  .page-wrapper{width:210mm;}.page{width:210mm;height:297mm;}
  .grid{
    grid-template-rows:
      40mm   /* letterhead */
      auto   /* title+subtitle */
      auto   /* info */
      1fr    /* table (grows) */
      auto   /* summary+remarks */
      auto   /* verify */
      auto   /* signatures */
      auto   /* next-term */
      auto;  /* footer */
    padding:10mm 14mm 8mm 14mm;
    gap:3px;
  }
`

// =========================================================================
// LANDSCAPE GRID TEMPLATE
// =========================================================================
const LANDSCAPE_GRID = `
  .page-wrapper{width:297mm;}.page{width:297mm;height:210mm;}
  .grid{
    grid-template-rows:
      30mm   /* letterhead */
      auto   /* title+subtitle */
      auto   /* info */
      1fr    /* table */
      auto   /* summary */
      auto   /* verify */
      auto   /* signatures */
      auto   /* next-term */
      auto;  /* footer */
    padding:8mm 14mm 6mm 14mm;
    gap:2px;
  }
`

// =========================================================================
// SINGLE TERM – Portrait / Landscape
// =========================================================================
function buildSingleTerm(student, results, term, year, school, letterhead, wm, verify, orientation) {
  const subjects = results?.subjects || []
  const total = subjects.reduce((s,x) => s + (parseFloat(x.score)||0), 0)
  const maxTotal = results?.total_max || subjects.reduce((s,x) => s + (parseFloat(x.max_score)||0), 0)
  const pct = results?.percentage || (maxTotal > 0 ? ((total/maxTotal)*100).toFixed(1) : 0)
  const pass = results?.result || (pct >= 50 ? 'Pass' : 'Fail')
  const cls = pass === 'Pass' ? 'pass' : 'fail'
  const isLand = orientation === 'landscape'

  return `<!DOCTYPE html><html>
<head><title>Report Card - ${esc(student?.name)}</title><meta charset="utf-8">
<style>${GRID_CSS}${isLand ? LANDSCAPE_GRID : PORTRAIT_GRID}</style></head>
<body>
<div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="grid">
    <div class="letterhead">
      <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:14px;">${esc(school?.name||'School Name')}</h2><p style="font-size:10px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
    <div class="title">ACADEMIC REPORT CARD</div>
    <div class="subtitle">${esc(term)} &bull; ${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
      <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(results?.conduct||'Good')}</span></div>
    </div>
    <table><thead><tr><th>SUBJECTS</th><th class="center">MARKS</th><th>REMARKS</th></tr></thead><tbody>
      ${subjects.map(s=>`<tr><td><strong>${esc(s.name||s.subject)}</strong></td><td class="center">${s.score||0}</td><td>${getRemark(s.grade)}</td></tr>`).join('')}
      <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${total}</strong></td><td class="${cls}"><strong>${pass.toUpperCase()}</strong></td></tr>
    </tbody></table>
    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-item"><span class="summary-label">Percentage:</span><span><strong>${pct}%</strong></span></div>
        <div class="summary-item"><span class="summary-label">Position:</span><span><strong>${esc(results?.position||'N/A')}</strong></span></div>
        <div class="summary-item"><span class="summary-label">Out of:</span><span><strong>${esc(results?.out_of||'N/A')}</strong></span></div>
        <div class="summary-item"><span class="summary-label">Result:</span><span class="${cls}"><strong>${pass}</strong></span></div>
      </div>
      <div class="remarks-box"><strong>Remarks:</strong><p>${esc(results?.remarks)||'________________________________'}</p></div>
    </div>
    ${verify?`<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>`:''}
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
    </div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name||'School')} | ${esc(year)} | Computer-generated Report Card</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 ${isLand?'Landscape':'Portrait'})</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}

// =========================================================================
// ANNUAL PORTRAIT
// =========================================================================
function buildAnnualPortrait(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1,t2,t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8">
<style>${GRID_CSS}
  .page-wrapper{width:210mm}.page{width:210mm;height:297mm}
  .grid{grid-template-rows:38mm auto auto 1fr auto auto auto auto auto;padding:10mm 12mm 7mm 12mm;gap:2px}
  .info-grid{grid-template-columns:1fr 1fr 1fr 1fr}.info-item{flex-wrap:wrap}.info-label{width:auto;margin-right:3px;font-size:9px}
  th{padding:4px 3px;font-size:7px}th.subject-col{text-align:left;padding-left:5px}
  td{padding:3px 3px;text-align:center;font-size:10px}td.subject-col{text-align:left;font-weight:bold;padding-left:5px}
  .total-row td{padding:4px 3px}.summary-row td{padding:3px 3px;background:rgba(240,244,255,.5);font-weight:bold;font-size:9px}
  .annual-summary{padding:5px 8px;background:transparent;font-size:10px;border:1px solid #1a56db;line-height:1.3}
  .annual-summary h4{margin-bottom:2px;font-size:11px;color:#1a3a6b}.annual-summary p{font-size:10px;margin-bottom:2px}
  .remarks-section{padding:4px 8px;font-size:10px;background:transparent;line-height:1.3}
  .signatures{margin-top:0}.sig-box{width:30%}.sig-line{height:16px}
  .title{font-size:14px}.subtitle{font-size:10px}
</style></head>
<body>
<div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="grid">
    <div class="letterhead">
      <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:13px;">${esc(school?.name||'School Name')}</h2><p style="font-size:9px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
    <div class="title">ANNUAL ACADEMIC REPORT CARD</div>
    <div class="subtitle">${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
      <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(student?.conduct||'Good')}</span></div>
    </div>
    <table><thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${t1?.total_score||'-'}</strong></td><td><strong>${t2?.total_score||'-'}</strong></td><td><strong>${t3?.total_score||'-'}</strong></td></tr>
      <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${esc(t1?.percentage||'N/A')}%</td><td>${esc(t2?.percentage||'N/A')}%</td><td>${esc(t3?.percentage||'N/A')}%</td></tr>
      <tr class="summary-row"><td class="subject-col">POSITION</td><td>${esc(t1?.position||'N/A')}</td><td>${esc(t2?.position||'N/A')}</td><td>${esc(t3?.position||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${esc(t1?.out_of||'N/A')}</td><td>${esc(t2?.out_of||'N/A')}</td><td>${esc(t3?.out_of||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">RESULT</td>
        <td><strong style="color:${t1?.result==='Pass'?'#059669':'#dc2626'}">${esc(t1?.result||'N/A')}</strong></td>
        <td><strong style="color:${t2?.result==='Pass'?'#059669':'#dc2626'}">${esc(t2?.result||'N/A')}</strong></td>
        <td><strong style="color:${t3?.result==='Pass'?'#059669':'#dc2626'}">${esc(t3?.result||'N/A')}</strong></td>
      </tr>
    </tbody></table>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class||'N/A')}</p><p>${esc(annual.remarks||'')}</p></div>`:''}
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    ${verify?`<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>`:''}
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name||'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 Portrait)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}

// =========================================================================
// ANNUAL LANDSCAPE
// =========================================================================
function buildAnnualLandscape(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1,t2,t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8">
<style>${GRID_CSS}
  .page-wrapper{width:297mm}.page{width:297mm;height:210mm}
  .grid{grid-template-rows:28mm auto auto 1fr auto auto auto auto auto;padding:8mm 12mm 5mm 12mm;gap:1px}
  .info-grid{grid-template-columns:1fr 1fr 1fr}
  th{padding:4px 4px;font-size:7px}th.subject-col{text-align:left;padding-left:5px}
  td{padding:3px 4px;text-align:center;font-size:10px}td.subject-col{text-align:left;font-weight:bold;padding-left:5px}
  .total-row td{padding:4px 4px}.summary-row td{padding:3px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:9px}
  .annual-summary{padding:4px 6px;background:transparent;font-size:9px;border:1px solid #1a56db;line-height:1.2}
  .annual-summary h4{margin-bottom:1px;font-size:10px;color:#1a3a6b}.annual-summary p{font-size:9px;margin-bottom:1px}
  .remarks-section{padding:3px 6px;font-size:9px;background:transparent;line-height:1.2}
  .signatures{margin-top:0}.sig-box{width:30%}.sig-line{height:14px}
  .title{font-size:13px}.subtitle{font-size:9px}
</style></head>
<body>
<div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="grid">
    <div class="letterhead">
      <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:12px;">${esc(school?.name||'School Name')}</h2><p style="font-size:8px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
    <div class="title">ANNUAL ACADEMIC REPORT CARD ${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
    </div>
    <table><thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${t1?.total_score||'-'}</strong></td><td><strong>${t2?.total_score||'-'}</strong></td><td><strong>${t3?.total_score||'-'}</strong></td></tr>
      <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${esc(t1?.percentage||'N/A')}%</td><td>${esc(t2?.percentage||'N/A')}%</td><td>${esc(t3?.percentage||'N/A')}%</td></tr>
      <tr class="summary-row"><td class="subject-col">POSITION</td><td>${esc(t1?.position||'N/A')}</td><td>${esc(t2?.position||'N/A')}</td><td>${esc(t3?.position||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${esc(t1?.out_of||'N/A')}</td><td>${esc(t2?.out_of||'N/A')}</td><td>${esc(t3?.out_of||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">RESULT</td>
        <td><strong style="color:${t1?.result==='Pass'?'#059669':'#dc2626'}">${esc(t1?.result||'N/A')}</strong></td>
        <td><strong style="color:${t2?.result==='Pass'?'#059669':'#dc2626'}">${esc(t2?.result||'N/A')}</strong></td>
        <td><strong style="color:${t3?.result==='Pass'?'#059669':'#dc2626'}">${esc(t3?.result||'N/A')}</strong></td>
      </tr>
    </tbody></table>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class||'N/A')}</p><p>${esc(annual.remarks||'')}</p></div>`:''}
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    ${verify?`<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>`:''}
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name||'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 Landscape)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
