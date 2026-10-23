import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  RefreshCw,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { api } from '../api';

export default function DataMenuScreen({ onSeedDemo, isSeeding }) {
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'meal',
    cost_per_portion_inr: 25.0,
    price_inr: 60.0,
    portion_weight_g: 250.0,
    shelf_life_hours: 4.0,
    batch_size: 10,
    is_reusable: false,
    reuse_suggestion: ''
  });

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    setLoading(true);
    try {
      const items = await api.getMenuItems();
      setMenuItems(items);
    } catch (err) {
      console.error('Failed to load menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'meal',
      cost_per_portion_inr: 25.0,
      price_inr: 60.0,
      portion_weight_g: 250.0,
      shelf_life_hours: 4.0,
      batch_size: 10,
      is_reusable: false,
      reuse_suggestion: ''
    });
    setShowItemModal(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      cost_per_portion_inr: item.cost_per_portion_inr,
      price_inr: item.price_inr,
      portion_weight_g: item.portion_weight_g,
      shelf_life_hours: item.shelf_life_hours,
      batch_size: item.batch_size,
      is_reusable: item.is_reusable,
      reuse_suggestion: item.reuse_suggestion || ''
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await api.updateMenuItem(editingItem.id, formData);
      } else {
        await api.createMenuItem(formData);
      }
      setShowItemModal(false);
      loadMenuItems();
    } catch (err) {
      alert('Error saving menu item: ' + err.message);
    }
  };

  const handleDeleteItem = async (id, name) => {
    if (!window.confirm(`Delete menu item '${name}'?`)) return;
    try {
      await api.deleteMenuItem(id);
      loadMenuItems();
    } catch (err) {
      alert('Error deleting item: ' + err.message);
    }
  };

  const handleUploadCsv = async () => {
    if (!csvFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await api.uploadSalesCsv(csvFile);
      setUploadResult(result);
      if (result.status === 'success') {
        loadMenuItems();
      }
    } catch (err) {
      setUploadResult({ status: 'error', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Synthetic Demo Seeding & CSV Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Synthetic Demo Seeder */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 rounded-2xl shadow-sm border border-emerald-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <h3 className="font-bold text-base text-emerald-100">Realistic 90-Day Demo Generator</h3>
            </div>
            <p className="text-xs text-emerald-200/90 leading-relaxed mb-4">
              Instantly seed your canteen database with 90 days of realistic history across 4 meal slots.
              Incorporates weekday patterns, exam attendance dips, rainy snack surges, and baseline over-preparation.
            </p>
          </div>

          <button
            onClick={onSeedDemo}
            disabled={isSeeding}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-stone-900 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSeeding ? 'animate-spin' : ''}`} />
            {isSeeding ? 'Generating 90 Days Synthetic Data...' : 'Generate 90 Days Synthetic History'}
          </button>
        </div>

        {/* CSV Upload */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-stone-900 text-base">Import Historical Sales CSV</h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Upload custom past records with columns: <code className="text-[11px] text-stone-700 bg-stone-100 px-1 py-0.5 rounded">date, meal_slot, item_name, prepared_qty, sold_qty, leftover_qty...</code>
            </p>

            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files[0])}
              className="block w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
            />
          </div>

          <div className="mt-4">
            <button
              onClick={handleUploadCsv}
              disabled={!csvFile || uploading}
              className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Validating & Importing...' : 'Validate & Upload CSV'}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Feedback Banner */}
      {uploadResult && (
        <div className={`p-4 rounded-xl text-xs ${
          uploadResult.status === 'success'
            ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
            : 'bg-rose-50 text-rose-900 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1">
            {uploadResult.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            {uploadResult.message}
          </div>
          {uploadResult.errors && (
            <ul className="list-disc pl-5 mt-1 space-y-0.5 text-[11px]">
              {uploadResult.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Menu Items Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Canteen Menu Catalog ({menuItems.length} Items)</h2>
            <p className="text-xs text-stone-500">Configure ingredient costs, portion weights, shelf lives, and safe reuse suggestions.</p>
          </div>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Menu Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Cost / Price</th>
                <th className="py-3 px-3">Portion Weight</th>
                <th className="py-3 px-3">Shelf Life</th>
                <th className="py-3 px-3">Batch Size</th>
                <th className="py-3 px-3">Safe Reuse Plan</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {menuItems.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900">{item.name}</td>
                  <td className="py-3.5 px-3 text-xs capitalize text-stone-600">{item.category}</td>
                  <td className="py-3.5 px-3 text-xs">
                    <span className="font-semibold text-stone-800">₹{item.cost_per_portion_inr}</span>
                    <span className="text-stone-400"> / </span>
                    <span className="font-bold text-emerald-700">₹{item.price_inr}</span>
                  </td>
                  <td className="py-3.5 px-3 text-xs text-stone-700">{item.portion_weight_g}g</td>
                  <td className="py-3.5 px-3 text-xs text-stone-700">{item.shelf_life_hours} hrs</td>
                  <td className="py-3.5 px-3 text-xs font-semibold text-stone-800">{item.batch_size} units</td>
                  <td className="py-3.5 px-3 text-xs text-stone-600 max-w-xs truncate">
                    {item.is_reusable ? (
                      <span className="text-emerald-700 font-medium">{item.reuse_suggestion}</span>
                    ) : (
                      <span className="text-stone-400">Non-reusable</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg"
                      title="Edit Item"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                      title="Delete Item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-bold text-stone-900 text-base">
                {editingItem ? `Edit Menu Item: ${editingItem.name}` : 'Add New Menu Item'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="py-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-600 mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="snack">Snack</option>
                    <option value="meal">Meal</option>
                    <option value="beverage">Beverage</option>
                    <option value="dessert">Dessert</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Kitchen Batch Size</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.batch_size}
                    onChange={(e) => setFormData({ ...formData, batch_size: parseInt(e.target.value) || 1 })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Cost (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.cost_per_portion_inr}
                    onChange={(e) => setFormData({ ...formData, cost_per_portion_inr: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={formData.price_inr}
                    onChange={(e) => setFormData({ ...formData, price_inr: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Portion (g)</label>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    required
                    value={formData.portion_weight_g}
                    onChange={(e) => setFormData({ ...formData, portion_weight_g: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-600 mb-1">Safe Shelf Life (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  required
                  value={formData.shelf_life_hours}
                  onChange={(e) => setFormData({ ...formData, shelf_life_hours: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_reusable}
                    onChange={(e) => setFormData({ ...formData, is_reusable: e.target.checked })}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="font-semibold text-stone-800">Is Reusable / Safe for Next Day Repurposing?</span>
                </label>
              </div>

              {formData.is_reusable && (
                <div>
                  <label className="block font-semibold text-stone-600 mb-1">Repurposing Action / Recipe Guidance</label>
                  <input
                    type="text"
                    placeholder="e.g. Refrigerate surplus rice to make fried rice special tomorrow"
                    value={formData.reuse_suggestion}
                    onChange={(e) => setFormData({ ...formData, reuse_suggestion: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm focus:outline-none"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-stone-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 bg-stone-100 text-stone-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
