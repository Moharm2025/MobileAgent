import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext, axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import '../styles/PageLayout.css';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const response = await axiosInstance.get('/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('فشل في تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;

    try {
      await axiosInstance.delete(`/users/${userId}`);
      toast.success('تم حذف المستخدم بنجاح');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'فشل في الحذف');
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
              <h1>الإعدادات</h1>
              <p>إدارة إعدادات النظام</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        <div className="settings-section">
          <div className="settings-card">
            <h2 className="settings-title">
              <i className="fas fa-user-circle"></i>
              معلومات المستخدم
            </h2>
            <div className="user-profile">
              <div className="profile-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className="profile-info">
                <h3>{user?.full_name}</h3>
                <p className="profile-username">@{user?.username}</p>
                <span className={`role-badge ${user?.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                  {user?.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                </span>
              </div>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="settings-card">
              <h2 className="settings-title">
                <i className="fas fa-users-cog"></i>
                إدارة المستخدمين
              </h2>
              {loading ? (
                <div className="loading-container">
                  <div className="spinner"></div>
                </div>
              ) : users.length === 0 ? (
                <p className="empty-message">لا يوجد مستخدمين</p>
              ) : (
                <div className="users-list">
                  {users.map((u) => (
                    <div key={u.id} className="user-item" data-testid={`user-${u.id}`}>
                      <div className="user-item-avatar">
                        <i className="fas fa-user"></i>
                      </div>
                      <div className="user-item-info">
                        <h4>{u.full_name}</h4>
                        <p>@{u.username}</p>
                      </div>
                      <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                        {u.role === 'admin' ? 'مسؤول' : 'مستخدم'}
                      </span>
                      {u.id !== user.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="delete-user-btn"
                          data-testid={`delete-user-${u.id}`}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="settings-card">
            <h2 className="settings-title">
              <i className="fas fa-info-circle"></i>
              معلومات النظام
            </h2>
            <div className="info-list">
              <div className="info-item">
                <span>اسم النظام:</span>
                <strong>نظام إدارة التسليح</strong>
              </div>
              <div className="info-item">
                <span>الإصدار:</span>
                <strong>1.0.0</strong>
              </div>
              <div className="info-item">
                <span>الحالة:</span>
                <span className="status-badge status-available">نشط</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;