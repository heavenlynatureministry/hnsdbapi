import { Printer, Download, Share2, X, FileText, ExternalLink } from 'lucide-react'
import Button from '../common/Button'
import { exportReceipt, printReceiptDirect, openReceiptInNewTab, downloadReceiptPDF } from '../../utils/exportReceipt'

function ReceiptPrint({ receipt, onClose }) {
  if (!receipt) return null

  const letterheadUrl = '/letter-head.jpg'

  const handleAutoPrint = () => {
    exportReceipt(receipt)
  }

  const handleManualPrint = () => {
    // This opens receipt in a new tab with print button
    // User can manually click Print button there
    printReceiptDirect(receipt)
  }

  const handleOpenInNewTab = () => {
    openReceiptInNewTab(receipt)
  }

  const handleDownloadPDF = () => {
    downloadReceiptPDF(receipt)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h3 className="font-semibold text-lg">Payment Receipt</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {receipt?.receipt_number}
            </p>
          </div>
          <Button onClick={onClose} variant="ghost" size="sm" icon={<X size={16} />} />
        </div>

        {/* Receipt Preview */}
        <div className="p-4 bg-gray-100 dark:bg-gray-900">
          <div 
            className="bg-white text-black"
            style={{ 
              fontFamily: "'Courier New', monospace",
              fontSize: '10px',
              maxWidth: '400px',
              margin: '0 auto',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
            }}
          >
            {/* Letterhead */}
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

            {/* Content */}
            <div className="p-3">
              <div className="text-center font-bold text-xs border border-black py-1 mb-2 bg-gray-100">
                PAYMENT RECEIPT
              </div>
              <div className="text-right text-xs mb-2">
                <strong>Receipt No:</strong> {receipt?.receipt_number}
              </div>
              
              <div className="space-y-1 mb-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-bold">Date:</span>
                  <span>{receipt?.date ? new Date(receipt.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Student:</span>
                  <span>{receipt?.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Class:</span>
                  <span>{receipt?.class_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Payment For:</span>
                  <span>{receipt?.payment_for}</span>
                </div>
                {receipt?.term && (
                  <div className="flex justify-between">
                    <span className="font-bold">Term:</span>
                    <span>{receipt.term}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Method:</span>
                  <span>{receipt?.payment_method}</span>
                </div>
              </div>

              <div className="border-2 border-black p-2 text-center my-2 bg-gray-50">
                <div className="text-xs mb-1">AMOUNT PAID</div>
                <div className="text-lg font-bold font-sans">
                  SSP {Number(receipt?.amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })}
                </div>
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
            {/* AUTO PRINT - Opens popup and auto-triggers print */}
            <Button 
              onClick={handleAutoPrint} 
              variant="primary" 
              className="w-full"
              size="lg"
              icon={<Printer size={18} />}
            >
              🖨️ Auto Print (Popup)
            </Button>
            
            {/* MANUAL PRINT - Opens in new tab with print button */}
            <Button 
              onClick={handleManualPrint} 
              variant="primary" 
              className="w-full"
              size="lg"
              icon={<ExternalLink size={18} />}
              style={{ background: '#059669' }}
            >
              📄 Manual Print (New Tab)
            </Button>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                onClick={handleDownloadPDF} 
                variant="secondary" 
                size="lg"
                icon={<FileText size={16} />}
              >
                💾 Save PDF
              </Button>
              <Button 
                onClick={handleOpenInNewTab} 
                variant="secondary" 
                size="lg"
                icon={<Share2 size={16} />}
              >
                🔗 Open Tab
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-1">
              <strong>Auto Print:</strong> Opens popup + auto-print<br/>
              <strong>Manual Print:</strong> Opens new tab with Print button (best for mobile)
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReceiptPrint
