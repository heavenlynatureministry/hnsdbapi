/**
 * Export Academic Report Card to Print/PDF
 * Includes letterhead background and watermark
 * Supports both single-term (Portrait) and annual (Portrait/Landscape) report cards
 */

export const exportReportCard = (reportData) => {
  if (!reportData) {
    console.error('No report data to export')
    return
  }

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  
  if (!printWindow) {
    alert('Please allow pop-ups to print report card')
    return
  }

  const { student, results, term, academic_year, school, verify_url } = reportData

  printWindow.document.write(generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl, verify_url))
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

  const { student, term1, term2, term3, academic_year, school, verify_url } = reportData

  if (orientation === 'landscape') {
    printWindow.document.write(generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url))
  } else {
    printWindow.document.write(generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url))
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
// SINGLE TERM REPORT CARD - Subjects | Marks Scored | Remarks
// =========================================================================
function generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl, verify_url) {
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

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 3px; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: white; overflow: hidden; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.06; }
        .content { position: relative; z-index: 1; padding: 10mm 12mm; }

        .title { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0; text-transform: uppercase; letter-spacing: 2px; }
        .subtitle { text-align: center; font-size: 12px; margin-bottom: 10px; color: #555; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3px; margin-bottom: 10px; font-size: 11px; padding: 6px 10px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; width: 75px; font-size: 10px; }

        table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 11px; }
        th { background: #1a56db; color: white; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; }
        th.center { text-align: center; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
        td.center { text-align: center; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 12px; }
        .total-row td { padding: 7px 8px; }

        .summary-section { margin-top: 10px; display: flex; gap: 8px; }
        .summary-box { flex: 1; padding: 8px 10px; border: 1px solid #ddd; background: #fafafa; font-size: 10px; }
        .summary-item { display: flex; padding: 3px 0; border-bottom: 1px dotted #ccc; }
        .summary-label { font-weight: bold; width: 95px; font-size: 9px; }
        .remarks-box { flex: 1; padding: 8px 10px; border: 1px solid #ddd; font-size: 10px; background: #fafafa; min-height: 45px; }

        .verify-section { margin-top: 6px; padding: 6px 10px; border: 1.5px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 9px; border-radius: 3px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; }

        .signatures { display: flex; justify-content: space-between; margin-top: 18px; font-size: 10px; }
        .sig-box { text-align: center; width: 40%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 25px; }

        .next-term { text-align: center; font-size: 9px; margin-top: 10px; color: #555; }
        .footer { text-align: center; font-size: 8px; margin-top: 8px; padding-top: 4px; border-top: 1px solid #ccc; color: #666; }

        .print-toolbar { text-align: center; padding: 8px; margin-top: 8px; background: #f0f0f0; border-radius: 6px; }
        .btn { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 2px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }

        .pass { color: #059669; font-weight: bold; }
        .fail { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="" onerror="this.style.display='none'" /></div>
        <div class="content">
          <div class="title">ACADEMIC REPORT CARD</div>
          <div class="subtitle">${term || ''} &bull; ${academic_year || ''}</div>

          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Conduct:</span><span>${results?.conduct || 'Good'}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>SUBJECTS</th>
                <th class="center">MARKS SCORED</th>
                <th>REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td><strong>${s.name || s.subject || 'N/A'}</strong></td>
                  <td class="center">${s.score || 0}</td>
                  <td>${getRemark(s.grade)}</td>
                </tr>`).join('')}
              <tr class="total-row">
                <td><strong>TOTAL</strong></td>
                <td class="center"><strong>${totalScore}</strong></td>
                <td class="${resultClass}"><strong>${resultText.toUpperCase()}</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary-section">
            <div class="summary-box">
              <div class="summary-item"><span class="summary-label">Percentage:</span><span><strong>${percentage}%</strong></span></div>
              <div class="summary-item"><span class="summary-label">Position in Class:</span><span><strong>${results?.position || 'N/A'}</strong></span></div>
              <div class="summary-item"><span class="summary-label">Out of:</span><span><strong>${results?.out_of || 'N/A'}</strong></span></div>
              <div class="summary-item"><span class="summary-label">Result:</span><span class="${resultClass}"><strong>${resultText}</strong></span></div>
            </div>
            <div class="remarks-box">
              <strong>Director of Studies' Remarks:</strong>
              <p style="margin-top:4px;">${results?.remarks || '___________________________________________'}</p>
            </div>
          </div>

          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify this report card online:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}

          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
          </div>

          <div class="next-term">
            <strong>Next Academic Year Commences on:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}
          </div>

          <div class="footer">
            <p>${school?.name || 'School'} | ${academic_year || ''} | Computer-generated report card</p>
            ${verify_url ? `<p style="color:#1a56db;">Verify: ${verify_url}</p>` : ''}
          </div>
        </div>
      </div>
      <div class="print-toolbar no-print">
        <button class="btn btn-print" onclick="window.print()">🖨️ Print Report Card</button>
        <button class="btn btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </body>
    </html>
  `
}

// =========================================================================
// ANNUAL PORTRAIT - Full table with summary rows
// =========================================================================
function generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url) {
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
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 3px; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 0; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.05; }
        .content { position: relative; z-index: 1; padding: 6mm 8mm; }

        .letterhead { text-align: center; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 2px double #1a56db; }
        .letterhead img { width: 100%; max-width: 100%; height: auto; display: block; }
        .letterhead-fallback { display: none; text-align: center; }

        .title { text-align: center; font-size: 15px; font-weight: bold; margin: 6px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 10px; padding: 5px 8px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; margin-right: 3px; }

        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
        th { background: #1a56db; color: white; padding: 5px 6px; text-align: center; font-size: 9px; text-transform: uppercase; }
        th.subject-col { text-align: left; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: center; font-size: 10px; }
        td.subject-col { text-align: left; font-weight: bold; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 11px; }
        .summary-row td { font-weight: bold; background: #f0f4ff; font-size: 10px; padding: 5px 6px; }

        .remarks-section { margin-top: 8px; padding: 6px 8px; border: 1px solid #ddd; font-size: 10px; min-height: 35px; background: #fafafa; }
        .verify-section { margin-top: 6px; padding: 5px 8px; border: 1.5px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 9px; border-radius: 3px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; }

        .signatures { display: flex; justify-content: space-between; margin-top: 15px; font-size: 10px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 22px; }
        .next-term { text-align: center; font-size: 9px; margin-top: 8px; color: #555; }
        .footer { text-align: center; font-size: 8px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #ccc; color: #666; }

        .print-toolbar { text-align: center; padding: 8px; margin-top: 8px; background: #f0f0f0; border-radius: 6px; }
        .btn { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 2px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="" onerror="this.style.display='none'" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2 style="font-size:14px;">${school?.name || 'School Name'}</h2><p style="font-size:9px;"><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">ANNUAL ACADEMIC REPORT CARD<br/><span style="font-size:12px;">${academic_year || ''}</span></div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Conduct:</span><span>${student?.conduct || 'Good'}</span></div>
          </div>
          <table>
            <thead>
              <tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr>
            </thead>
            <tbody>
              ${allSubjects.map(subj => {
                const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                return `<tr><td class="subject-col">${subj}</td><td>${t1.score || '-'}</td><td>${t2.score || '-'}</td><td>${t3.score || '-'}</td></tr>`
              }).join('')}
              <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${term1 ? t1Total : '-'}</strong></td><td><strong>${term2 ? t2Total : '-'}</strong></td><td><strong>${term3 ? t3Total : '-'}</strong></td></tr>
              <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${term1?.percentage || 'N/A'}%</td><td>${term2?.percentage || 'N/A'}%</td><td>${term3?.percentage || 'N/A'}%</td></tr>
              <tr class="summary-row"><td class="subject-col">POSITION IN CLASS</td><td>${term1?.position || 'N/A'}</td><td>${term2?.position || 'N/A'}</td><td>${term3?.position || 'N/A'}</td></tr>
              <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${term1?.out_of || 'N/A'}</td><td>${term2?.out_of || 'N/A'}</td><td>${term3?.out_of || 'N/A'}</td></tr>
              <tr class="summary-row"><td class="subject-col">RESULT</td><td><strong style="color:${(term1?.result === 'Pass') ? '#059669' : '#dc2626'}">${term1?.result || 'N/A'}</strong></td><td><strong style="color:${(term2?.result === 'Pass') ? '#059669' : '#dc2626'}">${term2?.result || 'N/A'}</strong></td><td><strong style="color:${(term3?.result === 'Pass') ? '#059669' : '#dc2626'}">${term3?.result || 'N/A'}</strong></td></tr>
            </tbody>
          </table>
          <div class="remarks-section"><strong>Director of Studies' Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || '___________________________________________________________________________'}</div>
          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}
          <div class="next-term"><strong>Next Academic Year Commences on:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
          </div>
          <div class="footer">
            <p>${school?.name || 'School'} | Annual Report Card ${academic_year || ''} | Computer-generated</p>
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
// ANNUAL LANDSCAPE - Full table with summary rows
// =========================================================================
function generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl, verify_url) {
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
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 3px; }
        .page { position: relative; width: 297mm; min-height: 210mm; margin: 0 auto; padding: 0; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.05; }
        .content { position: relative; z-index: 1; padding: 5mm 7mm; }

        .letterhead { text-align: center; margin-bottom: 3px; padding-bottom: 2px; border-bottom: 2px double #1a56db; }
        .letterhead img { width: 100%; max-width: 100%; height: auto; display: block; }
        .letterhead-fallback { display: none; text-align: center; }

        .title { text-align: center; font-size: 14px; font-weight: bold; margin: 4px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 3px; margin-bottom: 5px; font-size: 9px; padding: 4px 6px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; margin-right: 2px; }

        table { width: 100%; border-collapse: collapse; margin: 4px 0; font-size: 9px; }
        th { background: #1a56db; color: white; padding: 4px 5px; text-align: center; font-size: 8px; text-transform: uppercase; }
        th.subject-col { text-align: left; }
        td { padding: 3px 5px; border-bottom: 1px solid #ddd; text-align: center; font-size: 9px; }
        td.subject-col { text-align: left; font-weight: bold; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; }
        .summary-row td { font-weight: bold; background: #f0f4ff; font-size: 9px; padding: 4px 5px; }

        .remarks-section { margin-top: 6px; padding: 5px 6px; border: 1px solid #ddd; font-size: 9px; min-height: 28px; background: #fafafa; }
        .verify-section { margin-top: 4px; padding: 4px 6px; border: 1.5px solid #1a56db; background: #f0f4ff; text-align: center; font-size: 8px; border-radius: 3px; }
        .verify-link { font-family: 'Courier New', monospace; font-weight: bold; color: #1a56db; word-break: break-all; }

        .signatures { display: flex; justify-content: space-between; margin-top: 12px; font-size: 9px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 2px; height: 18px; }
        .next-term { text-align: center; font-size: 8px; margin-top: 6px; color: #555; }
        .footer { text-align: center; font-size: 7px; margin-top: 4px; padding-top: 3px; border-top: 1px solid #ccc; color: #666; }

        .print-toolbar { text-align: center; padding: 6px; margin-top: 6px; background: #f0f0f0; border-radius: 5px; }
        .btn { padding: 7px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: bold; margin: 2px; }
        .btn-print { background: #2563eb; color: white; }
        .btn-close { background: #6b7280; color: white; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="" onerror="this.style.display='none'" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2 style="font-size:13px;">${school?.name || 'School Name'}</h2><p style="font-size:8px;"><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">ANNUAL ACADEMIC REPORT CARD ${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span><strong style="font-family:'Courier New',monospace;">${student?.student_id || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
          </div>
          <table>
            <thead>
              <tr><th class="subject-col">SUBJECTS</th><th>TERM I</th><th>TERM II</th><th>TERM III</th></tr>
            </thead>
            <tbody>
              ${allSubjects.map(subj => {
                const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                return `<tr><td class="subject-col">${subj}</td><td>${t1.score || '-'}</td><td>${t2.score || '-'}</td><td>${t3.score || '-'}</td></tr>`
              }).join('')}
              <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td><strong>${term1 ? t1Total : '-'}</strong></td><td><strong>${term2 ? t2Total : '-'}</strong></td><td><strong>${term3 ? t3Total : '-'}</strong></td></tr>
              <tr class="summary-row"><td class="subject-col">PERCENTAGE</td><td>${term1?.percentage || 'N/A'}%</td><td>${term2?.percentage || 'N/A'}%</td><td>${term3?.percentage || 'N/A'}%</td></tr>
              <tr class="summary-row"><td class="subject-col">POSITION IN CLASS</td><td>${term1?.position || 'N/A'}</td><td>${term2?.position || 'N/A'}</td><td>${term3?.position || 'N/A'}</td></tr>
              <tr class="summary-row"><td class="subject-col">OUT OF</td><td>${term1?.out_of || 'N/A'}</td><td>${term2?.out_of || 'N/A'}</td><td>${term3?.out_of || 'N/A'}</td></tr>
              <tr class="summary-row"><td class="subject-col">RESULT</td><td><strong style="color:${(term1?.result === 'Pass') ? '#059669' : '#dc2626'}">${term1?.result || 'N/A'}</strong></td><td><strong style="color:${(term2?.result === 'Pass') ? '#059669' : '#dc2626'}">${term2?.result || 'N/A'}</strong></td><td><strong style="color:${(term3?.result === 'Pass') ? '#059669' : '#dc2626'}">${term3?.result || 'N/A'}</strong></td></tr>
            </tbody>
          </table>
          <div class="remarks-section"><strong>Director of Studies' Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || ''}</div>
          ${verify_url ? `<div class="verify-section"><p><strong>🔒 Verify:</strong> <span class="verify-link">${verify_url}</span></p></div>` : ''}
          <div class="next-term"><strong>Next Academic Year:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}</div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div>Director of Studies</div>
            <div class="sig-box"><div class="sig-line"></div>Head Teacher</div>
            <div class="sig-box"><div class="sig-line"></div>Parent/Guardian</div>
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
