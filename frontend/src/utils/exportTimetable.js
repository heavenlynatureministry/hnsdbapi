/**
 * Export Timetable to Print/PDF
 * Supports individual class and full section (Nursery/Primary/Secondary) export
 * A4 Landscape layout
 */

export const exportClassTimetable = (classData) => {
  if (!classData) { console.error('No timetable data to export'); return }
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) { alert('Please allow pop-ups to print timetable'); return }
  printWindow.document.write(buildClassTimetableHTML(classData))
  finishAndPrint(printWindow)
}

export const exportSectionTimetable = (sectionData, sectionName) => {
  if (!sectionData) { console.error('No timetable data to export'); return }
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) { alert('Please allow pop-ups to print timetable'); return }
  printWindow.document.write(buildSectionTimetableHTML(sectionData, sectionName))
  finishAndPrint(printWindow)
}

function finishAndPrint(win) {
  win.document.close()
  setTimeout(() => { win.focus(); win.print() }, 500)
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

const PRINT_CSS = `
  @page { size: A4 landscape; margin: 8mm; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    font-size: 10px; 
    color: #1a1a1a; 
    background: #f0f0f0; 
    padding: 10px; 
    line-height: 1.3; 
  }
  .page { 
    background: white; 
    padding: 15px; 
    margin: 0 auto 15px; 
    max-width: 297mm; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.1); 
  }
  .header { text-align: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px double #1a56db; }
  .header h1 { font-size: 16px; color: #1a3a6b; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 2px; }
  .header p { font-size: 10px; color: #666; }
  h2 { font-size: 13px; color: #1a3a6b; margin: 8px 0 5px; padding: 4px 8px; background: #f0f4ff; border-left: 4px solid #1a56db; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
  th { background: #1a56db; color: white; padding: 5px 6px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.day-col { width: 60px; }
  td { padding: 4px 6px; border: 1px solid #ddd; vertical-align: top; }
  .period { background: #f0f4ff; padding: 3px 5px; margin: 2px 0; border-radius: 3px; border-left: 3px solid #1a56db; font-size: 9px; }
  .period .subject { font-weight: bold; color: #1a3a6b; }
  .period .time { color: #666; font-size: 8px; }
  .period .teacher { color: #059669; font-size: 8px; }
  .empty { color: #999; font-style: italic; font-size: 9px; }
  .footer { text-align: center; font-size: 8px; color: #999; margin-top: 10px; padding-top: 5px; border-top: 1px solid #ddd; }
  .no-print { text-align: center; padding: 15px; }
  .btn { padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 3px; }
  .btn-close { background: #6b7280; }
  @media print {
    .page { box-shadow: none; margin: 0; padding: 10px; }
  }
`

function buildClassTimetableHTML(classData) {
  const { class_name, class_level, schedule, teacher_name } = classData

  return `<!DOCTYPE html><html>
<head><title>Timetable - ${esc(class_name)}</title><meta charset="utf-8"><style>${PRINT_CSS}</style></head>
<body>
  <div class="page">
    <div class="header">
      <h1>Class Timetable</h1>
      <p><strong>Class:</strong> ${esc(class_name)} | <strong>Level:</strong> ${esc(class_level || 'N/A')} | <strong>Teacher:</strong> ${esc(teacher_name || 'Unassigned')}</p>
    </div>
    <table>
      <thead><tr><th class="day-col">Day</th><th>Periods</th></tr></thead>
      <tbody>
        ${DAYS.map((day, i) => {
          const periods = schedule?.[day] || []
          let cells = ''
          if (periods.length === 0) {
            cells = '<span class="empty">No periods scheduled</span>'
          } else {
            periods.forEach(p => {
              cells += `<div class="period">
                <span class="subject">${esc(p.subject || 'N/A')}</span><br/>
                <span class="time">${esc(p.start_time || '--')} - ${esc(p.end_time || '--')}</span><br/>
                <span class="teacher">👨‍🏫 ${esc(p.teacher_name || p.teacher || 'Unassigned')}</span>
              </div>`
            })
          }
          return `<tr><td class="day-col"><strong>${DAY_LABELS[i]}</strong></td><td>${cells}</td></tr>`
        }).join('')}
      </tbody>
    </table>
    <div class="footer"><p>Computer-generated timetable | ${new Date().toLocaleDateString()}</p></div>
  </div>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Print Timetable</button>
    <button class="btn btn-close" onclick="window.close()">✕ Close</button>
  </div>
</body></html>`
}

function buildSectionTimetableHTML(sectionData, sectionName) {
  const { timetable, academic_year } = sectionData || {}
  const classes = timetable || []

  return `<!DOCTYPE html><html>
<head><title>${esc(sectionName)} Timetable</title><meta charset="utf-8"><style>${PRINT_CSS}</style></head>
<body>
  <div class="page">
    <div class="header">
      <h1>${esc(sectionName)} Section Timetable</h1>
      <p>Academic Year: ${esc(academic_year || 'N/A')} | ${classes.length} Class${classes.length !== 1 ? 'es' : ''} | Generated: ${new Date().toLocaleDateString()}</p>
    </div>
    ${classes.map((cls, ci) => `
      ${ci > 0 ? '<div class="page-break"></div>' : ''}
      <h2>📚 ${esc(cls.class_name)}</h2>
      <table>
        <thead><tr><th class="day-col">Day</th><th>Periods</th></tr></thead>
        <tbody>
          ${DAYS.map((day, i) => {
            const periods = cls.days?.[day] || []
            let cells = ''
            if (periods.length === 0) {
              cells = '<span class="empty">No periods scheduled</span>'
            } else {
              periods.forEach(p => {
                cells += `<div class="period">
                  <span class="subject">${esc(p.subject || 'N/A')}</span><br/>
                  <span class="time">${esc(p.start_time || '--')} - ${esc(p.end_time || '--')}</span><br/>
                  <span class="teacher">👨‍🏫 ${esc(p.teacher_name || 'Unassigned')}</span>
                </div>`
              })
            }
            return `<tr><td class="day-col"><strong>${DAY_LABELS[i]}</strong></td><td>${cells}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    `).join('')}
    <div class="footer"><p>Computer-generated timetable | ${esc(sectionName)} Section | ${new Date().toLocaleDateString()}</p></div>
  </div>
  <div class="no-print">
    <button class="btn" onclick="window.print()">🖨️ Print All</button>
    <button class="btn btn-close" onclick="window.close()">✕ Close</button>
  </div>
</body></html>`
}
