import React, { useState, useRef } from 'react';
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
  Check
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';

export const TablesManager: React.FC = () => {
  const { tables, addTable, deleteTable, updateTableStatus, restaurantId, settings } = useRestaurant();
  
  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState<number>(4);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [previewTable, setPreviewTable] = useState<RestaurantTable | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const flyerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const previewFlyerRef = useRef<HTMLDivElement | null>(null);

  const handleOpenAdd = () => {
    setEditingTable(null);
    setTableNumber('');
    setCapacity(4);
    setIsOpen(true);
  };

  const handleOpenEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setTableNumber(table.number);
    setCapacity(table.capacity);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber) return;

    const id = editingTable ? editingTable.id : `table-${Date.now()}`;
    const qrCodeUrl = `${window.location.origin}/menu/${id}`;

    const newTable: RestaurantTable = {
      id,
      number: tableNumber,
      capacity: Number(capacity),
      status: editingTable ? editingTable.status : 'available',
      qrCodeUrl,
      updatedAt: new Date().toISOString()
    };

    await addTable(newTable);
    setIsOpen(false);
  };

  const handleDelete = async (tableId: string) => {
    if (confirm('Are you sure you want to delete this table? The QR code will stop working immediately.')) {
      await deleteTable(tableId);
    }
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

  const restaurantName = settings?.name || 'Restaurant';

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Table & QR Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create dining tables, track occupancy, and export high-resolution QR flyers.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-brand-500/10"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Table</span>
        </button>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tables.map(table => {
          const menuUrl = `${window.location.origin}/menu/${table.id}`;
          return (
            <div 
              key={table.id}
              className="bg-white dark:bg-slate-900 border border-slate-150/60 dark:border-slate-850 rounded-3xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between"
            >
              {/* Card Top */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-850 dark:text-slate-100">Table {table.number}</h3>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>Capacity: {table.capacity} seats</span>
                  </p>
                </div>

                <select
                  value={table.status}
                  onChange={(e) => updateTableStatus(table.id, e.target.value as TableStatus)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-none ${
                    table.status === 'available' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                    table.status === 'occupied' ? 'bg-indigo-50 border-brand-200 text-brand-600 dark:bg-brand-950/20 dark:text-brand-400' :
                    'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                  }`}
                >
                  <option value="available">Available</option>
                  <option value="occupied">Occupied</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>

              {/* QR Code — Large, clear, crisp preview */}
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-5 flex flex-col items-center gap-3">
                {/* White padded QR container for maximum contrast */}
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100">
                  <QRCodeCanvas 
                    value={menuUrl} 
                    size={160}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: '',
                      height: 0,
                      width: 0,
                      excavate: false,
                    }}
                  />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scan to Order</p>
              </div>

              {/* URL row */}
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/30 rounded-xl px-3 py-2">
                <a 
                  href={menuUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[10px] text-brand-500 font-semibold hover:underline flex items-center gap-0.5 truncate flex-1"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0 mr-0.5" />
                  <span className="truncate">/menu/{table.id}</span>
                </a>
                <button
                  onClick={() => copyUrl(menuUrl, table.id)}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Copy URL"
                >
                  {copiedId === table.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewTable(table)}
                  className="flex-1 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 text-brand-600 dark:text-brand-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => downloadPNG(table)}
                  disabled={isDownloading === table.id}
                  className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{isDownloading === table.id ? '...' : 'PNG'}</span>
                </button>
                <button
                  onClick={() => downloadPDF(table)}
                  disabled={isDownloading === table.id}
                  className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(table)}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:border-slate-300 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(table.id)}
                  className="p-2 border border-slate-200 dark:border-slate-800 hover:border-red-300 rounded-xl text-slate-400 hover:text-red-600 dark:hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* HIDDEN PRINT-READY QR FLYER */}
              <div style={{ position: 'fixed', left: '-9999px', top: 0, opacity: 0, zIndex: -1000, pointerEvents: 'none' }}>
                <div 
                  ref={el => { flyerRefs.current[table.id] = el; }}
                  style={{ 
                    width: '400px', 
                    height: '600px', 
                    background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 60%, #0f172a 100%)',
                    padding: '40px 36px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: '#ffffff',
                    fontFamily: '"Outfit", "Inter", sans-serif',
                    boxSizing: 'border-box'
                  }}
                >
                  <div style={{ marginTop: '8px', width: '100%' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.18em', marginBottom: '8px' }}>
                      ✦ WELCOME TO ✦
                    </div>
                    <h2 style={{ fontSize: '28px', fontWeight: '900', color: '#fbbf24', margin: '0 0 4px 0', letterSpacing: '-0.03em', textTransform: 'uppercase', lineHeight: '1.1' }}>
                      {restaurantName}
                    </h2>
                    <div style={{ width: '48px', height: '3px', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '99px', margin: '10px auto 0' }} />
                  </div>
 
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '20px', boxShadow: '0 25px 50px -10px rgba(0, 0, 0, 0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <QRCodeCanvas 
                        value={menuUrl} 
                        size={220} 
                        level="H" 
                        includeMargin={false}
                      />
                    </div>
                    <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.25)', padding: '10px 32px', borderRadius: '9999px', border: '1.5px solid rgba(99, 102, 241, 0.5)' }}>
                      <p style={{ fontSize: '20px', fontWeight: '900', color: '#fbbf24', margin: 0, letterSpacing: '0.08em' }}>
                        TABLE {table.number.replace(/table\s*-?\s*/gi, '').toUpperCase()}
                      </p>
                    </div>
                  </div>
 
                  <div style={{ marginBottom: '8px', width: '100%' }}>
                    <div style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '14px', padding: '14px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: '#c7d2fe', margin: '0 0 5px 0' }}>
                        📱 Scan QR Code to Browse & Order
                      </p>
                      <p style={{ fontSize: '10px', color: 'rgba(165, 180, 252, 0.65)', margin: 0, lineHeight: '1.5' }}>
                        No app required · Instant access · Secure checkout
                      </p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })}

        {tables.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-500 font-semibold text-sm">No tables yet</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add New Table" to create your first table and QR code.</p>
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
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Table {previewTable.number}</h3>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">QR Code Preview</p>
                </div>
                <button
                  onClick={() => setPreviewTable(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* QR Display — huge, crystal clear */}
              <div className="p-8 flex flex-col items-center gap-5 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
                  <QRCodeCanvas 
                    value={menuUrl} 
                    size={240}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 text-xs font-bold px-4 py-2 rounded-full border border-brand-100 dark:border-brand-900/30 mb-2">
                    TABLE {previewTable.number.replace(/table\s*-?\s*/gi, '').toUpperCase()}
                  </div>
                  <p className="text-xs text-slate-400 font-semibold">{restaurantName}</p>
                </div>
              </div>

              {/* URL + Actions */}
              <div className="px-6 pb-6 space-y-3">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2.5 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 font-mono truncate flex-1">{menuUrl}</span>
                  <button
                    onClick={() => copyUrl(menuUrl, previewTable.id)}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title="Copy URL"
                  >
                    {copiedId === previewTable.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { downloadPNG(previewTable); setPreviewTable(null); }}
                    disabled={isDownloading === previewTable.id}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download PNG
                  </button>
                  <button
                    onClick={() => { downloadPDF(previewTable); setPreviewTable(null); }}
                    disabled={isDownloading === previewTable.id}
                    className="py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Download PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Add/Edit Table Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-lg">
                {editingTable ? `Edit Table ${editingTable.number}` : 'Add Dining Table'}
              </h3>
              <p className="text-xs text-slate-400">Set table identifier name and seat capacity.</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Table Number/Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5, 12, VIP-1"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Seating Capacity</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={20}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/60 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-850 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl"
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
