import { RestaurantOrder } from '../types';

export const printHTMLContent = (htmlContent: string, iframeId: string = 'pos-thermal-print-frame') => {
  let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print iframe error:', e);
    }
  }, 150);
};

export const printKOTReceipt = (
  order: RestaurantOrder, 
  restaurantName: string = 'Main Kitchen', 
  paperWidth: '80mm' | '58mm' = '80mm'
) => {
  if (!order) return;

  const bodyWidth = paperWidth === '58mm' ? '58mm' : '80mm';

  const itemsHtml = order.items.map(item => `
    <tr style="border-bottom: 1px dashed #666;">
      <td style="padding: 6px 0; vertical-align: top;">
        <div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">${item.name}</div>
        ${item.specialInstructions ? `<div style="font-size: 11px; font-weight: bold; color: #d97706; margin-top: 2px;">*** NOTE: ${item.specialInstructions} ***</div>` : ''}
      </td>
      <td style="text-align: right; vertical-align: top; padding: 6px 0; font-size: 18px; font-weight: 900;">
        x${item.quantity}
      </td>
    </tr>
  `).join('');

  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const kotHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>KOT_${order.orderNumber}</title>
        <meta charset="utf-8" />
        <style>
          @page {
            size: ${bodyWidth} auto;
            margin: 0;
          }
          @media print {
            html, body {
              width: ${bodyWidth};
              margin: 0 auto;
              padding: 0;
            }
            .no-print { display: none !important; }
          }
          body {
            font-family: 'Courier New', Courier, monospace, sans-serif;
            width: ${bodyWidth};
            margin: 0 auto;
            padding: 8px;
            box-sizing: border-box;
            font-size: 11px;
            line-height: 1.35;
            color: #000;
            background: #fff;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .dashed-divider {
            border-top: 2px dashed #000;
            margin: 8px 0;
          }
          .double-divider {
            border-top: 3px double #000;
            margin: 8px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          <h1 style="margin: 0; font-size: 18px; font-weight: 900;">*** KOT ***</h1>
          <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">KITCHEN ORDER TICKET</div>
          <div style="font-size: 10px; color: #333;">${restaurantName}</div>
        </div>

        <div class="double-divider"></div>

        <div style="font-size: 13px; font-weight: 900; display: flex; justify-content: space-between;">
          <span>TABLE: ${order.tableName.toUpperCase()}</span>
          <span>#${order.orderNumber}</span>
        </div>
        <div style="font-size: 10px; display: flex; justify-content: space-between; margin-top: 2px;">
          <span>Date: ${new Date(order.createdAt).toLocaleDateString()}</span>
          <span>Time: ${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <div class="dashed-divider"></div>

        <table>
          <thead>
            <tr style="border-bottom: 2px solid #000;">
              <th class="text-left" style="font-size: 12px; font-weight: 900; padding-bottom: 4px;">ITEM</th>
              <th class="text-right" style="font-size: 12px; font-weight: 900; padding-bottom: 4px;">QTY</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="dashed-divider"></div>

        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900;">
          <span>TOTAL ITEMS:</span>
          <span>${totalItemsCount}</span>
        </div>

        <div class="dashed-divider"></div>
        <div class="text-center" style="font-size: 10px; font-weight: bold; margin-top: 6px;">
          -- END OF KOT --
        </div>
        <div style="height: 30px;"></div>
      </body>
    </html>
  `;

  printHTMLContent(kotHtml, 'pos-kot-print-frame');
};
