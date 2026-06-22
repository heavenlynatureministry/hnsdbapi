/**
 * Export HTML element to PDF using browser print
 */

export const exportToPDF = (element, filename = 'report') => {
  if (!element) {
    console.error('No element to export')
    return
  }

  // Store original document title
  const originalTitle = document.title
  
  // Create a new window for printing
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
    } else if (style.tagName === 'LINK') {
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
          /* Print-specific styles */
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
            .page-break { page-break-after: always; }
          }
          body {
            font-family: 'Inter', system-ui, sans-serif;
            padding: 20px;
            color: #1f2937;
            background: white;
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
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 18px;">Heavenly Nature Nursery & Primary School</h2>
          <p style="margin: 4px 0; font-size: 12px; color: #6b7280;">Nurturing Right Leaders</p>
          <hr style="border: none; border-top: 2px solid #2563eb; margin: 12px 0;" />
        </div>
        ${element.outerHTML}
        <div style="text-align: center; margin-top: 30px; font-size: 10px; color: #9ca3af;">
          <p>Generated on ${new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          })}</p>
          <p>© ${new Date().getFullYear()} Heavenly Nature Nursery & Primary School</p>
        </div>
      </body>
    </html>
  `)

  printWindow.document.close()

  // Wait for content to load then print
  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    // Don't close the window - let user close after print dialog
  }

  // Fallback if onload doesn't fire
  setTimeout(() => {
    printWindow.focus()
    printWindow.print()
  }, 500)
}
