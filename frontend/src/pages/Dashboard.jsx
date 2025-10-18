import React, { useState, useEffect, useContext } from 'react';
import { AuthContext, axiosInstance } from '../App';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/card';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axiosInstance.get('/reports/statistics');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { name: 'الذخائر', icon: 'fa-boxes', path: '/ammunition', color: '#4ade80' },
    { name: 'الأسلحة', icon: 'fa-shield-alt', path: '/weapons', color: '#60a5fa' },
    { name: 'الأفراد', icon: 'fa-users', path: '/personnel', color: '#a78bfa' },
    { name: 'الوارد والمنصرف', icon: 'fa-exchange-alt', path: '/transactions', color: '#fb923c' },
    { name: 'التقارير', icon: 'fa-chart-bar', path: '/reports', color: '#f472b6' },
    { name: 'الإعدادات', icon: 'fa-cog', path: '/settings', color: '#94a3b8' },
  ];

  return (
    <div className="dashboard-container">
      <nav className="dashboard-header">
        <div className="header-content">
          <div className="header-right">
            <div className="military-badge-small">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div>
              <h1 className="header-title">نظام إدارة التسليح</h1>
              <p className="header-subtitle">إدارة متكاملة للأسلحة والذخائر</p>
            </div>
          </div>
          <div className="header-left">
            <div className="user-info">
              <div className="user-avatar">
                <i className="fas fa-user"></i>
              </div>
              <div className="user-details">
                <p className="user-name">{user?.full_name}</p>
                <p className="user-role">{user?.role === 'admin' ? 'مسؤول' : 'مستخدم'}</p>
              </div>
            </div>
            <button
              onClick={logout}
              data-testid="logout-button"
              className="logout-btn"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </nav>

      <div className="dashboard-main">
        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <Card className="stat-card" data-testid="ammo-stat">
                <div className="stat-icon" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
                  <i className="fas fa-boxes" style={{ color: '#4ade80' }}></i>
                </div>
                <div className="stat-details">
                  <h3 className="stat-title">أنواع الذخائر</h3>
                  <p className="stat-value">{stats?.total_ammunition_types || 0}</p>
                </div>
              </Card>

              <Card className="stat-card" data-testid="weapons-stat">
                <div className="stat-icon" style={{ background: 'rgba(96, 165, 250, 0.1)' }}>
                  <i className="fas fa-shield-alt" style={{ color: '#60a5fa' }}></i>
                </div>
                <div className="stat-details">
                  <h3 className="stat-title">إجمالي الأسلحة</h3>
                  <p className="stat-value">{stats?.total_weapons || 0}</p>
                </div>
              </Card>

              <Card className="stat-card" data-testid="personnel-stat">
                <div className="stat-icon" style={{ background: 'rgba(167, 139, 250, 0.1)' }}>
                  <i className="fas fa-users" style={{ color: '#a78bfa' }}></i>
                </div>
                <div className="stat-details">
                  <h3 className="stat-title">عدد الأفراد</h3>
                  <p className="stat-value">{stats?.total_personnel || 0}</p>
                </div>
              </Card>

              <Card className="stat-card" data-testid="assigned-weapons-stat">
                <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                  <i className="fas fa-exchange-alt" style={{ color: '#fb923c' }}></i>
                </div>
                <div className="stat-details">
                  <h3 className="stat-title">الأسلحة المسلمة</h3>
                  <p className="stat-value">{stats?.assigned_weapons || 0}</p>
                </div>
              </Card>
            </div>

            <div className="menu-grid">
              {menuItems.map((item, index) => (
                <Card
                  key={index}
                  className="menu-card"
                  data-testid={`menu-${item.name}`}
                  onClick={() => navigate(item.path)}
                  style={{ borderColor: `${item.color}33` }}
                >
                  <div className="menu-icon" style={{ background: `${item.color}22` }}>
                    <i className={`fas ${item.icon}`} style={{ color: item.color }}></i>
                  </div>
                  <h3 className="menu-title">{item.name}</h3>
                  <i className="fas fa-arrow-left menu-arrow" style={{ color: item.color }}></i>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;