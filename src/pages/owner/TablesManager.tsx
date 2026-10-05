import React, { useState, useRef, useMemo } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantTable, TableStatus } from '../../types';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Users, 
  FileText, 
  X,
  ExternalLink,
  Maximize2,
  Copy,
  Check,
  Printer,
  Layers,
  Sparkles,
  Building2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

const FLOOR_PRESETS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor",
  "Rooftop Lounge",
  "Outdoor Patio",
  "AC Family Hall",
  "VIP Cabin",
  "Bar & Counter"
];

export const TablesManager: React.FC = () => {
  const { tables, orders, addTable, deleteTable, updateTableStatus, settings, showToast, askConfirmation } = useRestaurant();
  
  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [floor, setFloor] = useState('');
  const [capacity, setCapacity] = useState<number>(4);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<RestaurantTable | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Floor / Section Filter
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<string>('all');

  const flyerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const previewFlyerRef = useRef<HTMLDivElement | null>(null);

  // Unique list of floors existing across all tables
  const availableFloors = useMemo(() => {
    const list = tables.map(t => t.floor?.trim()).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [tables]);

  // Filtered tables based on selected floor
  const filteredTables = useMemo(() => {
    if (selectedFloorFilter === 'all') return tables;
    if (selectedFloorFilter === 'unassigned') return tables.filter(t => !t.floor || !t.floor.trim());
    return tables.filter(t => t.floor?.trim() === selectedFloorFilter);
  }, [tables, selectedFloorFilter]);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableNumber('');
    setFloor(selectedFloorFilter !== 'all' && selectedFloorFilter !== 'unassigned' ? selectedFloorFilter : 'Ground Floor');
    setCapacity(4);
    setIsOpen(true);
  };

  const handleOpenEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.number);
    setFloor(table.floor || '');
    setCapacity(table.capacity);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;

    const id = editingTable ? editingTable.id : `table-${Date.now()}`;
    const qrCodeUrl = `${window.location.origin}/menu/${id}`;

    const newTable: RestaurantTable = {
      id,
      number: tableNumber.trim(),
      floor: floor.trim() || undefined,
      capacity: Number(capacity) || 4,
      status: editingTable ? editingTable.status : 'available',
      qrCodeUrl,
      updatedAt: new Date().toISOString()
    };

    await addTable(newTable);
    showToast(editingTable ? 'Table updated successfully!' : 'Table created successfully!', 'success');
    setIsOpen(false);
  };

  const handleDelete = async (tableId: string) => {
    askConfirmation(
      'Delete Table?',
      'Are you sure you want to delete this table? The QR code will stop working immediately.',
      async () => {
        await deleteTable(tableId);
        showToast('Table deleted successfully.', 'success');
      }
    );
  };

  const copyUrl = (url: string, tableId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Download PDF Standee/Flyer from hidden element
  const downloadPDF = async (table: RestaurantTable) => {
    setIsDownloading(table.id);
    const element = flyerRefs.current[table.id];
    if (!element) { setIsDownloading(null); return; }

    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'in', format: [4, 6] });
      pdf.addImage(imgData, 'PNG', 0, 0, 4, 6);
      pdf.save(`Table_${table.number}_QR_Standee.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  // Download PNG Image from hidden element
  const downloadPNG = async (table: RestaurantTable) => {
    setIsDownloading(table.id);
    const element = flyerRefs.current[table.id];
    if (!element) { setIsDownloading(null); return; }

    try {
      const canvas = await html2canvas(element, { scale: 4, useCORS: true, backgroundColor: null });
      const link = document.createElement('a');
      link.download = `Table_${table.number}_QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Error generating PNG:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  // Direct Print Standee from hidden element
  const printStandee = async (table: RestaurantTable) => {
    setIsDownloading(table.id);
    const element = flyerRefs.current[table.id];
    if (!element) { setIsDownloading(null); return; }

    try {
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: null });
      const imgData = canvas.toDataURL('image/png');
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print QR Standee - Table ${table.number}</title>
              <style>
                @page { size: 4in 6in; margin: 0; }
                body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; background: #0f172a; min-height: 100vh; }
                img { max-width: 100%; max-height: 100vh; object-fit: contain; }
              </style>
            </head>
            <body>
              <img src="${imgData}" onload="setTimeout(() => { window.print(); }, 250);" />
            </body>
          </html>
        `);
        win.document.close();
      }
    } catch (err) {
      console.error('Error printing QR standee:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  const restaurantName = settings?.name || 'Restaurant';

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto pb-12">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-sans">
              Table & Multi-Floor Manager
            </h1>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Multi-Zone
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Organize dining tables across floors, track live occupancy, and generate table QR flyers.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-5 py-2.5 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Table</span>
          </button>
        </div>
      </div>

      {/* MULTI-FLOOR / DINING SECTION FILTER CAROUSEL */}
      <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-1 pr-2 shrink-0 border-r border-slate-200 dark:border-slate-800">
            <Layers className="w-4 h-4 text-emerald-500" />
            <span>Floors & Zones:</span>
          </div>

          {/* All Tables Button */}
          <button
            type="button"
            onClick={() => setSelectedFloorFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
              selectedFloorFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-black'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            All Floors ({tables.length})
          </button>

          {/* Available Dynamic Floors */}
          {availableFloors.map((fl) => {
            const floorCount = tables.filter(t => t.floor?.trim() === fl).length;
            const occupiedOnFloor = tables.filter(t => t.floor?.trim() === fl && t.status === 'occupied').length;
            const isSelected = selectedFloorFilter === fl;
            return (
              <button
                key={fl}
                type="button"
                onClick={() => setSelectedFloorFilter(fl)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>📍 {fl} ({floorCount})</span>
                {occupiedOnFloor > 0 && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white animate-pulse' : 'bg-amber-500'}`} />
                )}
              </button>
            );
          })}

          {/* Unassigned Tables if any */}
          {tables.some(t => !t.floor) && (
            <button
              type="button"
              onClick={() => setSelectedFloorFilter('unassigned')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedFloorFilter === 'unassigned'
                  ? 'bg-slate-700 text-white shadow-xs font-black'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Unassigned ({tables.filter(t => !t.floor).length})
            </button>
          )}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
        {filteredTables.map(table => {
          const menuUrl = `${window.location.origin}/menu/${table.id}`;
          const cleanNum = table.number || table.id.replace(/^table-/i, '');
          const activeOrders = orders.filter(o => 
            (o.tableId === table.id || 
             o.tableId === `table-${cleanNum}` || 
             o.tableId === cleanNum ||
             o.tableName === `Table ${table.number}` || 
             o.tableName === table.number ||
             o.tableName === `Table ${cleanNum}`) &&
            ['pending', 'accepted', 'preparing', 'ready', 'served'].includes(o.status)
          );
          const isOccupied = table.status === 'occupied' || activeOrders.length > 0;
          const activeTotal = activeOrders.reduce((sum, o) => sum + o.grandTotal, 0);

          return (
            <div 
              key={table.id}
              className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-xs space-y-4 hover:shadow-md transition-all flex flex-col justify-between ${
                isOccupied 
                  ? 'border-emerald-500/50 dark:border-emerald-500/40 ring-2 ring-emerald-500/15 shadow-md' 
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {/* Card Top */}
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white whitespace-nowrap tracking-tight">
                      Table {table.number}
                    </h3>
                    {table.floor ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 truncate">
                        <Layers className="w-2.5 h-2.5" />
                        <span>{table.floor}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400 font-medium">Ground</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                    <span className="flex items-center gap-1 font-medium whitespace-nowrap">
                      <Users className="w-3.5 h-3.5" />
                      <span>{table.capacity} seats</span>
                    </span>
                    {activeOrders.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>{activeOrders.length} {activeOrders.length === 1 ? 'Order' : 'Orders'}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <select
                    value={table.status}
                    onChange={(e) => updateTableStatus(table.id, e.target.value as TableStatus)}
                    className={`text-xs font-black px-2.5 py-1.5 rounded-xl border focus:outline-none cursor-pointer transition-all shadow-2xs ${
                      table.status === 'available'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'
                        : table.status === 'occupied'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20'
                    }`}
                  >
                    <option value="available" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Available</option>
                    <option value="occupied" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Occupied</option>
                    <option value="reserved" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold">Reserved</option>
                  </select>
                </div>
              </div>

              {/* QR Code — Crisp & Clean Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 flex flex-col items-center gap-2.5">
                <div className="bg-white p-3.5 rounded-2xl shadow-sm border border-slate-100">
                  <QRCodeCanvas 
                    value={menuUrl} 
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="flex items-center justify-between w-full px-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {table.floor ? `${table.floor} • T-${table.number}` : `Table ${table.number}`}
                  </p>
                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400">
                    RestaurantsOS QR
                  </span>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewTable(table)}
                    title="View full standee preview"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => copyUrl(menuUrl, table.id)}
                    title="Copy QR Menu URL"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedId === table.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => downloadPDF(table)}
                    disabled={isDownloading === table.id}
                    title="Download 4x6 Printable PDF Standee"
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => printStandee(table)}
                    disabled={isDownloading === table.id}
                    title="Direct Print QR Standee"
                    className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(table)}
                    title="Edit Table"
                    className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(table.id)}
                    title="Delete Table"
                    className="p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* HIDDEN PRINT FLYER ELEMENT FOR HIGH-RES HTML2CANVAS */}
              <div style={{ position: 'fixed', left: '-9999px', top: '-9999px' }}>
                <div
                  ref={(el) => { flyerRefs.current[table.id] = el; }}
                  style={{
                    width: '384px',
                    height: '576px',
                    background: 'linear-gradient(145deg, #090d16 0%, #0f172a 40%, #1e1b4b 100%)',
                    borderRadius: '0px',
                    padding: '28px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    color: '#ffffff'
                  }}
                >
                  <div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.1)', padding: '5px 14px', borderRadius: '9999px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '800', color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        ✨ Contactless Menu
                      </span>
                    </div>
                    <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#fbbf24', margin: '0 0 4px 0', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: '1.1' }}>
                      {restaurantName}
                    </h2>
                    {table.floor && (
                      <p style={{ fontSize: '12px', fontWeight: '800', color: '#93c5fd', margin: '4px 0 0 0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        📍 {table.floor}
                      </p>
                    )}
                    <div style={{ width: '48px', height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '99px', margin: '8px auto 0' }} />
                  </div>
 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '18px', borderRadius: '20px', boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <QRCodeCanvas 
                        value={menuUrl} 
                        size={200} 
                        level="H" 
                        includeMargin={false}
                      />
                    </div>
                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.25)', padding: '8px 24px', borderRadius: '9999px', border: '1.5px solid rgba(99, 102, 241, 0.5)' }}>
                      <p style={{ fontSize: '16px', fontWeight: '900', color: '#fbbf24', margin: 0, letterSpacing: '0.08em' }}>
                        TABLE {table.number.replace(/table\s*-?\s*/gi, '').toUpperCase()}
                        {table.floor ? ` • ${table.floor.toUpperCase()}` : ''}
                      </p>
                    </div>
                  </div>
 
                  <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '10px 16px', border: '1px solid rgba(255,255,255,0.1)', width: '100%', boxSizing: 'border-box' }}>
                      <p style={{ fontSize: '11px', fontWeight: '700', color: '#c7d2fe', margin: '0 0 3px 0' }}>
                        📱 Scan QR Code to Browse & Order
                      </p>
                      <p style={{ fontSize: '9px', color: 'rgba(165, 180, 252, 0.65)', margin: 0, lineHeight: '1.4' }}>
                        No app required · Instant live menu · Instant Kitchen KOT
                      </p>
                    </div>

                    <div style={{ 
                      marginTop: '8px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      backgroundColor: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '9999px',
                      padding: '3px 10px'
                    }}>
                      <span style={{ fontSize: '8px', fontWeight: '700', color: 'rgba(255, 255, 255, 0.55)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                        Powered by
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: '900', color: '#34d399', letterSpacing: '0.04em' }}>
                        Restaurants OS
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {filteredTables.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-3">
              <Layers className="w-7 h-7 text-slate-400" />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">
              No tables found in {selectedFloorFilter === 'all' ? 'restaurant' : `"${selectedFloorFilter}"`}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Click "Add New Table" to assign dining tables to this floor or switch to "All Floors".
            </p>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-2 px-4 rounded-xl cursor-pointer"
            >
              + Add Table to {selectedFloorFilter === 'all' ? 'Restaurant' : selectedFloorFilter}
            </button>
          </div>
        )}
      </div>

      {/* ===== FULL-SCREEN QR PREVIEW MODAL ===== */}
      {previewTable && (() => {
        const menuUrl = `${window.location.origin}/menu/${previewTable.id}`;
        return (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setPreviewTable(null)}
          >
            <div 
              className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-scale-in overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">
                    Table {previewTable.number} {previewTable.floor ? `(${previewTable.floor})` : ''}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">QR Code Preview</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewTable(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Display */}
              <div className="p-6 flex flex-col items-center gap-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
                <div className="bg-white p-5 rounded-3xl shadow-xl border border-slate-100">
                  <QRCodeCanvas 
                    value={menuUrl} 
                    size={200} 
                    level="H" 
                    includeMargin={false}
                  />
                </div>

                <div className="w-full text-center space-y-1">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Scan to Open Instant QR Menu
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono break-all px-2">
                    {menuUrl}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full pt-2">
                  <button
                    type="button"
                    onClick={() => downloadPNG(previewTable)}
                    disabled={isDownloading === previewTable.id}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PNG
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadPDF(previewTable)}
                    disabled={isDownloading === previewTable.id}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => { printStandee(previewTable); setPreviewTable(null); }}
                    disabled={isDownloading === previewTable.id}
                    className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5 text-emerald-400" />
                    Print
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add / Edit Table Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-scale-in">
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-900 dark:text-white text-lg">
                {editingTable ? `Edit Table ${editingTable.number}` : 'Add Dining Table'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure table identifier, floor location, and seating capacity.</p>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              {/* Table Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Table Number / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5, 12, VIP-1, T-04"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-3.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Floor / Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Dining Floor / Zone
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Optional</span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {FLOOR_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setFloor(p)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                        floor === p
                          ? 'bg-emerald-600 border-emerald-600 text-white font-black'
                          : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Or enter custom floor (e.g. Rooftop Terrace, AC Hall)"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                  Seating Capacity (Guests)
                </label>
                <div className="flex items-center gap-2">
                  {[2, 4, 6, 8, 10].map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => setCapacity(cap)}
                      className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        capacity === cap
                          ? 'bg-emerald-600 border-emerald-600 text-white font-black'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {cap}p
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  required
                  min={1}
                  max={50}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full mt-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-xs font-bold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-sm cursor-pointer active:scale-95"
              >
                Save Table
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default TablesManager;
