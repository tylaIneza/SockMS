'use client';
import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { fmt } from '@/lib/auth';
import { Plus, Search, Pencil, Trash2, X, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';

const EMPTY = { name: '', category_id: '', buying_price: '', min_selling_price: '', low_stock_alert: '10' };

interface ParsedRow {
  name: string;
  category: string;
  buying_price: string;
  min_selling_price: string;
  low_stock_alert: string;
  quantity: string;
  _error?: string;
}

// Normalise any header variation to a known key
function normaliseKey(raw: string): string {
  const k = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (['name','productname','product','nom'].includes(k))                         return 'name';
  if (['category','categoryname','cat'].includes(k))                              return 'category';
  if (['buyingprice','buyprice','cost','purchaseprice','buying'].includes(k))     return 'buying_price';
  if (['minsellingprice','minprice','minimumprice','sellingprice','minselling','minimumsellingprice'].includes(k)) return 'min_selling_price';
  if (['lowstockalert','alert','lowstock','reorderpoint','lowstocklevel'].includes(k)) return 'low_stock_alert';
  if (['quantity','qty','stock','initialstock','initialqty','stockquantity'].includes(k)) return 'quantity';
  return raw;
}

function validateRow(row: ParsedRow): string {
  if (!row.name.trim())                                return 'Name is required';
  const buy = parseFloat(row.buying_price);
  const min = parseFloat(row.min_selling_price);
  if (isNaN(buy) || buy <= 0)                          return 'Invalid buying price';
  if (isNaN(min) || min <= 0)                          return 'Invalid min selling price';
  if (min < buy)                                       return 'Min price must be ≥ buying price';
  return '';
}

export default function ProductsPage() {
  const [products, setProducts]     = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch]         = useState('');
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState<any>(null);
  const [form, setForm]             = useState({ ...EMPTY });
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // Import state
  const [importModal, setImportModal]   = useState(false);
  const [parsedRows, setParsedRows]     = useState<ParsedRow[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const load = () => {
    api.get(`/products${search ? `?search=${search}` : ''}`).then(r => setProducts(r.data));
    api.get('/categories').then(r => setCategories(r.data));
  };
  useEffect(() => { load(); }, [search]);

  const openNew  = () => { setEditing(null); setForm({ ...EMPTY }); setError(''); setModal(true); };
  const openEdit = (p: any) => {
    setEditing(p);
    setForm({ name: p.name, category_id: p.category_id || '', buying_price: p.buying_price, min_selling_price: p.min_selling_price, low_stock_alert: p.low_stock_alert });
    setError(''); setModal(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (editing) await api.put(`/products/${editing.id}`, form);
      else          await api.post('/products', form);
      setModal(false); load();
    } catch (e: any) { setError(e.response?.data?.message || 'Error'); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`); load();
  };

  // ── Excel import helpers ─────────────────────────────────────────────

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Category', 'Buying Price', 'Min Selling Price', 'Low Stock Alert', 'Quantity'],
      ['Coca-Cola 300ml', 'Beverages', 300, 450, 50, 100],
      ['A4 Paper Ream', 'Stationery', 3500, 5000, 20, 50],
      ['Men\'s T-Shirt', 'Clothing', 3000, 5500, 10, 30],
    ]);
    ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'SockMS-product-template.xlsx');
  };

  const parseFile = async (file: File) => {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const rows: ParsedRow[] = raw.map(r => {
      const norm: any = {};
      for (const [k, v] of Object.entries(r)) {
        norm[normaliseKey(k)] = String(v).trim();
      }
      const row: ParsedRow = {
        name:              norm.name              || '',
        category:          norm.category          || '',
        buying_price:      norm.buying_price      || '',
        min_selling_price: norm.min_selling_price || '',
        low_stock_alert:   norm.low_stock_alert   || '10',
        quantity:          norm.quantity          || '0',
      };
      row._error = validateRow(row);
      return row;
    }).filter(r => r.name || r.buying_price || r.min_selling_price); // skip totally empty rows

    setParsedRows(rows);
    setImportResult(null);
  };

  const handleFileInput = async (file: File | null | undefined) => {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV (.csv)');
      return;
    }
    await parseFile(file);
  };

  const openImportModal = () => {
    setParsedRows([]); setImportResult(null); setImportModal(true);
  };

  const submitImport = async () => {
    const valid = parsedRows.filter(r => !r._error);
    if (valid.length === 0) return;
    setImportLoading(true);
    try {
      const { data } = await api.post('/products/import', {
        products: valid.map(r => ({
          name:              r.name,
          category:          r.category,
          buying_price:      r.buying_price,
          min_selling_price: r.min_selling_price,
          low_stock_alert:   r.low_stock_alert || 10,
          quantity:          r.quantity || 0,
        })),
      });
      setImportResult(data);
      load();
    } catch (e: any) {
      setImportResult({ error: e.response?.data?.message || 'Import failed' });
    } finally { setImportLoading(false); }
  };

  const validRows   = parsedRows.filter(r => !r._error);
  const invalidRows = parsedRows.filter(r => r._error);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-slate-400 text-sm mt-1">{products.length} products</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openImportModal} className="btn-ghost">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Products table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-white/8">
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="thead-dark">
              <tr>
                <th className="th">Product</th><th className="th">Category</th>
                <th className="th text-right">Buy Price</th><th className="th text-right">Min Sell</th>
                <th className="th text-right">Total Stock</th><th className="th text-right">Alert</th>
                <th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-dark">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="td font-medium">{p.name}</td>
                  <td className="td"><span className="badge-blue">{p.category_name || '—'}</span></td>
                  <td className="td text-right">{fmt(p.buying_price)}</td>
                  <td className="td text-right">{fmt(p.min_selling_price)}</td>
                  <td className="td text-right font-medium">{p.total_stock}</td>
                  <td className="td text-right">
                    <span className={p.total_stock <= p.low_stock_alert ? 'badge-red' : 'badge-green'}>{p.low_stock_alert}</span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-indigo-500/10 text-indigo-400"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => del(p.id)}   className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="text-center text-slate-500 py-10">No products found</p>}
        </div>
      </div>

      {/* Add / Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-white">{editing ? 'Edit Product' : 'New Product'}</h2>
              <button onClick={() => setModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <form onSubmit={save} className="p-6 space-y-4">
              {error && <div className="alert-error text-sm rounded-lg px-3 py-2">{error}</div>}
              <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                  <option value="">No category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Buying Price</label><input type="number" min="0" step="0.01" className="input" value={form.buying_price} onChange={e => setForm({...form, buying_price: e.target.value})} required /></div>
                <div><label className="label">Min Selling Price</label><input type="number" min="0" step="0.01" className="input" value={form.min_selling_price} onChange={e => setForm({...form, min_selling_price: e.target.value})} required /></div>
              </div>
              <div><label className="label">Low Stock Alert</label><input type="number" min="1" className="input" value={form.low_stock_alert} onChange={e => setForm({...form, low_stock_alert: e.target.value})} required /></div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-ghost flex-1 justify-center">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import modal */}
      {importModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="modal-card rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h2 className="font-semibold text-white">Import Products from Excel</h2>
              </div>
              <button onClick={() => setImportModal(false)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Template download */}
              <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-100 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-indigo-800">Need a template?</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Download the Excel template with the correct column format</p>
                </div>
                <button onClick={downloadTemplate} className="btn-ghost text-indigo-400 border-indigo-200 hover:bg-indigo-500/15 shrink-0 ml-3">
                  <Download className="w-4 h-4" /> Template
                </button>
              </div>

              {/* Drop zone */}
              {!importResult && (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={async e => { e.preventDefault(); setDragOver(false); await handleFileInput(e.dataTransfer.files[0]); }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                    ${dragOver ? 'border-indigo-400 bg-indigo-500/10' : 'border-gray-300 hover:border-indigo-400 hover:bg-white/5'}`}
                >
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-indigo-500' : 'text-gray-300'}`} />
                  <p className="text-sm font-medium text-slate-200">Drop your Excel file here</p>
                  <p className="text-xs text-slate-500 mt-1">or click to browse — .xlsx, .xls, .csv supported</p>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={e => handleFileInput(e.target.files?.[0])} />
                </div>
              )}

              {/* Preview table */}
              {parsedRows.length > 0 && !importResult && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">{parsedRows.length} rows found</span>
                    {validRows.length > 0   && <span className="badge-green">{validRows.length} valid</span>}
                    {invalidRows.length > 0 && <span className="badge-red">{invalidRows.length} with errors</span>}
                    <button onClick={() => fileInputRef.current?.click()} className="text-xs text-indigo-400 hover:underline ml-auto">
                      Change file
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-white/10 rounded-xl">
                    <table className="w-full text-sm">
                      <thead className="thead-dark">
                        <tr>
                          <th className="th">#</th>
                          <th className="th">Name</th>
                          <th className="th">Category</th>
                          <th className="th text-right">Buy Price</th>
                          <th className="th text-right">Min Price</th>
                          <th className="th text-right">Qty</th>
                          <th className="th text-right">Alert</th>
                          <th className="th">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-dark">
                        {parsedRows.map((row, i) => (
                          <tr key={i} className={row._error ? 'bg-red-500/10/50' : ''}>
                            <td className="td text-slate-500">{i + 1}</td>
                            <td className="td font-medium">{row.name || <span className="text-red-400 italic">empty</span>}</td>
                            <td className="td text-slate-400">{row.category || '—'}</td>
                            <td className="td text-right">{row.buying_price ? fmt(row.buying_price) : <span className="text-red-400">—</span>}</td>
                            <td className="td text-right">{row.min_selling_price ? fmt(row.min_selling_price) : <span className="text-red-400">—</span>}</td>
                            <td className="td text-right font-semibold text-indigo-400">{parseInt(row.quantity) || 0}</td>
                            <td className="td text-right">{row.low_stock_alert || 10}</td>
                            <td className="td">
                              {row._error
                                ? <span className="flex items-center gap-1 text-red-600 text-xs"><AlertCircle className="w-3 h-3" />{row._error}</span>
                                : <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle className="w-3 h-3" />Valid</span>
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result */}
              {importResult && !importResult.error && (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-200 rounded-xl p-5 text-center">
                    <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-emerald-800 text-lg">Import Complete</p>
                    <div className="flex justify-center gap-6 mt-3 text-sm">
                      <div><p className="text-2xl font-bold text-emerald-700">{importResult.created}</p><p className="text-emerald-400">Created</p></div>
                      <div><p className="text-2xl font-bold text-slate-400">{importResult.skipped}</p><p className="text-slate-400">Skipped (duplicates)</p></div>
                      {importResult.errors?.length > 0 && <div><p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p><p className="text-red-500">Errors</p></div>}
                    </div>
                  </div>
                  {importResult.errors?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-100 rounded-xl p-4">
                      <p className="text-sm font-medium text-red-400 mb-2">Rows with errors:</p>
                      {importResult.errors.map((e: any, i: number) => (
                        <p key={i} className="text-xs text-red-600">• <strong>{e.name}</strong>: {e.reason}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {importResult?.error && (
                <div className="bg-red-500/10 border border-red-200 rounded-xl p-4 text-red-400 text-sm">{importResult.error}</div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t shrink-0 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Required: <strong>Name, Buying Price, Min Selling Price</strong>. Optional: Category, Low Stock Alert, <strong>Quantity</strong> (stock sent to all branches).
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setImportModal(false)} className="btn-ghost">
                  {importResult ? 'Close' : 'Cancel'}
                </button>
                {!importResult && validRows.length > 0 && (
                  <button onClick={submitImport} disabled={importLoading} className="btn-primary disabled:opacity-50">
                    <Upload className="w-4 h-4" />
                    {importLoading ? 'Importing...' : `Import ${validRows.length} product${validRows.length !== 1 ? 's' : ''}`}
                  </button>
                )}
                {importResult && !importResult.error && (
                  <button onClick={() => { setParsedRows([]); setImportResult(null); }} className="btn-primary">
                    Import More
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
