import { useEffect, useRef } from 'react'
import { Printer, Download, X } from 'lucide-react'
import Button from '../common/Button'
// REMOVED: import './ReceiptPrint.css' - CSS is now inline

function ReceiptPrint({ receipt, onClose }) {
  const printRef = useRef(null)

  useEffect(() => {
    // Auto-open print dialog when receipt is loaded
    const timer = setTimeout(() => {
      handlePrint()
    }, 500)
    
    return () => clearTimeout(timer)
  }, [])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    
    // Get the letterhead image URL
    const letterheadUrl = window.location.origin + '/letter-head.jpg'
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt?.receipt_number || 'Print'}</title>
        <style>
          @page {
            size: A5;
            margin: 5mm;
          }
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .no-print { display: none !important; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            background: #fff;
            width: 148mm;
            margin: 0 auto;
            padding: 5mm;
          }
          
          .receipt {
            border: 2px solid #000;
            max-width: 148mm;
          }
          
          .letterhead {
            width: 100%;
            height: auto;
            display: block;
            border-bottom: 1px solid #000;
          }
          
          .letterhead img {
            width: 100%;
            height: auto;
            display: block;
            object-fit: contain;
          }
          
          .receipt-content {
            padding: 5mm 8mm 8mm 8mm;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 14px;
            font-weight: bold;
            margin: 5mm 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            border: 1px solid #000;
            padding: 2mm;
            background: #f0f0f0;
          }
          
          .receipt-number {
            text-align: right;
            font-size: 10px;
            margin-bottom: 5mm;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2mm;
            font-size: 11px;
          }
          
          .info-label {
            font-weight: bold;
            width: 35%;
          }
          
          .info-value {
            width: 65%;
            border-bottom: 1px dotted #ccc;
          }
          
          .amount-section {
            border: 2px solid #000;
            padding: 3mm;
            margin: 5mm 0;
            text-align: center;
            background: #fafafa;
          }
          
          .amount-value {
            font-size: 20px;
            font-weight: bold;
            font-family: 'Arial', sans-serif;
          }
          
          .amount-words {
            font-size: 10px;
            font-style: italic;
            margin-top: 2mm;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 10mm;
            padding-top: 5mm;
            border-top: 1px solid #000;
          }
          
          .signature-box {
            text-align: center;
            width: 45%;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 2mm;
            height: 10mm;
          }
          
          .signature-label {
            font-size: 9px;
          }
          
          .footer {
            text-align: center;
            font-size: 9px;
            margin-top: 5mm;
            padding-top: 3mm;
            border-top: 1px dashed #000;
          }

          .no-print {
            text-align: center;
            margin-top: 10px;
            padding: 10px;
          }
          
          .no-print button {
            padding: 10px 20px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
          }

          .header-fallback {
            text-align: center;
            padding: 8mm;
            border-bottom: 2px solid #000;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="header-fallback" style="display:none;">
              <div style="font-size:16px; font-weight:bold; text-transform:uppercase;">${receipt?.school?.name || 'School Name'}</div>
              ${receipt?.school?.motto ? `<div style="font-size:10px; font-style:italic; margin:2mm 0;">"${receipt.school.motto}"</div>` : ''}
              <div style="font-size:9px;">${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''} | Email: ${receipt?.school?.email || ''}</div>
            </div>
          </div>
          
          <div class="receipt-content">
            <div class="receipt-title">Payment Receipt</div>
            
            <div class="receipt-number">
              <strong>Receipt No:</strong> ${receipt?.receipt_number || 'N/A'}
            </div>
            
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Student Name:</span>
              <span class="info-value">${receipt?.student_name || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Class:</span>
              <span class="info-value">${receipt?.class_name || 'N/A'}</span>
            </div>
            
            <div class="info-row">
              <span class="info-label">Payment For:</span>
              <span class="info-value">${receipt?.payment_for || 'N/A'}</span>
            </div>
            
            ${receipt?.term ? `
            <div class="info-row">
              <span class="info-label">Term:</span>
              <span class="info-value">${receipt.term}</span>
            </div>` : ''}
            
            ${receipt?.academic_year ? `
            <div class="info-row">
              <span class="info-label">Academic Year:</span>
              <span class="info-value">${receipt.academic_year}</span>
            </div>` : ''}
            
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span class="info-value">${receipt?.payment_method || 'Cash'}</span>
            </div>
            
            <div class="amount-section">
              <div style="font-size: 10px; margin-bottom: 2mm;">AMOUNT PAID</div>
              <div class="amount-value">SSP ${Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
              <div class="amount-words">${receipt?.amount_words || ''}</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Received By</div>
                <div style="font-size: 9px;">${receipt?.received_by || ''}</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Paid By</div>
                <div style="font-size: 9px;">${receipt?.paid_by || ''}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>This is a computer-generated receipt.</p>
              <p>Thank you for your payment!</p>
            </div>
          </div>
        </div>
        
        <div class="no-print">
          <button onclick="window.print()">🖨️ Print Receipt</button>
        </div>
      </body>
      </html>
    `)
    
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 1000)
  }

  const handleDownloadPDF = () => {
    handlePrint()
  }

  if (!receipt) return null

  const letterheadUrl = '/letter-head.jpg'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-lg">Receipt Preview</h3>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="primary" size="sm" icon={<Printer size={16} />}>
              Print
            </Button>
            <Button onClick={handleDownloadPDF} variant="secondary" size="sm" icon={<Download size={16} />}>
              PDF
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" icon={<X size={16} />} />
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900">
          <div 
            ref={printRef}
            className="bg-white text-black"
            style={{ 
              fontFamily: "'Courier New', monospace",
              fontSize: '11px',
              maxWidth: '148mm',
              margin: '0 auto',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            {/* Letterhead Image */}
            <div>
              <img 
                src={letterheadUrl} 
                alt="School Letterhead" 
                className="w-full h-auto block border-b border-gray-300"
                onError={(e) => {
                  e.target.style.display = 'none'
                  const fallback = e.target.nextElementSibling
                  if (fallback) fallback.style.display = 'block'
                }}
              />
              {/* Fallback Header */}
              <div 
                className="text-center p-4 border-b-2 border-black"
                style={{ display: 'none' }}
              >
                <h2 className="text-base font-bold uppercase tracking-wide">
                  {receipt?.school?.name || 'Heavenly Nature Nursery & Primary School'}
                </h2>
                {receipt?.school?.motto && (
                  <p className="text-xs italic my-1">"{receipt.school.motto}"</p>
                )}
                <p className="text-xs">
                  {receipt?.school?.address || ''} 
                  {receipt?.school?.phone ? ` | Tel: ${receipt.school.phone}` : ''}
                  {receipt?.school?.email ? ` | Email: ${receipt.school.email}` : ''}
                </p>
              </div>
            </div>

            {/* Receipt Content */}
            <div className="p-4">
              <div className="text-center font-bold text-sm border border-black py-1 mb-3 bg-gray-100">
                PAYMENT RECEIPT
              </div>

              <div className="text-right text-xs mb-3">
                <strong>Receipt No:</strong> {receipt?.receipt_number || 'N/A'}
              </div>

              <div className="space-y-1 mb-3">
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Date:</span>
                  <span>{receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Student:</span>
                  <span>{receipt?.student_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Class:</span>
                  <span>{receipt?.class_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Payment For:</span>
                  <span>{receipt?.payment_for || 'N/A'}</span>
                </div>
                {receipt?.term && (
                  <div className="flex justify-between text-xs">
                    <span className="font-bold">Term:</span>
                    <span>{receipt.term}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Method:</span>
                  <span>{receipt?.payment_method || 'Cash'}</span>
                </div>
              </div>

              <div className="border-2 border-black p-3 text-center my-3 bg-gray-50">
                <div className="text-xs mb-1">AMOUNT PAID</div>
                <div className="text-xl font-bold font-sans">
                  SSP {Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs italic mt-1">{receipt?.amount_words || ''}</div>
              </div>

              <div className="flex justify-between mt-8 pt-3 border-t border-black">
                <div className="text-center w-2/5">
                  <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                  <div className="text-xs">Received By</div>
                  <div className="text-xs font-medium">{receipt?.received_by || ''}</div>
                </div>
                <div className="text-center w-2/5">
                  <div className="border-b border-black mb-1 h-8">&nbsp;</div>
                  <div className="text-xs">Paid By</div>
                  <div className="text-xs font-medium">{receipt?.paid_by || ''}</div>
                </div>
              </div>

              <div className="text-center text-xs mt-4 pt-2 border-t border-dashed border-gray-400">
                <p>This is a computer-generated receipt.</p>
                <p>Thank you for your payment!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPrint
