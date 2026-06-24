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

  // Get styles from the current document
  const styles = document.querySelectorAll('style, link[rel="stylesheet"]')
  let styleContent = ''
  styles.forEach(style => {
    if (style.tagName === 'STYLE') {
      styleContent += style.outerHTML
    } else if (style.tagName === 'LINK' && style.href && !style.href.includes('fonts.googleapis')) {
      styleContent += style.outerHTML
    }
  })

  // Format current date and time for footer
  const now = new Date()
  const formattedDateTime = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  const currentYear = now.getFullYear()

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
              position: relative;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            
            /* Watermark background on every page */
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -1;
              opacity: 0.15;
              pointer-events: none;
            }
            .watermark img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            
            .letterhead {
              text-align: center;
              padding-bottom: 15px;
              margin-bottom: 20px;
              border-bottom: 3px double #1a56db;
              position: relative;
              z-index: 1;
              background: rgba(255, 255, 255, 0.85);
            }
            .letterhead img {
              max-width: 100%;
              width: 700px;
              height: auto;
              object-fit: contain;
            }
            
            .report-content {
              position: relative;
              z-index: 1;
            }
            
            .report-footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 15px;
              border-top: 1px solid #e5e7eb;
              font-size: 10px;
              color: #9ca3af;
              position: relative;
              z-index: 1;
              background: rgba(255, 255, 255, 0.85);
            }
            .report-footer p {
              margin: 2px 0;
            }
          }
          
          body {
            font-family: 'Inter', system-ui, sans-serif;
            padding: 20px;
            color: #1f2937;
            background: white;
            position: relative;
          }
          
          /* Watermark for screen preview */
          .watermark {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: -1;
            opacity: 0.08;
            pointer-events: none;
          }
          .watermark img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          
          /* Hide dark mode styles when printing */
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
        <!-- Watermark Background (appears on every page) -->
        <div class="watermark">
          <img src="${window.location.origin}/watermark-A4.jpg" alt="Watermark Background" onerror="this.style.display='none';" />
        </div>
        
        <!-- Letterhead Header -->
        <div class="letterhead">
          <img src="${window.location.origin}/letter-head.jpg" alt="Heavenly Nature School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div style="display:none; text-align:center; padding:10px;">
            <h2 style="margin:0; color:#1a56db;">Heavenly Nature Nursery & Primary School</h2>
            <p style="margin:4px 0; font-style:italic; color:#4b5563;">"Nurturing Right Leaders"</p>
          </div>
        </div>
        
        <!-- Report Content -->
        <div class="report-content">
          ${element.outerHTML}
        </div>
        
        <!-- Report Footer -->
        <div class="report-footer">
          <p>Generated on ${formattedDateTime}</p>
          <p>&copy; ${currentYear} Heavenly Nature Nursery & Primary School. All rights reserved.</p>
        </div>
      </body>
    </html>
  `)

  printWindow.document.close()

  // Wait for content and images to load then print
  printWindow.onload = () => {
    printWindow.focus()
    // Small delay to ensure watermark image loads
    setTimeout(() => {
      printWindow.print()
    }, 300)
  }

  // Fallback if onload doesn't fire
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 1000)
}
