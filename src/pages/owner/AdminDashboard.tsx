import React from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle2, 
  DollarSign, 
  Percent, 
  Users, 
  FileText, 
  ChevronRight,
  TrendingDown,
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
      color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/20",
    },
    {
      title: "Active Prep Orders",
      value: activeOrders.length,
      desc: "Inside kitchen queues",
      icon: TrendingUp,
      color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      title: "Completed Orders",
      value: completedOrders.length,
      desc: "Successfully served",
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
    },
    {
      title: "Today's Revenue",
      value: `${currency}${totalRevenue.toFixed(0)}`,
      desc: "GST & Tax included",
      icon: DollarSign,
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "Tables Occupied",
      value: `${occupiedTables} / ${tables.length}`,
      desc: `${tables.filter(t => t.status === 'reserved').length} reserved tables`,
      icon: Users,
      color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20",
    },
    {
      title: "Pending Invoices",
      value: pendingBillsCount,
      desc: `${currency}${pendingBillsAmount.toFixed(0)} pending cashout`,
      icon: FileText,
      color: "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20",
    }
  ];

  return (
    <div className="space-y-7 animate-fade-in">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Overview Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time operations monitor for <span className="font-semibold text-brand-600 dark:text-brand-400">{settings?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-850 px-4 py-2.5 rounded-2xl shadow-sm">
          <Calendar className="w-4 h-4 text-brand-500" />
          <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Metrics Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {metrics.map((m, index) => (
          <div key={index} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-sm flex items-center justify-between transition-all hover:shadow-md">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">{m.title}</p>
              <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">{m.value}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
            </div>
            
            <div className={`p-4 rounded-2xl ${m.color}`}>
              <m.icon className="w-7 h-7" />
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Order Stream Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Sales Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-205 text-lg">Sales Trend</h3>
              <p className="text-xs text-slate-400">Hourly revenue stream for today</p>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full dark:bg-green-950/20 dark:text-green-400 flex items-center gap-1">
              Live updates
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-500)" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="var(--brand-500)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="hour" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)', 
                    backgroundColor: '#1E293B',
                    color: '#FFF'
                  }} 
                />
                <Area type="monotone" dataKey="sales" stroke="var(--brand-500)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Active Tables Panel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-3xl p-6 shadow-sm flex flex-col">
          <h3 className="font-extrabold text-slate-800 dark:text-slate-205 text-lg mb-4">Table Capacity Load</h3>
          <p className="text-xs text-slate-400 mb-6">Status overview of physical dining seats</p>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                <span>Occupied ({tables.filter(t => t.status === 'occupied').length})</span>
                <span>{((tables.filter(t => t.status === 'occupied').length / tables.length) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-brand-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(tables.filter(t => t.status === 'occupied').length / tables.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                <span>Reserved ({tables.filter(t => t.status === 'reserved').length})</span>
                <span>{((tables.filter(t => t.status === 'reserved').length / tables.length) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(tables.filter(t => t.status === 'reserved').length / tables.length) * 100}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-500 font-bold mb-1">
                <span>Available ({tables.filter(t => t.status === 'available').length})</span>
                <span>{((tables.filter(t => t.status === 'available').length / tables.length) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${(tables.filter(t => t.status === 'available').length / tables.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 flex gap-2.5 items-center bg-slate-50 dark:bg-slate-800/20 p-3 rounded-2xl text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-brand-500" />
            <span>Use the <strong>Table Manager</strong> in the sidebar to print QR codes and change table capacity limits.</span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default AdminDashboard;
