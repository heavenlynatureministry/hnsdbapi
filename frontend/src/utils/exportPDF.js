/**
 * Export HTML element to PDF using browser print
 * Produces beautifully formatted reports with letterhead, watermark, and footer
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
          
          /* Reset and base */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Inter', system-ui, sans-serif;
            color: #1f2937;
            background: white;
            position: relative;
          }
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            
            @page {
              margin: 0;
              size: A4;
            }
            
            /* Main container with margins matching watermark */
            .page-container {
              position: relative;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 20mm 15mm 20mm 15mm;
              background: white;
            }
            
            /* Watermark background on every page */
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -2;
              pointer-events: none;
            }
            .watermark img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.12;
            }
            
            /* Letterhead - positioned inside the watermark margins */
            .letterhead {
              text-align: center;
              padding-bottom: 12px;
              margin-bottom: 20px;
              border-bottom: 3px double #1a56db;
              position: relative;
              z-index: 1;
            }
            .letterhead img {
              max-width: 100%;
              width: 650px;
              height: auto;
              object-fit: contain;
              margin: 0 auto;
            }
            .letterhead-fallback {
              display: none;
              text-align: center;
              padding: 8px 0;
            }
            
            /* Report content area */
            .report-content {
              position: relative;
              z-index: 1;
              min-height: calc(297mm - 180mm);
            }
            
            /* Footer - positioned at the bottom of the content area */
            .report-footer {
              position: relative;
              z-index: 1;
              text-align: center;
              padding-top: 12px;
              margin-top: auto;
              border-top: 1px solid #d1d5db;
              font-size: 9px;
              color: #6b7280;
            }
            .report-footer p {
              margin: 1px 0;
              line-height: 1.4;
            }
            .report-footer .footer-brand {
              font-weight: 500;
              color: #4b5563;
            }
          }
          
          /* Screen preview styles */
          @media screen {
            .page-container {
              max-width: 900px;
              margin: 0 auto;
              padding: 30px 25px;
            }
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: -2;
              pointer-events: none;
            }
            .watermark img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0.06;
            }
            .letterhead img {
              max-width: 100%;
              width: 650px;
              height: auto;
              object-fit: contain;
              margin: 0 auto;
            }
            .report-footer {
              text-align: center;
              padding-top: 12px;
              margin-top: 30px;
              border-top: 1px solid #e5e7eb;
              font-size: 9px;
              color: #9ca3af;
            }
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
        
        <!-- Page Container with margins -->
        <div class="page-container">
          <!-- Letterhead Header -->
          <div class="letterhead">
            <img src="${window.location.origin}/letter-head.jpg" alt="Heavenly Nature School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="letterhead-fallback">
              <h2 style="margin:0; font-size:18px; color:#1a56db;">Heavenly Nature Nursery & Primary School</h2>
              <p style="margin:3px 0; font-size:11px; font-style:italic; color:#4b5563;">"Nurturing Right Leaders"</p>
            </div>
          </div>
          
          <!-- Report Content -->
          <div class="report-content">
            ${element.outerHTML}
          </div>
          
          <!-- Report Footer - inside the margin area -->
          <div class="report-footer">
            <p class="footer-brand">Heavenly Nature Nursery & Primary School</p>
            <p>Generated on ${formattedDateTime}</p>
            <p>&copy; ${currentYear} Heavenly Nature Nursery & Primary School. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `)

  printWindow.document.close()

  // Wait for content and images to load then print
  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Fallback if onload doesn't fire
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 1200)
}
