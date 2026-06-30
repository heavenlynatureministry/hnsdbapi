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
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          html, body {
            font-family: 'Inter', system-ui, sans-serif;
            color: #1f2937;
            background: transparent;
            position: relative;
            width: 100%;
            min-height: 100%;
          }
          
          @media print {
            html, body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background: transparent !important;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
            
            @page {
              margin: 0;
              size: A4;
              background: transparent;
            }
            
            /* Watermark - full page background */
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 0;
              pointer-events: none;
            }
            .watermark img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 0.30;
            }
            
            /* Page container - transparent to show watermark */
            .page-container {
              position: relative;
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              padding: 20mm 15mm 20mm 15mm;
              background: transparent;
              z-index: 1;
            }
            
            /* Letterhead */
            .letterhead {
              text-align: center;
              padding-bottom: 10px;
              margin-bottom: 18px;
              border-bottom: 3px double rgba(26, 86, 219, 0.6);
              position: relative;
              z-index: 2;
              background: transparent;
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
              background: transparent;
            }
            
            /* Report content - transparent to show watermark */
            .report-content {
              position: relative;
              z-index: 2;
              background: transparent;
            }
            
            /* Make cards and tables slightly translucent to show watermark */
            .report-content .card,
            .report-content [class*="card"],
            .report-content table {
              background: rgba(255, 255, 255, 0.65) !important;
              backdrop-filter: none;
            }
            
            .report-content table thead {
              background: rgba(26, 86, 219, 0.12) !important;
            }
            
            .report-content table tbody tr:nth-child(even) {
              background: rgba(249, 250, 251, 0.5) !important;
            }
            
            .report-content table tbody tr:nth-child(odd) {
              background: rgba(255, 255, 255, 0.4) !important;
            }
            
            /* Remove solid white backgrounds */
            .bg-white,
            [class*="bg-white"],
            .bg-gray-50,
            [class*="bg-gray-50"],
            .bg-gray-100,
            [class*="bg-gray-100"],
            .dark .bg-gray-800,
            .dark .bg-gray-900,
            [class*="bg-gray-800"],
            [class*="bg-gray-900"] {
              background: rgba(255, 255, 255, 0.55) !important;
            }
            
            /* Stat cards - slightly more opaque for readability */
            .stat-card {
              background: rgba(255, 255, 255, 0.7) !important;
            }
            
            /* Footer */
            .report-footer {
              position: relative;
              z-index: 2;
              text-align: center;
              padding-top: 10px;
              margin-top: 20px;
              border-top: 1px solid rgba(209, 213, 219, 0.6);
              font-size: 9px;
              color: #4b5563;
              background: transparent;
            }
            .report-footer p {
              margin: 2px 0;
              line-height: 1.4;
            }
            .report-footer .footer-brand {
              font-weight: 600;
              color: #374151;
            }
            
            /* Ensure text is readable */
            h1, h2, h3, h4, h5, h6 {
              color: #111827;
            }
            p, span, li, td, th, div {
              color: #1f2937;
            }
            
            /* Dark mode overrides */
            .dark { 
              background: transparent !important; 
              color: #1f2937 !important;
            }
            .dark .text-white { color: #1f2937 !important; }
            .dark .text-gray-300 { color: #374151 !important; }
            .dark .text-gray-400 { color: #4b5563 !important; }
            .dark .border-gray-700 { border-color: rgba(209, 213, 219, 0.5) !important; }
          }
          
          /* Screen preview */
          @media screen {
            .page-container {
              max-width: 900px;
              margin: 0 auto;
              padding: 30px 25px;
              background: transparent;
            }
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              z-index: 0;
              pointer-events: none;
            }
            .watermark img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              opacity: 0.22;
            }
            .letterhead {
              background: transparent;
              padding: 12px;
            }
            .letterhead img {
              max-width: 100%;
              width: 650px;
              height: auto;
              object-fit: contain;
              margin: 0 auto;
            }
            .report-content {
              background: transparent;
            }
            .report-content .card,
            .report-content table {
              background: rgba(255, 255, 255, 0.7) !important;
            }
            .report-footer {
              text-align: center;
              padding-top: 12px;
              margin-top: 30px;
              border-top: 1px solid rgba(209, 213, 219, 0.5);
              font-size: 9px;
              color: #6b7280;
              background: transparent;
            }
            .bg-white,
            [class*="bg-white"],
            .bg-gray-50,
            [class*="bg-gray-50"] {
              background: rgba(255, 255, 255, 0.6) !important;
            }
          }
        </style>
      </head>
      <body>
        <!-- Watermark Background -->
        <div class="watermark">
          <img src="${window.location.origin}/watermark-A4.jpg" alt="Watermark Background" onerror="this.style.display='none';" />
        </div>
        
        <!-- Page Container -->
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
          
          <!-- Report Footer -->
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
