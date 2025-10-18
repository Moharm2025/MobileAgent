import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import '../styles/PageLayout.css';

const Weapons = () => {
  const navigate = useNavigate();
  const [weapons, setWeapons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    serial_number: '',
    status: 'متاح',
    notes: ''
  });

  useEffect(() => {
    fetchWeapons();
  }, []);

  const fetchWeapons = async () => {
    try {
      const response = await axiosInstance.get('/weapons');
      setWeapons(response.data);
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
        await axiosInstance.put(`/weapons/${editingItem.id}`, formData);
        toast.success('تم التحديث بنجاح');
      } else {
        await axiosInstance.post('/weapons', formData);
        toast.success('تم الإضافة بنجاح');
      }
      setShowModal(false);
      resetForm();
      fetchWeapons();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    
    try {
      await axiosInstance.delete(`/weapons/${id}`);
      toast.success('تم الحذف بنجاح');
      fetchWeapons();
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
      serial_number: item.serial_number,
      status: item.status,
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      type: '',
      serial_number: '',
      status: 'متاح',
      notes: ''
    });
  };

  const getStatusClass = (status) => {
    switch(status) {
      case 'متاح': return 'status-available';
      case 'مسلم': return 'status-assigned';
      case 'صيانة': return 'status-maintenance';
      default: return 'status-available';
    }
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
              <h1>إدارة الأسلحة</h1>
              <p>إدارة وتتبع الأسلحة العسكرية</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        <div className="page-actions">
          <button onClick={openAddModal} className="action-btn" data-testid="add-weapon-button">
            <i className="fas fa-plus"></i>
            إضافة سلاح جديد
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : weapons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="empty-title">لا توجد أسلحة مسجلة</h3>
          </div>
        ) : (
          <div className="data-grid">
            {weapons.map((item) => (
              <div key={item.id} className="data-card" data-testid={`weapon-${item.id}`}>
                <div className="card-header">
                  <h3 className="card-title">{item.name}</h3>
                  <div className="card-actions">
                    <button
                      onClick={() => openEditModal(item)}
                      className="icon-btn"
                      data-testid={`edit-weapon-${item.id}`}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="icon-btn delete-btn"
                      data-testid={`delete-weapon-${item.id}`}
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
                    <span className="info-label">الرقم التسلسلي:</span>
                    <span className="info-value">{item.serial_number}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الحالة:</span>
                    <span className={`status-badge ${getStatusClass(item.status)}`}>
                      {item.status}
                    </span>
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
                {editingItem ? 'تعديل السلاح' : 'إضافة سلاح جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <Label htmlFor="name">اسم السلاح</Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="مثال: M4A1 Carbine"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="type">نوع السلاح</Label>
                <Input
                  id="type"
                  data-testid="type-input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                  placeholder="مثال: بندقية هجومية"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="serial_number">الرقم التسلسلي</Label>
                <Input
                  id="serial_number"
                  data-testid="serial-number-input"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  required
                  placeholder="مثال: WP-2024-001"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="status">الحالة</Label>
                <select
                  id="status"
                  data-testid="status-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
                  <option value="متاح">متاح</option>
                  <option value="مسلم">مسلم</option>
                  <option value="صيانة">صيانة</option>
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

export default Weapons;
