/**
 * Export ID Card to Print/PDF
 * Supports Student, Teacher, and Board Member ID cards
 * Uses id-card.jpg template background
 */

export const exportStudentIDCard = (student) => {
  if (!student) { console.error('No student data for ID card'); return }
  const templateUrl = window.location.origin + '/id-card.jpg'
  const printWindow = window.open('', '_blank', 'width=500,height=400')
  if (!printWindow) { alert('Please allow pop-ups to print ID card'); return }
  
  const html = buildIDCardHTML(student, 'student', templateUrl)
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 500)
}

export const exportTeacherIDCard = (teacher) => {
  if (!teacher) { console.error('No teacher data for ID card'); return }
  const templateUrl = window.location.origin + '/id-card.jpg'
  const printWindow = window.open('', '_blank', 'width=500,height=400')
  if (!printWindow) { alert('Please allow pop-ups to print ID card'); return }
  
  const html = buildIDCardHTML(teacher, 'teacher', templateUrl)
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 500)
}

export const exportBoardMemberIDCard = (boardMember) => {
  if (!boardMember) { console.error('No board member data for ID card'); return }
  const templateUrl = window.location.origin + '/id-card.jpg'
  const printWindow = window.open('', '_blank', 'width=500,height=400')
  if (!printWindow) { alert('Please allow pop-ups to print ID card'); return }
  
  const html = buildIDCardHTML(boardMember, 'board', templateUrl)
  printWindow.document.write(html)
  printWindow.document.close()
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 500)
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

function buildIDCardHTML(person, type, templateUrl) {
  const idNumber = person.student_id || person.teacher_id || person.board_member_id || 'N/A'
  const fullName = `${person.first_name || ''} ${person.last_name || ''}`.trim()
  const verifyUrl = `${window.location.origin}/verify/id/${type}/${person._id || person.id}`
  
  let role, roleLabel, idLabel
  switch (type) {
    case 'student':
      role = person.class_name || person.class || 'Student'
      roleLabel = 'Class'
      idLabel = 'Student ID'
      break
    case 'teacher':
      role = person.subject_specialty || person.department || 'Teacher'
      roleLabel = 'Department'
      idLabel = 'Teacher ID'
      break
    case 'board':
      role = person.position || 'Board Member'
      roleLabel = 'Position'
      idLabel = 'Board ID'
      break
  }

  // Generate barcode placeholder (simple SVG barcode representation)
  const barcodeSvg = generateBarcodeSvg(idNumber)

  return `<!DOCTYPE html><html>
<head><title>ID Card - ${esc(fullName)}</title><meta charset="utf-8">
<style>
  @page { size: 85.6mm 54mm; margin: 0; }
  @media print {
    html, body { 
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      margin: 0 !important; 
      padding: 0 !important; 
      background: white !important;
      width: 85.6mm !important; 
      height: 54mm !important;
      overflow: hidden !important;
    }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Arial', 'Helvetica', sans-serif; 
    font-size: 11px; 
    color: #1a1a1a; 
    background: #f0f0f0; 
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 10px;
  }
  .id-card {
    width: 85.6mm;
    height: 54mm;
    position: relative;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }
  .id-card-bg {
    position: absolute;
    inset: 0;
    background-image: url('${esc(templateUrl)}');
    background-size: cover;
    background-position: center;
    z-index: 0;
  }
  .id-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(26,58,107,0.85) 0%, rgba(13,71,161,0.8) 50%, rgba(21,101,192,0.85) 100%);
    z-index: 1;
  }
  .id-card-content {
    position: relative;
    z-index: 2;
    height: 100%;
    display: flex;
    padding: 6px 8px;
    color: #fff;
  }
  
  .left-section {
    width: 35%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding-right: 6px;
    border-right: 1px solid rgba(255,255,255,0.3);
  }
  .photo-container {
    width: 25mm;
    height: 30mm;
    border: 2px solid rgba(255,255,255,0.8);
    border-radius: 4px;
    overflow: hidden;
    background: rgba(255,255,255,0.2);
    margin-bottom: 4px;
  }
  .photo-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .photo-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: rgba(255,255,255,0.7);
    text-align: center;
  }
  .school-logo-text {
    font-size: 7px;
    text-align: center;
    font-weight: bold;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.9);
  }
  
  .right-section {
    width: 65%;
    padding-left: 6px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .school-name {
    font-size: 9px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
    text-align: center;
    border-bottom: 1px solid rgba(255,255,255,0.3);
    padding-bottom: 4px;
  }
  .info-row {
    display: flex;
    margin-bottom: 2px;
    font-size: 7.5px;
  }
  .info-label {
    width: 28%;
    font-weight: bold;
    color: rgba(255,255,255,0.85);
    font-size: 7px;
  }
  .info-value {
    width: 72%;
    color: #fff;
    font-size: 7.5px;
  }
  .name-value {
    font-size: 9px;
    font-weight: bold;
    text-transform: uppercase;
  }
  .barcode-section {
    margin-top: 4px;
    text-align: center;
  }
  .barcode-section svg {
    width: 100%;
    height: 12mm;
  }
  .verify-text {
    font-size: 5.5px;
    text-align: center;
    margin-top: 3px;
    color: rgba(255,255,255,0.7);
    letter-spacing: 0.5px;
  }
  .valid-date {
    font-size: 6px;
    text-align: center;
    margin-top: 2px;
    color: rgba(255,255,255,0.8);
  }
  
  .print-btn { 
    text-align: center; 
    margin-top: 15px; 
  }
  .btn { 
    padding: 10px 25px; 
    border: none; 
    border-radius: 6px; 
    cursor: pointer; 
    font-size: 14px; 
    font-weight: bold; 
    background: #2563eb; 
    color: #fff; 
  }
</style></head>
<body>
<div style="text-align:center;">
  <div class="id-card">
    <div class="id-card-bg"></div>
    <div class="id-card-overlay"></div>
    <div class="id-card-content">
      <div class="left-section">
        <div class="photo-container">
          ${person.photo_url 
            ? `<img src="${esc(person.photo_url)}" alt="Photo" onerror="this.parentElement.innerHTML='<div class=photo-placeholder>No<br>Photo</div>'">`
            : '<div class="photo-placeholder">No<br>Photo</div>'
          }
        </div>
        <div class="school-logo-text">HOPE<br>SCHOOL</div>
      </div>
      <div class="right-section">
        <div class="school-name">Hope Nursery & Primary School</div>
        <div class="info-row">
          <span class="info-label">Name:</span>
          <span class="info-value name-value">${esc(fullName)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${roleLabel}:</span>
          <span class="info-value">${esc(role)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">${idLabel}:</span>
          <span class="info-value" style="font-family:'Courier New',monospace;font-size:7px;">${esc(idNumber)}</span>
        </div>
        <div class="barcode-section">
          ${barcodeSvg}
        </div>
        <div class="verify-text">Verify: ${esc(verifyUrl)}</div>
        <div class="valid-date">Valid: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}</div>
      </div>
    </div>
  </div>
  <div class="print-btn no-print">
    <button class="btn" onclick="window.print()">🖨️ Print ID Card</button>
  </div>
</div>
</body></html>`
}

function generateBarcodeSvg(idNumber) {
  // Generate a simple visual barcode representation using SVG
  const digits = String(idNumber).replace(/\D/g, '')
  if (!digits) digits = '000000'
  
  let bars = ''
  const totalBars = digits.length * 8
  const barWidth = 100 / totalBars
  
  for (let i = 0; i < digits.length; i++) {
    const digit = parseInt(digits[i])
    // Create 8 bars per digit (simple pattern)
    for (let j = 0; j < 8; j++) {
      const isBar = ((digit * (j + 1)) % 3) !== 0
      const x = (i * 8 + j) * barWidth
      if (isBar) {
        const height = 70 + ((digit * 3 + j * 7) % 30)
        bars += `<rect x="${x}%" y="${(100 - height) / 2}%" width="${barWidth * 0.7}%" height="${height}%" fill="white" opacity="0.9"/>`
      }
    }
  }
  
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="100" height="100" fill="none"/>
    ${bars}
    <text x="50" y="95" text-anchor="middle" fill="white" font-size="6" font-family="'Courier New',monospace" opacity="0.8">${idNumber}</text>
  </svg>`
}
