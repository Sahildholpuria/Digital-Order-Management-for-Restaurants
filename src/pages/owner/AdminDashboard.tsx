import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { orders, tables, payments, settings } = useRestaurant();

  const currency = settings?.currency || '₹';

  // 1. Calculations for stats
  const today = new Date().toDateString();
  
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const activeOrders = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'served'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'completed');
  
  const totalRevenue = payments.reduce((acc, curr) => acc + curr.grandTotal, 0);
  
  const occupiedTables = tables.filter(t => t.status === 'occupied').length;
  
  // Pending bills are orders that are served but not completed (i.e. not paid yet)
  const pendingBillsCount = orders.filter(o => o.status === 'served').length;
  const pendingBillsAmount = orders.filter(o => o.status === 'served').reduce((acc, curr) => acc + curr.grandTotal, 0);

  // 2. Chart Data (Last 7 hours / simulated hour slots for orders)
  const getOrderChartData = () => {
    const hourlyData: { [key: string]: number } = {};
    
    // Set 6 hourly slots before current time
    for (let i = 5; i >= 0; i--) {
      const d = new Date(Date.now() - i * 60 * 60 * 1000);
      const hourStr = `${d.getHours()}:00`;
      hourlyData[hourStr] = 0;
    }

    todayOrders.forEach(o => {
      const orderHour = `${new Date(o.createdAt).getHours()}:00`;
      if (hourlyData[orderHour] !== undefined) {
        hourlyData[orderHour] += o.grandTotal;
      } else {
        hourlyData[orderHour] = o.grandTotal;
      }
    });

    return Object.keys(hourlyData).map(hour => ({
      hour,
      sales: hourlyData[hour]
    }));
  };

  const chartData = getOrderChartData();

  // Metrics Grid Config
  const metrics = [
    {
      title: "Today's Orders",
      value: todayOrders.length,
      desc: `${activeOrders.length} currently active`,
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
      title: "Completed Orders",
      value: completedOrders.length,
      desc: "Successfully served",
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30",
    },
    {
      title: "Today's Revenue",
      value: `${currency}${totalRevenue.toFixed(0)}`,
      desc: "GST & Tax included",
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

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            Overview Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Real-time operations monitor for <span className="font-bold text-brand-600 dark:text-brand-400">{settings?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-2xl shadow-sm">
          <Calendar className="w-4 h-4 text-brand-500" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((m, index) => (
          <div key={index} className="card-premium flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{m.title}</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{m.value}</h3>
              <p className="text-xs text-slate-550 dark:text-slate-400 font-semibold">{m.desc}</p>
            </div>
            
            <div className={`p-3.5 rounded-2xl border border-white/20 dark:border-slate-800/40 shadow-sm ${m.color}`}>
              <m.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Order Stream Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 card-premium">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">Sales Trend</h3>
              <p className="text-xs text-slate-405 font-medium">Hourly revenue stream for today</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-green-600 bg-green-500/10 px-3 py-1 rounded-full dark:text-green-400 flex items-center gap-1 border border-green-500/10">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              Live updates
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
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.2)', 
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
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
