import { useEffect, useRef, useState } from 'react'
import { Printer, Share2, X } from 'lucide-react'
import Button from '../common/Button'

function ReceiptPrint({ receipt, onClose }) {
  const printRef = useRef(null)

  /**
   * Print receipt - uses same proven method as exportPDF.js
   * Opens a new window and triggers print
   */
  const handlePrint = () => {
    const letterheadUrl = window.location.origin + '/letter-head.jpg'
    
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    
    if (!printWindow) {
      // Popup blocked - show alert
      alert(
        'Unable to open print window.\n\n' +
        'Please allow pop-ups for this site to print receipts.\n\n' +
        'On Android Chrome:\n' +
        '1. Tap the lock icon in address bar\n' +
        '2. Tap "Permissions"\n' +
        '3. Enable "Pop-ups and redirects"\n\n' +
        'Or use the "Open in New Tab" button below.'
      )
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt?.receipt_number || 'Print'}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            size: A5;
            margin: 3mm;
          }
          
          @media print {
            body { 
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .no-print { display: none !important; }
          }
          
          * { margin: 0; padding: 0; box-sizing: border-box; }
          
          body {
            font-family: 'Courier New', 'Courier', monospace;
            font-size: 10px;
            color: #000;
            background: #fff;
            max-width: 148mm;
            margin: 0 auto;
            padding: 3mm;
          }
          
          .receipt {
            border: 2px solid #000;
          }
          
          .letterhead {
            width: 100%;
            border-bottom: 1px solid #000;
          }
          
          .letterhead img {
            width: 100%;
            height: auto;
            display: block;
          }
          
          .header-fallback {
            text-align: center;
            padding: 6mm;
            border-bottom: 2px solid #000;
          }
          
          .receipt-content {
            padding: 4mm 6mm 6mm 6mm;
          }
          
          .receipt-title {
            text-align: center;
            font-size: 13px;
            font-weight: bold;
            margin: 4mm 0;
            text-transform: uppercase;
            letter-spacing: 2px;
            border: 1.5px solid #000;
            padding: 2mm;
            background: #f0f0f0;
          }
          
          .receipt-number {
            text-align: right;
            font-size: 9px;
            margin-bottom: 4mm;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 2mm;
            font-size: 10px;
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
            font-size: 9px;
            font-style: italic;
            margin-top: 2mm;
          }
          
          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 10mm;
            padding-top: 4mm;
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
            font-size: 8px;
          }
          
          .footer {
            text-align: center;
            font-size: 8px;
            margin-top: 4mm;
            padding-top: 2mm;
            border-top: 1px dashed #000;
          }

          /* Print button on screen */
          .print-toolbar {
            text-align: center;
            padding: 15px;
            background: #f5f5f5;
            position: sticky;
            bottom: 0;
          }
          
          .print-btn {
            padding: 12px 30px;
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin: 5px;
          }
          
          .close-btn {
            padding: 12px 30px;
            background: #6b7280;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            margin: 5px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="header-fallback" style="display:none;">
              <div style="font-size:15px; font-weight:bold; text-transform:uppercase;">${receipt?.school?.name || 'School Name'}</div>
              ${receipt?.school?.motto ? `<div style="font-size:9px; font-style:italic; margin:2mm 0;">"${receipt.school.motto}"</div>` : ''}
              <div style="font-size:8px;">${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}</div>
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
              <span class="info-label">Student:</span>
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
              <span class="info-label">Year:</span>
              <span class="info-value">${receipt.academic_year}</span>
            </div>` : ''}
            
            <div class="info-row">
              <span class="info-label">Method:</span>
              <span class="info-value">${receipt?.payment_method || 'Cash'}</span>
            </div>
            
            <div class="amount-section">
              <div style="font-size: 9px; margin-bottom: 1mm;">AMOUNT PAID</div>
              <div class="amount-value">SSP ${Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
              <div class="amount-words">${receipt?.amount_words || ''}</div>
            </div>
            
            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Received By</div>
                <div style="font-size: 8px;">${receipt?.received_by || ''}</div>
              </div>
              <div class="signature-box">
                <div class="signature-line"></div>
                <div class="signature-label">Paid By</div>
                <div style="font-size: 8px;">${receipt?.paid_by || ''}</div>
              </div>
            </div>
            
            <div class="footer">
              <p>This is a computer-generated receipt.</p>
              <p>Thank you for your payment!</p>
            </div>
          </div>
        </div>
        
        <div class="print-toolbar no-print">
          <button class="print-btn" onclick="window.print()">🖨️ Print Receipt</button>
          <button class="close-btn" onclick="window.close()">✕ Close</button>
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
    }, 1500)
  }

  /**
   * Fallback: Open receipt in a new tab without auto-print
   */
  const handleOpenInNewTab = () => {
    const letterheadUrl = window.location.origin + '/letter-head.jpg'
    
    const newTab = window.open('', '_blank')
    
    if (!newTab) {
      alert('Pop-up blocked! Please allow pop-ups for this site.')
      return
    }
    
    newTab.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${receipt?.receipt_number || 'Print'}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #000;
            background: #f5f5f5;
            padding: 15px;
          }
          .receipt {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            border: 2px solid #000;
          }
          .letterhead img { width: 100%; display: block; border-bottom: 1px solid #000; }
          .header-fallback { text-align: center; padding: 12px; border-bottom: 2px solid #000; display: none; }
          .receipt-content { padding: 12px; }
          .receipt-title {
            text-align: center; font-size: 13px; font-weight: bold; margin: 8px 0;
            text-transform: uppercase; border: 1px solid #000; padding: 4px; background: #f0f0f0;
          }
          .receipt-number { text-align: right; font-size: 10px; margin-bottom: 8px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 10px; }
          .info-label { font-weight: bold; }
          .amount-section {
            border: 2px solid #000; padding: 8px; margin: 8px 0;
            text-align: center; background: #fafafa;
          }
          .amount-value { font-size: 20px; font-weight: bold; }
          .amount-words { font-size: 9px; font-style: italic; margin-top: 4px; }
          .signature-section {
            display: flex; justify-content: space-between; margin-top: 25px;
            padding-top: 8px; border-top: 1px solid #000;
          }
          .signature-box { text-align: center; width: 45%; }
          .signature-line { border-bottom: 1px solid #000; margin-bottom: 4px; height: 25px; }
          .signature-label { font-size: 9px; }
          .footer { text-align: center; font-size: 8px; margin-top: 8px; padding-top: 4px; border-top: 1px dashed #000; }
          
          .toolbar {
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            display: flex; gap: 10px; z-index: 1000;
          }
          .toolbar button {
            padding: 12px 20px; border: none; border-radius: 25px;
            font-size: 14px; font-weight: bold; cursor: pointer;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          .btn-print { background: #2563eb; color: white; }
          .btn-close { background: #6b7280; color: white; }
          
          @media print {
            body { background: white; padding: 0; }
            .receipt { border: 1px solid #000; }
            .toolbar { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="letterhead">
            <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="header-fallback">
              <h2>${receipt?.school?.name || 'School Name'}</h2>
              ${receipt?.school?.motto ? `<p><em>"${receipt.school.motto}"</em></p>` : ''}
              <p>${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}</p>
            </div>
          </div>
          <div class="receipt-content">
            <div class="receipt-title">Payment Receipt</div>
            <div class="receipt-number"><strong>Receipt No:</strong> ${receipt?.receipt_number || 'N/A'}</div>
            <div class="info-row"><span class="info-label">Date:</span><span>${receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Student:</span><span>${receipt?.student_name || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Class:</span><span>${receipt?.class_name || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Payment For:</span><span>${receipt?.payment_for || 'N/A'}</span></div>
            <div class="info-row"><span class="info-label">Method:</span><span>${receipt?.payment_method || 'Cash'}</span></div>
            <div class="amount-section">
              <div>AMOUNT PAID</div>
              <div class="amount-value">SSP ${Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
              <div class="amount-words">${receipt?.amount_words || ''}</div>
            </div>
            <div class="signature-section">
              <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Received By</div><div>${receipt?.received_by || ''}</div></div>
              <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Paid By</div><div>${receipt?.paid_by || ''}</div></div>
            </div>
            <div class="footer"><p>Computer-generated receipt</p><p>Thank you for your payment!</p></div>
          </div>
        </div>
        <div class="toolbar">
          <button class="btn-print" onclick="window.print()">🖨️ Print</button>
          <button class="btn-close" onclick="window.close()">✕ Close</button>
        </div>
      </body>
      </html>
    `)
    newTab.document.close()
  }

  if (!receipt) return null

  const letterheadUrl = '/letter-head.jpg'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-lg">Receipt Preview</h3>
          <Button onClick={onClose} variant="ghost" size="sm" icon={<X size={16} />} />
        </div>

        {/* Receipt Content */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900">
          <div 
            ref={printRef}
            className="bg-white text-black"
            style={{ 
              fontFamily: "'Courier New', monospace",
              fontSize: '10px',
              maxWidth: '400px',
              margin: '0 auto',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            <div>
              <img 
                src={letterheadUrl} 
                alt="School Letterhead" 
                className="w-full h-auto block border-b border-gray-300"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextElementSibling.style.display = 'block'
                }}
              />
              <div className="text-center p-3 border-b-2 border-black" style={{ display: 'none' }}>
                <h2 className="text-sm font-bold uppercase">{receipt?.school?.name || 'School Name'}</h2>
                {receipt?.school?.motto && <p className="text-xs italic my-1">"{receipt.school.motto}"</p>}
                <p className="text-xs">{receipt?.school?.address} | Tel: {receipt?.school?.phone}</p>
              </div>
            </div>

            <div className="p-3">
              <div className="text-center font-bold text-xs border border-black py-1 mb-2 bg-gray-100">PAYMENT RECEIPT</div>
              <div className="text-right text-xs mb-2"><strong>Receipt No:</strong> {receipt?.receipt_number}</div>
              
              <div className="space-y-1 mb-2 text-xs">
                <div className="flex justify-between"><span className="font-bold">Date:</span><span>{receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span></div>
                <div className="flex justify-between"><span className="font-bold">Student:</span><span>{receipt?.student_name}</span></div>
                <div className="flex justify-between"><span className="font-bold">Class:</span><span>{receipt?.class_name}</span></div>
                <div className="flex justify-between"><span className="font-bold">Payment For:</span><span>{receipt?.payment_for}</span></div>
                {receipt?.term && <div className="flex justify-between"><span className="font-bold">Term:</span><span>{receipt.term}</span></div>}
                <div className="flex justify-between"><span className="font-bold">Method:</span><span>{receipt?.payment_method}</span></div>
              </div>

              <div className="border-2 border-black p-2 text-center my-2 bg-gray-50">
                <div className="text-xs mb-1">AMOUNT PAID</div>
                <div className="text-lg font-bold">SSP {Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs italic mt-1">{receipt?.amount_words}</div>
              </div>

              <div className="flex justify-between mt-6 pt-2 border-t border-black">
                <div className="text-center w-2/5">
                  <div className="border-b border-black mb-1 h-6">&nbsp;</div>
                  <div className="text-xs">Received By</div>
                  <div className="text-xs">{receipt?.received_by}</div>
                </div>
                <div className="text-center w-2/5">
                  <div className="border-b border-black mb-1 h-6">&nbsp;</div>
                  <div className="text-xs">Paid By</div>
                  <div className="text-xs">{receipt?.paid_by}</div>
                </div>
              </div>

              <div className="text-center text-xs mt-3 pt-2 border-t border-dashed border-gray-400">
                <p>Computer-generated receipt</p>
                <p>Thank you for your payment!</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            <Button 
              onClick={handlePrint} 
              variant="primary" 
              className="w-full"
              size="lg"
              icon={<Printer size={18} />}
            >
              🖨️ Print Receipt (Auto-Print)
            </Button>
            <Button 
              onClick={handleOpenInNewTab} 
              variant="secondary" 
              className="w-full"
              size="lg"
              icon={<Share2 size={18} />}
            >
              📄 Open in New Tab (Manual Print)
            </Button>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
              If auto-print is blocked, use "Open in New Tab" then tap Print button.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPrint
