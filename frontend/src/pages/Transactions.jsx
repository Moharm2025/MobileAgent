import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import '../styles/PageLayout.css';
import './Transactions.css';

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [ammunition, setAmmunition] = useState([]);
  const [weapons, setWeapons] = useState([]);
  const [personnel, setPersonnel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    type: 'ammunition',
    item_id: '',
    item_name: '',
    transaction_type: 'وارد',
    quantity: '',
    personnel_id: '',
    personnel_name: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [transRes, ammoRes, weaponsRes, persRes] = await Promise.all([
        axiosInstance.get('/transactions'),
        axiosInstance.get('/ammunition'),
        axiosInstance.get('/weapons'),
        axiosInstance.get('/personnel')
      ]);
      setTransactions(transRes.data);
      setAmmunition(ammoRes.data);
      setWeapons(weaponsRes.data);
      setPersonnel(persRes.data);
    } catch (error) {
      toast.error('فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { ...formData };
      if (formData.type === 'ammunition') {
        submitData.quantity = parseInt(formData.quantity);
      } else {
        delete submitData.quantity;
      }
      
      await axiosInstance.post('/transactions', submitData);
      toast.success('تمت العملية بنجاح');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'ammunition',
      item_id: '',
      item_name: '',
      transaction_type: 'وارد',
      quantity: '',
      personnel_id: '',
      personnel_name: '',
      notes: ''
    });
  };

  const handleItemChange = (itemId) => {
    const items = formData.type === 'ammunition' ? ammunition : weapons;
    const item = items.find(i => i.id === itemId);
    if (item) {
      setFormData({
        ...formData,
        item_id: itemId,
        item_name: item.name
      });
    }
  };

  const handlePersonnelChange = (persId) => {
    const person = personnel.find(p => p.id === persId);
    if (person) {
      setFormData({
        ...formData,
        personnel_id: persId,
        personnel_name: person.name
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
              <h1>الوارد والمنصرف</h1>
              <p>إدارة معاملات الأسلحة والذخائر</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        <div className="page-actions">
          <button onClick={openModal} className="action-btn" data-testid="add-transaction-button">
            <i className="fas fa-plus"></i>
            إضافة معاملة جديدة
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <i className="fas fa-exchange-alt"></i>
            </div>
            <h3 className="empty-title">لا توجد معاملات مسجلة</h3>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((tx) => (
              <div key={tx.id} className="transaction-card" data-testid={`transaction-${tx.id}`}>
                <div className="tx-icon" style={{
                  background: tx.transaction_type === 'وارد' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(251, 146, 60, 0.1)'
                }}>
                  <i className={`fas ${tx.transaction_type === 'وارد' ? 'fa-arrow-down' : 'fa-arrow-up'}`} 
                     style={{ color: tx.transaction_type === 'وارد' ? '#4ade80' : '#fb923c' }}></i>
                </div>
                <div className="tx-content">
                  <div className="tx-header">
                    <h3 className="tx-title">{tx.item_name}</h3>
                    <span className={`status-badge ${tx.transaction_type === 'وارد' ? 'status-available' : 'status-assigned'}`}>
                      {tx.transaction_type}
                    </span>
                  </div>
                  <div className="tx-details">
                    <span className="tx-detail">
                      <i className="fas fa-box"></i>
                      {tx.type === 'ammunition' ? 'ذخيرة' : 'سلاح'}
                    </span>
                    {tx.quantity && (
                      <span className="tx-detail">
                        <i className="fas fa-cubes"></i>
                        {tx.quantity} قطعة
                      </span>
                    )}
                    {tx.personnel_name && (
                      <span className="tx-detail">
                        <i className="fas fa-user"></i>
                        {tx.personnel_name}
                      </span>
                    )}
                    <span className="tx-detail">
                      <i className="fas fa-calendar"></i>
                      {formatDate(tx.created_at)}
                    </span>
                    {tx.created_by && (
                      <span className="tx-detail">
                        <i className="fas fa-user-shield"></i>
                        {tx.created_by}
                      </span>
                    )}
                  </div>
                  {tx.notes && (
                    <p className="tx-notes">{tx.notes}</p>
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
              <h2 className="modal-title">إضافة معاملة جديدة</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="form-grid">
              <div className="form-group">
                <Label htmlFor="type">نوع الصنف</Label>
                <select
                  id="type"
                  data-testid="type-select"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value, item_id: '', item_name: '' })}
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
                  <option value="ammunition">ذخيرة</option>
                  <option value="weapon">سلاح</option>
                </select>
              </div>

              <div className="form-group">
                <Label htmlFor="item">{formData.type === 'ammunition' ? 'الذخيرة' : 'السلاح'}</Label>
                <select
                  id="item"
                  data-testid="item-select"
                  value={formData.item_id}
                  onChange={(e) => handleItemChange(e.target.value)}
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
                  <option value="">اختر {formData.type === 'ammunition' ? 'الذخيرة' : 'السلاح'}</option>
                  {(formData.type === 'ammunition' ? ammunition : weapons).map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <Label htmlFor="transaction_type">نوع المعاملة</Label>
                <select
                  id="transaction_type"
                  data-testid="transaction-type-select"
                  value={formData.transaction_type}
                  onChange={(e) => setFormData({ ...formData, transaction_type: e.target.value })}
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
                  <option value="وارد">وارد</option>
                  <option value="منصرف">منصرف</option>
                </select>
              </div>

              {formData.type === 'ammunition' && (
                <div className="form-group">
                  <Label htmlFor="quantity">الكمية</Label>
                  <Input
                    id="quantity"
                    data-testid="quantity-input"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    min="1"
                  />
                </div>
              )}

              {formData.transaction_type === 'منصرف' && (
                <div className="form-group">
                  <Label htmlFor="personnel">الفرد</Label>
                  <select
                    id="personnel"
                    data-testid="personnel-select"
                    value={formData.personnel_id}
                    onChange={(e) => handlePersonnelChange(e.target.value)}
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
                    <option value="">اختر الفرد (اختياري)</option>
                    {personnel.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} - {person.rank}
                      </option>
                    ))}
                  </select>
                </div>
              )}

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
                  إضافة
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

export default Transactions;
