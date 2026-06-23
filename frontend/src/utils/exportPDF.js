/**
 * Export HTML element to PDF using browser print
 */

export const exportToPDF = (element, filename = 'report') => {
  if (!element) {
    console.error('No element to export')
    return
  }

  const printWindow = window.open('', '_blank', 'width=800,height=600')
  
  if (!printWindow) {
    alert('Please allow popups to export PDF')
    return
  }

  // Get styles
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
  let styleContent = ''
  styles.forEach(style => {
    if (style.tagName === 'STYLE') {
      styleContent += style.outerHTML
    } else if (style.tagName === 'LINK' && style.href && !style.href.includes('fonts.googleapis')) {
      styleContent += style.outerHTML
    }
  })

  // Build the print content
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${filename}</title>
        <meta charset="utf-8">
        ${styleContent}
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            
            .letterhead {
              display: flex !important;
              align-items: center;
              justify-content: center;
              gap: 15px;
              padding-bottom: 15px;
              margin-bottom: 20px;
              border-bottom: 3px double #1a56db;
            }
            .letterhead img {
              width: 65px;
              height: 65px;
              object-fit: cover;
              border-radius: 12px;
            }
            .letterhead-text h2 {
              margin: 0;
              font-size: 18px;
              color: #1a56db;
              font-weight: 700;
            }
            .letterhead-text p {
              margin: 2px 0;
              font-size: 11px;
              color: #4b5563;
            }
            .letterhead-text .motto {
              color: #1a56db;
              font-style: italic;
              font-weight: 500;
              margin-top: 4px;
            }
          }
          
          body {
            font-family: 'Inter', system-ui, sans-serif;
            padding: 20px;
            color: #1f2937;
            background: white;
          }
          
          .dark { 
            background: white !important; 
            color: #1f2937 !important;
          }
          .dark .text-white { color: #1f2937 !important; }
          .dark .bg-gray-800 { background: #f9fafb !important; }
          .dark .bg-gray-900 { background: #f3f4f6 !important; }
          .dark .text-gray-300 { color: #374151 !important; }
          .dark .text-gray-400 { color: #4b5563 !important; }
          .dark .border-gray-700 { border-color: #e5e7eb !important; }
        </style>
      </head>
      <body>
        <!-- Letterhead Header -->
        <div class="letterhead">
          <img src="${window.location.origin}/letter-head.jpg" alt="HNS Letterhead" onerror="this.style.display='none'" />
          <div class="letterhead-text">
            <h2>Heavenly Nature Nursery & Primary School</h2>
            <p>Juba, South Sudan | +211 922 273 334</p>
            <p>info@heavenlynatureschools.com | www.heavenlynatureschools.com</p>
            <p class="motto">"Nurturing Right Leaders"</p>
          </div>
        </div>
        
        ${element.outerHTML}
        
        <div style="text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af;">
          <p>Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })}</p>
          <p>&copy; ${new Date().getFullYear()} Heavenly Nature Nursery & Primary School. All rights reserved.</p>
        </div>
      </body>
    </html>
  `)

  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
  }

  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 500)
}
