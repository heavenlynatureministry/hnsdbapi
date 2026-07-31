/**
 * Export Testimonial to Print/PDF
 * For P8 and S4 students
 */

export const exportTestimonial = (data, orientation = 'portrait') => {
  if (!data) { console.error('No testimonial data to export'); return }
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) { alert('Please allow pop-ups to print testimonial'); return }

  const { student, academic_year, index_number, centre_number, section, subjects, total_score, percentage, result } = data

  const html = buildTestimonialHTML(student, academic_year, index_number, centre_number, section, subjects, total_score, percentage, result, letterheadUrl, watermarkUrl)
  printWindow.document.write(html)
  
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 600)
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function getGrade(score) {
  if (score >= 80) return 'A'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'F'
}

function buildTestimonialHTML(student, academicYear, indexNumber, centreNumber, section, subjects, totalScore, percentage, result, letterhead, wm) {
  const studentClass = student?.class_name || student?.class || ''
  const isSecondary = studentClass.toLowerCase().includes('s4') || studentClass.toLowerCase().includes('senior 4')
  const certType = isSecondary ? 'Secondary Education' : 'Primary Education'
  const levelLabel = isSecondary ? 'South Sudan Certificate of Secondary Education' : 'Certificate of Primary Education'

  const subjectRows = (subjects || []).map(s => {
    const grade = s.grade || getGrade(s.score || 0)
    return `<tr><td><strong>${esc(s.name || s.subject)}</strong></td><td class="center">${s.score || 0}</td><td class="center">${grade}</td></tr>`
  }).join('')

  return `<!DOCTYPE html><html>
<head><title>Testimonial - ${esc(student?.first_name)} ${esc(student?.last_name)}</title><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; padding: 0 !important; background: white !important; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 14px; color: #1a1a1a; background: #e5e7eb; padding: 8px; line-height: 1.6; }
  .page-wrapper { width: 210mm; margin: 0 auto; }
  .page { width: 210mm; height: 297mm; position: relative; background: #fff; border: 3px double #1a3a6b; }
  .watermark { position: absolute; inset: 0; z-index: 0; }
  .watermark img { width: 100%; height: 100%; object-fit: fill; opacity: 0.15; display: block; }
  .content { position: absolute; inset: 0; z-index: 5; padding: 20mm 18mm; display: flex; flex-direction: column; }
  
  .header { text-align: center; margin-bottom: 10px; border-bottom: 2px double #1a56db; padding-bottom: 8px; }
  .header img { width: 100%; height: auto; max-height: 30mm; }
  .title { text-align: center; font-size: 22px; font-weight: bold; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 6px; color: #1a3a6b; }
  .subtitle { text-align: center; font-size: 14px; margin-bottom: 10px; color: #555; font-weight: bold; }
  
  .cert-text { text-align: center; font-size: 14px; margin: 15px 0; line-height: 1.8; }
  .student-name { font-size: 18px; font-weight: bold; text-transform: uppercase; }
  .exam-info { text-align: center; font-size: 13px; margin: 8px 0; color: #444; }
  
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  th { background: rgba(20,60,140,0.92); color: #fff; padding: 6px 10px; text-align: left; font-size: 11px; text-transform: uppercase; }
  th.center { text-align: center; }
  td { padding: 5px 10px; border-bottom: 1px solid #bbb; font-size: 13px; }
  td.center { text-align: center; }
  .total-row { font-weight: bold; background: rgba(26,86,219,0.12)!important; }
  .total-row td { border-top: 2px solid #1a56db; }
  
  .summary { margin: 10px 0; padding: 8px 15px; border: 1px solid #ccc; font-size: 13px; }
  .summary p { margin: 3px 0; }
  
  .signatures { display: flex; justify-content: space-between; margin-top: 30px; font-size: 13px; }
  .sig-box { text-align: center; width: 30%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 5px; height: 25px; }
  
  .footer { text-align: center; font-size: 10px; margin-top: auto; padding-top: 10px; border-top: 1px solid #bbb; color: #666; }
  
  .print-toolbar { text-align: center; padding: 10px; margin-top: 12px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; margin: 3px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="content">
    <div class="header"><img src="${esc(letterhead)}" alt="School Letterhead"></div>
    <div class="title">TESTIMONIAL</div>
    <div class="subtitle">${esc(academicYear)}</div>
    
    <div class="cert-text">
      <p>This is to certify that</p>
      <p class="student-name">${esc(student?.first_name || '')} ${esc(student?.last_name || '')}</p>
      <p>Has sat for the <strong>${esc(levelLabel)}</strong></p>
      ${section ? `<p>in the <strong>${esc(section)} Section</strong></p>` : ''}
    </div>
    
    <div class="exam-info">
      <p><strong>Index Number:</strong> ${esc(indexNumber || '_______________')} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Centre Number:</strong> ${esc(centreNumber || '_______________')}</p>
    </div>
    
    <p style="font-size:14px;margin-top:10px;"><strong>And has obtained the following results:</strong></p>
    
    <table>
      <thead><tr><th>SUBJECTS</th><th class="center">MARKS</th><th class="center">GRADE</th></tr></thead>
      <tbody>
        ${subjectRows}
        <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${totalScore || 0}</strong></td><td class="center"></td></tr>
      </tbody>
    </table>
    
    <div class="summary">
      <p><strong>Percentage:</strong> ${percentage || 'N/A'}%</p>
      <p><strong>Result:</strong> <span style="color:${result === 'Pass' ? '#059669' : '#dc2626'};font-weight:bold;">${result || 'N/A'}</span></p>
    </div>
    
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    
    <div class="footer">
      <p>Hope Nursery and Primary School | ${esc(academicYear)} | Computer-generated Testimonial</p>
      <p style="color:#1a56db;margin-top:2px;">Verify at: www.hopeschool.sd/verify</p>
    </div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
