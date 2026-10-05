import React, { useState, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar, 
  AlertCircle,
  Filter,
  Sparkles
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export type DateRange = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export const AdminDashboard: React.FC = () => {
  const { orders, tables, payments, settings } = useRestaurant();
  const [dateRange, setDateRange] = useState<DateRange>('today');

  const currency = settings?.currency || '₹';

  // 1. Date Range Definitions & Filter Helpers
  const rangeInfo = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (dateRange === 'today') {
      return {
        start: startOfToday,
        end: endOfToday,
        label: "Today's",
        subtext: "Today",
        dateString: now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      };
    }
    if (dateRange === 'yesterday') {
      const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return {
        start: startOfYesterday,
        end: endOfYesterday,
        label: "Yesterday's",
        subtext: "Yesterday",
        dateString: yesterdayDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
      };
    }
    if (dateRange === 'week') {
      // Last 7 days
      const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      return {
        start: startOfWeek,
        end: endOfToday,
        label: "This Week's",
        subtext: "Last 7 Days",
        dateString: `${startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      };
    }
    if (dateRange === 'month') {
      // 1st of current month to now
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return {
        start: startOfMonth,
        end: endOfToday,
        label: "This Month's",
        subtext: "Current Month",
        dateString: `${startOfMonth.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      };
    }
    // 'all'
    return {
      start: new Date(0),
      end: new Date(8640000000000000),
      label: "All-Time",
      subtext: "All-Time Historical",
      dateString: "All records"
    };
  }, [dateRange]);

  const isWithinRange = (dateInput: any) => {
    if (!dateInput) return false;
    const d = new Date(dateInput);
    return d >= rangeInfo.start && d <= rangeInfo.end;
  };

  // 2. Filtered orders and financial calculations
  const filteredOrders = useMemo(() => {
    return orders.filter(o => isWithinRange(o.createdAt));
  }, [orders, rangeInfo]);

  const completedOrders = useMemo(() => {
    return filteredOrders.filter(o => o.status === 'completed');
  }, [filteredOrders]);

  // Active orders are in kitchen queues right now
  const activeOrders = useMemo(() => {
    return orders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'served'].includes(o.status));
  }, [orders]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => isWithinRange(p.createdAt));
  }, [payments, rangeInfo]);

  const totalRevenue = useMemo(() => {
    if (filteredPayments.length > 0) {
      return filteredPayments.reduce((acc, curr) => acc + curr.grandTotal, 0);
    }
    // Fallback if payments not recorded yet, sum completed orders in range
    return completedOrders.reduce((acc, curr) => acc + curr.grandTotal, 0);
  }, [filteredPayments, completedOrders]);

  const averageTicket = useMemo(() => {
    const totalCount = filteredPayments.length || completedOrders.length;
    if (totalCount === 0) return 0;
    return totalRevenue / totalCount;
  }, [totalRevenue, filteredPayments, completedOrders]);

  const occupiedTables = tables.filter(t => t.status === 'occupied').length;

  // Pending bills are served but not completed
  const pendingBills = orders.filter(o => o.status === 'served');
  const pendingBillsCount = pendingBills.length;
  const pendingBillsAmount = pendingBills.reduce((acc, curr) => acc + curr.grandTotal, 0);

  // 3. Adaptive Chart Data based on Date Range
  const chartData = useMemo(() => {
    if (dateRange === 'today' || dateRange === 'yesterday') {
      // Hourly slots (e.g. 09:00 to 23:00)
      const hourlyData: { [key: string]: number } = {};
      
      // Initialize slots from 9 AM to 11 PM
      for (let h = 9; h <= 23; h++) {
        const hourLabel = `${h.toString().padStart(2, '0')}:00`;
        hourlyData[hourLabel] = 0;
      }

      filteredOrders.forEach(o => {
        const d = new Date(o.createdAt);
        const hourLabel = `${d.getHours().toString().padStart(2, '0')}:00`;
        if (hourlyData[hourLabel] !== undefined) {
          hourlyData[hourLabel] += o.grandTotal;
        } else {
          hourlyData[hourLabel] = o.grandTotal;
        }
      });

      return Object.keys(hourlyData).map(hour => ({
        label: hour,
        sales: Math.round(hourlyData[hour])
      }));
    }

    if (dateRange === 'week') {
      // Last 7 days day-by-day
      const daysMap: { [key: string]: { label: string; sales: number } } = {};
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });
        daysMap[dateKey] = { label: dayLabel, sales: 0 };
      }

      filteredOrders.forEach(o => {
        const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
        if (daysMap[dateKey]) {
          daysMap[dateKey].sales += o.grandTotal;
        }
      });

      return Object.values(daysMap).map(d => ({
        label: d.label,
        sales: Math.round(d.sales)
      }));
    }

    if (dateRange === 'month') {
      // Group by days of the month
      const daysMap: { [key: string]: { label: string; sales: number } } = {};
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const totalDays = now.getDate();

      for (let i = 1; i <= totalDays; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const dateKey = d.toISOString().split('T')[0];
        const dayLabel = `${i} ${d.toLocaleDateString(undefined, { month: 'short' })}`;
        daysMap[dateKey] = { label: dayLabel, sales: 0 };
      }

      filteredOrders.forEach(o => {
        const dateKey = new Date(o.createdAt).toISOString().split('T')[0];
        if (daysMap[dateKey]) {
          daysMap[dateKey].sales += o.grandTotal;
        }
      });

      return Object.values(daysMap).map(d => ({
        label: d.label,
        sales: Math.round(d.sales)
      }));
    }

    // 'all' - Group by recent dates or months
    const dateMap: { [key: string]: number } = {};
    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      dateMap[key] = (dateMap[key] || 0) + o.grandTotal;
    });

    const entries = Object.entries(dateMap).slice(-10);
    return entries.map(([key, val]) => ({
      label: key,
      sales: Math.round(val)
    }));
  }, [filteredOrders, dateRange]);

  // Metrics Grid Config
  const metrics = [
    {
      title: `${rangeInfo.label} Orders`,
      value: filteredOrders.length,
      desc: dateRange === 'today' ? `${activeOrders.length} currently active` : `${completedOrders.length} completed tickets`,
      icon: ShoppingBag,
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30",
    },
    {
      title: "Active Prep Orders",
      value: activeOrders.length,
      desc: "Inside kitchen queues",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30",
    },
    {
      title: `${rangeInfo.label} Completed`,
      value: completedOrders.length,
      desc: `${((completedOrders.length / Math.max(1, filteredOrders.length)) * 100).toFixed(0)}% completion rate`,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    },
    {
      title: `${rangeInfo.label} Revenue`,
      value: `${currency}${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      desc: `Avg Ticket: ${currency}${averageTicket.toFixed(0)}`,
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",
    },
    {
      title: "Tables Occupied",
      value: `${occupiedTables} / ${tables.length}`,
      desc: `${tables.filter(t => t.status === 'reserved').length} reserved tables`,
      icon: Users,
      color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30",
    },
    {
      title: "Pending Invoices",
      value: pendingBillsCount,
      desc: `${currency}${pendingBillsAmount.toFixed(0)} pending cashout`,
      icon: FileText,
      color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30",
    }
  ];

  const dateFilterTabs: { id: DateRange; label: string }[] = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'all', label: 'All Time' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header bar with Date Range Filter */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
              Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-800/40">
              <Sparkles className="w-3 h-3" />
              {rangeInfo.subtext}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
            Real-time operations monitor for <span className="font-bold text-brand-600 dark:text-brand-400">{settings?.name || 'Restaurant'}</span>.
          </p>
        </div>

        {/* Date Filter & Calendar Badge Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">

          {/* Segmented Date Range Picker */}
          <div className="flex items-center p-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto no-scrollbar max-w-full w-full lg:w-auto">
            <div className="flex items-center gap-1 px-2 text-slate-400">
              <Filter className="w-3.5 h-3.5" />
            </div>
            {dateFilterTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setDateRange(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/25'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Current Date Badge */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-2xl shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-brand-500" />
            <span>{rangeInfo.dateString}</span>
          </div>
        </div>
      </div>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {metrics.map((m, index) => (
          <div key={index} className="rounded-2xl sm:rounded-3xl border border-slate-200/60 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/50 p-3 sm:p-5 shadow-sm backdrop-blur-md flex flex-col sm:flex-row justify-between sm:items-center gap-2 sm:gap-4 transition-all hover:shadow-md">
            <div className="space-y-0.5 sm:space-y-1 min-w-0 order-2 sm:order-1">
              <p className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">{m.title}</p>
              <h3 className="text-xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">{m.value}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-semibold truncate">{m.desc}</p>
            </div>
            
            <div className={`p-2 sm:p-3.5 rounded-xl sm:rounded-2xl border border-white/20 dark:border-slate-800/40 shadow-sm shrink-0 self-start sm:self-auto order-1 sm:order-2 ${m.color}`}>
              <m.icon className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Order Stream Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 card-premium">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Sales Trend</h3>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-2 py-0.5 rounded-md border border-brand-200/40 dark:border-brand-800/40">
                  {rangeInfo.subtext}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {dateRange === 'today' && 'Hourly revenue stream for today'}
                {dateRange === 'yesterday' && 'Hourly revenue stream for yesterday'}
                {dateRange === 'week' && 'Daily revenue stream for the last 7 days'}
                {dateRange === 'month' && 'Daily revenue stream for this month'}
                {dateRange === 'all' && 'Revenue stream across historical dates'}
              </p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-green-600 bg-green-500/10 px-3 py-1 rounded-full dark:text-green-400 flex items-center gap-1 border border-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-500)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--color-brand-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.15} />
                <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, 'Sales']}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)', 
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(10px)',
                    color: '#FFF'
                  }} 
                />
                <Area type="monotone" dataKey="sales" stroke="var(--color-brand-500)" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Active Tables Panel */}
        <div className="card-premium flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg mb-1">Table Load Capacity</h3>
            <p className="text-xs text-slate-400 font-medium mb-6">Status overview of physical dining seats</p>

            <div className="space-y-5">
              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                  <span>Occupied ({tables.filter(t => t.status === 'occupied').length})</span>
                  <span className="text-brand-500 font-extrabold">{((tables.filter(t => t.status === 'occupied').length / Math.max(1, tables.length)) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2">
                  <div 
                    className="bg-brand-500 dark:bg-brand-400 h-2 rounded-full transition-all duration-500 shadow-sm shadow-brand-500/25" 
                    style={{ width: `${(tables.filter(t => t.status === 'occupied').length / Math.max(1, tables.length)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                  <span>Reserved ({tables.filter(t => t.status === 'reserved').length})</span>
                  <span className="text-rose-500 font-extrabold">{((tables.filter(t => t.status === 'reserved').length / Math.max(1, tables.length)) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-rose-500 to-pink-650 h-2 rounded-full transition-all duration-500 shadow-sm shadow-rose-500/25" 
                    style={{ width: `${(tables.filter(t => t.status === 'reserved').length / Math.max(1, tables.length)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-500 font-bold mb-1.5">
                  <span>Available ({tables.filter(t => t.status === 'available').length})</span>
                  <span className="text-emerald-500 font-extrabold">{((tables.filter(t => t.status === 'available').length / Math.max(1, tables.length)) * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-green-600 h-2 rounded-full transition-all duration-500 shadow-sm shadow-emerald-500/25" 
                    style={{ width: `${(tables.filter(t => t.status === 'available').length / Math.max(1, tables.length)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 border border-slate-100/50 dark:border-slate-800/50 p-3.5 rounded-2xl text-[11px] text-slate-500 font-medium flex gap-2 items-start bg-slate-50/60 dark:bg-slate-850/30">
            <AlertCircle className="w-4 h-4 text-brand-500 flex-shrink-0 mt-0.5" />
            <span>Use the <strong>Table & QR Manager</strong> in the sidebar to print QR codes and change table capacity limits.</span>
          </div>
        </div>

      </div>

    </div>
  );
};

export default AdminDashboard;
