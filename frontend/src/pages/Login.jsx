import React, { useState, useContext } from 'react';
import { AuthContext, axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import './Login.css';

const Login = () => {
  const { login } = useContext(AuthContext);
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await axiosInstance.post('/auth/register', formData);
        toast.success('تم إنشاء الحساب بنجاح! الرجاء تسجيل الدخول');
        setIsRegister(false);
        setFormData({ username: '', password: '', full_name: '', role: 'user' });
      } else {
        const response = await axiosInstance.post('/auth/login', {
          username: formData.username,
          password: formData.password
        });
        login(response.data.access_token, response.data.user);
        toast.success('مرحباً بك!');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="military-pattern"></div>
      </div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="military-badge">
            <i className="fas fa-shield-alt"></i>
          </div>
          <h1>نظام إدارة التسليح</h1>
          <p>نظام متكامل لإدارة الأسلحة والذخائر العسكرية</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <div className="form-group">
              <Label htmlFor="full_name">الاسم الكامل</Label>
              <Input
                id="full_name"
                data-testid="full-name-input"
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                placeholder="أدخل الاسم الكامل"
              />
            </div>
          )}

          <div className="form-group">
            <Label htmlFor="username">اسم المستخدم</Label>
            <Input
              id="username"
              data-testid="username-input"
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              placeholder="أدخل اسم المستخدم"
            />
          </div>

          <div className="form-group">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              data-testid="password-input"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              placeholder="أدخل كلمة المرور"
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <Label htmlFor="role">الدور</Label>
              <select
                id="role"
                data-testid="role-select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="role-select"
              >
                <option value="user">مستخدم</option>
                <option value="admin">مسؤول</option>
              </select>
            </div>
          )}

          <Button
            type="submit"
            data-testid="submit-button"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="loading-text">جاري التحميل...</span>
            ) : (
              isRegister ? 'إنشاء حساب' : 'تسجيل الدخول'
            )}
          </Button>
        </form>

        <div className="toggle-auth">
          <button
            type="button"
            data-testid="toggle-auth-button"
            onClick={() => {
              setIsRegister(!isRegister);
              setFormData({ username: '', password: '', full_name: '', role: 'user' });
            }}
            className="toggle-btn"
          >
            {isRegister ? 'لديك حساب؟ سجل الدخول' : 'ليس لديك حساب؟ سجل الآن'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;