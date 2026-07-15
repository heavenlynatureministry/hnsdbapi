/**
 * Export Academic Report Card to Print/PDF
 * Supports Portrait & Landscape for both Single Term & Annual Report Cards
 * Uses letter-head.jpg at top + ReportCardWM.jpg as full-page template background
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
// BASE CSS – Letterhead + watermark template background
// =========================================================================
const BASE_CSS = `
  @page { size: A4; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Georgia', 'Times New Roman', serif;
    font-size: 12px;
    color: #1a1a1a;
    background: #e5e7eb;
    padding: 10px;
    line-height: 1.5;
  }
  
  /* Letterhead at top */
  .letterhead {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    z-index: 10;
  }
  .letterhead img {
    width: 100%;
    height: auto;
    display: block;
  }
  .letterhead-fallback {
    display: none;
    text-align: center;
    padding: 8mm 18mm;
    border-bottom: 2px double #1a56db;
  }
  
  /* Full-page watermark template */
  .watermark {
    position: absolute;
    inset: 0;
    z-index: 0;
  }
  .watermark img {
    width: 100%;
    height: 100%;
    object-fit: fill;
    opacity: 1;
    display: block;
  }
  
  /* Content inside printable area */
  .content {
    position: absolute;
    inset: 0;
    z-index: 5;
    background: transparent;
    display: flex;
    flex-direction: column;
  }
  .spacer { flex: 1; min-height: 8px; }

  .title {
    text-align: center;
    font-size: 16px;
    font-weight: bold;
    margin: 8px 0 4px;
    text-transform: uppercase;
    letter-spacing: 4px;
    color: #1a3a6b;
  }
  .subtitle {
    text-align: center;
    font-size: 12px;
    margin-bottom: 8px;
    color: #555;
  }
  
  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    margin-bottom: 8px;
    font-size: 12px;
    padding: 6px 10px;
    background: transparent;
  }
  .info-item { display: flex; align-items: center; padding: 2px 0; }
  .info-label { font-weight: bold; width: 75px; font-size: 11px; color: #444; }

  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th {
    background: rgba(20, 60, 140, 0.92);
    color: #fff;
    padding: 6px 8px;
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  th.center { text-align: center; }
  td { padding: 5px 8px; border-bottom: 1px solid #bbb; font-size: 12px; }
  td.center { text-align: center; }
  tr:nth-child(even) { background: rgba(248, 249, 250, 0.5); }
  .total-row {
    font-weight: bold;
    background: rgba(26, 86, 219, 0.12) !important;
    font-size: 13px;
  }
  .total-row td { padding: 6px 8px; border-top: 2px solid #1a56db; }

  .summary-section { margin-top: 8px; display: flex; gap: 10px; }
  .summary-box { flex: 1; padding: 6px 10px; background: transparent; font-size: 12px; }
  .summary-item { display: flex; padding: 3px 0; border-bottom: 1px dotted #bbb; }
  .summary-item:last-child { border-bottom: none; }
  .summary-label { font-weight: bold; width: 80px; font-size: 11px; }
  .remarks-box { flex: 1; padding: 6px 10px; font-size: 12px; background: transparent; min-height: 40px; }
  .remarks-box p { margin-top: 4px; line-height: 1.4; }

  .verify-section { margin-top: 8px; padding: 5px 10px; background: transparent; text-align: center; font-size: 10px; }
  .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 11px; }

  .signatures { display: flex; justify-content: space-between; margin-top: 16px; font-size: 12px; padding: 0 10px; }
  .sig-box { text-align: center; width: 40%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 4px; height: 24px; }

  .next-term { text-align: center; font-size: 10px; margin-top: 8px; color: #555; font-weight: bold; }
  .footer { text-align: center; font-size: 9px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #bbb; color: #666; }

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
    ? `.page-wrapper{width:297mm}.page{width:297mm;min-height:210mm}.content{padding:20mm 14mm 18mm 14mm}`
    : `.page-wrapper{width:210mm}.page{width:210mm;min-height:297mm}.content{padding:34mm 18mm 22mm 18mm}`

  return `<!DOCTYPE html>
<html>
<head>
  <title>Report Card - ${esc(student?.name)}</title>
  <meta charset="utf-8">
  <style>${BASE_CSS}${pageCSS}</style>
</head>
<body>
  <div class="page-wrapper">
    <div class="page">
      <div class="watermark"><img src="${esc(wm)}" alt=""></div>
      <div class="letterhead">
        <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="letterhead-fallback">
          <h2 style="font-size:16px;">${esc(school?.name || 'School Name')}</h2>
          <p style="font-size:11px;"><em>"${esc(school?.motto || '')}"</em></p>
        </div>
      </div>
      <div class="content">
        <div class="title">ACADEMIC REPORT CARD</div>
        <div class="subtitle">${esc(term)} &bull; ${esc(year)}</div>

        <div class="info-grid">
          <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
          <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
          <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
          <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(results?.conduct || 'Good')}</span></div>
        </div>

        <table>
          <thead><tr><th>SUBJECTS</th><th class="center">MARKS</th><th>REMARKS</th></tr></thead>
          <tbody>
            ${subjects.map(s => `<tr><td><strong>${esc(s.name || s.subject)}</strong></td><td class="center">${s.score || 0}</td><td>${getRemark(s.grade)}</td></tr>`).join('')}
            <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${total}</strong></td><td class="${cls}"><strong>${pass.toUpperCase()}</strong></td></tr>
          </tbody>
        </table>

        <div class="spacer"></div>

        <div class="summary-section">
          <div class="summary-box">
            <div class="summary-item"><span class="summary-label">Percentage:</span><span><strong>${pct}%</strong></span></div>
            <div class="summary-item"><span class="summary-label">Position:</span><span><strong>${esc(results?.position || 'N/A')}</strong></span></div>
            <div class="summary-item"><span class="summary-label">Out of:</span><span><strong>${esc(results?.out_of || 'N/A')}</strong></span></div>
            <div class="summary-item"><span class="summary-label">Result:</span><span class="${cls}"><strong>${pass}</strong></span></div>
          </div>
          <div class="remarks-box"><strong>Remarks:</strong><p>${esc(results?.remarks) || '________________________________'}</p></div>
        </div>

        ${verify ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>` : ''}

        <div class="signatures">
          <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
          <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
        </div>

        <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1] || new Date().getFullYear() + 1)}</div>
        <div class="footer">
          <p>${esc(school?.name || 'School')} | ${esc(year)} | Computer-generated Report Card</p>
          ${verify ? `<p style="color:#1a56db;">Verify: ${esc(verify)}</p>` : ''}
        </div>
      </div>
    </div>
  </div>
  <div class="print-toolbar no-print">
    <button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 ${isLand ? 'Landscape' : 'Portrait'})</button>
    <button class="btn btn-close" onclick="window.close()">✕ Close</button>
  </div>
</body>
</html>`
}

// =========================================================================
// ANNUAL PORTRAIT
// =========================================================================
function buildAnnualPortrait(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1, t2, t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects || []).find(s => s.name === subj) || {}
    const b = (t2?.subjects || []).find(s => s.name === subj) || {}
    const c = (t3?.subjects || []).find(s => s.name === subj) || {}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score || '-'}</td><td>${b.score || '-'}</td><td>${c.score || '-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Annual Report - ${esc(student?.name)}</title>
  <meta charset="utf-8">
  <style>
    ${BASE_CSS}
    .page-wrapper{width:210mm}.page{width:210mm;min-height:297mm}.content{padding:34mm 16mm 20mm 16mm}
    .info-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
    .info-item { flex-wrap: wrap; }
    .info-label { width: auto; margin-right: 4px; }
    th { padding: 5px 6px; font-size: 9px; }
    th.subject-col { text-align: left; padding-left: 8px; }
    td { padding: 4px 6px; text-align: center; font-size: 11px; }
    td.subject-col { text-align: left; font-weight: bold; padding-left: 8px; }
    .total-row td { padding: 5px 6px; }
    .summary-row td { padding: 4px 6px; background: rgba(240, 244, 255, 0.5); font-weight: bold; font-size: 10px; }
    .annual-summary { margin-top: 8px; padding: 8px 10px; background: transparent; font-size: 11px; border: 1px solid #1a56db; }
    .annual-summary h4 { margin-bottom: 4px; font-size: 13px; color: #1a3a6b; }
    .annual-summary p { font-size: 11px; line-height: 1.4; margin-bottom: 3px; }
    .remarks-section { margin-top: 8px; padding: 6px 10px; font-size: 11px; min-height: 35px; background: transparent; line-height: 1.4; }
    .signatures { margin-top: 14px; }
    .sig-box { width: 30%; }
    .sig-line { height: 22px; }
    .title { font-size: 15px; margin: 6px 0 3px; }
    .subtitle { font-size: 11px; margin-bottom: 6px; }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="page">
      <div class="watermark"><img src="${esc(wm)}" alt=""></div>
      <div class="letterhead">
        <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="letterhead-fallback"><h2 style="font-size:15px;">${esc(school?.name || 'School Name')}</h2><p style="font-size:10px;"><em>"${esc(school?.motto || '')}"</em></p></div>
      </div>
      <div class="content">
        <div class="title">ANNUAL ACADEMIC REPORT CARD</div>
        <div class="subtitle">${esc(year)}</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
          <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
          <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
          <div class="info-item"><span class="info-label">Conduct:</span><span>${esc(student?.conduct || 'Good')}</span></div>
        </div>
        <table>
          <thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${t1?.total_score || '-'}</strong></td><td><strong>${t2?.total_score || '-'}</strong></td><td><strong>${t3?.total_score || '-'}</strong></td></tr>
            <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${esc(t1?.percentage || 'N/A')}%</td><td>${esc(t2?.percentage || 'N/A')}%</td><td>${esc(t3?.percentage || 'N/A')}%</td></tr>
            <tr class="summary-row"><td class="subject-col">POSITION</td><td>${esc(t1?.position || 'N/A')}</td><td>${esc(t2?.position || 'N/A')}</td><td>${esc(t3?.position || 'N/A')}</td></tr>
            <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${esc(t1?.out_of || 'N/A')}</td><td>${esc(t2?.out_of || 'N/A')}</td><td>${esc(t3?.out_of || 'N/A')}</td></tr>
            <tr class="summary-row"><td class="subject-col">RESULT</td>
              <td><strong style="color:${t1?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t1?.result || 'N/A')}</strong></td>
              <td><strong style="color:${t2?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t2?.result || 'N/A')}</strong></td>
              <td><strong style="color:${t3?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t3?.result || 'N/A')}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="spacer"></div>
        ${annual ? `<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Average:</strong> ${annual.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual.grade || 'N/A'}</p><p><strong>Status:</strong> <span class="${annual.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual.promotion_status || 'N/A'}</span> | <strong>Next Class:</strong> ${esc(annual.next_class || 'N/A')}</p><p><strong>Remarks:</strong> ${esc(annual.remarks || '')}</p></div>` : ''}
        <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks || t2?.remarks || t1?.remarks) || '________________________________'}</div>
        ${verify ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>` : ''}
        <div class="signatures">
          <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
          <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
          <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
        </div>
        <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1] || new Date().getFullYear() + 1)}</div>
        <div class="footer"><p>${esc(school?.name || 'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify ? `<p style="color:#1a56db;">Verify: ${esc(verify)}</p>` : ''}</div>
      </div>
    </div>
  </div>
  <div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 Portrait)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body>
</html>`
}

// =========================================================================
// ANNUAL LANDSCAPE
// =========================================================================
function buildAnnualLandscape(student, t1, t2, t3, year, school, letterhead, wm, verify, annual) {
  const subjects = getUniqueSubjects(t1, t2, t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects || []).find(s => s.name === subj) || {}
    const b = (t2?.subjects || []).find(s => s.name === subj) || {}
    const c = (t3?.subjects || []).find(s => s.name === subj) || {}
    return `<tr><td class="subject-col">${esc(subj)}</td><td>${a.score || '-'}</td><td>${b.score || '-'}</td><td>${c.score || '-'}</td></tr>`
  }).join('')

  return `<!DOCTYPE html>
<html>
<head>
  <title>Annual Report - ${esc(student?.name)}</title>
  <meta charset="utf-8">
  <style>
    ${BASE_CSS}
    .page-wrapper{width:297mm}.page{width:297mm;min-height:210mm}.content{padding:22mm 14mm 16mm 14mm}
    .info-grid { grid-template-columns: 1fr 1fr 1fr; }
    th { padding: 4px 5px; font-size: 8px; }
    th.subject-col { text-align: left; padding-left: 6px; }
    td { padding: 3px 5px; text-align: center; font-size: 10px; }
    td.subject-col { text-align: left; font-weight: bold; padding-left: 6px; }
    .total-row td { padding: 4px 5px; }
    .summary-row td { padding: 3px 5px; background: rgba(240, 244, 255, 0.5); font-weight: bold; font-size: 9px; }
    .annual-summary { margin-top: 6px; padding: 6px 8px; background: transparent; font-size: 10px; border: 1px solid #1a56db; }
    .annual-summary h4 { margin-bottom: 2px; font-size: 11px; color: #1a3a6b; }
    .annual-summary p { font-size: 10px; line-height: 1.3; margin-bottom: 2px; }
    .remarks-section { margin-top: 6px; padding: 5px 8px; font-size: 10px; min-height: 28px; background: transparent; line-height: 1.3; }
    .signatures { margin-top: 10px; }
    .sig-box { width: 30%; }
    .sig-line { height: 18px; }
    .title { font-size: 14px; margin: 4px 0 2px; }
    .subtitle { font-size: 10px; margin-bottom: 4px; }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <div class="page">
      <div class="watermark"><img src="${esc(wm)}" alt=""></div>
      <div class="letterhead">
        <img src="${esc(letterhead)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="letterhead-fallback"><h2 style="font-size:14px;">${esc(school?.name || 'School Name')}</h2><p style="font-size:9px;"><em>"${esc(school?.motto || '')}"</em></p></div>
      </div>
      <div class="content">
        <div class="title">ANNUAL ACADEMIC REPORT CARD ${esc(year)}</div>
        <div class="info-grid">
          <div class="info-item"><span class="info-label">Name:</span><span><strong>${esc(student?.name)}</strong></span></div>
          <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace">${esc(student?.student_id)}</strong></span></div>
          <div class="info-item"><span class="info-label">Class:</span><span>${esc(student?.class_name)}</span></div>
        </div>
        <table>
          <thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${t1?.total_score || '-'}</strong></td><td><strong>${t2?.total_score || '-'}</strong></td><td><strong>${t3?.total_score || '-'}</strong></td></tr>
            <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${esc(t1?.percentage || 'N/A')}%</td><td>${esc(t2?.percentage || 'N/A')}%</td><td>${esc(t3?.percentage || 'N/A')}%</td></tr>
            <tr class="summary-row"><td class="subject-col">POSITION</td><td>${esc(t1?.position || 'N/A')}</td><td>${esc(t2?.position || 'N/A')}</td><td>${esc(t3?.position || 'N/A')}</td></tr>
            <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${esc(t1?.out_of || 'N/A')}</td><td>${esc(t2?.out_of || 'N/A')}</td><td>${esc(t3?.out_of || 'N/A')}</td></tr>
            <tr class="summary-row"><td class="subject-col">RESULT</td>
              <td><strong style="color:${t1?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t1?.result || 'N/A')}</strong></td>
              <td><strong style="color:${t2?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t2?.result || 'N/A')}</strong></td>
              <td><strong style="color:${t3?.result === 'Pass' ? '#059669' : '#dc2626'}">${esc(t3?.result || 'N/A')}</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="spacer"></div>
        ${annual ? `<div class="annual-summary"><h4>📋 Annual Summary</h4><p><strong>Avg:</strong> ${annual.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual.grade || 'N/A'} | <strong>Status:</strong> <span class="${annual.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual.promotion_status || 'N/A'}</span> | <strong>Next:</strong> ${esc(annual.next_class || 'N/A')}</p><p>${esc(annual.remarks || '')}</p></div>` : ''}
        <div class="remarks-section"><strong>Remarks:</strong> ${esc(t3?.remarks || t2?.remarks || t1?.remarks) || '________________________________'}</div>
        ${verify ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${esc(verify)}</span></div>` : ''}
        <div class="signatures">
          <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
          <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
          <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
        </div>
        <div class="next-term"><strong>Next Academic Year:</strong> January ${parseInt(year?.split('/')[1] || new Date().getFullYear() + 1)}</div>
        <div class="footer"><p>${esc(school?.name || 'School')} | Annual Report ${esc(year)} | Computer-generated</p>${verify ? `<p style="color:#1a56db;">Verify: ${esc(verify)}</p>` : ''}</div>
      </div>
    </div>
  </div>
  <div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print (A4 Landscape)</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body>
</html>`
}
