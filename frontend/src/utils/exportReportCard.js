/**
 * Export Academic Report Card to Print/PDF
 * Complete Redesign - Professional A4 layout with template background
 * Supports single-term & annual (Portrait/Landscape) report cards
 *
 * Replace the existing file at: frontend/src/utils/exportReportCard.js
 */

// =========================================================================
// PUBLIC API
// =========================================================================

export const exportReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) { console.error('No report data to export'); return }
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const printWindow = openPrintWindow(orientation)
  if (!printWindow) { alert('Please allow pop-ups to print report card'); return }
  const { student, results, term, academic_year, school, verify_url } = reportData
  printWindow.document.write(buildSingleTerm(student, results, term, academic_year, school, watermarkUrl, verify_url, orientation))
  finishAndPrint(printWindow)
}

export const exportAnnualReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) { console.error('No report data to export'); return }
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const printWindow = openPrintWindow(orientation)
  if (!printWindow) { alert('Please allow pop-ups to print report card'); return }
  const { student, term1, term2, term3, academic_year, school, verify_url, annual_summary } = reportData
  const fn = orientation === 'landscape' ? buildAnnualLandscape : buildAnnualPortrait
  printWindow.document.write(fn(student, term1, term2, term3, academic_year, school, watermarkUrl, verify_url, annual_summary))
  finishAndPrint(printWindow)
}

// =========================================================================
// HELPERS
// =========================================================================

function openPrintWindow(orientation) {
  const w = orientation === 'landscape' ? 1100 : 900
  const h = orientation === 'landscape' ? 800 : 700
  return window.open('', '_blank', `width=${w},height=${h}`)
}

function finishAndPrint(win) {
  win.document.close()
  win.onload = () => { win.focus(); setTimeout(() => win.print(), 600) }
  setTimeout(() => { win.focus(); win.print() }, 1500)
}

function esc(str) { return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }

function getRemark(grade) {
  const m = { A:'Excellent', B:'Very Good', C:'Good', D:'Satisfactory', F:'Needs Improvement' }
  return m[grade] || ''
}

function getUniqueSubjects(t1, t2, t3) {
  const s = new Set()
  ;[t1,t2,t3].forEach(t => (t?.subjects||[]).forEach(x => { if (x.name) s.add(x.name) }))
  return [...s]
}

// =========================================================================
// SHARED BASE CSS – Full-page template background
// =========================================================================
const BASE_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust:exact; print-color-adjust:exact; margin:0; padding:0; }
    .no-print { display:none !important; }
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Georgia','Times New Roman',serif;font-size:11px;color:#1a1a1a;background:#e5e7eb;padding:10px;line-height:1.45}
  .page-wrapper{width:210mm;margin:0 auto}
  .page{position:relative;width:210mm;min-height:297mm;overflow:hidden;background:#fff}
  .watermark{position:absolute;inset:0;z-index:0}
  .watermark img{width:100%;height:100%;object-fit:fill;opacity:1;display:block}
  .content{position:absolute;inset:0;z-index:5;padding:34mm 18mm 25mm 18mm;background:transparent;display:flex;flex-direction:column}
  .spacer{flex:1;min-height:6px}

  .title{text-align:center;font-size:14px;font-weight:bold;margin:6px 0 3px;text-transform:uppercase;letter-spacing:3px;color:#1a3a6b}
  .subtitle{text-align:center;font-size:10px;margin-bottom:6px;color:#555}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:3px;margin-bottom:6px;font-size:10px;padding:5px 8px;background:transparent}
  .info-item{display:flex;align-items:center;padding:1px 0}
  .info-label{font-weight:bold;width:65px;font-size:9px;color:#444}

  table{width:100%;border-collapse:collapse;margin:6px 0;font-size:10px}
  th{background:rgba(20,60,140,.92);color:#fff;padding:4px 6px;text-align:left;font-size:8px;text-transform:uppercase;letter-spacing:1px}
  th.center{text-align:center}
  td{padding:3px 6px;border-bottom:1px solid #bbb;font-size:10px}
  td.center{text-align:center}
  tr:nth-child(even){background:rgba(248,249,250,.5)}
  .total-row{font-weight:bold;background:rgba(26,86,219,.12)!important;font-size:11px}
  .total-row td{padding:4px 6px;border-top:1.5px solid #1a56db}

  .summary-section{margin-top:6px;display:flex;gap:8px}
  .summary-box{flex:1;padding:5px 8px;background:transparent;font-size:10px}
  .summary-item{display:flex;padding:2px 0;border-bottom:1px dotted #bbb}
  .summary-item:last-child{border-bottom:none}
  .summary-label{font-weight:bold;width:70px;font-size:9px}
  .remarks-box{flex:1;padding:5px 8px;font-size:10px;background:transparent;min-height:35px}
  .remarks-box p{margin-top:3px;line-height:1.3}

  .verify-section{margin-top:6px;padding:4px 8px;background:transparent;text-align:center;font-size:8px}
  .verify-link{font-family:'Courier New',monospace;font-weight:bold;color:#1a56db;word-break:break-all;font-size:9px}

  .signatures{display:flex;justify-content:space-between;margin-top:12px;font-size:10px;padding:0 5px}
  .sig-box{text-align:center;width:40%}
  .sig-line{border-bottom:1px solid #000;margin-bottom:2px;height:20px}

  .next-term{text-align:center;font-size:8px;margin-top:6px;color:#555;font-weight:bold}
  .footer{text-align:center;font-size:7px;margin-top:4px;padding-top:3px;border-top:1px solid #bbb;color:#666}

  .pass{color:#059669;font-weight:bold}
  .fail{color:#dc2626;font-weight:bold}
  .promoted{color:#059669;font-weight:bold}
  .repeat{color:#dc2626;font-weight:bold}

  .print-toolbar{text-align:center;padding:8px;margin-top:10px;background:#f0f0f0;border-radius:6px}
  .btn{padding:8px 16px;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:bold;margin:3px}
  .btn-print{background:#2563eb;color:#fff}
  .btn-close{background:#6b7280;color:#fff}
`

// =========================================================================
// SINGLE-TERM REPORT
// =========================================================================
function buildSingleTerm(student, results, term, year, school, wm, verify, orient) {
  const subjects = results?.subjects || []
  const total = subjects.reduce((s,x)=>s+(parseFloat(x.score)||0),0)
  const pct = results?.percentage || (total>0?((total/(results?.total_max||subjects.reduce((s,x)=>s+(parseFloat(x.max_score)||0),0)))*100).toFixed(1):0)
  const pass = (results?.result||(pct>=50?'Pass':'Fail'))
  const cls = pass==='Pass'?'pass':'fail'
  const isLand = orient==='landscape'
  return `<!DOCTYPE html><html><head><title>Report Card - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    ${isLand?'.page-wrapper{width:297mm}.page{width:297mm;min-height:210mm}.content{padding:20mm 14mm 18mm 14mm}':''}
  </style></head><body><div class="page-wrapper"><div class="page"><div class="watermark"><img src="${esc(wm)}" alt=""></div><div class="content">
    <div class="title">ACADEMIC REPORT CARD</div><div class="subtitle">${esc(term)} &bull; ${esc(year)}</div>
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
    <div class="spacer"></div>
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
    <div class="footer"><p>${esc(school?.name)} | ${esc(year)} | Computer-generated Report Card</p>${verify?`<p style="color:#1a56db">Verify: ${esc(verify)}</p>`:''}</div>
  </div></div></div>
  <div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (${isLand?'Landscape':'Portrait'})</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div></body></html>`
}

// =========================================================================
// ANNUAL PORTRAIT
// =========================================================================
function buildAnnualPortrait(student, t1, t2, t3, year, school, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1,t2,t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')
  return `<!DOCTYPE html><html><head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    .info-grid{grid-template-columns:1fr 1fr 1fr 1fr}.info-item{flex-wrap:wrap}.info-label{width:auto;margin-right:3px}
    th{padding:3px 4px;font-size:7px}th.subject-col{text-align:left;padding-left:5px}
    td{padding:2px 4px;text-align:center;font-size:9px}td.subject-col{text-align:left;font-weight:bold;padding-left:5px}
    .total-row td{padding:3px 4px}.summary-row td{padding:2px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:8px}
    .annual-summary{margin-top:6px;padding:5px 8px;background:transparent;font-size:9px}
    .annual-summary h4{margin-bottom:2px;font-size:10px}.annual-summary p{font-size:9px;line-height:1.3;margin-bottom:2px}
    .remarks-section{margin-top:6px;padding:5px 8px;font-size:9px;min-height:30px;background:transparent;line-height:1.3}
    .signatures{margin-top:10px}.sig-box{width:30%}.sig-line{height:18px}
    .title{font-size:13px;margin:4px 0 2px}.subtitle{margin-bottom:4px;font-size:9px}
  </style></head><body><div class="page-wrapper"><div class="page"><div class="watermark"><img src="${esc(wm)}" alt=""></div><div class="content">
    <div class="title">ANNUAL ACADEMIC REPORT CARD</div><div class="subtitle">${esc(year)}</div>
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
    <div class="spacer"></div>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span></p><p><strong>Next:</strong> ${esc(annual.next_class||'N/A')} | ${esc(annual.remarks||'')}</p></div>`:''}
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    ${verify?`<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>`:''}
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name)} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db">Verify: ${esc(verify)}</p>`:''}</div>
  </div></div></div>
  <div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (Portrait)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div></body></html>`
}

// =========================================================================
// ANNUAL LANDSCAPE
// =========================================================================
function buildAnnualLandscape(student, t1, t2, t3, year, school, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1,t2,t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')
  return `<!DOCTYPE html><html><head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    .page-wrapper{width:297mm}.page{width:297mm;min-height:210mm}.content{padding:22mm 14mm 18mm 14mm}
    .info-grid{grid-template-columns:1fr 1fr 1fr}
    th{padding:3px 4px;font-size:7px}th.subject-col{text-align:left;padding-left:5px}
    td{padding:2px 4px;text-align:center;font-size:9px}td.subject-col{text-align:left;font-weight:bold;padding-left:5px}
    .total-row td{padding:3px 4px}.summary-row td{padding:2px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:8px}
    .annual-summary{margin-top:5px;padding:4px 6px;background:transparent;font-size:9px}
    .annual-summary h4{margin-bottom:1px;font-size:9px}.annual-summary p{font-size:8px;line-height:1.2;margin-bottom:1px}
    .remarks-section{margin-top:5px;padding:4px 6px;font-size:9px;min-height:25px;background:transparent}
    .signatures{margin-top:8px}.sig-line{height:16px}
    .title{font-size:13px;margin:3px 0 2px}.subtitle{margin-bottom:3px;font-size:9px}
  </style></head><body><div class="page-wrapper"><div class="page"><div class="watermark"><img src="${esc(wm)}" alt=""></div><div class="content">
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
    <div class="spacer"></div>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class||'N/A')}</p><p>${esc(annual.remarks||'')}</p></div>`:''}
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    ${verify?`<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>`:''}
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name)} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db">Verify: ${esc(verify)}</p>`:''}</div>
  </div></div></div>
  <div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (Landscape)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div></body></html>`
}
