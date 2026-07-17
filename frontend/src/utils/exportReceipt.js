/**
 * Export receipt to print/PDF
 * Uses receipt-templateA5.jpg as full-page A5 background
 * Letterhead at top, all text positioned within template borders
 * Guaranteed single-page A5 print
 * Supports both Student Payments and Organization Transactions
 */

export const exportReceipt = (receipt) => {
  if (!receipt) { console.error('No receipt data to export'); return }
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const templateUrl = window.location.origin + '/receipt-templateA5.jpg'
  const printWindow = window.open('', '_blank', 'width=450,height=650')
  if (!printWindow) { printReceiptDirect(receipt); return }
  printWindow.document.write(buildReceiptHTML(receipt, letterheadUrl, templateUrl))
  finishAndPrint(printWindow)
}

export const printReceiptDirect = (receipt) => {
  if (!receipt) return
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const templateUrl = window.location.origin + '/receipt-templateA5.jpg'
  const printWindow = window.open('', '_blank', 'width=450,height=650')
  if (!printWindow) { alert('Please allow pop-ups.'); return }
  printWindow.document.write(buildReceiptHTML(receipt, letterheadUrl, templateUrl))
  finishAndPrint(printWindow)
}

export const downloadReceiptPDF = (receipt) => { if (!receipt) return; exportReceipt(receipt) }

export const openReceiptInNewTab = (receipt) => {
  if (!receipt) return
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const templateUrl = window.location.origin + '/receipt-templateA5.jpg'
  const newTab = window.open('', '_blank')
  if (!newTab) { alert('Pop-up blocked!'); return }
  newTab.document.write(buildReceiptHTML(receipt, letterheadUrl, templateUrl))
  newTab.document.close()
}

// =========================================================================
// HELPERS
// =========================================================================

function finishAndPrint(win) {
  win.document.close()
  const images = win.document.images
  let loadedCount = 0; const totalImages = images.length
  if (totalImages === 0) { setTimeout(() => { win.focus(); win.print() }, 500); return }
  function checkAllLoaded() { loadedCount++; if (loadedCount >= totalImages) { setTimeout(() => { win.focus(); win.print() }, 400) } }
  for (let i = 0; i < images.length; i++) { if (images[i].complete) { loadedCount++ } else { images[i].onload = checkAllLoaded; images[i].onerror = checkAllLoaded } }
  if (loadedCount >= totalImages) { setTimeout(() => { win.focus(); win.print() }, 500) }
}

function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') }
function formatDate(dateStr) { if (!dateStr) return 'N/A'; return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }
function formatAmount(amount) { return Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2 }) }

// =========================================================================
// SHARED RECEIPT BUILDER
// =========================================================================

function buildReceiptHTML(receipt, letterheadUrl, templateUrl) {
  const isStudentPayment = !!receipt?.student_name && receipt?.student_name !== 'N/A'
  const receiptType = isStudentPayment ? 'Payment Receipt' : 'Official Receipt'

  const balanceHTML = receipt?.balance_info ? `
    <div class="balance-section">
      <div class="info-row"><span class="info-label">Total Fee:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_fee)}</span></div>
      <div class="info-row"><span class="info-label">Total Paid:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_paid)}</span></div>
      <div class="info-row" style="font-weight:bold"><span class="info-label">Balance:</span><span class="info-value" style="color:${receipt.balance_info.is_cleared ? '#059669' : '#dc2626'}">${receipt.balance_info.balance_display || 'N/A'}</span></div>
    </div>` : ''

  let detailsHTML = ''
  if (isStudentPayment) {
    detailsHTML = `
      <div class="info-row"><span class="info-label">Student:</span><span class="info-value">${esc(receipt?.student_name)}</span></div>
      <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${esc(receipt?.class_name || 'N/A')}</span></div>
      <div class="info-row"><span class="info-label">Payment For:</span><span class="info-value">${esc(receipt?.payment_for || 'School Fees')}</span></div>
      ${receipt?.term ? `<div class="info-row"><span class="info-label">Term:</span><span class="info-value">${esc(receipt.term)}</span></div>` : ''}`
  } else {
    detailsHTML = `
      ${receipt?.organization_name ? `<div class="info-row"><span class="info-label">Organization:</span><span class="info-value">${esc(receipt.organization_name)}</span></div>` : ''}
      ${receipt?.representative_name ? `<div class="info-row"><span class="info-label">Representative:</span><span class="info-value">${esc(receipt.representative_name)}</span></div>` : ''}
      <div class="info-row"><span class="info-label">Payment For:</span><span class="info-value">${esc(receipt?.payment_for || receipt?.description || 'Transaction')}</span></div>
      ${receipt?.term ? `<div class="info-row"><span class="info-label">Term:</span><span class="info-value">${esc(receipt.term)}</span></div>` : ''}`
  }

  return `<!DOCTYPE html><html>
<head><title>Receipt - ${esc(receipt?.receipt_number)}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  @page { size: A5 portrait; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; background: white; width: 100%; height: 100%; }
    .no-print { display: none !important; }
    .page-wrapper { page-break-after: avoid; page-break-inside: avoid; }
    .page { page-break-after: avoid; page-break-inside: avoid; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', 'Courier', monospace; font-size: 11px; color: #000; background: #e5e7eb; padding: 8px; line-height: 1.45; }
  .page-wrapper { width: 148mm; margin: 0 auto; }
  .page { position: relative; width: 148mm; height: 210mm; max-height: 210mm; overflow: hidden; background: transparent; }
  .template { position: absolute; inset: 0; z-index: 0; }
  .template img { width: 100%; height: 100%; object-fit: fill; opacity: 1; display: block; }
  .content { position: absolute; inset: 0; z-index: 5; background: transparent; display: flex; flex-direction: column; padding: 14mm 12mm 12mm 12mm; height: 100%; overflow: hidden; }
  .spacer { flex: 1 1 auto; min-height: 3px; }
  .section-break { height: 5px; flex-shrink: 0; }

  .letterhead { text-align: center; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px dashed #999; flex-shrink: 0; }
  .letterhead img { width: 100%; height: auto; display: block; }
  .letterhead-fallback { display: none; text-align: center; padding: 2mm 0; }

  .receipt-type { text-align: center; font-size: 13px; font-weight: bold; margin: 4px 0; text-transform: uppercase; letter-spacing: 2px; color: #1a3a6b; flex-shrink: 0; }
  .receipt-number { text-align: right; font-size: 9px; margin-bottom: 4px; padding-bottom: 3px; border-bottom: 1px dashed #999; flex-shrink: 0; }

  .info-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px; padding: 2px 0; flex-shrink: 0; }
  .info-label { font-weight: bold; width: 36%; white-space: nowrap; font-size: 10px; }
  .info-value { width: 64%; border-bottom: 1px dotted #ccc; text-align: right; font-size: 11px; }

  .amount-section { border: 2px solid #000; padding: 4mm; margin: 4mm 0; text-align: center; background: rgba(250,250,250,0.6); flex-shrink: 0; }
  .amount-label { font-size: 9px; margin-bottom: 1mm; text-transform: uppercase; letter-spacing: 1px; }
  .amount-value { font-size: 22px; font-weight: bold; font-family: 'Arial', sans-serif; margin: 2mm 0; }
  .amount-words { font-size: 9px; font-style: italic; margin-top: 2mm; line-height: 1.3; }

  .balance-section { border-top: 1px dashed #999; margin-top: 3mm; padding-top: 2mm; flex-shrink: 0; }

  .signature-section { display: flex; justify-content: space-between; margin-top: 6mm; padding-top: 3mm; border-top: 1px solid #000; flex-shrink: 0; }
  .signature-box { text-align: center; width: 45%; }
  .signature-line { border-bottom: 1px solid #000; margin-bottom: 2mm; height: 9mm; }
  .signature-label { font-size: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
  .signature-name { font-size: 9px; margin-top: 1mm; }

  .receipt-footer { text-align: center; font-size: 8px; margin-top: 4mm; padding-top: 2mm; border-top: 1px dashed #999; color: #666; flex-shrink: 0; }

  .print-toolbar { text-align: center; padding: 10px; margin-top: 10px; background: #f0f0f0; border-radius: 6px; }
  .btn { padding: 9px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 13px; font-weight: bold; margin: 2px; }
  .btn-print { background: #2563eb; color: #fff; }
  .btn-close { background: #6b7280; color: #fff; }
</style></head>
<body><div class="page-wrapper"><div class="page">
  <div class="template"><img src="${esc(templateUrl)}" alt="" onerror="this.style.display='none'"></div>
  <div class="content">
    <div class="letterhead">
      <img src="${esc(letterheadUrl)}" alt="School Letterhead" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <div class="letterhead-fallback"><h2 style="font-size:13px;">${esc(receipt?.school?.name || 'School Name')}</h2><p style="font-size:9px;"><em>"${esc(receipt?.school?.motto || '')}"</em></p></div>
    </div>
    <div class="receipt-type">${receiptType}</div>
    <div class="receipt-number"><strong>Receipt No:</strong> ${esc(receipt?.receipt_number || 'N/A')}</div>
    <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(receipt?.date)}</span></div>
    ${detailsHTML}
    ${receipt?.academic_year ? `<div class="info-row"><span class="info-label">Year:</span><span class="info-value">${esc(receipt.academic_year)}</span></div>` : ''}
    <div class="info-row"><span class="info-label">Method:</span><span class="info-value">${esc((receipt?.payment_method || 'Cash').replace(/_/g, ' '))}</span></div>
    ${receipt?.transaction_reference ? `<div class="info-row"><span class="info-label">Ref:</span><span class="info-value">${esc(receipt.transaction_reference)}</span></div>` : ''}
    <div class="section-break"></div>
    <div class="amount-section">
      <div class="amount-label">Amount Paid</div>
      <div class="amount-value">SSP ${formatAmount(receipt?.amount)}</div>
      <div class="amount-words">${esc(receipt?.amount_words || '')}</div>
    </div>
    ${balanceHTML}
    <div class="spacer"></div>
    <div class="signature-section">
      <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Received By</div><div class="signature-name">${esc(receipt?.received_by || 'School Bursar')}</div></div>
      <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Paid By</div><div class="signature-name">${esc(receipt?.paid_by || '________________')}</div></div>
    </div>
    <div class="section-break"></div>
    <div class="receipt-footer"><p>Computer-generated receipt</p><p>Thank you! | ${esc(receipt?.school?.name || 'School')}</p></div>
  </div>
</div></div>
<div class="print-toolbar no-print"><button class="btn btn-print" onclick="window.print()">🖨️ Print Receipt</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
</body></html>`
}
