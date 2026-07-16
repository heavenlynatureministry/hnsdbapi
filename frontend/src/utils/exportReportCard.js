/**
 * Export Academic Report Card to Print/PDF
 * Supports Portrait & Landscape for both Single Term & Annual Report Cards
 * Uses letter-head.jpg inside template border + ReportCardWM.jpg as full-page background
 * All content fits on ONE A4 page
 *
 * Replace the existing file at: frontend/src/utils/exportReportCard.js
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
  finishAndPrint(printWindow, isLandscape)
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
  finishAndPrint(printWindow, isLandscape)
}

// =========================================================================
// HELPERS
// =========================================================================

function finishAndPrint(win, isLandscape) {
  win.document.close()
  
  // ✅ Wait for images to load before printing
  const images = win.document.images
  let loadedCount = 0
  const totalImages = images.length
  
  if (totalImages === 0) {
    // No images, print immediately
    setTimeout(() => {
      win.focus()
      win.print()
      // Don't auto-close - let user close manually
    }, 400)
    return
  }
  
  // Track image loading
  for (let i = 0; i < images.length; i++) {
    if (images[i].complete) {
      loadedCount++
    } else {
      images[i].onload = () => {
        loadedCount++
        if (loadedCount >= totalImages) {
          setTimeout(() => {
            win.focus()
            win.print()
          }, 300)
        }
      }
      images[i].onerror = () => {
        loadedCount++
        if (loadedCount >= totalImages) {
          setTimeout(() => {
            win.focus()
            win.print()
          }, 300)
        }
      }
    }
  }
  
  // If all already loaded
  if (loadedCount >= totalImages) {
    setTimeout(() => {
      win.focus()
      win.print()
    }, 400)
  }
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function getRemark(grade) {
  const m = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Satisfactory', F: 'Needs Improvement' }
  return m[grade] || ''
}

function getUniqueSubjects(t1, t2, t3) {
  const s = new Set()
  ;[t1, t2, t3].forEach(t => (t?.subjects || []).forEach(x => { if (x.name) s.add(x.name) }))
  return [...s]
}

// =========================================================================
// BASE CSS
// =========================================================================
const BASE_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 13px;
    color: #1a1a1a;
    background: #e5e7eb;
    padding: 10px;
    line-height: 1.55;
  }
  .page-wrapper { margin: 0 auto; }
  .page { position: relative; overflow: hidden; background: #fff; }
  .watermark { position: absolute; inset: 0; z-index: 0; }
  .watermark img { width: 100%; height: 100%; object-fit: fill; opacity: 1; display: block; }
  .content {
    position: absolute; inset: 0; z-index: 5;
    background: transparent;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .spacer { flex: 1 1 auto; min-height: 2px; }
  .letterhead { text-align: center; margin-bottom: 6px; padding-bottom: 3px; border-bottom: 1.5px double #1a56db; flex-shrink: 0; }
  .letterhead img { width: 100%; height: auto; display: block; }
  .letterhead-fallback { display: none; text-align: center; padding: 3mm 0; }
  .title { text-align: center; font-size: 17px; font-weight: bold; margin: 6px 0 3px; text-transform: uppercase; letter-spacing: 3px; color: #1a3a6b; flex-shrink: 0; }
  .subtitle { text-align: center; font-size: 13px; margin-bottom: 6px; color: #555; flex-shrink: 0; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 6px; font-size: 13px; padding: 5px 10px; background: transparent; flex-shrink: 0; }
  .info-item { display: flex; align-items: center; padding: 2px 0; }
  .info-label { font-weight: bold; width: 75px; font-size: 12px; color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 13px; flex-shrink: 0; }
  th { background: rgba(20,60,140,0.92); color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  th.center { text-align: center; }
  td { padding: 5px 8px; border-bottom: 1px solid #bbb; font-size: 13px; }
  td.center { text-align: center; }
  tr:nth-child(even) { background: rgba(248,249,250,0.5); }
  .total-row { font-weight: bold; background: rgba(26,86,219,0.12)!important; font-size: 14px; }
  .total-row td { padding: 6px 8px; border-top: 2px solid #1a56db; }
  .summary-section { margin-top: 4px; display: flex; gap: 10px; flex-shrink: 0; }
  .summary-box { flex: 1; padding: 5px 10px; background: transparent; font-size: 13px; }
  .summary-item { display: flex; padding: 3px 0; border-bottom: 1px dotted #bbb; }
  .summary-item:last-child { border-bottom: none; }
  .summary-label { font-weight: bold; width: 80px; font-size: 11px; }
  .remarks-box { flex: 1; padding: 5px 10px; font-size: 13px; background: transparent; min-height: 38px; }
  .remarks-box p { margin-top: 4px; line-height: 1.4; }
  .verify-section { margin-top: 6px; padding: 4px 10px; background: transparent; text-align: center; font-size: 10px; flex-shrink: 0; }
  .verify-link { font-family: 'Courier New',monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 11px; }
  .signatures { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; padding: 0 10px; flex-shrink: 0; }
  .sig-box { text-align: center; width: 40%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 4px; height: 22px; }
  .next-term { text-align: center; font-size: 10px; margin-top: 6px; color: #555; font-weight: bold; flex-shrink: 0; }
  .footer { text-align: center; font-size: 9px; margin-top: 4px; padding-top: 3px; border-top: 1px solid #bbb; color: #666; flex-shrink: 0; }
  .pass { color: #059669; font-weight: bold; }
  .fail { color: #dc2626; font-weight: bold; }
  .promoted { color: #059669; font-weight: bold; }
  .repeat { color: #dc2626; font-weight: bold; }
  .print-toolbar { text-align: center; padding: 10px; margin-top: 12px; background: #f0f0f0; border-radius: 8px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 4px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
`

// =========================================================================
// SINGLE-TERM REPORT
// =========================================================================
function buildSingleTerm(student, results, term, year, school, letterhead, wm, verify, orientation) {
  const subjects = results?.subjects || []
  const total = subjects.reduce((s, x) => s + (parseFloat(x.score) || 0), 0)
  const maxTotal = results?.total_max || subjects.reduce((s, x) => s + (parseFloat(x.max_score) || 0), 0)
  const pct = results?.percentage || (maxTotal > 0 ? ((total / maxTotal) * 100).toFixed(1) : 0)
  const pass = (results?.result || (pct >= 50 ? 'Pass' : 'Fail'))
  const cls = pass === 'Pass' ? 'pass' : 'fail'
  const isLand = orientation === 'landscape'

  const pageCSS = isLand
    ? `.page-wrapper{width:297mm}.page{width:297mm;height:210mm}.content{padding:14mm 16mm 14mm 16mm}`
    : `.page-wrapper{width:210mm}.page{width:210mm;height:297mm}.content{padding:16mm 16mm 16mm 16mm}`

  return `<!DOCTYPE html><html>
<head><title>Report Card - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}${pageCSS}</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="content">
    <div class="letterhead">
      <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:15px;">${esc(school?.name||'School Name')}</h2><p style="font-size:10px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
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
    <div class="footer"><p>${esc(school?.name||'School')} | ${esc(year)} | Computer-generated Report Card</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print">
  <button class="btn btn-print" onclick="window.print()">🖨️ Print</button>
  <button class="btn btn-close" onclick="window.close()">✕ Close</button>
</div></body></html>`
}

// =========================================================================
// ANNUAL PORTRAIT
// =========================================================================
function buildAnnualPortrait(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1, t2, t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    .page-wrapper{width:210mm}.page{width:210mm;height:297mm}.content{padding:16mm 12mm 16mm 12mm}
    .info-grid{grid-template-columns:1fr 1fr 1fr 1fr}.info-item{flex-wrap:wrap}.info-label{width:auto;margin-right:3px;font-size:10px}
    th{padding:5px 4px;font-size:8px}th.subject-col{text-align:left;padding-left:6px}
    td{padding:4px 4px;text-align:center;font-size:11px}td.subject-col{text-align:left;font-weight:bold;padding-left:6px}
    .total-row td{padding:5px 4px}.summary-row td{padding:4px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:10px}
    .annual-summary{margin-top:4px;padding:6px 8px;background:transparent;font-size:11px;border:1px solid #1a56db;flex-shrink:0}
    .annual-summary h4{margin-bottom:3px;font-size:12px;color:#1a3a6b}.annual-summary p{font-size:11px;line-height:1.35;margin-bottom:2px}
    .remarks-section{margin-top:4px;padding:5px 8px;font-size:11px;min-height:30px;background:transparent;line-height:1.35;flex-shrink:0}
    .signatures{margin-top:10px}.sig-box{width:30%}.sig-line{height:20px}
    .title{font-size:15px;margin:4px 0 2px}.subtitle{font-size:11px;margin-bottom:4px}
  </style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="content">
    <div class="letterhead"><img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="letterhead-fallback"><h2 style="font-size:14px;">${esc(school?.name||'School Name')}</h2><p style="font-size:9px;"><em>"${esc(school?.motto||'')}"</em></p></div></div>
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
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}

// =========================================================================
// ANNUAL LANDSCAPE
// =========================================================================
function buildAnnualLandscape(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1, t2, t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (t2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (t3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score||'-'}</td><td>${b.score||'-'}</td><td>${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    .page-wrapper{width:297mm}.page{width:297mm;height:210mm}.content{padding:14mm 14mm 14mm 14mm}
    .info-grid{grid-template-columns:1fr 1fr 1fr}
    th{padding:5px 5px;font-size:8px}th.subject-col{text-align:left;padding-left:6px}
    td{padding:4px 5px;text-align:center;font-size:11px}td.subject-col{text-align:left;font-weight:bold;padding-left:6px}
    .total-row td{padding:5px 5px}.summary-row td{padding:4px 5px;background:rgba(240,244,255,.5);font-weight:bold;font-size:10px}
    .annual-summary{margin-top:4px;padding:5px 8px;background:transparent;font-size:10px;border:1px solid #1a56db;flex-shrink:0}
    .annual-summary h4{margin-bottom:2px;font-size:11px;color:#1a3a6b}.annual-summary p{font-size:10px;line-height:1.3;margin-bottom:2px}
    .remarks-section{margin-top:4px;padding:4px 8px;font-size:10px;min-height:26px;background:transparent;line-height:1.3;flex-shrink:0}
    .signatures{margin-top:8px}.sig-box{width:30%}.sig-line{height:18px}
    .title{font-size:14px;margin:3px 0 2px}.subtitle{font-size:10px;margin-bottom:3px}
  </style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="content">
    <div class="letterhead"><img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="letterhead-fallback"><h2 style="font-size:13px;">${esc(school?.name||'School Name')}</h2><p style="font-size:8px;"><em>"${esc(school?.motto||'')}"</em></p></div></div>
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
    <div class="footer"><p>${esc(school?.name||'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
