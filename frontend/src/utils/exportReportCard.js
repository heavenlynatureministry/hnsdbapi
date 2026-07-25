/**
 * Export Academic Report Card to Print/PDF
 * Supports Portrait & Landscape for Single Term, Annual, and Nursery Certificate
 * Uses letter-head.jpg inside template border + ReportCardWM.jpg as full-page background
 * All content fits on ONE A4 page - Guaranteed single-page print (all browsers)
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
  const images = win.document.images
  let loadedCount = 0; const totalImages = images.length
  if (totalImages === 0) { setTimeout(() => { win.focus(); win.print() }, 600); return }
  function checkAllLoaded() { loadedCount++; if (loadedCount >= totalImages) { setTimeout(() => { win.focus(); win.print() }, 500) } }
  for (let i = 0; i < images.length; i++) { if (images[i].complete) { loadedCount++ } else { images[i].onload = checkAllLoaded; images[i].onerror = checkAllLoaded } }
  if (loadedCount >= totalImages) { setTimeout(() => { win.focus(); win.print() }, 600) }
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function getRemark(grade) { const m = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Satisfactory', F: 'Needs Improvement' }; return m[grade] || '' }
function getUniqueSubjects(t1, t2, t3) { const s = new Set(); [t1, t2, t3].forEach(t => (t?.subjects || []).forEach(x => { if (x.name) s.add(x.name) })); return [...s] }

// =========================================================================
// BASE CSS
// =========================================================================
const BASE_CSS = `
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      margin: 0 !important; padding: 0 !important; 
      background: white !important;
      width: 100% !important; height: 100% !important;
      overflow: hidden !important;
      -webkit-transform: none !important; transform: none !important;
    }
    .no-print { display: none !important; }
    .page-wrapper, .page, .content { 
      page-break-after: avoid !important; page-break-inside: avoid !important; page-break-before: avoid !important;
      break-after: avoid !important; break-inside: avoid !important; break-before: avoid !important;
    }
    .content > * { page-break-inside: avoid !important; break-inside: avoid !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Georgia', 'Times New Roman', serif; 
    font-size: 13px; color: #1a1a1a; background: #e5e7eb; 
    padding: 8px; line-height: 1.5; 
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page-wrapper { margin: 0 auto; }
  .page { position: relative; background: transparent; }
  .watermark { position: absolute; inset: 0; z-index: 0; }
  .watermark img { width: 100%; height: 100%; object-fit: fill; opacity: 1; display: block; }
  .content { position: absolute; inset: 0; z-index: 5; background: transparent; display: flex; flex-direction: column; }
  .spacer { flex: 1 1 auto; min-height: 4px; }
  
  .letterhead { text-align: center; margin-bottom: 5px; padding-bottom: 3px; border-bottom: 2px double #1a56db; flex-shrink: 0; }
  .letterhead img { width: 100%; height: auto; display: block; }
  .letterhead-fallback { display: none; text-align: center; padding: 1mm 0; }
  
  .title { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 4px; color: #1a3a6b; flex-shrink: 0; }
  .subtitle { text-align: center; font-size: 12px; margin-bottom: 8px; color: #555; flex-shrink: 0; }
  
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 8px; font-size: 13px; padding: 5px 10px; background: transparent; flex-shrink: 0; }
  .info-item { display: flex; align-items: center; padding: 2px 0; }
  .info-label { font-weight: bold; width: 72px; font-size: 11px; color: #444; }
  
  .section-spacer { height: 4mm; flex-shrink: 0; }
  .section-divider { height: 4mm; flex-shrink: 0; border-bottom: 1px solid #ddd; margin-bottom: 3mm; }

  table { width: 100%; border-collapse: collapse; margin: 5px 0; font-size: 13px; flex-shrink: 0; }
  th { background: rgba(20,60,140,0.92); color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
  th.center, th.term-col { text-align: center; }
  td { padding: 4px 8px; border-bottom: 1px solid #bbb; font-size: 13px; }
  td.center, td.term-col { text-align: center; }
  tr:nth-child(even) { background: rgba(248,249,250,0.5); }
  .total-row { font-weight: bold; background: rgba(26,86,219,0.12)!important; font-size: 14px; }
  .total-row td { padding: 5px 8px; border-top: 2px solid #1a56db; }
  
  .summary-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; flex-shrink: 0; }
  .summary-table td { padding: 3px 8px; border-bottom: 1px dotted #ccc; }
  .summary-table td.label { font-weight: bold; width: 35%; color: #444; font-size: 11px; }
  .summary-table td.value { text-align: right; font-weight: bold; font-size: 12px; }
  .summary-table tr:last-child td { border-bottom: none; }
  
  .remarks-section { margin-top: 5px; padding: 6px 10px; font-size: 12px; background: transparent; min-height: 32px; flex-shrink: 0; line-height: 1.5; }
  .remarks-section p { margin-top: 4px; line-height: 1.5; }
  
  .signatures { display: flex; justify-content: space-between; margin-top: 12px; font-size: 12px; padding: 0 10px; flex-shrink: 0; }
  .sig-box { text-align: center; width: 40%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 4px; height: 20px; }
  
  .next-term { text-align: center; font-size: 10px; margin-top: 6px; color: #555; font-weight: bold; flex-shrink: 0; }
  .footer { text-align: center; font-size: 9px; margin-top: 4px; padding-top: 4px; border-top: 1px solid #bbb; color: #666; flex-shrink: 0; line-height: 1.4; }
  
  .pass { color: #059669; font-weight: bold; }
  .fail { color: #dc2626; font-weight: bold; }
  .promoted { color: #059669; font-weight: bold; }
  .repeat { color: #dc2626; font-weight: bold; }
  
  .print-toolbar { text-align: center; padding: 10px; margin-top: 12px; background: #f0f0f0; border-radius: 8px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
`

const PORTRAIT_PAGE = `.page-wrapper{width:210mm}.page{width:210mm;height:297mm;max-height:297mm;overflow:hidden}.content{padding:16mm 14mm 14mm 14mm;height:100%;overflow:hidden}`
const LANDSCAPE_PAGE = `.page-wrapper{width:297mm}.page{width:297mm;height:210mm;max-height:210mm;overflow:hidden}.content{padding:12mm 14mm 10mm 14mm;height:100%;overflow:hidden}`

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
  const pageCSS = isLand ? LANDSCAPE_PAGE : PORTRAIT_PAGE

  return `<!DOCTYPE html><html>
<head><title>Report Card - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}${pageCSS}</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt="" onerror="this.style.display='none'"></div>
  <div class="content">
    <div class="letterhead">
      <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:15px;">${esc(school?.name||'School Name')}</h2><p style="font-size:10px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
    <div class="title">ACADEMIC REPORT CARD</div>
    <div class="subtitle">${esc(term)} &bull; ${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
      <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(results?.conduct||'Good')}</span></div>
    </div>
    <div class="section-divider"></div>
    <table><thead><tr><th>SUBJECTS</th><th class="center">MARKS</th><th>REMARKS</th></tr></thead><tbody>
      ${subjects.map(s=>`<tr><td><strong>${esc(s.name||s.subject)}</strong></td><td class="center">${s.score||0}</td><td>${getRemark(s.grade)}</td></tr>`).join('')}
      <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${total}</strong></td><td class="${cls}"><strong>${pass.toUpperCase()}</strong></td></tr>
    </tbody></table>
    <div class="section-spacer"></div>
    <table class="summary-table">
      <tr><td class="label">Percentage:</td><td class="value">${pct}%</td></tr>
      <tr><td class="label">Position:</td><td class="value">${esc(results?.position||'N/A')}</td></tr>
      <tr><td class="label">Out of:</td><td class="value">${esc(results?.out_of||'N/A')}</td></tr>
      <tr><td class="label">Result:</td><td class="value ${cls}">${pass}</td></tr>
    </table>
    <div class="section-spacer"></div>
    <div class="remarks-section"><strong>Director of Studies' Remarks:</strong><p>${esc(results?.remarks)||'________________________________'}</p></div>
    <div class="spacer"></div>
    <div class="section-divider"></div>
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
    </div>
    <div class="section-spacer"></div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name||'School')} | ${esc(year)} | Computer-generated Report Card</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
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
    return `<tr><td class="subject-col">${esc(subj)}</td><td class="term-col">${a.score||'-'}</td><td class="term-col">${b.score||'-'}</td><td class="term-col">${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    ${PORTRAIT_PAGE}
    .info-grid{grid-template-columns:1fr 1fr}
    th{padding:3px 4px;font-size:8px;text-align:center}th.subject-col{text-align:left;padding-left:4px}
    td{padding:2px 4px;text-align:center;font-size:10px}td.subject-col{text-align:left;font-weight:bold;padding-left:4px}
    td.term-col{text-align:center;font-weight:500}
    .total-row td{padding:3px 4px}.summary-row td{padding:2px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:9px}
    .annual-summary{margin:6px 0;padding:5px 8px;background:transparent;font-size:10px;border:1px solid #1a56db;flex-shrink:0}
    .annual-summary h4{margin-bottom:2px;font-size:11px;color:#1a3a6b}.annual-summary p{font-size:10px;line-height:1.3;margin-bottom:1px}
    .remarks-section{margin-top:4px;padding:3px 8px;font-size:10px;min-height:22px;background:transparent;line-height:1.3;flex-shrink:0}
    .signatures{margin-top:8px}.sig-box{width:30%}.sig-line{height:16px}
    .title{font-size:14px;margin:3px 0 2px}.subtitle{font-size:10px;margin-bottom:3px}
  </style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt="" onerror="this.style.display='none'"></div>
  <div class="content">
    <div class="letterhead"><img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="letterhead-fallback"><h2 style="font-size:13px;">${esc(school?.name||'School Name')}</h2><p style="font-size:8px;"><em>"${esc(school?.motto||'')}"</em></p></div></div>
    <div class="title">ANNUAL ACADEMIC REPORT CARD</div><div class="subtitle">${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
      <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(student?.conduct||'Good')}</span></div>
    </div>
    <div class="section-divider"></div>
    <table><thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td class="term-col"><strong>${t1?.total_score||'-'}</strong></td><td class="term-col"><strong>${t2?.total_score||'-'}</strong></td><td class="term-col"><strong>${t3?.total_score||'-'}</strong></td></tr>
      <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td class="term-col">${esc(t1?.percentage||'N/A')}%</td><td class="term-col">${esc(t2?.percentage||'N/A')}%</td><td class="term-col">${esc(t3?.percentage||'N/A')}%</td></tr>
      <tr class="summary-row"><td class="subject-col">POSITION</td><td class="term-col">${esc(t1?.position||'N/A')}</td><td class="term-col">${esc(t2?.position||'N/A')}</td><td class="term-col">${esc(t3?.position||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">OUT OF</td><td class="term-col">${esc(t1?.out_of||'N/A')}</td><td class="term-col">${esc(t2?.out_of||'N/A')}</td><td class="term-col">${esc(t3?.out_of||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">RESULT</td>
        <td class="term-col"><strong style="color:${t1?.result==='Pass'?'#059669':'#dc2626'}">${esc(t1?.result||'N/A')}</strong></td>
        <td class="term-col"><strong style="color:${t2?.result==='Pass'?'#059669':'#dc2626'}">${esc(t2?.result||'N/A')}</strong></td>
        <td class="term-col"><strong style="color:${t3?.result==='Pass'?'#059669':'#dc2626'}">${esc(t3?.result||'N/A')}</strong></td>
      </tr>
    </tbody></table>
    <div class="section-spacer"></div>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class||'N/A')}</p><p>${esc(annual.remarks||'')}</p></div>`:''}
    <div class="section-spacer"></div>
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    <div class="spacer"></div>
    <div class="section-divider"></div>
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="section-spacer"></div>
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
    return `<tr><td class="subject-col">${esc(subj)}</td><td class="term-col">${a.score||'-'}</td><td class="term-col">${b.score||'-'}</td><td class="term-col">${c.score||'-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Annual Report - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}
    ${LANDSCAPE_PAGE}
    .info-grid{grid-template-columns:1fr 1fr}
    th{padding:3px 4px;font-size:8px;text-align:center}th.subject-col{text-align:left;padding-left:4px}
    td{padding:2px 4px;text-align:center;font-size:10px}td.subject-col{text-align:left;font-weight:bold;padding-left:4px}
    td.term-col{text-align:center;font-weight:500}
    .total-row td{padding:3px 4px}.summary-row td{padding:2px 4px;background:rgba(240,244,255,.5);font-weight:bold;font-size:9px}
    .annual-summary{margin:4px 0;padding:3px 6px;background:transparent;font-size:9px;border:1px solid #1a56db;flex-shrink:0}
    .annual-summary h4{margin-bottom:1px;font-size:10px;color:#1a3a6b}.annual-summary p{font-size:9px;line-height:1.2;margin-bottom:1px}
    .remarks-section{margin-top:3px;padding:2px 6px;font-size:9px;min-height:20px;background:transparent;line-height:1.2;flex-shrink:0}
    .signatures{margin-top:6px}.sig-box{width:30%}.sig-line{height:14px}
    .title{font-size:13px;margin:2px 0 1px}.subtitle{font-size:9px;margin-bottom:2px}
  </style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt="" onerror="this.style.display='none'"></div>
  <div class="content">
    <div class="letterhead"><img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><div class="letterhead-fallback"><h2 style="font-size:12px;">${esc(school?.name||'School Name')}</h2><p style="font-size:7px;"><em>"${esc(school?.motto||'')}"</em></p></div></div>
    <div class="title">ANNUAL ACADEMIC REPORT CARD ${esc(year)}</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
      <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
      <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
      <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(student?.conduct||'Good')}</span></div>
    </div>
    <div class="section-divider"></div>
    <table><thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td class="term-col"><strong>${t1?.total_score||'-'}</strong></td><td class="term-col"><strong>${t2?.total_score||'-'}</strong></td><td class="term-col"><strong>${t3?.total_score||'-'}</strong></td></tr>
      <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td class="term-col">${esc(t1?.percentage||'N/A')}%</td><td class="term-col">${esc(t2?.percentage||'N/A')}%</td><td class="term-col">${esc(t3?.percentage||'N/A')}%</td></tr>
      <tr class="summary-row"><td class="subject-col">POSITION</td><td class="term-col">${esc(t1?.position||'N/A')}</td><td class="term-col">${esc(t2?.position||'N/A')}</td><td class="term-col">${esc(t3?.position||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">OUT OF</td><td class="term-col">${esc(t1?.out_of||'N/A')}</td><td class="term-col">${esc(t2?.out_of||'N/A')}</td><td class="term-col">${esc(t3?.out_of||'N/A')}</td></tr>
      <tr class="summary-row"><td class="subject-col">RESULT</td>
        <td class="term-col"><strong style="color:${t1?.result==='Pass'?'#059669':'#dc2626'}">${esc(t1?.result||'N/A')}</strong></td>
        <td class="term-col"><strong style="color:${t2?.result==='Pass'?'#059669':'#dc2626'}">${esc(t2?.result||'N/A')}</strong></td>
        <td class="term-col"><strong style="color:${t3?.result==='Pass'?'#059669':'#dc2626'}">${esc(t3?.result||'N/A')}</strong></td>
      </tr>
    </tbody></table>
    <div class="section-spacer"></div>
    ${annual?`<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage||'N/A'}% | <strong>Grade:</strong> ${annual.grade||'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status==='Promoted'?'promoted':'repeat'}">${annual.promotion_status||'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class||'N/A')}</p><p>${esc(annual.remarks||'')}</p></div>`:''}
    <div class="section-spacer"></div>
    <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks||t2?.remarks||t1?.remarks)||'________________________________'}</div>
    <div class="spacer"></div>
    <div class="section-divider"></div>
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    <div class="section-spacer"></div>
    <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1]||new Date().getFullYear()+1)}</div>
    <div class="footer"><p>${esc(school?.name||'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify?`<p style="color:#1a56db;">Verify: ${esc(verify)}</p>`:''}</div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
