/**
 * Export Academic Report Card to Print/PDF
 * Full-page template background with content positioned inside printable area
 * Supports both single-term and annual (Portrait/Landscape) report cards
 */

export const exportReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) {
    console.error('No report data to export')
    return
  }

  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  
  const width = orientation === 'landscape' ? 1100 : 900
  const height = orientation === 'landscape' ? 800 : 700
  
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`)
  
  if (!printWindow) {
    alert('Please allow pop-ups to print report card')
    return
  }

  const { student, results, term, academic_year, school, verify_url } = reportData

  printWindow.document.write(generateSingleTermHTML(student, results, term, academic_year, school, watermarkUrl, verify_url, orientation))
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => printWindow.print(), 600)
  }
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 1500)
}

export const exportAnnualReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) {
    console.error('No report data to export')
    return
  }

  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  
  const width = orientation === 'landscape' ? 1100 : 900
  const height = orientation === 'landscape' ? 800 : 700
  
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`)
  
  if (!printWindow) {
    alert('Please allow pop-ups to print report card')
    return
  }

  const { student, term1, term2, term3, academic_year, school, verify_url, annual_summary } = reportData

  if (orientation === 'landscape') {
    printWindow.document.write(generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, watermarkUrl, verify_url, annual_summary))
  } else {
    printWindow.document.write(generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, watermarkUrl, verify_url, annual_summary))
  }
  
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => printWindow.print(), 600)
  }
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 1500)
}

// =========================================================================
// SHARED CSS - Full template background with content inside printable area
// =========================================================================
const SHARED_CSS = `
  @page { size: A4; margin: 0; }
  @media print { 
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } 
    .no-print { display: none !important; } 
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 11px; color: #1a1a1a; background: #e5e7eb; padding: 10px; line-height: 1.4; }
  .page-wrapper { width: 210mm; margin: 0 auto; }
  
  .page { 
    position: relative; 
    width: 210mm; 
    min-height: 297mm; 
    overflow: hidden; 
    background: #fff; 
  }
  
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
  
  .content { 
    position: absolute; 
    inset: 0; 
    z-index: 5; 
    padding: 34mm 18mm 25mm 18mm; 
    background: transparent; 
  }

  .letterhead { 
    text-align: center; 
    margin-bottom: 4px; 
    border-bottom: none; 
  }
  .letterhead img { width: 100%; height: auto; display: block; }
  .letterhead-fallback { display: none; text-align: center; padding: 4px; background: transparent; }

  .title { 
    text-align: center; 
    font-size: 14px; 
    font-weight: bold; 
    margin: 6px 0 3px; 
    text-transform: uppercase; 
    letter-spacing: 3px; 
    color: #1a3a6b; 
  }
  .subtitle { text-align: center; font-size: 10px; margin-bottom: 6px; color: #555; }

  .info-grid { 
    display: grid; 
    grid-template-columns: 1fr 1fr; 
    gap: 3px; 
    margin-bottom: 6px; 
    font-size: 10px; 
    padding: 5px 8px; 
    border: none; 
    background: transparent; 
  }
  .info-item { display: flex; align-items: center; padding: 1px 0; }
  .info-label { font-weight: bold; width: 65px; font-size: 9px; color: #444; }

  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
  th { 
    background: rgba(20,60,140,0.92); 
    color: #fff; 
    padding: 4px 6px; 
    text-align: left; 
    font-size: 8px; 
    text-transform: uppercase; 
    letter-spacing: 1px; 
  }
  th.center { text-align: center; }
  td { padding: 3px 6px; border-bottom: 1px solid #bbb; font-size: 10px; }
  td.center { text-align: center; }
  tr:nth-child(even) { background: rgba(248,249,250,0.5); }
  .total-row { font-weight: bold; background: rgba(26,86,219,0.12) !important; font-size: 11px; }
  .total-row td { padding: 4px 6px; border-top: 1.5px solid #1a56db; }

  .summary-section { margin-top: 6px; display: flex; gap: 8px; }
  .summary-box { 
    flex: 1; 
    padding: 5px 8px; 
    border: none; 
    background: transparent; 
    font-size: 10px; 
  }
  .summary-item { display: flex; padding: 2px 0; border-bottom: 1px dotted #bbb; }
  .summary-item:last-child { border-bottom: none; }
  .summary-label { font-weight: bold; width: 70px; font-size: 9px; }
  .remarks-box { 
    flex: 1; 
    padding: 5px 8px; 
    border: none; 
    font-size: 10px; 
    background: transparent; 
    min-height: 35px; 
  }
  .remarks-box p { margin-top: 3px; line-height: 1.3; }

  .verify-section { 
    margin-top: 6px; 
    padding: 4px 8px; 
    border: none; 
    background: transparent; 
    text-align: center; 
    font-size: 8px; 
  }
  .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 9px; }

  .signatures { display: flex; justify-content: space-between; margin-top: 12px; font-size: 10px; padding: 0 5px; }
  .sig-box { text-align: center; width: 40%; }
  .sig-line { border-bottom: 1px solid #000; margin-bottom: 2px; height: 20px; }

  .next-term { text-align: center; font-size: 8px; margin-top: 6px; color: #555; font-weight: bold; }
  .footer { text-align: center; font-size: 7px; margin-top: 4px; padding-top: 3px; border-top: 1px solid #bbb; color: #666; }

  .print-toolbar { text-align: center; padding: 8px; margin-top: 10px; background: #f0f0f0; border-radius: 6px; }
  .btn { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 3px; }
  .btn-print { background: #2563eb; color: white; }
  .btn-close { background: #6b7280; color: white; }

  .pass { color: #059669; font-weight: bold; }
  .fail { color: #dc2626; font-weight: bold; }
  .promoted { color: #059669; font-weight: bold; }
  .repeat { color: #dc2626; font-weight: bold; }
`

// =========================================================================
// SINGLE TERM
// =========================================================================
function generateSingleTermHTML(student, results, term, academic_year, school, watermarkUrl, verify_url, orientation) {
  const subjects = results?.subjects || []
  const totalScore = results?.total_score || subjects.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
  const totalMax = results?.total_max || subjects.reduce((sum, s) => sum + (parseFloat(s.max_score) || 0), 0)
  const percentage = results?.percentage || (totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0)

  const getRemark = (grade) => {
    const remarks = { A: 'Excellent', B: 'Very Good', C: 'Good', D: 'Satisfactory', F: 'Needs Improvement' }
    return remarks[grade] || ''
  }

  const resultText = results?.result || (percentage >= 50 ? 'Pass' : 'Fail')
  const resultClass = resultText === 'Pass' ? 'pass' : 'fail'
  const isLandscape = orientation === 'landscape'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        ${SHARED_CSS}
        ${isLandscape ? '.page-wrapper { width: 297mm; } .page { width: 297mm; min-height: 210mm; } .content { padding: 20mm 14mm 18mm 14mm; }' : ''}
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="page">
          <div class="watermark"><img src="${watermarkUrl}" alt="" /></div>
          <div class="content">
            <div class="letterhead">
              <div class="letterhead-fallback" style="display:block;"><h2 style="font-size:13px;">${school?.name || 'School Name'}</h2><p style="font-size:9px;"><em>"${school?.motto || ''}"</em></p></div>
            </div>
            <div class="title">ACADEMIC REPORT CARD</div>
            <div class="subtitle">${term || ''} &bull; ${academic_year || ''}</div>

            <div class="info-grid">
              <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
              <div class="info-item"><span class="info-label">Conduct:</span><span>${results?.conduct || 'Good'}</span></div>
            </div>

            <table>
              <thead><tr><th>SUBJECTS</th><th class="center">MARKS</th><th>REMARKS</th></tr></thead>
              <tbody>
                ${subjects.map(s => `<tr><td><strong>${s.name || s.subject || 'N/A'}</strong></td><td class="center">${s.score || 0}</td><td>${getRemark(s.grade)}</td></tr>`).join('')}
                <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${totalScore}</strong></td><td class="${resultClass}"><strong>${resultText.toUpperCase()}</strong></td></tr>
              </tbody>
            </table>

            <div class="summary-section">
              <div class="summary-box">
                <div class="summary-item"><span class="summary-label">Percentage:</span><span><strong>${percentage}%</strong></span></div>
                <div class="summary-item"><span class="summary-label">Position:</span><span><strong>${results?.position || 'N/A'}</strong></span></div>
                <div class="summary-item"><span class="summary-label">Out of:</span><span><strong>${results?.out_of || 'N/A'}</strong></span></div>
                <div class="summary-item"><span class="summary-label">Result:</span><span class="${resultClass}"><strong>${resultText}</strong></span></div>
              </div>
              <div class="remarks-box">
                <strong>Remarks:</strong>
                <p>${results?.remarks || '________________________________'}</p>
              </div>
            </div>

            ${verify_url ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${verify_url}</span></div>` : ''}

            <div class="signatures">
              <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
              <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
            </div>

            <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
            <div class="footer">
              <p>${school?.name || 'School'} | ${academic_year || ''} | Computer-generated Report Card</p>
              ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="print-toolbar no-print">
        <button class="btn btn-print" onclick="window.print()">🖨️ Print (${isLandscape ? 'Landscape' : 'Portrait'})</button>
        <button class="btn btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </body>
    </html>
  `
}

// =========================================================================
// ANNUAL PORTRAIT
// =========================================================================
function generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, watermarkUrl, verify_url, annual_summary) {
  const allSubjects = getUniqueSubjects(term1, term2, term3)
  const t1Total = term1?.total_score || 0
  const t2Total = term2?.total_score || 0
  const t3Total = term3?.total_score || 0

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Annual Report - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        ${SHARED_CSS}
        .info-grid { grid-template-columns: 1fr 1fr 1fr 1fr; }
        .info-item { flex-wrap: wrap; }
        .info-label { width: auto; margin-right: 3px; }
        th { padding: 3px 4px; font-size: 7px; }
        th.subject-col { text-align: left; padding-left: 5px; }
        td { padding: 2px 4px; text-align: center; font-size: 9px; }
        td.subject-col { text-align: left; font-weight: bold; padding-left: 5px; }
        .total-row td { padding: 3px 4px; }
        .summary-row td { padding: 2px 4px; background: rgba(240,244,255,0.5); font-weight: bold; font-size: 8px; }
        .annual-summary { margin-top: 6px; padding: 5px 8px; border: none; background: transparent; font-size: 9px; }
        .annual-summary h4 { margin-bottom: 2px; font-size: 10px; }
        .annual-summary p { font-size: 9px; line-height: 1.3; margin-bottom: 2px; }
        .remarks-section { margin-top: 6px; padding: 5px 8px; border: none; font-size: 9px; min-height: 30px; background: transparent; line-height: 1.3; }
        .signatures { margin-top: 10px; }
        .sig-box { width: 30%; }
        .sig-line { height: 18px; }
        .title { font-size: 13px; margin: 4px 0 2px; }
        .subtitle { margin-bottom: 4px; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="page">
          <div class="watermark"><img src="${watermarkUrl}" alt="" /></div>
          <div class="content">
            <div class="letterhead">
              <div class="letterhead-fallback" style="display:block;"><h2 style="font-size:13px;">${school?.name || 'School Name'}</h2><p style="font-size:9px;"><em>"${school?.motto || ''}"</em></p></div>
            </div>
            <div class="title">ANNUAL ACADEMIC REPORT CARD</div>
            <div class="subtitle">${academic_year || ''}</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
              <div class="info-item"><span class="info-label">Conduct:</span><span>${student?.conduct || 'Good'}</span></div>
            </div>
            <table>
              <thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead>
              <tbody>
                ${allSubjects.map(subj => {
                  const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                  const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                  const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                  return `<tr><td class="subject-col">${subj}</td><td>${t1.score || '-'}</td><td>${t2.score || '-'}</td><td>${t3.score || '-'}</td></tr>`
                }).join('')}
                <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${term1 ? t1Total : '-'}</strong></td><td><strong>${term2 ? t2Total : '-'}</strong></td><td><strong>${term3 ? t3Total : '-'}</strong></td></tr>
                <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${term1?.percentage || 'N/A'}%</td><td>${term2?.percentage || 'N/A'}%</td><td>${term3?.percentage || 'N/A'}%</td></tr>
                <tr class="summary-row"><td class="subject-col">POSITION</td><td>${term1?.position || 'N/A'}</td><td>${term2?.position || 'N/A'}</td><td>${term3?.position || 'N/A'}</td></tr>
                <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${term1?.out_of || 'N/A'}</td><td>${term2?.out_of || 'N/A'}</td><td>${term3?.out_of || 'N/A'}</td></tr>
                <tr class="summary-row"><td class="subject-col">RESULT</td><td><strong style="color:${(term1?.result === 'Pass') ? '#059669' : '#dc2626'}">${term1?.result || 'N/A'}</strong></td><td><strong style="color:${(term2?.result === 'Pass') ? '#059669' : '#dc2626'}">${term2?.result || 'N/A'}</strong></td><td><strong style="color:${(term3?.result === 'Pass') ? '#059669' : '#dc2626'}">${term3?.result || 'N/A'}</strong></td></tr>
              </tbody>
            </table>
            
            ${annual_summary ? `
            <div class="annual-summary">
              <h4>📋 Annual Summary</h4>
              <p><strong>Avg:</strong> ${annual_summary.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual_summary.grade || 'N/A'} | <strong>Status:</strong> <span class="${annual_summary.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual_summary.promotion_status || 'N/A'}</span></p>
              <p><strong>Next:</strong> ${annual_summary.next_class || 'N/A'} | ${annual_summary.remarks || ''}</p>
            </div>
            ` : ''}
            
            <div class="remarks-section"><strong>Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || '________________________________'}</div>

            ${verify_url ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${verify_url}</span></div>` : ''}
            
            <div class="signatures">
              <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
              <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
              <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
            </div>

            <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
            <div class="footer">
              <p>${school?.name || 'School'} | Annual Report ${academic_year || ''} | Computer-generated</p>
              ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="print-toolbar no-print">
        <button class="btn btn-print" onclick="window.print()">🖨️ Print (Portrait)</button>
        <button class="btn btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </body>
    </html>
  `
}

// =========================================================================
// ANNUAL LANDSCAPE
// =========================================================================
function generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, watermarkUrl, verify_url, annual_summary) {
  const allSubjects = getUniqueSubjects(term1, term2, term3)
  const t1Total = term1?.total_score || 0
  const t2Total = term2?.total_score || 0
  const t3Total = term3?.total_score || 0

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Annual Report - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        ${SHARED_CSS}
        .page-wrapper { width: 297mm; }
        .page { width: 297mm; min-height: 210mm; }
        .content { padding: 22mm 14mm 18mm 14mm; }
        .info-grid { grid-template-columns: 1fr 1fr 1fr; }
        th { padding: 3px 4px; font-size: 7px; }
        th.subject-col { text-align: left; padding-left: 5px; }
        td { padding: 2px 4px; text-align: center; font-size: 9px; }
        td.subject-col { text-align: left; font-weight: bold; padding-left: 5px; }
        .total-row td { padding: 3px 4px; }
        .summary-row td { padding: 2px 4px; background: rgba(240,244,255,0.5); font-weight: bold; font-size: 8px; }
        .annual-summary { margin-top: 5px; padding: 4px 6px; border: none; background: transparent; font-size: 9px; }
        .annual-summary h4 { margin-bottom: 1px; font-size: 9px; }
        .annual-summary p { font-size: 8px; line-height: 1.2; margin-bottom: 1px; }
        .remarks-section { margin-top: 5px; padding: 4px 6px; font-size: 9px; min-height: 25px; background: transparent; border: none; }
        .signatures { margin-top: 8px; }
        .sig-line { height: 16px; }
        .title { font-size: 13px; margin: 3px 0 2px; }
        .subtitle { margin-bottom: 3px; font-size: 9px; }
      </style>
    </head>
    <body>
      <div class="page-wrapper">
        <div class="page">
          <div class="watermark"><img src="${watermarkUrl}" alt="" /></div>
          <div class="content">
            <div class="letterhead">
              <div class="letterhead-fallback" style="display:block;"><h2 style="font-size:12px;">${school?.name || 'School Name'}</h2><p style="font-size:8px;"><em>"${school?.motto || ''}"</em></p></div>
            </div>
            <div class="title">ANNUAL ACADEMIC REPORT CARD ${academic_year || ''}</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
              <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            </div>
            <table>
              <thead><tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr></thead>
              <tbody>
                ${allSubjects.map(subj => {
                  const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                  const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                  const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                  return `<tr><td class="subject-col">${subj}</td><td>${t1.score || '-'}</td><td>${t2.score || '-'}</td><td>${t3.score || '-'}</td></tr>`
                }).join('')}
                <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${term1 ? t1Total : '-'}</strong></td><td><strong>${term2 ? t2Total : '-'}</strong></td><td><strong>${term3 ? t3Total : '-'}</strong></td></tr>
                <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${term1?.percentage || 'N/A'}%</td><td>${term2?.percentage || 'N/A'}%</td><td>${term3?.percentage || 'N/A'}%</td></tr>
                <tr class="summary-row"><td class="subject-col">POSITION</td><td>${term1?.position || 'N/A'}</td><td>${term2?.position || 'N/A'}</td><td>${term3?.position || 'N/A'}</td></tr>
                <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${term1?.out_of || 'N/A'}</td><td>${term2?.out_of || 'N/A'}</td><td>${term3?.out_of || 'N/A'}</td></tr>
                <tr class="summary-row"><td class="subject-col">RESULT</td><td><strong style="color:${(term1?.result === 'Pass') ? '#059669' : '#dc2626'}">${term1?.result || 'N/A'}</strong></td><td><strong style="color:${(term2?.result === 'Pass') ? '#059669' : '#dc2626'}">${term2?.result || 'N/A'}</strong></td><td><strong style="color:${(term3?.result === 'Pass') ? '#059669' : '#dc2626'}">${term3?.result || 'N/A'}</strong></td></tr>
              </tbody>
            </table>
            
            ${annual_summary ? `
            <div class="annual-summary">
              <h4>📋 Annual Summary</h4>
              <p><strong>Avg:</strong> ${annual_summary.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual_summary.grade || 'N/A'} | <strong>Status:</strong> <span class="${annual_summary.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual_summary.promotion_status || 'N/A'}</span> | <strong>Next:</strong> ${annual_summary.next_class || 'N/A'}</p>
              <p>${annual_summary.remarks || ''}</p>
            </div>
            ` : ''}
            
            <div class="remarks-section"><strong>Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || '________________________________'}</div>

            ${verify_url ? `<div class="verify-section"><strong>🔒 Verify:</strong> <span class="verify-link">${verify_url}</span></div>` : ''}
            
            <div class="signatures">
              <div class="sig-box"><div class="sig-line"></div><strong>Dir. of Studies</strong></div>
              <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
              <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
            </div>

            <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
            <div class="footer">
              <p>${school?.name || 'School'} | Annual Report ${academic_year || ''} | Computer-generated</p>
              ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="print-toolbar no-print">
        <button class="btn btn-print" onclick="window.print()">🖨️ Print (Landscape)</button>
        <button class="btn btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </body>
    </html>
  `
}

// =========================================================================
// HELPER
// =========================================================================
function getUniqueSubjects(term1, term2, term3) {
  const subjects = new Set()
  ;[term1, term2, term3].forEach(term => {
    (term?.subjects || []).forEach(s => {
      if (s.name) subjects.add(s.name)
    })
  })
  return Array.from(subjects)
}
