import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import '../styles/PageLayout.css';

const Ammunition = () => {
  const navigate = useNavigate();
  const [ammunition, setAmmunition] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    caliber: '',
    quantity: '',
    min_stock: '',
    unit: 'قطعة',
    notes: ''
  });

  useEffect(() => {
    fetchAmmunition();
  }, []);

  const fetchAmmunition = async () => {
    try {
      const response = await axiosInstance.get('/ammunition');
      setAmmunition(response.data);
    } catch (error) {
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axiosInstance.put(`/ammunition/${editingItem.id}`, {
          ...formData,
          quantity: parseInt(formData.quantity),
          min_stock: parseInt(formData.min_stock)
        });
        toast.success('تم التحديث بنجاح');
      } else {
        await axiosInstance.post('/ammunition', {
          ...formData,
          quantity: parseInt(formData.quantity),
          min_stock: parseInt(formData.min_stock)
        });
        toast.success('تم الإضافة بنجاح');
      }
      setShowModal(false);
      resetForm();
      fetchAmmunition();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    
    try {
      await axiosInstance.delete(`/ammunition/${id}`);
      toast.success('تم الحذف بنجاح');
      fetchAmmunition();
    } catch (error) {
      toast.error('فشل في الحذف');
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      type: item.type,
      caliber: item.caliber,
      quantity: item.quantity.toString(),
      min_stock: item.min_stock.toString(),
      unit: item.unit,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      type: '',
      caliber: '',
      quantity: '',
      min_stock: '',
      unit: 'قطعة',
      notes: ''
    });
  };

  return (
    <div className="page-container">
      <nav className="page-header">
        <div className="header-content">
          <div className="header-right">
            <button onClick={() => navigate('/')} className="back-btn" data-testid="back-button">
              <i className="fas fa-arrow-right"></i>
            </button>
            <div className="page-title-section">
              <h1>إدارة الذخائر</h1>
              <p>إدارة وتتبع المخزون من الذخائر</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        <div className="page-actions">
          <button onClick={openAddModal} className="action-btn" data-testid="add-ammunition-button">
            <i className="fas fa-plus"></i>
            إضافة ذخيرة جديدة
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : ammunition.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-boxes"></i>
            </div>
            <h3 className="empty-title">لا توجد ذخائر مسجلة</h3>
          </div>
        ) : (
          <div className="data-grid">
            {ammunition.map((item) => (
              <div key={item.id} className="data-card" data-testid={`ammunition-${item.id}`}>
                <div className="card-header">
                  <h3 className="card-title">{item.name}</h3>
                  <div className="card-actions">
                    <button
                      onClick={() => openEditModal(item)}
                      className="icon-btn"
                      data-testid={`edit-ammunition-${item.id}`}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="icon-btn delete-btn"
                      data-testid={`delete-ammunition-${item.id}`}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">النوع:</span>
                    <span className="info-value">{item.type}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">العيار:</span>
                    <span className="info-value">{item.caliber}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الكمية المتاحة:</span>
                    <span className="info-value" style={{ 
                      color: item.quantity <= item.min_stock ? '#ef4444' : '#4ade80'
                    }}>
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الحد الأدنى:</span>
                    <span className="info-value">{item.min_stock} {item.unit}</span>
                  </div>
                  {item.notes && (
                    <div className="info-row">
                      <span className="info-label">ملاحظات:</span>
                      <span className="info-value">{item.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItem ? 'تعديل الذخيرة' : 'إضافة ذخيرة جديدة'}
              </h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <Label htmlFor="name">اسم الذخيرة</Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="مثال: ذخيرة M4A1"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="type">نوع الذخيرة</Label>
                <Input
                  id="type"
                  data-testid="type-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  placeholder="مثال: رصاص خرطوش"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="caliber">العيار</Label>
                <Input
                  id="caliber"
                  data-testid="caliber-input"
                  value={formData.caliber}
                  onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                  required
                  placeholder="مثال: 5.56mm"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="quantity">الكمية</Label>
                <Input
                  id="quantity"
                  data-testid="quantity-input"
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="min_stock">الحد الأدنى للمخزون</Label>
                <Input
                  id="min_stock"
                  data-testid="min-stock-input"
                  type="number"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="unit">الوحدة</Label>
                <select
                  id="unit"
                  data-testid="unit-select"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '10px',
                    color: '#f1f5f9',
                    fontSize: '15px',
                    fontFamily: 'Cairo, sans-serif'
                  }}
                >
                  <option value="قطعة">قطعة</option>
                  <option value="صندوق">صندوق</option>
                  <option value="كرتونة">كرتونة</option>
                </select>
              </div>
              <div className="form-group">
                <Label htmlFor="notes">ملاحظات</Label>
                <textarea
                  id="notes"
                  data-testid="notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="أي ملاحظات إضافية..."
                />
              </div>
              <div className="form-actions">
                <Button type="submit" className="submit-btn" data-testid="submit-button">
                  {editingItem ? 'تحديث' : 'إضافة'}
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="cancel-btn"
                  data-testid="cancel-button"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ammunition;