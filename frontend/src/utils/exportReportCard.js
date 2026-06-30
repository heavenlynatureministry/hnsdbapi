/**
 * Export Academic Report Card to Print/PDF
 * Includes letterhead background and watermark
 * Supports both single-term (Portrait) and annual (Portrait/Landscape) report cards
 */

/**
 * Export single-term report card (Portrait)
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

  const { student, results, term, academic_year, school } = reportData

  printWindow.document.write(generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl))
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

/**
 * Export annual report card - Portrait (default)
 */
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

  const { student, term1, term2, term3, academic_year, school } = reportData

  if (orientation === 'landscape') {
    printWindow.document.write(generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl))
  } else {
    printWindow.document.write(generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl))
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

/**
 * Generate single-term HTML (Portrait A4)
 */
function generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl) {
  const subjects = results?.subjects || []
  const totalScore = results?.total_score || subjects.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
  const totalMax = results?.total_max || subjects.reduce((sum, s) => sum + (parseFloat(s.max_score) || 0), 0)
  const percentage = results?.percentage || (totalMax > 0 ? ((totalScore / totalMax) * 100).toFixed(1) : 0)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 portrait; margin: 10mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 10px; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 15mm 12mm; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.10; }
        .content { position: relative; z-index: 1; }
        .letterhead { text-align: center; margin-bottom: 8px; border-bottom: 3px double #1a56db; padding-bottom: 6px; }
        .letterhead img { max-width: 100%; width: 550px; height: auto; }
        .letterhead-fallback { display: none; text-align: center; padding: 10px; }
        .title { text-align: center; font-size: 18px; font-weight: bold; margin: 10px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; font-size: 12px; padding: 8px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; width: 80px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
        th { background: #1a56db; color: white; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; }
        td { padding: 6px 10px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; font-size: 12px; }
        .summary-section { margin-top: 10px; padding: 10px; border: 1px solid #ddd; background: #fafafa; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; }
        .summary-item { display: flex; padding: 4px 0; border-bottom: 1px dotted #ccc; }
        .summary-label { font-weight: bold; width: 130px; }
        .remarks-section { margin-top: 10px; padding: 10px; border: 1px solid #ddd; min-height: 50px; font-size: 11px; background: #fafafa; }
        .signatures { display: flex; justify-content: space-between; margin-top: 25px; font-size: 11px; }
        .sig-box { text-align: center; width: 40%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 4px; height: 30px; }
        .next-term { text-align: center; font-size: 10px; margin-top: 15px; color: #555; }
        .footer { text-align: center; font-size: 9px; margin-top: 10px; padding-top: 8px; border-top: 1px solid #ccc; color: #666; }
        .print-toolbar { text-align: center; padding: 12px; margin-top: 10px; background: #f0f0f0; border-radius: 8px; }
        .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
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
            <div class="letterhead-fallback"><h2>${school?.name || 'School Name'}</h2><p><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">Academic Report Card<br/>${term || ''} • ${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span>${student?.student_id || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Conduct:</span><span>${results?.conduct || 'Good'}</span></div>
          </div>
          <table>
            <thead><tr><th>Subject</th><th>Score</th><th>Percentage</th><th>Grade</th><th>Remarks</th></tr></thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td><strong>${s.name || s.subject || 'N/A'}</strong></td>
                  <td>${s.score || 0}/${s.max_score || 100}</td>
                  <td>${s.percentage || 0}%</td>
                  <td><strong>${s.grade || 'N/A'}</strong></td>
                  <td>${s.grade === 'A' ? 'Excellent' : s.grade === 'B' ? 'Very Good' : s.grade === 'C' ? 'Good' : s.grade === 'D' ? 'Satisfactory' : s.grade === 'F' ? 'Needs Improvement' : ''}</td>
                </tr>`).join('')}
              <tr class="total-row"><td><strong>TOTAL</strong></td><td><strong>${totalScore}/${totalMax}</strong></td><td><strong>${percentage}%</strong></td><td><strong>${results?.grade || 'N/A'}</strong></td><td></td></tr>
            </tbody>
          </table>
          <div class="summary-section">
            <div class="summary-grid">
              <div class="summary-item"><span class="summary-label">Percentage:</span><span><strong>${percentage}%</strong></span></div>
              <div class="summary-item"><span class="summary-label">Position in Class:</span><span><strong>${results?.position || 'N/A'}</strong></span></div>
              <div class="summary-item"><span class="summary-label">Out of:</span><span><strong>${results?.out_of || 'N/A'}</strong></span></div>
              <div class="summary-item"><span class="summary-label">Result:</span><span><strong>${results?.result || (percentage >= 50 ? 'Pass' : 'Fail')}</strong></span></div>
            </div>
          </div>
          <div class="remarks-section">
            <strong>Director of Studies' Remarks:</strong>
            <p style="margin-top:4px;">${results?.remarks || '___________________________________________________________________________'}</p>
          </div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
            <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
          </div>
          <div class="next-term">
            <strong>Next Academic Year Commences on:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}
          </div>
          <div class="footer"><p>${school?.name || 'School'} | ${academic_year || ''} | Computer-generated report card</p></div>
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

/**
 * Generate annual report card HTML - PORTRAIT (3 terms stacked vertically)
 */
function generateAnnualPortraitHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl) {
  const allSubjects = getUniqueSubjects(term1, term2, term3)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Annual Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 portrait; margin: 8mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 10px; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 10mm 8mm; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.08; }
        .content { position: relative; z-index: 1; }
        .letterhead { text-align: center; margin-bottom: 6px; border-bottom: 2px double #1a56db; padding-bottom: 4px; }
        .letterhead img { max-width: 100%; width: 500px; height: auto; }
        .letterhead-fallback { display: none; text-align: center; }
        .title { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 10px; padding: 6px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; margin-right: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 9px; }
        th { background: #1a56db; color: white; padding: 4px 5px; text-align: center; font-size: 8px; text-transform: uppercase; }
        th.subject-col { text-align: left; }
        td { padding: 3px 5px; border-bottom: 1px solid #ddd; text-align: center; font-size: 9px; }
        td.subject-col { text-align: left; font-weight: bold; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; }
        .summary-section { margin-top: 8px; }
        .summary-table { width: 100%; border-collapse: collapse; font-size: 9px; }
        .summary-table td { padding: 3px 6px; border: 1px solid #ddd; text-align: left; }
        .remarks-section { margin-top: 8px; padding: 6px; border: 1px solid #ddd; font-size: 9px; min-height: 30px; background: #fafafa; }
        .signatures { display: flex; justify-content: space-between; margin-top: 15px; font-size: 9px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 20px; }
        .next-term { text-align: center; font-size: 9px; margin-top: 8px; color: #555; }
        .footer { text-align: center; font-size: 8px; margin-top: 8px; padding-top: 5px; border-top: 1px solid #ccc; color: #666; }
        .print-toolbar { text-align: center; padding: 10px; margin-top: 8px; background: #f0f0f0; border-radius: 6px; }
        .btn { padding: 8px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 2px; }
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
            <div class="letterhead-fallback"><h2>${school?.name || 'School Name'}</h2><p><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">Annual Academic Report Card<br/>${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span>${student?.student_id || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="subject-col">SUBJECTS</th>
                <th>TERM I<br/>Score</th><th>Grade</th>
                <th>TERM II<br/>Score</th><th>Grade</th>
                <th>TERM III<br/>Score</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${allSubjects.map(subj => {
                const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                return `
                <tr>
                  <td class="subject-col">${subj}</td>
                  <td>${t1.score || '-'}</td><td><strong>${t1.grade || '-'}</strong></td>
                  <td>${t2.score || '-'}</td><td><strong>${t2.grade || '-'}</strong></td>
                  <td>${t3.score || '-'}</td><td><strong>${t3.grade || '-'}</strong></td>
                </tr>`
              }).join('')}
              <tr class="total-row">
                <td class="subject-col"><strong>TOTAL</strong></td>
                <td colspan="2"><strong>${term1 ? term1.total_score + '/' + term1.total_max : '-'}</strong></td>
                <td colspan="2"><strong>${term2 ? term2.total_score + '/' + term2.total_max : '-'}</strong></td>
                <td colspan="2"><strong>${term3 ? term3.total_score + '/' + term3.total_max : '-'}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="summary-section">
            <table class="summary-table">
              <tr><td><strong>Term I:</strong> ${term1?.percentage || 'N/A'}% | Pos: ${term1?.position || 'N/A'}/${term1?.out_of || 'N/A'} | Grade: ${term1?.grade || 'N/A'} | ${term1?.result || 'N/A'}</td></tr>
              <tr><td><strong>Term II:</strong> ${term2?.percentage || 'N/A'}% | Pos: ${term2?.position || 'N/A'}/${term2?.out_of || 'N/A'} | Grade: ${term2?.grade || 'N/A'} | ${term2?.result || 'N/A'}</td></tr>
              <tr><td><strong>Term III:</strong> ${term3?.percentage || 'N/A'}% | Pos: ${term3?.position || 'N/A'}/${term3?.out_of || 'N/A'} | Grade: ${term3?.grade || 'N/A'} | ${term3?.result || 'N/A'}</td></tr>
            </table>
          </div>
          <div class="remarks-section">
            <strong>Director of Studies' Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || ''}
          </div>
          <div class="next-term">
            <strong>Next Academic Year Commences on:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}
          </div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div>Director of Studies</div>
            <div class="sig-box"><div class="sig-line"></div>Head Teacher</div>
            <div class="sig-box"><div class="sig-line"></div>Parent/Guardian</div>
          </div>
          <div class="footer"><p>${school?.name || 'School'} | Annual Report Card ${academic_year || ''} | Computer-generated</p></div>
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

/**
 * Generate annual report card HTML - LANDSCAPE (3 terms in wide columns)
 */
function generateAnnualLandscapeHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl) {
  const allSubjects = getUniqueSubjects(term1, term2, term3)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Annual Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; background: #f0f0f0; padding: 10px; }
        .page { position: relative; width: 297mm; min-height: 210mm; margin: 0 auto; padding: 10mm 8mm; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.08; }
        .content { position: relative; z-index: 1; }
        .letterhead { text-align: center; margin-bottom: 5px; border-bottom: 2px double #1a56db; padding-bottom: 3px; }
        .letterhead img { max-width: 100%; width: 500px; height: auto; }
        .letterhead-fallback { display: none; text-align: center; }
        .title { text-align: center; font-size: 16px; font-weight: bold; margin: 6px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 6px; font-size: 10px; padding: 5px; border: 1px solid #ddd; background: #fafafa; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; margin-right: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
        th { background: #1a56db; color: white; padding: 5px 6px; text-align: center; font-size: 9px; text-transform: uppercase; }
        th.subject-col { text-align: left; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: center; font-size: 10px; }
        td.subject-col { text-align: left; font-weight: bold; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; }
        .summary-section { margin-top: 6px; display: flex; gap: 10px; }
        .summary-card { flex: 1; padding: 6px; border: 1px solid #ddd; background: #fafafa; font-size: 9px; }
        .summary-card h4 { margin-bottom: 4px; font-size: 10px; }
        .remarks-section { margin-top: 6px; padding: 6px; border: 1px solid #ddd; font-size: 9px; min-height: 25px; background: #fafafa; }
        .signatures { display: flex; justify-content: space-between; margin-top: 12px; font-size: 9px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 20px; }
        .next-term { text-align: center; font-size: 9px; margin-top: 6px; color: #555; }
        .footer { text-align: center; font-size: 8px; margin-top: 6px; padding-top: 4px; border-top: 1px solid #ccc; color: #666; }
        .print-toolbar { text-align: center; padding: 10px; margin-top: 8px; background: #f0f0f0; border-radius: 6px; }
        .btn { padding: 8px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; margin: 2px; }
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
            <div class="letterhead-fallback"><h2>${school?.name || 'School Name'}</h2><p><em>"${school?.motto || ''}"</em></p></div>
          </div>
          <div class="title">Annual Academic Report Card ${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span><strong>${student?.name || 'N/A'}</strong></span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span>${student?.student_id || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="subject-col">SUBJECTS</th>
                <th>TERM I<br/>Score</th><th>Grade</th>
                <th>TERM II<br/>Score</th><th>Grade</th>
                <th>TERM III<br/>Score</th><th>Grade</th>
              </tr>
            </thead>
            <tbody>
              ${allSubjects.map(subj => {
                const t1 = term1?.subjects?.find(s => s.name === subj) || {}
                const t2 = term2?.subjects?.find(s => s.name === subj) || {}
                const t3 = term3?.subjects?.find(s => s.name === subj) || {}
                return `
                <tr>
                  <td class="subject-col">${subj}</td>
                  <td>${t1.score || '-'}</td><td><strong>${t1.grade || '-'}</strong></td>
                  <td>${t2.score || '-'}</td><td><strong>${t2.grade || '-'}</strong></td>
                  <td>${t3.score || '-'}</td><td><strong>${t3.grade || '-'}</strong></td>
                </tr>`
              }).join('')}
              <tr class="total-row">
                <td class="subject-col"><strong>TOTAL</strong></td>
                <td colspan="2"><strong>${term1 ? term1.total_score + '/' + term1.total_max : '-'}</strong></td>
                <td colspan="2"><strong>${term2 ? term2.total_score + '/' + term2.total_max : '-'}</strong></td>
                <td colspan="2"><strong>${term3 ? term3.total_score + '/' + term3.total_max : '-'}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="summary-section">
            <div class="summary-card">
              <h4>Term I</h4>
              <p>Percentage: <strong>${term1?.percentage || 'N/A'}%</strong></p>
              <p>Position: <strong>${term1?.position || 'N/A'}/${term1?.out_of || 'N/A'}</strong></p>
              <p>Grade: <strong>${term1?.grade || 'N/A'}</strong> | ${term1?.result || 'N/A'}</p>
            </div>
            <div class="summary-card">
              <h4>Term II</h4>
              <p>Percentage: <strong>${term2?.percentage || 'N/A'}%</strong></p>
              <p>Position: <strong>${term2?.position || 'N/A'}/${term2?.out_of || 'N/A'}</strong></p>
              <p>Grade: <strong>${term2?.grade || 'N/A'}</strong> | ${term2?.result || 'N/A'}</p>
            </div>
            <div class="summary-card">
              <h4>Term III</h4>
              <p>Percentage: <strong>${term3?.percentage || 'N/A'}%</strong></p>
              <p>Position: <strong>${term3?.position || 'N/A'}/${term3?.out_of || 'N/A'}</strong></p>
              <p>Grade: <strong>${term3?.grade || 'N/A'}</strong> | ${term3?.result || 'N/A'}</p>
            </div>
          </div>
          <div class="remarks-section">
            <strong>Director of Studies' Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || ''}
          </div>
          <div class="next-term">
            <strong>Next Academic Year Commences on:</strong> January ${String(parseInt(academic_year?.split('/')[1] || new Date().getFullYear() + 1))}
          </div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div>Director of Studies</div>
            <div class="sig-box"><div class="sig-line"></div>Head Teacher</div>
            <div class="sig-box"><div class="sig-line"></div>Parent/Guardian</div>
          </div>
          <div class="footer"><p>${school?.name || 'School'} | Annual Report Card ${academic_year || ''} | Computer-generated</p></div>
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

// Helper functions
function getUniqueSubjects(term1, term2, term3) {
  const subjects = new Set()
  ;[term1, term2, term3].forEach(term => {
    (term?.subjects || []).forEach(s => {
      if (s.name) subjects.add(s.name)
    })
  })
  return Array.from(subjects)
}
