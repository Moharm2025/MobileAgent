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
            <pre className="report-content">{JSON.stringify(reportData, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
