import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
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
  const { payments, orders, foodItems, categories, settings } = useRestaurant();

  const currency = settings?.currency || '₹';

  // ==========================================
  // METRICS CALCULATIONS
  // ==========================================
  const totalRevenue = payments.reduce((acc, curr) => acc + curr.grandTotal, 0);
  const totalOrders = payments.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

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
  // CSV EXPORTER
  // ==========================================
  const handleExportCSV = () => {
    if (payments.length === 0) {
      alert('No payment records to export.');
      return;
    }

    const headers = ['Payment Date,Order Number,Table,Subtotal,Taxes,Discounts,Grand Total,Payment Method\n'];
    const rows = payments.map(p => {
      return `"${new Date(p.createdAt).toLocaleString()}","${p.orderNumber}","${p.tableName}",${p.subtotal.toFixed(2)},${p.tax.toFixed(2)},${p.discount.toFixed(2)},${p.grandTotal.toFixed(2)},"${p.paymentMethod.toUpperCase()}"`;
    });

    const csvBlob = new Blob([headers + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(csvBlob);
    link.download = `Restaurant_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
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

        <button
          onClick={handleExportCSV}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/10"
        >
          <Download className="w-4 h-4" />
          <span>Export Sales CSV</span>
        </button>
      </div>

      {/* Reports Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-brand-50 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400 rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Sales Value</p>
            <h3 className="text-2xl font-black text-slate-855 dark:text-slate-100">{currency}{totalRevenue.toFixed(0)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-2xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AOV (Avg Bill)</p>
            <h3 className="text-2xl font-black text-slate-855 dark:text-slate-100">{currency}{averageOrderValue.toFixed(0)}</h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 rounded-2xl">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Busiest Category</p>
            <h3 className="text-lg font-black text-slate-855 dark:text-slate-105 truncate max-w-[150px]" title={topCategoryName}>
              {topCategoryName}
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-5 rounded-3xl shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bestseller Dish</p>
            <h3 className="text-lg font-black text-slate-855 dark:text-slate-105 truncate max-w-[150px]" title={topSellingItemName}>
              {topSellingItemName}
            </h3>
          </div>
        </div>

      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Daily Sales Bar Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Weekly Revenue Flow</h3>
              <p className="text-[11px] text-slate-400">Daily settlements summary (Monday - Sunday)</p>
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={dailySalesData}>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
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
                <RechartsBarChart data={topItems} layout="vertical" margin={{ left: 20 }}>
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
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-700 dark:text-slate-205">Peak Dining Hours</h3>
              <p className="text-[11px] text-slate-400">Ordering volume spikes by hour slot</p>
            </div>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={peakHoursData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1E293B', color: '#FFF' }} />
                <Line type="monotone" dataKey="orders" stroke="#F59E0B" strokeWidth={3} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Share of Sales by Categories */}
        <div className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 p-6 rounded-3xl shadow-sm space-y-4">
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
