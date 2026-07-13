/**
 * Export Academic Report Card to Print/PDF
 * Includes letterhead background and watermark
 * Supports both single-term and annual (Portrait/Landscape) report cards
 */

export const exportReportCard = (reportData, orientation = 'portrait') => {
  if (!reportData) {
    console.error('No report data to export')
    return
  }

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  
  const width = orientation === 'landscape' ? 1100 : 900
  const height = orientation === 'landscape' ? 800 : 700
  
  const printWindow = window.open('', '_blank', `width=${width},height=${height}`)
  
  if (!printWindow) {
    alert('Please allow pop-ups to print report card')
    return
  }

  const { student, results, term, academic_year, school, verify_url } = reportData

  printWindow.document.write(generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl, verify_url, orientation))
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

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
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
    printWindow.document.write(generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary))
  } else {
    printWindow.document.write(generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary))
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
// SINGLE TERM - Letterhead + Watermark + Subjects|Marks|Remarks
// =========================================================================
function generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl, verify_url, orientation) {
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
  const pageWidth = isLandscape ? '297mm' : '210mm'
  const pageHeight = isLandscape ? '210mm' : '297mm'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 ${isLandscape ? 'landscape' : 'portrait'}; margin: 8mm; }
        @media print { 
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; } 
          .no-print { display: none !important; } 
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #e5e7eb; padding: 10px; line-height: 1.6; }
        .page { position: relative; width: ${pageWidth}; min-height: ${pageHeight}; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.06; }
        .watermark img { width: 100%; height: 100%; object-fit: contain; }
        .content { position: relative; z-index: 1; padding: 12mm 14mm; }

        .letterhead { text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px double #1a56db; }
        .letterhead img { width: 100%; max-width: 100%; height: auto; display: block; }
        .letterhead-fallback { display: none; text-align: center; padding: 8px; }

        .title { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0 6px; text-transform: uppercase; letter-spacing: 3px; }
        .subtitle { text-align: center; font-size: 13px; margin-bottom: 10px; color: #555; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px; font-size: 12px; padding: 8px 10px; border: 1.5px solid #ddd; background: #fafafa; border-radius: 3px; }
        .info-item { display: flex; align-items: center; padding: 3px 0; }
        .info-label { font-weight: bold; width: 80px; font-size: 11px; color: #444; }

        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        th { background: #1a56db; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; }
        th.center { text-align: center; }
        td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px; }
        td.center { text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 13px; }
        .total-row td { padding: 9px 10px; border-top: 2px solid #1a56db; }

        .summary-section { margin-top: 12px; display: flex; gap: 12px; }
        .summary-box { flex: 1; padding: 10px 12px; border: 1.5px solid #ddd; background: #fafafa; font-size: 11px; border-radius: 3px; }
        .summary-item { display: flex; padding: 4px 0; border-bottom: 1px dotted #ccc; }
        .summary-item:last-child { border-bottom: none; }
        .summary-label { font-weight: bold; width: 95px; font-size: 10px; }
        .remarks-box { flex: 1; padding: 10px 12px; border: 1.5px solid #ddd; font-size: 11px; background: #fafafa; min-height: 50px; border-radius: 3px; }
        .remarks-box p { margin-top: 6px; line-height: 1.5; }

        .verify-section { margin-top: 10px; padding: 8px 10px; border: 2px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 10px; border-radius: 4px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 11px; }

        .signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 11px; }
        .sig-box { text-align: center; width: 40%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 4px; height: 28px; }

        .next-term { text-align: center; font-size: 10px; margin-top: 12px; color: #555; font-weight: bold; }
        .footer { text-align: center; font-size: 9px; margin-top: 10px; padding-top: 6px; border-top: 1px solid #ccc; color: #666; line-height: 1.4; }

        .print-toolbar { text-align: center; padding: 10px; margin-top: 10px; background: #f0f0f0; border-radius: 8px; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }

        .pass { color: #059669; font-weight: bold; }
        .fail { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="Watermark" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2 style="font-size:16px;">${school?.name || 'School Name'}</h2><p style="font-size:11px;"><em>"${school?.motto || ''}"</em></p></div>
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
            <thead><tr><th>SUBJECTS</th><th class="center">MARKS SCORED</th><th>REMARKS</th></tr></thead>
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
              <strong>Director of Studies' Remarks:</strong>
              <p>${results?.remarks || '___________________________________________'}</p>
            </div>
          </div>

          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify Online:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}

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
function generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary) {
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
        @page { size: A4 portrait; margin: 6mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #e5e7eb; padding: 8px; line-height: 1.5; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.06; }
        .watermark img { width: 100%; height: 100%; object-fit: contain; }
        .content { position: relative; z-index: 1; padding: 8mm 10mm; }

        .letterhead { text-align: center; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 2px double #1a56db; }
        .letterhead img { width: 100%; max-width: 100%; height: auto; display: block; }
        .letterhead-fallback { display: none; text-align: center; }

        .title { text-align: center; font-size: 17px; font-weight: bold; margin: 8px 0 4px; text-transform: uppercase; letter-spacing: 3px; }
        .title-sub { text-align: center; font-size: 12px; margin-bottom: 8px; color: #555; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 5px; margin-bottom: 10px; font-size: 12px; padding: 8px 10px; border: 1.5px solid #ddd; background: #fafafa; border-radius: 3px; }
        .info-item { display: flex; align-items: center; }
        .info-label { font-weight: bold; margin-right: 4px; font-size: 10px; color: #444; }

        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
        th { background: #1a56db; color: white; padding: 8px 6px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        th.subject-col { text-align: left; padding-left: 8px; }
        td { padding: 6px 6px; border-bottom: 1px solid #ddd; text-align: center; font-size: 12px; }
        td.subject-col { text-align: left; font-weight: bold; padding-left: 8px; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 13px; }
        .total-row td { border-top: 2px solid #1a56db; padding: 8px 6px; }
        .summary-row td { font-weight: bold; background: #f0f4ff; font-size: 11px; padding: 7px 6px; }

        .annual-summary { margin-top: 10px; padding: 10px 12px; border: 2px solid #1a56db; background: #f0f4ff; border-radius: 4px; }
        .annual-summary h4 { margin-bottom: 6px; font-size: 13px; }
        .annual-summary p { font-size: 11px; line-height: 1.5; margin-bottom: 4px; }
        .promoted { color: #059669; font-weight: bold; }
        .repeat { color: #dc2626; font-weight: bold; }

        .remarks-section { margin-top: 10px; padding: 10px 12px; border: 1.5px solid #ddd; font-size: 11px; min-height: 45px; background: #fafafa; border-radius: 3px; line-height: 1.5; }
        .verify-section { margin-top: 8px; padding: 8px 10px; border: 2px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 10px; border-radius: 4px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 11px; }

        .signatures { display: flex; justify-content: space-between; margin-top: 18px; font-size: 11px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 4px; height: 26px; }
        .next-term { text-align: center; font-size: 10px; margin-top: 10px; color: #555; font-weight: bold; }
        .footer { text-align: center; font-size: 9px; margin-top: 8px; padding-top: 5px; border-top: 1px solid #ccc; color: #666; line-height: 1.4; }

        .print-toolbar { text-align: center; padding: 10px; margin-top: 10px; background: #f0f0f0; border-radius: 8px; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="Watermark" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2 style="font-size:16px;">${school?.name || 'School Name'}</h2><p style="font-size:11px;"><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">ANNUAL ACADEMIC REPORT CARD</div>
          <div class="title-sub">${academic_year || ''}</div>
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
            <p><strong>Average:</strong> ${annual_summary.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual_summary.grade || 'N/A'}</p>
            <p><strong>Status:</strong> <span class="${annual_summary.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual_summary.promotion_status || 'N/A'}</span> | <strong>Next Class:</strong> ${annual_summary.next_class || 'N/A'}</p>
            <p><strong>Remarks:</strong> ${annual_summary.remarks || ''}</p>
          </div>
          ` : ''}
          
          <div class="remarks-section"><strong>Director of Studies' Remarks:</strong><br/> ${term3?.remarks || term2?.remarks || term1?.remarks || '___________________________________________________________________________'}</div>
          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify Online:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}
          <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
          </div>
          <div class="footer">
            <p>${school?.name || 'School'} | Annual Report ${academic_year || ''} | Computer-generated</p>
            ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
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
function generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url, annual_summary) {
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
        @page { size: A4 landscape; margin: 6mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #e5e7eb; padding: 8px; line-height: 1.5; }
        .page { position: relative; width: 297mm; min-height: 210mm; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0.06; }
        .watermark img { width: 100%; height: 100%; object-fit: contain; }
        .content { position: relative; z-index: 1; padding: 7mm 9mm; }

        .letterhead { text-align: center; margin-bottom: 5px; padding-bottom: 4px; border-bottom: 2px double #1a56db; }
        .letterhead img { width: 100%; max-width: 100%; height: auto; display: block; }
        .letterhead-fallback { display: none; text-align: center; }

        .title { text-align: center; font-size: 16px; font-weight: bold; margin: 6px 0 3px; text-transform: uppercase; letter-spacing: 3px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 12px; padding: 6px 8px; border: 1.5px solid #ddd; background: #fafafa; border-radius: 3px; }
        .info-item { display: flex; align-items: center; }
        .info-label { font-weight: bold; margin-right: 3px; font-size: 10px; color: #444; }

        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
        th { background: #1a56db; color: white; padding: 7px 5px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; }
        th.subject-col { text-align: left; padding-left: 8px; }
        td { padding: 5px 5px; border-bottom: 1px solid #ddd; text-align: center; font-size: 12px; }
        td.subject-col { text-align: left; font-weight: bold; padding-left: 8px; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 13px; }
        .total-row td { border-top: 2px solid #1a56db; padding: 7px 5px; }
        .summary-row td { font-weight: bold; background: #f0f4ff; font-size: 11px; padding: 6px 5px; }

        .annual-summary { margin-top: 8px; padding: 8px 10px; border: 2px solid #1a56db; background: #f0f4ff; border-radius: 4px; font-size: 11px; }
        .annual-summary h4 { margin-bottom: 4px; font-size: 12px; }
        .annual-summary p { line-height: 1.5; margin-bottom: 3px; }
        .promoted { color: #059669; font-weight: bold; }
        .repeat { color: #dc2626; font-weight: bold; }

        .remarks-section { margin-top: 8px; padding: 8px 10px; border: 1.5px solid #ddd; font-size: 11px; min-height: 35px; background: #fafafa; border-radius: 3px; line-height: 1.5; }
        .verify-section { margin-top: 6px; padding: 7px 8px; border: 2px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 10px; border-radius: 4px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; font-size: 10px; }

        .signatures { display: flex; justify-content: space-between; margin-top: 14px; font-size: 11px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 22px; }
        .next-term { text-align: center; font-size: 10px; margin-top: 8px; color: #555; font-weight: bold; }
        .footer { text-align: center; font-size: 8px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #ccc; color: #666; line-height: 1.4; }

        .print-toolbar { text-align: center; padding: 8px; margin-top: 8px; background: #f0f0f0; border-radius: 8px; }
        .btn { padding: 9px 18px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 2px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="Watermark" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2 style="font-size:15px;">${school?.name || 'School Name'}</h2><p style="font-size:10px;"><em>"${school?.motto || ''}"</em></p></div>
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
            <p><strong>Average:</strong> ${annual_summary.average_percentage || 'N/A'}% | <strong>Grade:</strong> ${annual_summary.grade || 'N/A'} | <strong>Status:</strong> <span class="${annual_summary.promotion_status === 'Promoted' ? 'promoted' : 'repeat'}">${annual_summary.promotion_status || 'N/A'}</span></p>
            <p><strong>Next Class:</strong> ${annual_summary.next_class || 'N/A'} | <strong>Remarks:</strong> ${annual_summary.remarks || ''}</p>
          </div>
          ` : ''}
          
          <div class="remarks-section"><strong>Director of Studies' Remarks:</strong><br/> ${term3?.remarks || term2?.remarks || term1?.remarks || ''}</div>
          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify Online:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}
          <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
          </div>
          <div class="footer">
            <p>${school?.name || 'School'} | Annual Report ${academic_year || ''} | Computer-generated</p>
            ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
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
