/**
 * Export receipt to print/PDF
 * Uses the same proven approach as exportPDF.js
 * Optimized for small receipt printers (A5, B5, thermal)
 */

export const exportReceipt = (receipt) => {
  if (!receipt) {
    console.error('No receipt data to export')
    return
  }

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  
  if (!printWindow) {
    printReceiptDirect(receipt)
    return
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const formatAmount = (amount) => {
    return Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })
  }

  // ✅ Balance info HTML
  const balanceHTML = receipt?.balance_info ? `
    <div style="border-top:1px dashed #000; margin-top:3mm; padding-top:2mm;">
      <div class="info-row">
        <span class="info-label">Total Fee:</span>
        <span class="info-value">SSP ${formatAmount(receipt.balance_info.total_fee)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Total Paid:</span>
        <span class="info-value">SSP ${formatAmount(receipt.balance_info.total_paid)}</span>
      </div>
      <div class="info-row" style="font-weight:bold; font-size:11px;">
        <span class="info-label">Balance:</span>
        <span class="info-value" style="color:${receipt.balance_info.is_cleared ? '#059669' : '#dc2626'}; font-size:11px;">
          ${receipt.balance_info.balance_display || 'N/A'}
        </span>
      </div>
    </div>
  ` : ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${receipt?.receipt_number || 'Payment'}</title>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page { size: A5; margin: 2mm; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin:0; padding:0; background:white; } .no-print { display:none !important; } }
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Courier New','Courier',monospace; font-size:10px; color:#000; background:#fff; max-width:148mm; margin:0 auto; padding:2mm; }
        .receipt { border:1.5px solid #000; background:white; }
        .letterhead-wrapper { width:100%; border-bottom:1px solid #000; }
        .letterhead-wrapper img { width:100%; height:auto; display:block; }
        .letterhead-fallback { display:none; text-align:center; padding:6mm; border-bottom:2px solid #000; background:#fff; }
        .receipt-content { padding:4mm 5mm 5mm 5mm; background:white; }
        .receipt-title { text-align:center; font-size:13px; font-weight:bold; margin:3mm 0; text-transform:uppercase; letter-spacing:2px; border:1.5px solid #000; padding:2mm; background:#f5f5f5; }
        .receipt-number { text-align:right; font-size:9px; margin-bottom:3mm; padding:2mm 0; }
        .info-row { display:flex; justify-content:space-between; margin-bottom:1.5mm; font-size:10px; padding:1mm 0; }
        .info-label { font-weight:bold; width:35%; white-space:nowrap; }
        .info-value { width:65%; border-bottom:1px dotted #ccc; text-align:right; }
        .amount-section { border:2px solid #000; padding:3mm; margin:4mm 0; text-align:center; background:#fafafa; }
        .amount-label { font-size:9px; margin-bottom:1mm; text-transform:uppercase; letter-spacing:1px; }
        .amount-value { font-size:22px; font-weight:bold; font-family:'Arial',sans-serif; margin:2mm 0; }
        .amount-words { font-size:9px; font-style:italic; margin-top:2mm; line-height:1.3; }
        .signature-section { display:flex; justify-content:space-between; margin-top:8mm; padding-top:3mm; border-top:1px solid #000; }
        .signature-box { text-align:center; width:45%; }
        .signature-line { border-bottom:1px solid #000; margin-bottom:2mm; height:10mm; }
        .signature-label { font-size:8px; text-transform:uppercase; letter-spacing:0.5px; }
        .signature-name { font-size:9px; margin-top:1mm; }
        .receipt-footer { text-align:center; font-size:8px; margin-top:4mm; padding-top:2mm; border-top:1px dashed #999; color:#666; }
        .print-toolbar { text-align:center; padding:12px; margin-top:10px; background:#f0f0f0; border-radius:8px; }
        .btn-print { display:inline-block; padding:10px 25px; background:#2563eb; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; font-weight:bold; margin:3px; }
        .btn-close { display:inline-block; padding:10px 25px; background:#6b7280; color:white; border:none; border-radius:6px; cursor:pointer; font-size:13px; margin:3px; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="letterhead-wrapper">
          <img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
          <div class="letterhead-fallback">
            <div style="font-size:15px;font-weight:bold;text-transform:uppercase;">${receipt?.school?.name || 'School Name'}</div>
            ${receipt?.school?.motto ? `<div style="font-size:9px;font-style:italic;margin:1mm 0;">"${receipt.school.motto}"</div>` : ''}
            <div style="font-size:8px;">${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}</div>
          </div>
        </div>
        <div class="receipt-content">
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-number"><strong>Receipt No:</strong> ${receipt?.receipt_number || 'N/A'}</div>
          <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(receipt?.date)}</span></div>
          <div class="info-row"><span class="info-label">Student:</span><span class="info-value">${receipt?.student_name || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${receipt?.class_name || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Payment For:</span><span class="info-value">${receipt?.payment_for || 'School Fees'}</span></div>
          ${receipt?.term ? `<div class="info-row"><span class="info-label">Term:</span><span class="info-value">${receipt.term}</span></div>` : ''}
          ${receipt?.academic_year ? `<div class="info-row"><span class="info-label">Year:</span><span class="info-value">${receipt.academic_year}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Method:</span><span class="info-value">${receipt?.payment_method || 'Cash'}</span></div>
          ${receipt?.transaction_reference ? `<div class="info-row"><span class="info-label">Ref:</span><span class="info-value">${receipt.transaction_reference}</span></div>` : ''}
          <div class="amount-section">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">SSP ${formatAmount(receipt?.amount)}</div>
            <div class="amount-words">${receipt?.amount_words || ''}</div>
          </div>
          ${balanceHTML}
          <div class="signature-section">
            <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Received By</div><div class="signature-name">${receipt?.received_by || '________________'}</div></div>
            <div class="signature-box"><div class="signature-line"></div><div class="signature-label">Paid By</div><div class="signature-name">${receipt?.paid_by || '________________'}</div></div>
          </div>
          <div class="receipt-footer"><p>Computer-generated receipt</p><p>Thank you! | ${receipt?.school?.name || 'School'}</p></div>
        </div>
      </div>
      <div class="print-toolbar no-print">
        <button class="btn-print" onclick="window.print()">🖨️ Print Receipt</button>
        <button class="btn-close" onclick="window.close()">✕ Close</button>
      </div>
    </body></html>
  `)
  
  printWindow.document.close()
  printWindow.onload = () => { printWindow.focus(); setTimeout(() => printWindow.print(), 600) }
  setTimeout(() => { printWindow.focus(); printWindow.print() }, 1500)
}

/**
 * DIRECT PRINT - Opens receipt in new tab as a full printable page
 */
export const printReceiptDirect = (receipt) => {
  if (!receipt) return

  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const formatDate = (dateStr) => !dateStr ? 'N/A' : new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatAmount = (amount) => Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })

  // ✅ Balance info HTML
  const balanceHTML = receipt?.balance_info ? `
    <div style="border-top:1px dashed #000; margin-top:3mm; padding-top:2mm;">
      <div class="info-row"><span class="info-label">Total Fee:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_fee)}</span></div>
      <div class="info-row"><span class="info-label">Total Paid:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_paid)}</span></div>
      <div class="info-row" style="font-weight:bold;"><span class="info-label">Balance:</span><span class="info-value" style="color:${receipt.balance_info.is_cleared ? '#059669' : '#dc2626'};">${receipt.balance_info.balance_display}</span></div>
    </div>` : ''

  const printPage = window.open('', '_blank')
  if (!printPage) { alert('Please allow pop-ups.'); return }
  
  printPage.document.write(`
    <!DOCTYPE html><html><head><title>Receipt - ${receipt?.receipt_number || 'Payment'}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      @page { size: A5; margin: 3mm; } @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin:0; padding:0; background:white; } .no-print { display:none !important; } }
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:'Courier New',monospace; font-size:10px; color:#000; background:#f0f0f0; padding:10px; }
      .receipt-container { max-width:148mm; margin:0 auto; background:white; border:1.5px solid #000; }
      .letterhead-wrapper { width:100%; border-bottom:1px solid #000; }
      .letterhead-wrapper img { width:100%; height:auto; display:block; }
      .letterhead-fallback { display:none; text-align:center; padding:6mm; border-bottom:2px solid #000; }
      .receipt-content { padding:5mm 6mm 6mm 6mm; background:white; }
      .receipt-title { text-align:center; font-size:14px; font-weight:bold; margin:4mm 0; text-transform:uppercase; letter-spacing:2px; border:1.5px solid #000; padding:2mm; background:#f5f5f5; }
      .receipt-number { text-align:right; font-size:10px; margin-bottom:4mm; padding:2mm 0; border-bottom:1px dashed #ccc; }
      .info-row { display:flex; justify-content:space-between; margin-bottom:2mm; font-size:11px; padding:1mm 0; }
      .info-label { font-weight:bold; width:38%; white-space:nowrap; }
      .info-value { width:62%; border-bottom:1px dotted #ccc; text-align:right; }
      .amount-section { border:2px solid #000; padding:4mm; margin:5mm 0; text-align:center; background:#fafafa; }
      .amount-label { font-size:10px; margin-bottom:2mm; text-transform:uppercase; }
      .amount-value { font-size:24px; font-weight:bold; font-family:'Arial',sans-serif; margin:2mm 0; }
      .amount-words { font-size:10px; font-style:italic; margin-top:2mm; }
      .signature-section { display:flex; justify-content:space-between; margin-top:10mm; padding-top:4mm; border-top:1px solid #000; }
      .signature-box { text-align:center; width:45%; }
      .signature-line { border-bottom:1px solid #000; margin-bottom:2mm; height:12mm; }
      .signature-label { font-size:9px; text-transform:uppercase; }
      .signature-name { font-size:10px; margin-top:1mm; }
      .receipt-footer { text-align:center; font-size:9px; margin-top:5mm; padding-top:3mm; border-top:1px dashed #999; color:#666; }
      @media screen { .print-toolbar { position:fixed; bottom:0; left:0; right:0; background:white; padding:12px; box-shadow:0 -2px 10px rgba(0,0,0,0.1); z-index:1000; display:flex; gap:10px; justify-content:center; } .btn { padding:12px 24px; border:none; border-radius:8px; cursor:pointer; font-size:14px; font-weight:bold; } .btn-print { background:#2563eb; color:white; } .btn-close { background:#6b7280; color:white; } .btn-back { background:#059669; color:white; } body { padding-bottom:80px; } }
    </style></head>
    <body>
      <div class="receipt-container">
        <div class="letterhead-wrapper"><img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div class="letterhead-fallback"><div style="font-size:15px;font-weight:bold;text-transform:uppercase;">${receipt?.school?.name || 'School Name'}</div>${receipt?.school?.motto ? `<div style="font-size:9px;font-style:italic;margin:1mm 0;">"${receipt.school.motto}"</div>` : ''}<div style="font-size:8px;">${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}</div></div></div>
        <div class="receipt-content">
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-number"><strong>Receipt No:</strong> ${receipt?.receipt_number || 'N/A'}</div>
          <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(receipt?.date)}</span></div>
          <div class="info-row"><span class="info-label">Student:</span><span class="info-value">${receipt?.student_name || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${receipt?.class_name || 'N/A'}</span></div>
          <div class="info-row"><span class="info-label">Payment For:</span><span class="info-value">${receipt?.payment_for || 'School Fees'}</span></div>
          ${receipt?.term ? `<div class="info-row"><span class="info-label">Term:</span><span class="info-value">${receipt.term}</span></div>` : ''}
          ${receipt?.academic_year ? `<div class="info-row"><span class="info-label">Year:</span><span class="info-value">${receipt.academic_year}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Method:</span><span class="info-value">${receipt?.payment_method || 'Cash'}</span></div>
          <div class="amount-section"><div class="amount-label">Amount Paid</div><div class="amount-value">SSP ${formatAmount(receipt?.amount)}</div><div class="amount-words">${receipt?.amount_words || ''}</div></div>
          ${balanceHTML}
          <div class="signature-section"><div class="signature-box"><div class="signature-line"></div><div class="signature-label">Received By</div><div class="signature-name">${receipt?.received_by || '________________'}</div></div><div class="signature-box"><div class="signature-line"></div><div class="signature-label">Paid By</div><div class="signature-name">${receipt?.paid_by || '________________'}</div></div></div>
          <div class="receipt-footer"><p>Computer-generated receipt</p><p>Thank you! | ${receipt?.school?.name || 'School'}</p></div>
        </div>
      </div>
      <div class="print-toolbar no-print"><button class="btn btn-back" onclick="window.close()">← Back</button><button class="btn btn-print" onclick="window.print()">🖨️ Print Receipt</button><button class="btn btn-close" onclick="window.close()">✕ Close</button></div>
    </body></html>
  `)
  printPage.document.close()
}

export const downloadReceiptPDF = (receipt) => { if (!receipt) return; exportReceipt(receipt) }

export const openReceiptInNewTab = (receipt) => {
  if (!receipt) return
  const letterheadUrl = window.location.origin + '/letter-head.jpg'
  const formatDate = (dateStr) => !dateStr ? 'N/A' : new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
  const formatAmount = (amount) => Number(amount || 0).toLocaleString('en', { minimumFractionDigits: 2 })

  // ✅ Balance info HTML
  const balanceHTML = receipt?.balance_info ? `
    <div style="border-top:1px dashed #ccc; margin-top:8px; padding-top:5px;">
      <div class="info-row"><span class="info-label">Total Fee:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_fee)}</span></div>
      <div class="info-row"><span class="info-label">Total Paid:</span><span class="info-value">SSP ${formatAmount(receipt.balance_info.total_paid)}</span></div>
      <div class="info-row" style="font-weight:bold;"><span class="info-label">Balance:</span><span class="info-value" style="color:${receipt.balance_info.is_cleared ? '#059669' : '#dc2626'};">${receipt.balance_info.balance_display}</span></div>
    </div>` : ''

  const newTab = window.open('', '_blank')
  if (!newTab) { alert('Pop-up blocked!'); return }
  newTab.document.write(`
    <!DOCTYPE html><html><head><title>Receipt - ${receipt?.receipt_number || 'Payment'}</title><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; } body { font-family:'Courier New',monospace; font-size:11px; color:#000; background:#e5e7eb; padding:20px; }
      .receipt { max-width:420px; margin:0 auto; background:white; border:2px solid #000; box-shadow:0 4px 15px rgba(0,0,0,0.1); }
      .letterhead-wrapper img { width:100%; display:block; border-bottom:1px solid #000; }
      .letterhead-fallback { display:none; text-align:center; padding:15px; border-bottom:2px solid #000; }
      .receipt-content { padding:15px; } .receipt-title { text-align:center; font-size:14px; font-weight:bold; margin:10px 0; text-transform:uppercase; border:1.5px solid #000; padding:5px; background:#f5f5f5; }
      .receipt-number { text-align:right; font-size:10px; margin-bottom:10px; } .info-row { display:flex; justify-content:space-between; margin-bottom:4px; font-size:11px; }
      .info-label { font-weight:bold; } .info-value { text-align:right; }
      .amount-section { border:2px solid #000; padding:10px; margin:10px 0; text-align:center; background:#fafafa; }
      .amount-value { font-size:24px; font-weight:bold; margin:5px 0; } .amount-words { font-size:10px; font-style:italic; margin-top:5px; }
      .signature-section { display:flex; justify-content:space-between; margin-top:30px; padding-top:10px; border-top:1px solid #000; }
      .signature-box { text-align:center; width:45%; } .signature-line { border-bottom:1px solid #000; margin-bottom:5px; height:30px; }
      .signature-label { font-size:9px; text-transform:uppercase; } .receipt-footer { text-align:center; font-size:9px; margin-top:10px; padding-top:5px; border-top:1px dashed #999; color:#666; }
      .toolbar { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); display:flex; gap:10px; z-index:1000; }
      .toolbar button { padding:12px 24px; border:none; border-radius:25px; font-size:14px; font-weight:bold; cursor:pointer; box-shadow:0 4px 15px rgba(0,0,0,0.2); }
      .btn-print { background:#2563eb; color:white; } .btn-close { background:#6b7280; color:white; }
      @media print { body { background:white; padding:0; } .receipt { box-shadow:none; border:1px solid #000; } .toolbar { display:none; } }
    </style></head>
    <body>
      <div class="receipt"><div class="letterhead-wrapper"><img src="${letterheadUrl}" alt="School Letterhead" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" /><div class="letterhead-fallback"><h2>${receipt?.school?.name || 'School Name'}</h2>${receipt?.school?.motto ? `<p><em>"${receipt.school.motto}"</em></p>` : ''}<p>${receipt?.school?.address || ''} | Tel: ${receipt?.school?.phone || ''}</p></div></div>
      <div class="receipt-content"><div class="receipt-title">Payment Receipt</div><div class="receipt-number"><strong>Receipt No:</strong> ${receipt?.receipt_number || 'N/A'}</div>
      <div class="info-row"><span class="info-label">Date:</span><span class="info-value">${formatDate(receipt?.date)}</span></div>
      <div class="info-row"><span class="info-label">Student:</span><span class="info-value">${receipt?.student_name || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${receipt?.class_name || 'N/A'}</span></div>
      <div class="info-row"><span class="info-label">Payment For:</span><span class="info-value">${receipt?.payment_for || 'School Fees'}</span></div>
      <div class="info-row"><span class="info-label">Method:</span><span class="info-value">${receipt?.payment_method || 'Cash'}</span></div>
      <div class="amount-section"><div>AMOUNT PAID</div><div class="amount-value">SSP ${formatAmount(receipt?.amount)}</div><div class="amount-words">${receipt?.amount_words || ''}</div></div>
      ${balanceHTML}
      <div class="signature-section"><div class="signature-box"><div class="signature-line"></div><div class="signature-label">Received By</div><div>${receipt?.received_by || ''}</div></div><div class="signature-box"><div class="signature-line"></div><div class="signature-label">Paid By</div><div>${receipt?.paid_by || ''}</div></div></div>
      <div class="receipt-footer"><p>Computer-generated receipt</p><p>Thank you for your payment!</p></div></div></div>
      <div class="toolbar"><button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF</button><button class="btn-close" onclick="window.close()">✕ Close</button></div>
    </body></html>
  `)
  newTab.document.close()
}
