/**
 * Export Nursery Certificate to Print/PDF
 * Shows all three terms with certification details
 */

export const exportCertificate = (data, orientation = 'portrait') => {
  if (!data) { console.error('No certificate data to export'); return }
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) { alert('Please allow pop-ups to print certificate'); return }

  const { student, term1, term2, term3, academic_year, school, annual_summary } = data
  const html = buildCertificateHTML(student, term1, term2, term3, academic_year, school, annual_summary, letterheadUrl, watermarkUrl)
  printWindow.document.write(html)
  
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 600)
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function getUniqueSubjects(t1, t2, t3) { 
  const s = new Set(); 
  [t1, t2, t3].forEach(t => (t?.subjects || []).forEach(x => { if (x.name) s.add(x.name) })); 
  return [...s] 
}

function buildCertificateHTML(student, t1, t2, t3, year, school, annual, letterhead, wm) {
  const subjects = getUniqueSubjects(t1, t2, t3)
  const rows = subjects.map(subj => {
    const a = (t1?.subjects || []).find(s => s.name === subj) || {}
    const b = (t2?.subjects || []).find(s => s.name === subj) || {}
    const c = (t3?.subjects || []).find(s => s.name === subj) || {}
    return `<tr><td class="subject-col">${esc(subj)}</td><td class="center">${a.score || '-'}</td><td class="center">${b.score || '-'}</td><td class="center">${c.score || '-'}</td></tr>`
  }).join('')

  const avgPct = annual?.average_percentage || 
    ((parseFloat(t1?.percentage) || 0) + (parseFloat(t2?.percentage) || 0) + (parseFloat(t3?.percentage) || 0)) / 3

  return `<!DOCTYPE html><html>
<head><title>Nursery Certificate - ${esc(student?.first_name)} ${esc(student?.last_name)}</title><meta charset="utf-8">
<style>
  @page { size: A4 portrait; margin: 0; }
  @media print {
    html, body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; margin: 0 !important; padding: 0 !important; background: white !important; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; font-size: 13px; color: #1a1a1a; background: #e5e7eb; padding: 8px; line-height: 1.5; }
  .page-wrapper { width: 210mm; margin: 0 auto; }
  .page { width: 210mm; height: 297mm; position: relative; background: #fff; border: 5px double #c9a84c; }
  .watermark { position: absolute; inset: 0; z-index: 0; }
  .watermark img { width: 100%; height: 100%; object-fit: fill; opacity: 0.1; display: block; }
  .content { position: absolute; inset: 0; z-index: 5; padding: 15mm 14mm; display: flex; flex-direction: column; }
  
  .header { text-align: center; margin-bottom: 8px; border-bottom: 2px solid #c9a84c; padding-bottom: 6px; }
  .header img { width: 100%; height: auto; max-height: 25mm; }
  .title { text-align: center; font-size: 20px; font-weight: bold; margin: 10px 0 4px; text-transform: uppercase; letter-spacing: 5px; color: #8b6914; }
  .subtitle { text-align: center; font-size: 13px; margin-bottom: 8px; color: #666; font-weight: bold; }
  
  .cert-text { text-align: center; font-size: 13px; margin: 10px 0; line-height: 1.8; }
  .student-name { font-size: 16px; font-weight: bold; text-transform: uppercase; }
  
  .photo-qr { display: flex; justify-content: center; align-items: center; gap: 20px; margin: 10px 0; }
  .photo-box { width: 30mm; height: 35mm; border: 2px solid #c9a84c; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #999; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .qr-box { width: 25mm; height: 25mm; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; }
  
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 12px; }
  th { background: rgba(139,105,20,0.9); color: #fff; padding: 5px 6px; text-align: left; font-size: 9px; text-transform: uppercase; }
  th.center { text-align: center; }
  td { padding: 3px 6px; border-bottom: 1px solid #ddd; font-size: 11px; }
  td.center { text-align: center; }
  .subject-col { text-align: left; font-weight: bold; }
  .total-row { font-weight: bold; background: rgba(201,168,76,0.15)!important; }
  .total-row td { border-top: 2px solid #c9a84c; }
  
  .summary { margin: 6px 0; padding: 6px 12px; border: 1px solid #c9a84c; font-size: 11px; background: rgba(201,168,76,0.05); }
  .summary p { margin: 2px 0; }
  
  .date-info { text-align: center; font-size: 11px; margin: 6px 0; color: #555; }
  
  .signatures { display: flex; justify-content: space-between; margin-top: 20px; font-size: 12px; }
  .sig-box { text-align: center; width: 30%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 5px; height: 22px; }
  
  .footer { text-align: center; font-size: 9px; margin-top: auto; padding-top: 8px; border-top: 1px solid #c9a84c; color: #666; }
  
  .pass { color: #059669; font-weight: bold; }
  .fail { color: #dc2626; font-weight: bold; }
  .promoted { color: #059669; font-weight: bold; }
  
  .print-toolbar { text-align: center; padding: 10px; margin-top: 12px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold; margin: 3px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(wm)}" alt=""></div>
  <div class="content">
    <div class="header"><img src="${esc(letterhead)}" alt="School Letterhead"></div>
    <div class="title">THE CERTIFICATE OF NURSERY EDUCATION</div>
    <div class="subtitle">${esc(year)}</div>
    
    <div class="photo-qr">
      <div class="photo-box">
        ${student?.photo_url ? `<img src="${esc(student.photo_url)}" alt="Photo">` : 'Passport Photo'}
      </div>
      <div class="qr-box" id="qrcode"></div>
    </div>
    
    <div class="cert-text">
      <p>This is to certify that</p>
      <p class="student-name">${esc(student?.first_name || '')} ${esc(student?.last_name || '')}</p>
      <p>Has sat for the <strong>Certificate of Nursery Education</strong></p>
    </div>
    
    <div class="date-info">
      <p><strong>Date of Award:</strong> ${new Date().toLocaleDateString('en-GB', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
      <p><strong>Pupil's ID:</strong> ${esc(student?.student_id || 'N/A')}</p>
    </div>
    
    <p style="font-size:12px;margin-top:6px;"><strong>And has obtained the following results:</strong></p>
    
    <table>
      <thead><tr><th class="subject-col">SUBJECTS</th><th class="center">TERM I</th><th class="center">TERM II</th><th class="center">TERM III</th></tr></thead>
      <tbody>
        ${rows}
        <tr class="total-row"><td class="subject-col"><strong>TOTAL</strong></td><td class="center"><strong>${t1?.total_score || '-'}</strong></td><td class="center"><strong>${t2?.total_score || '-'}</strong></td><td class="center"><strong>${t3?.total_score || '-'}</strong></td></tr>
      </tbody>
    </table>
    
    <div class="summary">
      <p><strong>Average Percentage:</strong> ${avgPct ? avgPct.toFixed(1) + '%' : 'N/A'}</p>
      <p><strong>Result:</strong> <span class="pass">Pass</span></p>
      <p><strong>Promoted to:</strong> <span class="promoted">P1</span></p>
    </div>
    
    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>
    
    <div class="footer">
      <p>Hope Nursery and Primary School | Certificate of Nursery Education | ${esc(year)}</p>
      <p style="color:#1a56db;margin-top:2px;">Verify at: www.hopeschool.sd/verify</p>
    </div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
<script>
  // Generate QR code if QR library available
  try {
    const qrDiv = document.getElementById('qrcode');
    if (qrDiv && typeof QRCode !== 'undefined') {
      new QRCode(qrDiv, {
        text: '${esc(student?.verify_url || '')}',
        width: 80,
        height: 80
      });
    }
  } catch(e) {}
</script>
</body></html>`
}
