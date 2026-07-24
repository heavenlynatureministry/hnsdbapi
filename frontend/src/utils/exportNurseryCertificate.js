/**
 * Export Nursery Education Certificate to Print/PDF
 * A4 Portrait - Certificate of Nursery Education
 * Includes photo, QR code, award date, certificate wording
 * All content fits on ONE A4 page
 */

export const exportNurseryCertificate = (reportData) => {
  if (!reportData) { console.error('No report data to export'); return }
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const watermarkUrl = window.location.origin + '/ReportCardWM.jpg'
  const printWindow = window.open('', '_blank', 'width=900,height=700')
  if (!printWindow) { alert('Please allow pop-ups to print certificate'); return }
  printWindow.document.write(buildNurseryCertificate(reportData, letterheadUrl, watermarkUrl))
  finishAndPrint(printWindow)
}

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
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Georgia', 'Times New Roman', serif; 
    font-size: 13px; color: #1a1a1a; background: #e5e7eb; 
    padding: 8px; line-height: 1.5; 
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .page-wrapper { width: 210mm; margin: 0 auto; }
  .page { position: relative; width: 210mm; height: 297mm; max-height: 297mm; overflow: hidden; background: transparent; }
  .watermark { position: absolute; inset: 0; z-index: 0; }
  .watermark img { width: 100%; height: 100%; object-fit: fill; opacity: 1; display: block; }
  .content { position: absolute; inset: 0; z-index: 5; background: transparent; display: flex; flex-direction: column; padding: 16mm 14mm 14mm 14mm; height: 100%; overflow: hidden; }
  .spacer { flex: 1 1 auto; min-height: 3px; }
  .section-spacer { height: 3mm; flex-shrink: 0; }

  .letterhead { text-align: center; margin-bottom: 4px; padding-bottom: 2px; border-bottom: 2px double #1a56db; flex-shrink: 0; }
  .letterhead img { width: 100%; height: auto; display: block; }
  .letterhead-fallback { display: none; text-align: center; padding: 1mm 0; }

  .title { text-align: center; font-size: 17px; font-weight: bold; margin: 6px 0 4px; text-transform: uppercase; letter-spacing: 3px; color: #1a3a6b; flex-shrink: 0; }

  .header-row { display: flex; justify-content: space-between; align-items: center; margin: 5mm 0; flex-shrink: 0; gap: 4mm; }
  .photo-box { width: 25mm; height: 25mm; border: 2px solid #1a3a6b; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f0f4f8; }
  .photo-box img { width: 100%; height: 100%; object-fit: cover; }
  .photo-placeholder { font-size: 8px; color: #999; text-align: center; }
  .middle-info { flex: 1; text-align: center; font-size: 11px; line-height: 1.6; }
  .middle-info p { margin: 2px 0; }
  .qr-box { width: 25mm; height: 25mm; border: 1px solid #ccc; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
  .qr-box img { width: 100%; height: 100%; }

  .certificate-text { text-align: center; margin: 5mm 0; font-size: 12px; line-height: 1.6; flex-shrink: 0; }
  .certificate-text .student-name { font-size: 15px; font-weight: bold; color: #1a3a6b; display: block; margin: 3px 0; }

  table { width: 100%; border-collapse: collapse; margin: 3px 0; font-size: 11px; flex-shrink: 0; }
  th { background: rgba(20,60,140,0.92); color: #fff; padding: 4px 5px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 1px; }
  th.center { text-align: center; }
  td { padding: 3px 5px; border-bottom: 1px solid #bbb; font-size: 11px; }
  td.center { text-align: center; }
  tr:nth-child(even) { background: rgba(248,249,250,0.5); }
  .total-row { font-weight: bold; background: rgba(26,86,219,0.12)!important; font-size: 12px; }
  .total-row td { padding: 4px 5px; border-top: 2px solid #1a56db; }

  .signatures { display: flex; justify-content: space-between; margin-top: 8px; font-size: 10px; padding: 0 8px; flex-shrink: 0; }
  .sig-box { text-align: center; width: 30%; }
  .sig-line { border-bottom: 1.5px solid #000; margin-bottom: 3px; height: 16px; }

  .footer { text-align: center; font-size: 8px; margin-top: 3px; padding-top: 3px; border-top: 1px solid #bbb; color: #666; flex-shrink: 0; line-height: 1.4; }
  .footer .verify-text { color: #1a56db; }

  .print-toolbar { text-align: center; padding: 10px; margin-top: 12px; background: #f0f0f0; border-radius: 8px; }
  .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
`

function buildNurseryCertificate(reportData, letterheadUrl, watermarkUrl) {
  const { student, term1, term2, term3, academic_year, school, verify_url, annual_summary } = reportData
  const subjects = getUniqueSubjects(term1, term2, term3)
  
  const rows = subjects.map(subj => {
    const a = (term1?.subjects||[]).find(s=>s.name===subj)||{}
    const b = (term2?.subjects||[]).find(s=>s.name===subj)||{}
    const c = (term3?.subjects||[]).find(s=>s.name===subj)||{}
    return `<tr><td class="subject-col">${esc(subj)}</td><td class="center">${a.score||'-'}</td><td class="center">${b.score||'-'}</td><td class="center">${c.score||'-'}</td></tr>`
  }).join('')

  const t1Total = term1?.total_score || '-'
  const t2Total = term2?.total_score || '-'
  const t3Total = term3?.total_score || '-'

  // QR Code URL for verification
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verify_url || '')}`

  // Photo URL - use student photo if available, otherwise placeholder
  const photoUrl = student?.photo_url || student?.photo || '/logo.png'

  return `<!DOCTYPE html><html>
<head><title>Certificate - ${esc(student?.name)}</title><meta charset="utf-8"><style>${BASE_CSS}</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="watermark"><img src="${esc(watermarkUrl)}" alt="" onerror="this.style.display='none'"></div>
  <div class="content">
    <div class="letterhead">
      <img src="${esc(letterheadUrl)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:14px;">${esc(school?.name||'School Name')}</h2><p style="font-size:9px;"><em>"${esc(school?.motto||'')}"</em></p></div>
    </div>
    <div class="title">THE CERTIFICATE OF NURSERY EDUCATION</div>
    
    <div class="section-spacer"></div>
    
    <!-- Photo | Info | QR Code Row -->
    <div class="header-row">
      <div class="photo-box">
        <img src="${esc(photoUrl)}" alt="Student Photo" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
        <div class="photo-placeholder" style="display:none">Photo</div>
      </div>
      <div class="middle-info">
        <p><strong>Date of Award:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
        <p><strong>Pupil's ID:</strong> ${esc(student?.student_id || 'N/A')}</p>
        <p><strong>Conduct:</strong> Good</p>
      </div>
      <div class="qr-box">
        <img src="${qrApiUrl}" alt="QR Code" onerror="this.innerHTML='QR'">
      </div>
    </div>

    <div class="section-spacer"></div>

    <!-- Certificate Text -->
    <div class="certificate-text">
      <p>This is to certify that</p>
      <span class="student-name">${esc(student?.name || 'Student Name')}</span>
      <p>Has been awarded the Certificate of Nursery Education</p>
    </div>

    <div class="section-spacer"></div>

    <!-- Marks Table -->
    <table><thead><tr><th>SUBJECTS</th><th class="center">TERM I</th><th class="center">TERM II</th><th class="center">TERM III</th></tr></thead><tbody>
      ${rows}
      <tr class="total-row"><td><strong>TOTAL</strong></td><td class="center"><strong>${t1Total}</strong></td><td class="center"><strong>${t2Total}</strong></td><td class="center"><strong>${t3Total}</strong></td></tr>
    </tbody></table>

    ${annual_summary ? `
    <div class="section-spacer"></div>
    <div style="text-align:center;font-size:10px;padding:4px 8px;border:1px solid #1a56db;flex-shrink:0">
      <strong>Annual Average:</strong> ${annual_summary.average_percentage||'N/A'}% | 
      <strong>Grade:</strong> ${annual_summary.grade||'N/A'} | 
      <strong>Status:</strong> <span style="color:${annual_summary.promotion_status==='Promoted'?'#059669':'#dc2626'};font-weight:bold">${annual_summary.promotion_status||'N/A'}</span>
    </div>` : ''}

    <div class="spacer"></div>

    <div class="signatures">
      <div class="sig-box"><div class="sig-line"></div><strong>Director of Studies</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Head Teacher</strong></div>
      <div class="sig-box"><div class="sig-line"></div><strong>Parent/Guardian</strong></div>
    </div>

    <div class="footer">
      <p>${esc(school?.name||'School')} | ${esc(academic_year)} | Computer-generated Certificate</p>
      ${verify_url ? `<p class="verify-text">Certificate Verification: ${esc(verify_url)}</p>` : ''}
    </div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print Certificate</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
