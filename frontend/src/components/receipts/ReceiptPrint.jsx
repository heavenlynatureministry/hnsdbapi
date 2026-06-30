import { useEffect, useRef } from 'react'
import { Printer, Download, X } from 'lucide-react'
import Button from '../common/Button'
import './ReceiptPrint.css'

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
    const printContent = printRef.current
    const originalContents = document.body.innerHTML
    
    // Create print window
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    
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
            width: 148mm; /* A5 width */
            margin: 0 auto;
            padding: 5mm;
          }
          
          .receipt {
            border: 2px solid #000;
            padding: 8mm;
            max-width: 148mm;
          }
          
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 5mm;
            margin-bottom: 5mm;
          }
          
          .header .school-name {
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .header .school-motto {
            font-size: 10px;
            font-style: italic;
            margin: 2mm 0;
          }
          
          .header .school-address {
            font-size: 9px;
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
          }
          
          .amount-value {
            font-size: 20px;
            font-weight: bold;
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
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-30deg);
            font-size: 60px;
            color: rgba(0,0,0,0.03);
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="school-name">${receipt?.school?.name || 'School Name'}</div>
            ${receipt?.school?.motto ? `<div class="school-motto">"${receipt.school.motto}"</div>` : ''}
            <div class="school-address">
              ${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}
            </div>
          </div>
          
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
            </div>
          </div>
          
          <div class="footer">
            <p>This is a computer-generated receipt.</p>
            <p>Thank you for your payment!</p>
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 10px; padding: 10px;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">
            🖨️ Print Receipt
          </button>
        </div>
      </body>
      </html>
    `)
    
    printWindow.document.close()
    
    // Auto print after a short delay
    setTimeout(() => {
      printWindow.print()
    }, 1000)
  }

  const handleDownloadPDF = () => {
    // You can add PDF generation here using jsPDF or similar
    handlePrint() // Fallback to print which can save as PDF
  }

  if (!receipt) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-lg">Receipt Preview</h3>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} variant="primary" size="sm" icon={<Printer size={16} />}>
              Print
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm" icon={<X size={16} />} />
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="p-4">
          <div 
            ref={printRef}
            className="bg-white text-black p-4 border-2 border-gray-300"
            style={{ 
              fontFamily: "'Courier New', monospace",
              fontSize: '11px',
              maxWidth: '148mm',
              margin: '0 auto'
            }}
          >
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-3 mb-3">
              <h2 className="text-base font-bold uppercase tracking-wide">
                {receipt?.school?.name || 'School Name'}
              </h2>
              {receipt?.school?.motto && (
                <p className="text-xs italic my-1">"{receipt.school.motto}"</p>
              )}
              <p className="text-xs">
                {receipt?.school?.address} | Tel: {receipt?.school?.phone}
              </p>
            </div>

            {/* Receipt Title */}
            <div className="text-center font-bold text-sm border border-black py-1 mb-3 bg-gray-100">
              PAYMENT RECEIPT
            </div>

            {/* Receipt Number */}
            <div className="text-right text-xs mb-3">
              <strong>Receipt No:</strong> {receipt?.receipt_number}
            </div>

            {/* Details */}
            <div className="space-y-1 mb-3">
              <div className="flex justify-between text-xs">
                <span className="font-bold">Date:</span>
                <span>{receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold">Student:</span>
                <span>{receipt?.student_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold">Class:</span>
                <span>{receipt?.class_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-bold">Payment For:</span>
                <span>{receipt?.payment_for}</span>
              </div>
              {receipt?.term && (
                <div className="flex justify-between text-xs">
                  <span className="font-bold">Term:</span>
                  <span>{receipt.term}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="font-bold">Method:</span>
                <span>{receipt?.payment_method}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="border-2 border-black p-3 text-center my-3">
              <div className="text-xs mb-1">AMOUNT PAID</div>
              <div className="text-xl font-bold">
                SSP {Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs italic mt-1">{receipt?.amount_words}</div>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-8 pt-3 border-t border-black">
              <div className="text-center w-2/5">
                <div className="border-b border-black mb-1">&nbsp;</div>
                <div className="text-xs">Received By</div>
                <div className="text-xs">{receipt?.received_by}</div>
              </div>
              <div className="text-center w-2/5">
                <div className="border-b border-black mb-1">&nbsp;</div>
                <div className="text-xs">Paid By</div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-xs mt-4 pt-2 border-t border-dashed border-gray-400">
              <p>Computer-generated receipt</p>
              <p>Thank you for your payment!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPrint
