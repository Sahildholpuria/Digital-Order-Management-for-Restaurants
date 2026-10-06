import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { jsPDF } from 'jspdf';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  Download, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Coffee, 
  Clock, 
  Award,
  Sparkles
} from 'lucide-react';

export const ReportsManager: React.FC = () => {
  const { payments, orders, foodItems, categories, settings, showToast } = useRestaurant();

  const currency = settings?.currency || '₹';

  // ==========================================
  // METRICS CALCULATIONS
  // ==========================================
  const totalRevenue = Math.round(payments.reduce((acc, curr) => acc + curr.grandTotal, 0) * 100) / 100;
  const totalOrders = payments.length;
  const averageOrderValue = totalOrders > 0 ? Math.round((totalRevenue / totalOrders) * 100) / 100 : 0;

  // Calculate Top Selling Items
  const getItemStats = () => {
    const stats: { [key: string]: { name: string; qty: number; sales: number } } = {};
    
    // Scan all completed orders
    orders.filter(o => o.status === 'completed').forEach(o => {
      o.items.forEach(i => {
        if (!stats[i.itemId]) {
          stats[i.itemId] = { name: i.name, qty: 0, sales: 0 };
        }
        stats[i.itemId].qty += i.quantity;
        stats[i.itemId].sales += i.price * i.quantity;
      });
    });

    return Object.values(stats)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5); // top 5
  };

  const topItems = getItemStats();
  const topSellingItemName = topItems[0]?.name || 'N/A';

  // Calculate Category Share
  const getCategoryShare = () => {
    const shares: { [key: string]: number } = {};
    
    orders.filter(o => o.status === 'completed').forEach(o => {
      o.items.forEach(item => {
        const food = foodItems.find(f => f.id === item.itemId);
        if (food) {
          const cat = categories.find(c => c.id === food.categoryId);
          if (cat) {
            shares[cat.name] = (shares[cat.name] || 0) + (item.price * item.quantity);
          }
        }
      });
    });

    return Object.keys(shares).map(name => ({
      name,
      value: shares[name]
    }));
  };

  const categoryShare = getCategoryShare();
  const topCategoryName = categoryShare.sort((a, b) => b.value - a.value)[0]?.name || 'N/A';

  // Calculate Peak Hours (0-23 hours distribution)
  const getPeakHours = () => {
    const hourlyDistribution: { [key: string]: number } = {};
    for (let h = 9; h <= 22; h++) {
      const label = `${h === 12 ? 12 : h % 12} ${h >= 12 ? 'PM' : 'AM'}`;
      hourlyDistribution[label] = 0;
    }

    orders.forEach(o => {
      const hour = new Date(o.createdAt).getHours();
      if (hour >= 9 && hour <= 22) {
        const label = `${hour === 12 ? 12 : hour % 12} ${hour >= 12 ? 'PM' : 'AM'}`;
        hourlyDistribution[label] = (hourlyDistribution[label] || 0) + 1;
      }
    });

    return Object.keys(hourlyDistribution).map(hour => ({
      hour,
      orders: hourlyDistribution[hour]
    }));
  };

  const peakHoursData = getPeakHours();

  // Daily sales chart — purely derived from real payment records in the DB.
  // Groups settled payments by day-of-week for the last 7 days.
  const getDailySalesData = () => {
    const today = new Date();
    // Build a map keyed by date string for the last 7 days
    const result: { day: string; date: string; sales: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' }); // "Mon", "Tue" …
      result.push({ day: dayLabel, date: dateStr, sales: 0 });
    }

    // Accumulate real payments into the matching day bucket
    payments.forEach(p => {
      const paymentDate = new Date(p.createdAt).toISOString().split('T')[0];
      const bucket = result.find(r => r.date === paymentDate);
      if (bucket) {
        bucket.sales += p.grandTotal;
      }
    });

    return result.map(({ day, sales }) => ({ day, sales }));
  };

  const dailySalesData = getDailySalesData();

  // ==========================================
  // PDF EXPORTER (30 DAYS DATA & MOST ORDERED DISH)
  // ==========================================
  const get30DaysData = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const filteredOrders = orders.filter(o => 
      o.status === 'completed' && new Date(o.createdAt).getTime() >= thirtyDaysAgo.getTime()
    );

    // Calculate most ordered dish in last 30 days
    const dishStats: { [key: string]: { name: string; qty: number; sales: number } } = {};
    filteredOrders.forEach(o => {
      o.items.forEach(i => {
        if (!dishStats[i.itemId]) {
          dishStats[i.itemId] = { name: i.name, qty: 0, sales: 0 };
        }
        dishStats[i.itemId].qty += i.quantity;
        dishStats[i.itemId].sales += i.price * i.quantity;
      });
    });

    const sortedDishes = Object.values(dishStats).sort((a, b) => b.qty - a.qty);
    const mostOrderedDish = sortedDishes[0] || null;

    // Total revenue in last 30 days
    const totalRevenue30Days = filteredOrders.reduce((acc, curr) => {
      const orderSum = curr.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      return acc + orderSum;
    }, 0);

    return {
      filteredOrders,
      mostOrderedDish,
      totalRevenue30Days,
      sortedDishes
    };
  };

  const handleExportPDF = () => {
    const { filteredOrders, mostOrderedDish, totalRevenue30Days, sortedDishes } = get30DaysData();

    const doc = new jsPDF();
    const pdfCurrency = currency === '₹' ? 'Rs. ' : `${currency} `;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const dateRangeStr = `${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}`;

    // --- Page 1: Cover and Summary ---
    
    // Header Panel
    doc.setFillColor(99, 102, 241); // Indigo Primary
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    const titleText = settings?.name ? `${settings.name} Sales Report` : "Restaurant Sales Report";
    doc.text(titleText, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 225, 255);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Period: Last 30 Days (${dateRangeStr})`, 14, 25);

    // Section 1: Business Metrics
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Dark slate
    doc.text('30-DAY BUSINESS PERFORMANCE', 14, 48);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 52, 196, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Settled Orders: ${filteredOrders.length}`, 14, 60);
    doc.text(`Total 30-Day Revenue: ${pdfCurrency}${totalRevenue30Days.toFixed(2)}`, 14, 67);

    // Bestseller Dish Box
    doc.setFillColor(243, 244, 246); // Light gray
    doc.rect(14, 76, 182, 25, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Accent indigo
    doc.text('BEST SELLING DISH', 18, 83);
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    if (mostOrderedDish) {
      doc.text(`Dish Name: ${mostOrderedDish.name}`, 18, 90);
      doc.text(`Volume: ${mostOrderedDish.qty} times ordered | Sales: ${pdfCurrency}${mostOrderedDish.sales.toFixed(2)}`, 18, 95);
    } else {
      doc.text('No dishes logged in this period.', 18, 91);
    }

    // Section 2: Dish Popularity List
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('DISH POPULARITY BREAKDOWN', 14, 115);
    doc.line(14, 118, 196, 118);

    // Table Header
    doc.setFillColor(99, 102, 241);
    doc.rect(14, 122, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text('Dish Name', 18, 127.5);
    doc.text('Quantity Ordered', 110, 127.5);
    doc.text('Total Revenue', 160, 127.5);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    let yPos = 138;
    sortedDishes.slice(0, 15).forEach((dish) => {
      doc.text(dish.name, 18, yPos);
      doc.text(dish.qty.toString(), 110, yPos);
      doc.text(`${pdfCurrency}${dish.sales.toFixed(2)}`, 160, yPos);
      
      doc.setDrawColor(241, 245, 249);
      doc.line(14, yPos + 3, 196, yPos + 3);
      yPos += 8;
    });

    // --- Page 2: Detailed Order Transaction Log ---
    doc.addPage();

    // Page 2 Header
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, 210, 25, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('30-DAY ORDER TRANSACTION LOG', 14, 16);

    // Table Header for Orders Log
    doc.setFillColor(243, 244, 246);
    doc.rect(14, 32, 182, 8, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(9);
    doc.text('Order Date/Time', 18, 37.5);
    doc.text('Table', 65, 37.5);
    doc.text('Items Details', 90, 37.5);
    doc.text('Grand Total', 165, 37.5);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    yPos = 48;

    // Sort orders newest first
    const sortedOrdersLog = [...filteredOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    sortedOrdersLog.forEach((ord) => {
      if (yPos > 275) {
        doc.addPage();
        
        // Sub-page header
        doc.setFillColor(99, 102, 241);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text('30-DAY ORDER TRANSACTION LOG (CONTINUED)', 14, 13);
        
        // Sub-page table header
        doc.setFillColor(243, 244, 246);
        doc.rect(14, 28, 182, 8, 'F');
        doc.setTextColor(71, 85, 105);
        doc.setFontSize(9);
        doc.text('Order Date/Time', 18, 33.5);
        doc.text('Table', 65, 33.5);
        doc.text('Items Details', 90, 33.5);
        doc.text('Grand Total', 165, 33.5);

        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        yPos = 44;
      }

      // Date Format: DD/MM/YYYY HH:MM
      const orderDate = new Date(ord.createdAt);
      const formattedDate = `${orderDate.getDate().toString().padStart(2, '0')}/${(orderDate.getMonth() + 1).toString().padStart(2, '0')}/${orderDate.getFullYear()} ${orderDate.getHours().toString().padStart(2, '0')}:${orderDate.getMinutes().toString().padStart(2, '0')}`;

      // Table name
      const tableName = ord.tableName || `Table ${ord.tableId}`;

      // Items list summary
      let itemsSummary = ord.items.map(i => `${i.name} (x${i.quantity})`).join(', ');
      if (itemsSummary.length > 38) {
        itemsSummary = itemsSummary.substring(0, 35) + '...';
      }
      
      // Calculate order total
      const orderTotal = ord.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      doc.setFontSize(8.5);
      doc.text(formattedDate, 18, yPos);
      doc.text(tableName, 65, yPos);
      doc.text(itemsSummary, 90, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`${pdfCurrency}${orderTotal.toFixed(0)}`, 165, yPos);
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(241, 245, 249);
      doc.line(14, yPos + 3, 196, yPos + 3);
      yPos += 8;
    });

    // Footnote page at end
    if (yPos > 280) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Note: Order history entries older than 30 days are automatically deleted permanently from the database logs.', 14, yPos + 10);

    doc.save(`Restaurant_30Day_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // ==========================================
  // LAST 6 MONTHS TRANSACTIONS EXPORTERS
  // ==========================================
  const getLast6MonthsData = () => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const minTimestamp = sixMonthsAgo.getTime();

    // Filter payments within last 6 months (180 days)
    const sixMonthPayments = payments.filter(p => new Date(p.createdAt).getTime() >= minTimestamp);

    const totalRevenue6M = sixMonthPayments.reduce((acc, p) => acc + p.grandTotal, 0);
    const totalTax6M = sixMonthPayments.reduce((acc, p) => acc + p.tax, 0);
    const totalDiscount6M = sixMonthPayments.reduce((acc, p) => acc + p.discount, 0);

    return {
      sixMonthPayments,
      totalRevenue6M,
      totalTax6M,
      totalDiscount6M
    };
  };

  const handleExport6MonthCSV = () => {
    const { sixMonthPayments } = getLast6MonthsData();

    if (sixMonthPayments.length === 0) {
      showToast('No payment transactions found in the last 6 months.', 'info');
      return;
    }

    const headers = 'Transaction ID,Order Number,Table,Subtotal,Discount,Tax / GST,Grand Total,Payment Method,Date & Time\n';
    const rows = sixMonthPayments.map(p => {
      return `"${p.id}","${p.orderNumber}","${p.tableName}",${p.subtotal.toFixed(2)},${p.discount.toFixed(2)},${p.tax.toFixed(2)},${p.grandTotal.toFixed(2)},"${p.paymentMethod.toUpperCase()}","${new Date(p.createdAt).toLocaleDateString("en-US") + " " + new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}"`;
    });

    const csvBlob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    const sanitizedRestName = (settings?.name || 'Restaurant').replace(/[^a-z0-9]/gi, '_');
    link.download = `${sanitizedRestName}_Last_6_Months_Transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Last 6 months transactions CSV downloaded successfully!', 'success');
  };

  const handleExport6MonthPDF = () => {
    const { sixMonthPayments, totalRevenue6M, totalTax6M, totalDiscount6M } = getLast6MonthsData();

    if (sixMonthPayments.length === 0) {
      showToast('No payment transactions found in the last 6 months.', 'info');
      return;
    }

    const doc = new jsPDF();
    const pdfCurrency = currency === '₹' ? 'Rs. ' : `${currency} `;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const dateRangeStr = `${sixMonthsAgo.toLocaleDateString()} - ${new Date().toLocaleDateString()}`;

    // Header Banner
    doc.setFillColor(16, 185, 129); // Emerald
    doc.rect(0, 0, 210, 35, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    const titleText = settings?.name ? `${settings.name} - 6 Month Statement` : "Restaurant 6-Month Statement";
    doc.text(titleText, 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(220, 252, 231);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Period: Last 6 Months (${dateRangeStr})`, 14, 25);

    // Business Summary
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('6-MONTH TRANSACTION SUMMARY', 14, 48);

    doc.setDrawColor(226, 232, 240);
    doc.line(14, 52, 196, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Total Settled Transactions: ${sixMonthPayments.length}`, 14, 60);
    doc.text(`Total 6-Month Gross Revenue: ${pdfCurrency}${totalRevenue6M.toFixed(2)}`, 14, 67);
    doc.text(`Total Discounts Allowed: ${pdfCurrency}${totalDiscount6M.toFixed(2)}`, 14, 74);
    doc.text(`Total Tax/GST Collected: ${pdfCurrency}${totalTax6M.toFixed(2)}`, 14, 81);

    // Transactions Table
    doc.setFont('helvetica', 'bold');
    doc.text('TRANSACTION AUDIT LOG', 14, 98);
    doc.line(14, 101, 196, 101);

    doc.setFillColor(16, 185, 129);
    doc.rect(14, 105, 182, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('Date & Time', 18, 110);
    doc.text('Order #', 65, 110);
    doc.text('Table', 105, 110);
    doc.text('Payment Method', 135, 110);
    doc.text('Grand Total', 170, 110);

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    let yPos = 120;
    sixMonthPayments.forEach((p) => {
      if (yPos > 275) {
        doc.addPage();
        yPos = 20;

        // Subpage Header
        doc.setFillColor(16, 185, 129);
        doc.rect(14, 15, 182, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text('Date & Time', 18, 20);
        doc.text('Order #', 65, 20);
        doc.text('Table', 105, 20);
        doc.text('Payment Method', 135, 20);
        doc.text('Grand Total', 170, 20);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'normal');
        yPos = 30;
      }

      const dStr = new Date(p.createdAt).toLocaleDateString("en-US") + " " + new Date(p.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      doc.text(dStr, 18, yPos);
      doc.text(p.orderNumber, 65, yPos);
      doc.text(p.tableName, 105, yPos);
      doc.text(p.paymentMethod.toUpperCase(), 135, yPos);
      doc.text(`${pdfCurrency}${p.grandTotal.toFixed(2)}`, 170, yPos);

      doc.setDrawColor(241, 245, 249);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 7;
    });

    const sanitizedRestName = (settings?.name || 'Restaurant').replace(/[^a-z0-9]/gi, '_');
    doc.save(`${sanitizedRestName}_Last_6_Months_Transactions_${new Date().toISOString().split('T')[0]}.pdf`);
    showToast('Last 6 months transaction PDF downloaded successfully!', 'success');
  };

  const COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Analytics & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Export financial summaries and analyze popular dishes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleExport6MonthCSV}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2.5 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
            title="Download last 6 months transaction history in CSV format"
          >
            <Download className="w-4 h-4" />
            <span>6M Transactions (CSV)</span>
          </button>

          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleExport6MonthPDF}
              className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold px-3 py-2.5 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              title="Download last 6 months transaction statement in PDF format"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>6M Statement (PDF)</span>
            </button>
            
            <button
              onClick={handleExportPDF}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-2.5 rounded-xl sm:rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-red-500/10 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>30-Day PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-xl sm:rounded-2xl shrink-0">
            <DollarSign className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Total Sales Value</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-855 dark:text-slate-100 truncate">{currency}{totalRevenue.toFixed(0)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-xl sm:rounded-2xl shrink-0">
            <ShoppingBag className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">AOV (Avg Bill)</p>
            <h3 className="text-lg sm:text-2xl font-black text-slate-855 dark:text-slate-100 truncate">{currency}{averageOrderValue.toFixed(0)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-xl sm:rounded-2xl shrink-0">
            <Coffee className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Busiest Category</p>
            <h3 className="text-lg font-black text-slate-855 dark:text-slate-105 truncate max-w-[150px]" title={topCategoryName}>
              {topCategoryName}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-3 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-xl sm:rounded-2xl shrink-0">
            <Award className="w-4 h-4 sm:w-6 sm:h-6" />
          </div>
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Bestseller Dish</p>
            <h3 className="text-lg font-black text-slate-855 dark:text-slate-105 truncate max-w-[150px]" title={topSellingItemName}>
              {topSellingItemName}
            </h3>
          </div>
        </div>

      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Sales Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Weekly Revenue Flow</h3>
              <p className="text-[11px] text-slate-400">Daily settlements summary (Monday - Sunday)</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={dailySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(99,102,241,0.04)' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1E293B', color: '#FFF' }} />
                <Bar dataKey="sales" fill="var(--brand-500)" radius={[10, 10, 0, 0]} barSize={25} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Dishes Quantities Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Top 5 Selling Items</h3>
              <p className="text-[11px] text-slate-400">Items ordered by volume (qty)</p>
            </div>
            <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
          </div>

          <div className="h-64">
            {topItems.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No sales data logged yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={topItems} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1E293B', color: '#FFF' }} />
                  <Bar dataKey="qty" fill="#10B981" radius={[0, 8, 8, 0]} barSize={15} />
                </RechartsBarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Peak Ordering Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Peak Dining Hours</h3>
              <p className="text-[11px] text-slate-400">Ordering volume spikes by hour slot</p>
            </div>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peakHoursData} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={9} tickLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1E293B', color: '#FFF' }} />
                <Line type="monotone" dataKey="orders" stroke="#F59E0B" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Share of Sales by Categories */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Category Share Value</h3>
          <p className="text-[11px] text-slate-400">Total revenue generated by category</p>

          <div className="h-64 flex flex-col md:flex-row items-center justify-around">
            {categoryShare.length === 0 ? (
              <div className="text-xs text-slate-400">No categories statistics ready</div>
            ) : (
              <>
                <div className="h-48 w-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryShare}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryShare.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${currency}${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Custom Legend */}
                <div className="space-y-1.5 text-xs text-slate-500 max-h-48 overflow-y-auto pl-4">
                  {categoryShare.map((entry, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-semibold text-slate-700 dark:text-slate-350">{entry.name}</span>
                      <span>({currency}{entry.value.toFixed(0)})</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
export default ReportsManager;
