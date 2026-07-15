import React, { useState, useRef } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { RestaurantTable, TableStatus } from '../../types';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Download, 
  Users, 
  FileText, 
  Check, 
  X,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const TablesManager: React.FC = () => {
  const { tables, addTable, deleteTable, updateTableStatus, restaurantId } = useRestaurant();
  
  // Dialog States
  const [isOpen, setIsOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState<number>(4);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const flyerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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
    if (confirm('Are you sure you want to delete this table?')) {
      await deleteTable(tableId);
    }
  };

  // Download PDF Standee/Flyer
  const downloadPDF = async (table: RestaurantTable) => {
    setIsDownloading(table.id);
    const element = flyerRefs.current[table.id];
    if (!element) {
      setIsDownloading(null);
      return;
    }

    try {
      // Force render hidden flyer node to canvas
      element.style.display = 'block';
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      element.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: [4, 6] // 4" x 6" table tent size
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 4, 6);
      pdf.save(`Table_${table.number}_QR_Standee.pdf`);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsDownloading(null);
    }
  };

  // Download PNG Image
  const downloadPNG = async (table: RestaurantTable) => {
    setIsDownloading(table.id);
    const element = flyerRefs.current[table.id];
    if (!element) {
      setIsDownloading(null);
      return;
    }

    try {
      element.style.display = 'block';
      const canvas = await html2canvas(element, { scale: 3, useCORS: true });
      element.style.display = 'none';

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

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight font-sans">
            Table & QR Manager
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create physical dining tables, track real-time occupancy, and export smart QR flyers.
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

              {/* QR Mini Code Box */}
              <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl flex items-center justify-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                  <QRCodeSVG 
                    value={menuUrl} 
                    size={72} 
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Link</p>
                  <a 
                    href={menuUrl} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-brand-500 font-semibold hover:underline flex items-center gap-0.5 truncate"
                  >
                    <span>/menu/{table.id}</span>
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => downloadPNG(table)}
                  disabled={isDownloading === table.id}
                  className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
                <button
                  onClick={() => downloadPDF(table)}
                  disabled={isDownloading === table.id}
                  className="flex-1 py-2 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Flyer</span>
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

              {/* HIDDEN PRINT-READY QR FLYER (Rendered off-screen for html2canvas compilation) */}
              <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                <div 
                  ref={el => { flyerRefs.current[table.id] = el; }}
                  style={{ display: 'none', width: '400px', height: '600px' }}
                  className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 text-center flex flex-col justify-between text-white font-sans rounded-none"
                >
                  <div className="space-y-2 mt-4">
                    <h2 className="text-3xl font-black tracking-tight text-amber-400">THE GRAND BISTRO</h2>
                    <p className="text-xs text-indigo-200 uppercase tracking-widest font-semibold">Self-Ordering Table Menu</p>
                  </div>

                  <div className="space-y-6 flex flex-col items-center">
                    <div className="bg-white p-6 rounded-3xl shadow-2xl border-4 border-amber-400/50">
                      <QRCodeSVG 
                        value={menuUrl} 
                        size={200} 
                        level="H" 
                        includeMargin={false}
                      />
                    </div>
                    <div className="bg-white/10 px-6 py-2.5 rounded-full border border-white/10">
                      <p className="text-2xl font-black text-amber-400">TABLE {table.number}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <p className="text-sm font-semibold text-indigo-200">Scan QR Code to Browse & Order</p>
                    <p className="text-[10px] text-indigo-300/80">No registration or app downloads required. Quick, simple, and secure.</p>
                  </div>
                </div>
              </div>

            </div>
          );
        })}
      </div>

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
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
                  className="w-full bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-800 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
