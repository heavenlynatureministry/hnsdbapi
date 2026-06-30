/**
 * Export Academic Report Card to Print/PDF
 * Includes letterhead background and watermark
 * Supports both single-term and annual (3 terms) report cards
 */

/**
 * Export single-term report card
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
 * Export annual report card (all 3 terms)
 */
export const exportAnnualReportCard = (reportData) => {
  if (!reportData) {
    console.error('No report data to export')
    return
  }

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  
  const printWindow = window.open('', '_blank', 'width=1000,height=800')
  
  if (!printWindow) {
    alert('Please allow pop-ups to print report card')
    return
  }

  const { student, term1, term2, term3, academic_year, school } = reportData

  printWindow.document.write(generateAnnualHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl))
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
 * Generate single-term HTML
 */
function generateSingleTermHTML(student, results, term, academic_year, school, letterheadUrl, watermarkUrl) {
  const subjects = results?.subjects || []
  const totalScore = subjects.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
  const maxScore = subjects.length * 100
  const percentage = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(1) : 0

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4; margin: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; }
        .page { position: relative; width: 210mm; min-height: 297mm; margin: 0 auto; padding: 20mm 15mm; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.12; }
        .content { position: relative; z-index: 1; }
        .letterhead { text-align: center; margin-bottom: 10px; border-bottom: 3px double #1a56db; padding-bottom: 8px; }
        .letterhead img { max-width: 100%; width: 600px; height: auto; }
        .letterhead-fallback { display: none; text-align: center; }
        .title { text-align: center; font-size: 18px; font-weight: bold; margin: 12px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 12px; font-size: 12px; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; width: 80px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
        th { background: #1a56db; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; }
        .summary { margin-top: 12px; font-size: 12px; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .summary-item { display: flex; padding: 4px 0; border-bottom: 1px dotted #ccc; }
        .summary-label { font-weight: bold; width: 120px; }
        .remarks { margin-top: 12px; padding: 10px; border: 1px solid #ddd; font-size: 11px; min-height: 50px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 11px; }
        .sig-box { text-align: center; width: 40%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 4px; height: 30px; }
        .footer { text-align: center; font-size: 9px; margin-top: 15px; padding-top: 8px; border-top: 1px solid #ccc; color: #666; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="" onerror="this.style.display='none'" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2>${school?.name || 'School Name'}</h2><p>${school?.motto || ''}</p></div>
          </div>
          <div class="title">Academic Report Card - ${term || ''} ${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span>${student?.name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span>${student?.student_id || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Date:</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
          </div>
          <table>
            <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Remarks</th></tr></thead>
            <tbody>
              ${subjects.map(s => `
                <tr>
                  <td>${s.name || s.subject}</td>
                  <td>${s.score || '-'}</td>
                  <td>${s.grade || '-'}</td>
                  <td>${s.remarks || ''}</td>
                </tr>`).join('')}
              <tr class="total-row"><td><strong>TOTAL</strong></td><td><strong>${totalScore}</strong></td><td colspan="2"><strong>Out of ${maxScore}</strong></td></tr>
            </tbody>
          </table>
          <div class="summary">
            <div class="summary-grid">
              <div class="summary-item"><span class="summary-label">Percentage:</span><span>${percentage}%</span></div>
              <div class="summary-item"><span class="summary-label">Position:</span><span>${results?.position || 'N/A'} out of ${results?.out_of || 'N/A'}</span></div>
              <div class="summary-item"><span class="summary-label">Result:</span><span>${results?.result || 'N/A'}</span></div>
              <div class="summary-item"><span class="summary-label">Conduct:</span><span>${results?.conduct || 'N/A'}</span></div>
            </div>
          </div>
          <div class="remarks"><strong>Director of Studies' Remarks:</strong> ${results?.remarks || ''}</div>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div>Director of Studies</div>
            <div class="sig-box"><div class="sig-line"></div>Head Teacher</div>
          </div>
          <div class="footer"><p>${school?.name || 'School'} | ${academic_year || ''} | Computer-generated report card</p></div>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Generate annual report card HTML (3 terms in columns)
 */
function generateAnnualHTML(student, term1, term2, term3, academic_year, school, letterheadUrl, watermarkUrl) {
  const allSubjects = getUniqueSubjects(term1, term2, term3)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Annual Report Card - ${student?.name || 'Student'}</title>
      <meta charset="utf-8">
      <style>
        @page { size: A4 landscape; margin: 0; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; }
        .page { position: relative; width: 297mm; min-height: 210mm; margin: 0 auto; padding: 12mm 10mm; background: white; }
        .watermark { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; }
        .watermark img { width: 100%; height: 100%; object-fit: cover; opacity: 0.10; }
        .content { position: relative; z-index: 1; }
        .letterhead { text-align: center; margin-bottom: 6px; border-bottom: 2px double #1a56db; padding-bottom: 5px; }
        .letterhead img { max-width: 100%; width: 550px; height: auto; }
        .letterhead-fallback { display: none; text-align: center; }
        .title { text-align: center; font-size: 16px; font-weight: bold; margin: 8px 0; text-transform: uppercase; letter-spacing: 2px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 8px; font-size: 11px; }
        .info-item { display: flex; }
        .info-label { font-weight: bold; margin-right: 4px; }
        table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px; }
        th { background: #1a56db; color: white; padding: 5px 6px; text-align: center; font-size: 9px; }
        th.subject-col { text-align: left; }
        td { padding: 4px 6px; border-bottom: 1px solid #ddd; text-align: center; }
        td.subject-col { text-align: left; font-weight: bold; }
        tr:nth-child(even) { background: #f8f9fa; }
        .total-row { font-weight: bold; background: #e8f0fe !important; }
        .summary { margin-top: 8px; font-size: 11px; }
        .summary-table { width: 100%; border-collapse: collapse; }
        .summary-table td { padding: 3px 8px; border: 1px solid #ddd; font-size: 10px; }
        .remarks { margin-top: 8px; padding: 8px; border: 1px solid #ddd; font-size: 10px; min-height: 35px; }
        .signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 10px; }
        .sig-box { text-align: center; width: 30%; }
        .sig-line { border-bottom: 1px solid #000; margin-bottom: 3px; height: 25px; }
        .footer { text-align: center; font-size: 8px; margin-top: 10px; padding-top: 5px; border-top: 1px solid #ccc; color: #666; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="watermark"><img src="${watermarkUrl}" alt="" onerror="this.style.display='none'" /></div>
        <div class="content">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block'" />
            <div class="letterhead-fallback"><h2>${school?.name || 'School Name'}</h2><p>${school?.motto || ''}</p></div>
          </div>
          <div class="title">Annual Academic Report Card ${academic_year || ''}</div>
          <div class="info-grid">
            <div class="info-item"><span class="info-label">Name:</span><span>${student?.name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Pupil's ID:</span><span>${student?.student_id || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Class:</span><span>${student?.class_name || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Conduct:</span><span>${term3?.conduct || term2?.conduct || term1?.conduct || 'N/A'}</span></div>
            <div class="info-item"><span class="info-label">Date:</span><span>${new Date().toLocaleDateString('en-GB')}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="subject-col">SUBJECTS</th>
                <th>TERM I<br/>Score</th><th>TERM I<br/>Grade</th>
                <th>TERM II<br/>Score</th><th>TERM II<br/>Grade</th>
                <th>TERM III<br/>Score</th><th>TERM III<br/>Grade</th>
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
                  <td>${t1.score || '-'}</td><td>${t1.grade || '-'}</td>
                  <td>${t2.score || '-'}</td><td>${t2.grade || '-'}</td>
                  <td>${t3.score || '-'}</td><td>${t3.grade || '-'}</td>
                </tr>`
              }).join('')}
              <tr class="total-row">
                <td class="subject-col"><strong>TOTAL</strong></td>
                <td colspan="2"><strong>${getTermTotal(term1)}</strong></td>
                <td colspan="2"><strong>${getTermTotal(term2)}</strong></td>
                <td colspan="2"><strong>${getTermTotal(term3)}</strong></td>
              </tr>
            </tbody>
          </table>
          <div class="summary">
            <table class="summary-table">
              <tr>
                <td><strong>Term I:</strong> ${term1?.percentage || 'N/A'}% | Pos: ${term1?.position || 'N/A'}/${term1?.out_of || 'N/A'} | ${term1?.result || 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Term II:</strong> ${term2?.percentage || 'N/A'}% | Pos: ${term2?.position || 'N/A'}/${term2?.out_of || 'N/A'} | ${term2?.result || 'N/A'}</td>
              </tr>
              <tr>
                <td><strong>Term III:</strong> ${term3?.percentage || 'N/A'}% | Pos: ${term3?.position || 'N/A'}/${term3?.out_of || 'N/A'} | ${term3?.result || 'N/A'}</td>
              </tr>
            </table>
          </div>
          <div class="remarks"><strong>Director of Studies' Remarks:</strong> ${term3?.remarks || term2?.remarks || term1?.remarks || ''}</div>
          <p style="font-size: 10px; margin-top: 6px;"><strong>Next Academic Year Commences on:</strong> ${getNextAcademicYearDate(academic_year)}</p>
          <div class="signatures">
            <div class="sig-box"><div class="sig-line"></div>Director of Studies</div>
            <div class="sig-box"><div class="sig-line"></div>Head Teacher</div>
            <div class="sig-box"><div class="sig-line"></div>Parent/Guardian</div>
          </div>
          <div class="footer"><p>${school?.name || 'School'} | Annual Report Card ${academic_year || ''} | Computer-generated</p></div>
        </div>
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

function getTermTotal(term) {
  if (!term?.subjects) return '-'
  const total = term.subjects.reduce((sum, s) => sum + (parseFloat(s.score) || 0), 0)
  const max = term.subjects.length * 100
  return `${total}/${max}`
}

function getNextAcademicYearDate(academic_year) {
  if (!academic_year) return 'TBA'
  const parts = academic_year.split('/')
  if (parts.length === 2) {
    return `January ${parts[1]}`
  }
  return 'TBA'
}
