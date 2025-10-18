import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import '../styles/PageLayout.css';

const Personnel = () => {
  const navigate = useNavigate();
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    military_id: '',
    name: '',
    rank: '',
    unit: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    fetchPersonnel();
  }, []);

  const fetchPersonnel = async () => {
    try {
      const response = await axiosInstance.get('/personnel');
      setPersonnel(response.data);
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
        await axiosInstance.put(`/personnel/${editingItem.id}`, formData);
        toast.success('تم التحديث بنجاح');
      } else {
        await axiosInstance.post('/personnel', formData);
        toast.success('تم الإضافة بنجاح');
      }
      setShowModal(false);
      resetForm();
      fetchPersonnel();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من الحذف؟')) return;
    
    try {
      await axiosInstance.delete(`/personnel/${id}`);
      toast.success('تم الحذف بنجاح');
      fetchPersonnel();
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
      military_id: item.military_id,
      name: item.name,
      rank: item.rank,
      unit: item.unit,
      phone: item.phone || '',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingItem(null);
    setFormData({
      military_id: '',
      name: '',
      rank: '',
      unit: '',
      phone: '',
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
              <h1>إدارة الأفراد</h1>
              <p>إدارة بيانات الأفراد المسلحين</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        <div className="page-actions">
          <button onClick={openAddModal} className="action-btn" data-testid="add-personnel-button">
            <i className="fas fa-plus"></i>
            إضافة فرد جديد
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : personnel.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3 className="empty-title">لا يوجد أفراد مسجلين</h3>
          </div>
        ) : (
          <div className="data-grid">
            {personnel.map((item) => (
              <div key={item.id} className="data-card" data-testid={`personnel-${item.id}`}>
                <div className="card-header">
                  <h3 className="card-title">{item.name}</h3>
                  <div className="card-actions">
                    <button
                      onClick={() => openEditModal(item)}
                      className="icon-btn"
                      data-testid={`edit-personnel-${item.id}`}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="icon-btn delete-btn"
                      data-testid={`delete-personnel-${item.id}`}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  <div className="info-row">
                    <span className="info-label">الرقم العسكري:</span>
                    <span className="info-value">{item.military_id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الرتبة:</span>
                    <span className="info-value">{item.rank}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">الوحدة:</span>
                    <span className="info-value">{item.unit}</span>
                  </div>
                  {item.phone && (
                    <div className="info-row">
                      <span className="info-label">الهاتف:</span>
                      <span className="info-value">{item.phone}</span>
                    </div>
                  )}
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
                {editingItem ? 'تعديل الفرد' : 'إضافة فرد جديد'}
              </h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <Label htmlFor="military_id">الرقم العسكري</Label>
                <Input
                  id="military_id"
                  data-testid="military-id-input"
                  value={formData.military_id}
                  onChange={(e) => setFormData({ ...formData, military_id: e.target.value })}
                  required
                  placeholder="مثال: M-2024-001"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  data-testid="name-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="أدخل الاسم الكامل"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="rank">الرتبة</Label>
                <select
                  id="rank"
                  data-testid="rank-select"
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                  required
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
                  <option value="">اختر الرتبة</option>
                  <option value="جندي">جندي</option>
                  <option value="عريف">عريف</option>
                  <option value="رقيب">رقيب</option>
                  <option value="رقيب أول">رقيب أول</option>
                  <option value="ملازم">ملازم</option>
                  <option value="نقيب">نقيب</option>
                  <option value="رائد">رائد</option>
                  <option value="مقدم">مقدم</option>
                  <option value="عقيد">عقيد</option>
                </select>
              </div>
              <div className="form-group">
                <Label htmlFor="unit">الوحدة</Label>
                <Input
                  id="unit"
                  data-testid="unit-input"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                  placeholder="مثال: الكتيبة الأولى"
                />
              </div>
              <div className="form-group">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  data-testid="phone-input"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966xxxxxxxxx"
                />
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

export default Personnel;
