import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantOrder, PaymentRecord } from '../../types';
import { 
  FileText, 
  Printer, 
  Download, 
  CreditCard, 
  Check, 
  Tag,
  DollarSign,
  Receipt,
  User,
  ShoppingBag,
  Percent
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

export const BillingManager: React.FC = () => {
  const { 
    orders, 
    settings, 
    addPaymentRecord, 
    updateOrderStatus,
    showToast
  } = useRestaurant();

  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'wallet'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  const receiptRef = useRef<HTMLDivElement>(null);
  const currency = settings?.currency || '₹';

  // Get active orders that need payment (either ready, served or completed, but let's show served as primary target for POS cash-out)
  const billableOrders = orders.filter(o => ['ready', 'served'].includes(o.status));
  
  const selectedOrder = orders.find(o => o.id === selectedOrderId) || billableOrders[0];

  // Calculations
  const subtotal = selectedOrder ? selectedOrder.subtotal : 0;
  const taxPercentage = settings ? settings.taxPercentage : 18;
  const discountAmount = Math.round(subtotal * (discountPercent / 100) * 100) / 100;
  const taxableAmount = Math.round((subtotal - discountAmount) * 100) / 100;
  const taxAmount = Math.round(taxableAmount * (taxPercentage / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleMarkPaid = async () => {
    if (!selectedOrder) return;
    setIsProcessing(true);

    try {
      const payment: PaymentRecord = {
        id: `pay-${Date.now()}`,
        orderId: selectedOrder.id,
        orderNumber: selectedOrder.orderNumber,
        tableName: selectedOrder.tableName,
        subtotal,
        tax: taxAmount,
        discount: discountAmount,
        grandTotal,
        paymentMethod,
        createdAt: new Date().toISOString()
      };

      // 1. Add payment log
      await addPaymentRecord(payment);
      
      // 2. Mark order completed (releases table status automatically in Context)
      await updateOrderStatus(selectedOrder.id, 'completed');
      
      // Reset POS terminal selection
      setSelectedOrderId('');
      setDiscountPercent(0);
      showToast(`Order ${selectedOrder.orderNumber} settled successfully via ${paymentMethod.toUpperCase()}!`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Settlement failed.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Receipt PDF
  const downloadReceiptPDF = async () => {
    if (!selectedOrder || !receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      
      // Thermal receipt standard size (3 inches wide, dynamic height based on aspect ratio)
      const width = 3;
      const height = (canvas.height * width) / canvas.width;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [width, height + 0.5]
      });

      pdf.addImage(imgData, 'PNG', 0, 0.25, width, height);
      pdf.save(`${selectedOrder.orderNumber}_Receipt.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    }
  };

  // Trigger Browser Print Dialog
  const triggerPrint = () => {
    const printContent = receiptRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    
    // Create print window layout
    const printWindow = window.open('', '', 'height=600,width=400');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>POS Receipt</title>
          <style>
            body { font-family: monospace; padding: 20px; font-size: 12px; line-height: 1.4; color: #000; width: 300px; margin: 0 auto; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 3px 0; }
            .mt-4 { margin-top: 16px; }
            .mb-2 { margin-bottom: 8px; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
          POS Billing Terminal
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Generate professional invoices, apply discount margins, and settle payments.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Billable Table queues */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm space-y-4 lg:col-span-1">
          <div className="pb-2 border-b border-slate-100 dark:border-slate-850">
            <h3 className="font-extrabold text-slate-700 dark:text-slate-205 text-sm uppercase tracking-wider">Awaiting Billing</h3>
          </div>

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {billableOrders.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-805 rounded-2xl">
                No tables ready for check-out.
              </div>
            ) : (
              billableOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderId(order.id);
                    setDiscountPercent(0);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                    (selectedOrder?.id === order.id)
                      ? 'bg-brand-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:border-brand-900/30'
                      : 'bg-slate-50/50 border-slate-100 dark:bg-slate-800/10 dark:border-slate-850 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className="font-black text-xs font-mono">#{order.orderNumber}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-500 text-white rounded-md">
                      {order.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex justify-between items-end w-full">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-205">{order.tableName}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{order.items.reduce((acc, curr) => acc + curr.quantity, 0)} items</p>
                    </div>
                    <span className="font-black text-sm text-slate-800 dark:text-slate-200">{currency}{order.grandTotal.toFixed(0)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Invoice Terminal */}
        {selectedOrder ? (
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Thermal Receipt Visual Preview Box */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Receipt Preview</h3>
              
              {/* Thermal Receipt Design (Ref target) */}
              <div 
                ref={receiptRef}
                className="bg-white p-6 border border-slate-200 font-mono text-slate-900 text-xs space-y-4 leading-normal shadow-sm max-w-sm mx-auto"
              >
                <div className="text-center space-y-1">
                  {settings?.logoUrl ? (
                    <img 
                      src={settings.logoUrl} 
                      alt="Logo" 
                      className="w-10 h-10 rounded-full mx-auto object-cover border border-slate-200"
                    />
                  ) : (
                    <Receipt className="w-8 h-8 mx-auto text-brand-500" />
                  )}
                  <h4 className="font-bold text-sm uppercase tracking-wide">{settings?.name || 'The Grand Bistro'}</h4>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {settings?.address || '102 Gourmet Blvd, Culinary District'}
                  </p>
                  <p className="text-[10px] text-slate-500">GSTIN: {settings?.gstNumber || '22AAAAA1111A1Z1'}</p>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                <div className="space-y-1 text-[10px] text-slate-700">
                  <div className="flex justify-between">
                    <span>Receipt No: {selectedOrder.orderNumber}</span>
                    <span>Date: {new Date(selectedOrder.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Table: {selectedOrder.tableName.replace(/table\s*-\s*/gi, '')}</span>
                    <span>Time: {new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Items List */}
                <table className="w-full text-[10px] text-slate-800">
                  <thead>
                    <tr className="border-b border-dashed border-slate-300">
                      <th className="font-bold pb-1 text-left">Item</th>
                      <th className="font-bold text-center pb-1">Qty</th>
                      <th className="font-bold text-right pb-1">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((i, index) => (
                      <tr key={index}>
                        <td className="py-1">{i.name}</td>
                        <td className="py-1 text-center">{i.quantity}</td>
                        <td className="py-1 text-right">{currency}{(i.price * i.quantity).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                {/* Totals Block */}
                <div className="space-y-1.5 text-[10px] text-slate-800">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{currency}{subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-red-650 font-bold">
                      <span>Discount ({discountPercent}%)</span>
                      <span>-{currency}{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Taxes & GST ({taxPercentage}%)</span>
                    <span>{currency}{taxAmount.toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t border-dashed border-slate-300 my-1.5"></div>
                  
                  <div className="flex justify-between text-sm font-black text-slate-900">
                    <span>GRAND TOTAL</span>
                    <span>{currency}{grandTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-300 my-2"></div>

                <div className="text-center text-[9px] text-slate-550 space-y-0.5">
                  <p>Settled via {paymentMethod.toUpperCase()}</p>
                  <p>Thank you for dining with us!</p>
                  <p>www.{settings?.name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bistro'}.com</p>
                </div>
              </div>
            </div>

            {/* Billing settlement panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-6">
              
              <div className="pb-3 border-b border-slate-50 dark:border-slate-850">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-105 text-base">Settlement Terminal</h3>
              </div>

              {/* Adjust discount */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span>Apply Discount (%)</span>
                  <span className="text-brand-500">{discountPercent}% OFF</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Percent className="w-4 h-4" />
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                    className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-850 rounded-2xl py-3 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-805 dark:text-slate-100 dark:focus:bg-slate-800"
                  />
                </div>
              </div>

              {/* Select payment method */}
              <div className="space-y-3.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">Payment Method</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['cash', 'upi', 'card', 'wallet'] as const).map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-3 rounded-2xl font-bold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                        paymentMethod === method
                          ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-500/10'
                          : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>{method.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                {/* Print and PDF download commands */}
                <div className="flex gap-2.5">
                  <button
                    onClick={triggerPrint}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-150 dark:border-slate-850"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={downloadReceiptPDF}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-bold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors border border-slate-150 dark:border-slate-850"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Final Checkout settled button */}
                <button
                  onClick={handleMarkPaid}
                  disabled={isProcessing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 text-sm"
                >
                  <Check className="w-5 h-5" />
                  <span>{isProcessing ? 'Processing Settle...' : `Settle & Mark Paid (${currency}${grandTotal.toFixed(0)})`}</span>
                </button>
              </div>

            </div>

          </div>
        ) : (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 rounded-3xl p-12 text-center text-slate-400">
            No active billing orders selected. Pick a waiting table from the left list.
          </div>
        )}

      </div>

    </div>
  );
};
export default BillingManager;
