import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { axiosInstance } from '../App';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import '../styles/PageLayout.css';
import './Reports.css';

const Reports = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('inventory');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const response = await axiosInstance.get('/reports/statistics');
      setStats(response.data);
    } catch (error) {
      toast.error('فشل في تحميل الإحصائيات');
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      let response;
      switch (reportType) {
        case 'inventory':
          response = await axiosInstance.get('/reports/inventory');
          break;
        case 'personnel-weapons':
          response = await axiosInstance.get('/reports/personnel-weapons');
          break;
        case 'transactions':
          response = await axiosInstance.get('/reports/transactions');
          break;
        default:
          response = await axiosInstance.get('/reports/statistics');
      }
      setReportData(response.data);
      toast.success('تم إنشاء التقرير بنجاح');
    } catch (error) {
      toast.error('فشل في إنشاء التقرير');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(16);
    doc.text('تقرير نظام إدارة التسليح', 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`نوع التقرير: ${getReportTypeName()}`, 105, 25, { align: 'center' });
    doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, 105, 32, { align: 'center' });
    
    if (reportData) {
      let tableData = [];
      let headers = [];
      
      if (reportType === 'inventory') {
        headers = [['Name', 'Type', 'Quantity', 'Status']];
        // Ammunition
        if (reportData.ammunition_count > 0) {
          doc.text('Ammunition Inventory:', 14, 45);
        }
        // Weapons
        if (reportData.weapons_count > 0) {
          doc.text('Weapons Summary:', 14, 75);
          tableData = [
            ['Total Weapons', reportData.weapons_count],
            ['Available', reportData.weapon_stats?.available || 0],
            ['Assigned', reportData.weapon_stats?.assigned || 0],
            ['Maintenance', reportData.weapon_stats?.maintenance || 0]
          ];
          doc.autoTable({
            startY: 80,
            head: [['Category', 'Count']],
            body: tableData,
          });
        }
      } else if (reportType === 'personnel-weapons') {
        tableData = reportData.map(item => [
          item.personnel?.name || 'N/A',
          item.personnel?.rank || 'N/A',
          item.weapons?.length || 0
        ]);
        doc.autoTable({
          startY: 45,
          head: [['Name', 'Rank', 'Weapons Count']],
          body: tableData,
        });
      } else if (reportType === 'transactions') {
        tableData = reportData.slice(0, 20).map(tx => [
          tx.item_name,
          tx.transaction_type,
          tx.quantity || 'N/A',
          new Date(tx.created_at).toLocaleDateString('ar-SA')
        ]);
        doc.autoTable({
          startY: 45,
          head: [['Item', 'Type', 'Quantity', 'Date']],
          body: tableData,
        });
      }
    }
    
    doc.save(`report-${reportType}-${Date.now()}.pdf`);
    toast.success('تم تصدير التقرير إلى PDF');
  };

  const exportToExcel = () => {
    if (!reportData) return;
    
    let exportData = [];
    
    if (reportType === 'inventory') {
      exportData = [{
        'عدد الذخائر': reportData.ammunition_count,
        'عدد الأسلحة': reportData.weapons_count,
        'أسلحة متاحة': reportData.weapon_stats?.available,
        'أسلحة مسلمة': reportData.weapon_stats?.assigned,
        'أسلحة صيانة': reportData.weapon_stats?.maintenance
      }];
    } else if (reportType === 'personnel-weapons') {
      exportData = reportData.map(item => ({
        'الاسم': item.personnel?.name,
        'الرتبة': item.personnel?.rank,
        'الوحدة': item.personnel?.unit,
        'عدد الأسلحة': item.weapons?.length
      }));
    } else if (reportType === 'transactions') {
      exportData = reportData.map(tx => ({
        'الصنف': tx.item_name,
        'النوع': tx.type === 'ammunition' ? 'ذخيرة' : 'سلاح',
        'نوع المعاملة': tx.transaction_type,
        'الكمية': tx.quantity || '-',
        'التاريخ': new Date(tx.created_at).toLocaleDateString('ar-SA')
      }));
    }
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    
    XLSX.writeFile(wb, `report-${reportType}-${Date.now()}.xlsx`);
    toast.success('تم تصدير التقرير إلى Excel');
  };

  const printReport = () => {
    window.print();
    toast.success('جاري الطباعة...');
  };

  const getReportTypeName = () => {
    const names = {
      'inventory': 'تقرير المخزون',
      'personnel-weapons': 'تقرير الأسلحة المسلمة',
      'transactions': 'تقرير المعاملات',
      'statistics': 'التقرير الإحصائي'
    };
    return names[reportType] || reportType;
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
              <h1>التقارير والإحصائيات</h1>
              <p>تقارير شاملة عن الأسلحة والذخائر</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="page-main">
        {stats && (
          <div className="stats-overview">
            <div className="stat-box">
              <i className="fas fa-boxes stat-box-icon" style={{ color: '#4ade80' }}></i>
              <div>
                <p className="stat-box-label">أنواع الذخائر</p>
                <p className="stat-box-value">{stats.total_ammunition_types}</p>
              </div>
            </div>
            <div className="stat-box">
              <i className="fas fa-shield-alt stat-box-icon" style={{ color: '#60a5fa' }}></i>
              <div>
                <p className="stat-box-label">إجمالي الأسلحة</p>
                <p className="stat-box-value">{stats.total_weapons}</p>
              </div>
            </div>
            <div className="stat-box">
              <i className="fas fa-users stat-box-icon" style={{ color: '#a78bfa' }}></i>
              <div>
                <p className="stat-box-label">عدد الأفراد</p>
                <p className="stat-box-value">{stats.total_personnel}</p>
              </div>
            </div>
            <div className="stat-box">
              <i className="fas fa-exchange-alt stat-box-icon" style={{ color: '#fb923c' }}></i>
              <div>
                <p className="stat-box-label">المعاملات</p>
                <p className="stat-box-value">{stats.total_transactions}</p>
              </div>
            </div>
          </div>
        )}

        <div className="report-generator">
          <div className="generator-card">
            <h2 className="generator-title">إنشاء تقرير جديد</h2>
            <div className="generator-controls">
              <div className="form-group">
                <label htmlFor="reportType">نوع التقرير</label>
                <select
                  id="reportType"
                  data-testid="report-type-select"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
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
                  <option value="inventory">تقرير المخزون</option>
                  <option value="personnel-weapons">تقرير الأسلحة المسلمة</option>
                  <option value="transactions">تقرير المعاملات</option>
                  <option value="statistics">التقرير الإحصائي</option>
                </select>
              </div>
              <Button
                onClick={generateReport}
                disabled={loading}
                className="action-btn"
                data-testid="generate-report-button"
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-alt"></i>
                    إنشاء التقرير
                  </>
                )}
              </Button>
            </div>
          </div>

          {reportData && (
            <div className="report-actions">
              <button onClick={exportToPDF} className="export-btn" data-testid="export-pdf-button">
                <i className="fas fa-file-pdf"></i>
                تصدير PDF
              </button>
              <button onClick={exportToExcel} className="export-btn" data-testid="export-excel-button">
                <i className="fas fa-file-excel"></i>
                تصدير Excel
              </button>
              <button onClick={printReport} className="export-btn" data-testid="print-button">
                <i className="fas fa-print"></i>
                طباعة
              </button>
            </div>
          )}
        </div>

        {reportData && (
          <div className="report-display">
            <div className="report-header-section">
              <h2 className="report-main-title">{getReportTypeName()}</h2>
              <p className="report-date">تاريخ الإنشاء: {new Date().toLocaleDateString('ar-SA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>
            
            {reportType === 'inventory' && (
              <div className="report-content-section">
                <div className="report-summary">
                  <div className="summary-item">
                    <i className="fas fa-boxes" style={{ color: '#4ade80' }}></i>
                    <div>
                      <span className="summary-label">أنواع الذخائر</span>
                      <span className="summary-value">{reportData.ammunition_count}</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <i className="fas fa-shield-alt" style={{ color: '#60a5fa' }}></i>
                    <div>
                      <span className="summary-label">إجمالي الأسلحة</span>
                      <span className="summary-value">{reportData.weapons_count}</span>
                    </div>
                  </div>
                </div>

                {reportData.weapon_stats && (
                  <div className="report-table">
                    <h3 className="table-title">إحصائيات الأسلحة</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>الحالة</th>
                          <th>العدد</th>
                          <th>النسبة</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>متاح</td>
                          <td>{reportData.weapon_stats.available}</td>
                          <td>{((reportData.weapon_stats.available / reportData.weapon_stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td>مسلم</td>
                          <td>{reportData.weapon_stats.assigned}</td>
                          <td>{((reportData.weapon_stats.assigned / reportData.weapon_stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                        <tr>
                          <td>صيانة</td>
                          <td>{reportData.weapon_stats.maintenance}</td>
                          <td>{((reportData.weapon_stats.maintenance / reportData.weapon_stats.total) * 100).toFixed(1)}%</td>
                        </tr>
                        <tr className="total-row">
                          <td><strong>الإجمالي</strong></td>
                          <td><strong>{reportData.weapon_stats.total}</strong></td>
                          <td><strong>100%</strong></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {reportData.low_stock_ammo && reportData.low_stock_ammo.length > 0 && (
                  <div className="report-alert">
                    <i className="fas fa-exclamation-triangle"></i>
                    <div>
                      <h4>تنبيه: ذخائر منخفضة المخزون</h4>
                      <p>يوجد {reportData.low_stock_ammo.length} صنف من الذخائر يحتاج إلى إعادة تعبئة</p>
                      <div className="low-stock-list">
                        {reportData.low_stock_ammo.map((ammo, idx) => (
                          <div key={idx} className="low-stock-item">
                            <span className="ammo-name">{ammo.name}</span>
                            <span className="ammo-quantity">الكمية المتاحة: {ammo.quantity} {ammo.unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {reportType === 'personnel-weapons' && (
              <div className="report-content-section">
                <h3 className="table-title">الأسلحة المسلمة للأفراد</h3>
                <div className="personnel-cards">
                  {reportData.map((item, idx) => (
                    <div key={idx} className="personnel-report-card">
                      <div className="card-header-section">
                        <div className="personnel-info">
                          <i className="fas fa-user-shield"></i>
                          <div>
                            <h4>{item.personnel?.name}</h4>
                            <p>{item.personnel?.rank} - {item.personnel?.unit}</p>
                          </div>
                        </div>
                        <div className="weapons-badge">
                          <i className="fas fa-shield-alt"></i>
                          {item.weapons?.length || 0}
                        </div>
                      </div>
                      {item.weapons && item.weapons.length > 0 && (
                        <div className="weapons-list">
                          {item.weapons.map((weapon, widx) => (
                            <div key={widx} className="weapon-item">
                              <span className="weapon-name">{weapon.name}</span>
                              <span className="weapon-serial">{weapon.serial_number}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reportType === 'transactions' && (
              <div className="report-content-section">
                <h3 className="table-title">سجل المعاملات</h3>
                <div className="report-table">
                  <table>
                    <thead>
                      <tr>
                        <th>الصنف</th>
                        <th>النوع</th>
                        <th>نوع المعاملة</th>
                        <th>الكمية</th>
                        <th>الفرد</th>
                        <th>التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.slice(0, 50).map((tx, idx) => (
                        <tr key={idx}>
                          <td>{tx.item_name}</td>
                          <td>
                            <span className={`type-badge ${tx.type === 'ammunition' ? 'type-ammo' : 'type-weapon'}`}>
                              {tx.type === 'ammunition' ? 'ذخيرة' : 'سلاح'}
                            </span>
                          </td>
                          <td>
                            <span className={`tx-type-badge ${tx.transaction_type === 'وارد' ? 'tx-in' : 'tx-out'}`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td>{tx.quantity || '-'}</td>
                          <td>{tx.personnel_name || '-'}</td>
                          <td>{new Date(tx.created_at).toLocaleDateString('ar-SA')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {reportType === 'statistics' && (
              <div className="report-content-section">
                <h3 className="table-title">الإحصائيات الشاملة</h3>
                <div className="stats-grid-report">
                  <div className="stat-card-report">
                    <i className="fas fa-boxes"></i>
                    <span className="stat-label">أنواع الذخائر</span>
                    <span className="stat-value">{reportData.total_ammunition_types}</span>
                  </div>
                  <div className="stat-card-report">
                    <i className="fas fa-shield-alt"></i>
                    <span className="stat-label">إجمالي الأسلحة</span>
                    <span className="stat-value">{reportData.total_weapons}</span>
                  </div>
                  <div className="stat-card-report">
                    <i className="fas fa-users"></i>
                    <span className="stat-label">عدد الأفراد</span>
                    <span className="stat-value">{reportData.total_personnel}</span>
                  </div>
                  <div className="stat-card-report">
                    <i className="fas fa-exchange-alt"></i>
                    <span className="stat-label">المعاملات</span>
                    <span className="stat-value">{reportData.total_transactions}</span>
                  </div>
                  <div className="stat-card-report">
                    <i className="fas fa-check-circle"></i>
                    <span className="stat-label">أسلحة متاحة</span>
                    <span className="stat-value">{reportData.available_weapons}</span>
                  </div>
                  <div className="stat-card-report">
                    <i className="fas fa-hand-holding"></i>
                    <span className="stat-label">أسلحة مسلمة</span>
                    <span className="stat-value">{reportData.assigned_weapons}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
