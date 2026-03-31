import { useEffect, useState } from "react";
import "./managerdashboard.css";
import { useNavigate } from "react-router-dom";
import PrintProfile from "./PrintProfile";
import "./print.css";

const SCRIPT_URL = process.env.REACT_APP_API_URL;

const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    } catch {
        return dateString;
    }
};

const getDriveDirectLink = (url) => {
    if (!url) return null;
    if (url.includes("drive.google.com")) {
        const id = url.match(/[-\w]{25,}/);
        if (id) return `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
        const ucId = url.split("id=")[1] || url.split("/d/")[1]?.split("/")[0];
        if (ucId) return `https://drive.google.com/uc?export=view&id=${ucId}`;
    }
    return url;
};

const parseJSON = (jsonString) => {
    if (!jsonString) return [];
    try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch {
        return [];
    }
};

function AdminActionsContent({ employee, onUpdate }) {
    const [status, setStatus] = useState(employee.Status || "Active");
    const [empType, setEmpType] = useState(employee.EmploymentType || "regular");
    const [confType, setConfType] = useState(employee.ConfirmationType || (new Date(employee.DateOfJoining || employee.doj) > new Date(new Date().setMonth(new Date().getMonth() - 3)) ? "Probation" : "Permanent"));

    return (
        <div className="mg-oversight-card">
            <div className="mg-oversight-header">
                <div className="mg-oversight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div className="mg-oversight-title-wrap">
                    <h3>Managerial Oversight</h3>
                    <p>Manually override employee status and employment terms. Changes are updated instantly across all systems.</p>
                </div>
            </div>

            <div className="mg-oversight-grid">
                <div className="mg-input-field">
                    <label>Status</label>
                    <select className="mg-admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="PIP">Performance Improvement Plan (PIP)</option>
                        <option value="Inactive Suspend">Inactive - Suspended</option>
                        <option value="Abscond">Absconded</option>
                    </select>
                </div>
                <div className="mg-input-field">
                    <label>Employment Type</label>
                    <select className="mg-admin-select" value={empType} onChange={(e) => setEmpType(e.target.value)}>
                        <option value="regular">Regular</option>
                        <option value="contract">Contractor</option>
                        <option value="training">Trainee</option>
                        <option value="intern">Intern</option>
                        <option value="consultant">Consultant</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="mg-input-field" style={{ opacity: empType === "regular" ? 1 : 0.4, pointerEvents: empType === "regular" ? 'auto' : 'none' }}>
                    <label>Confirmation Status</label>
                    <select className="mg-admin-select" value={confType} onChange={(e) => setConfType(e.target.value)}>
                        <option value="Probation">Probation</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                </div>
            </div>
            <div className="mg-oversight-footer">
                <button
                    className="mg-apply-btn"
                    onClick={() => {
                        const updateData = { Status: status, EmploymentType: empType };
                        if (empType === "regular") updateData.ConfirmationType = confType;
                        onUpdate(updateData);
                    }}
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
}

function ManagerDashboard() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [filterDept, setFilterDept] = useState("All");
    const [filterGender, setFilterGender] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterEmploymentType, setFilterEmploymentType] = useState("All");
    const [filterEmploymentCategory, setFilterEmploymentCategory] = useState("All");
    const [detailTab, setDetailTab] = useState("personal");
    const [sortBy, setSortBy] = useState("name");
    const [uniqueDepts, setUniqueDepts] = useState([]);
    const [celebMonth, setCelebMonth] = useState(new Date().getMonth() + 1);
    const navigate = useNavigate();

    const normalizeDept = (dept) => {
        if (!dept) return "";
        const name = dept.trim();
        if (name === "HRD") return "HR";
        if (name === "Management") return "Admin";
        return name;
    };

    const loadEmployees = async () => {
        try {
            setLoading(true);
            if (!SCRIPT_URL) {
                console.error("API URL is not configured. Please check your .env file and RESTART the dev server.");
                setLoading(false);
                return;
            }
            const res = await fetch(`${SCRIPT_URL}?action=getAllEmployees`);
            if (!res.ok) throw new Error("Network response was not ok");
            const data = await res.json();
            if (data.status === "success") {
                const newEmployees = data.employees || [];
                setEmployees(newEmployees);
                localStorage.setItem("employee_cache", JSON.stringify(newEmployees));
            }
            setLoading(false);
        } catch (err) {
            console.log(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        const cached = localStorage.getItem("employee_cache");
        if (cached) setEmployees(JSON.parse(cached));
        loadEmployees();
        const interval = setInterval(loadEmployees, 10000);
        return () => clearInterval(interval);
    }, []);

    const getUpcomingBirthdays = () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        return employees.filter(emp => {
            if (!emp.DOB && !emp.dob) return false;
            const dob = new Date(emp.DOB || emp.dob);
            const month = dob.getMonth() + 1;
            const day = dob.getDate();

            if (month !== celebMonth) return false;
            // If it's the current month, hide passed dates
            if (celebMonth === currentMonth && day < currentDay) return false;
            
            return true;
        }).sort((a, b) => new Date(a.DOB || a.dob).getDate() - new Date(b.DOB || b.dob).getDate()).slice(0, 3);
    };

    const getWorkAnniversaries = () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentDay = today.getDate();

        return employees.filter(emp => {
            if (!emp.DateOfJoining && !emp.doj) return false;
            const doj = new Date(emp.DateOfJoining || emp.doj);
            const month = doj.getMonth() + 1;
            const day = doj.getDate();

            if (month !== celebMonth) return false;
            if (doj.getFullYear() >= today.getFullYear()) return false; // Not an anniversary yet
            // If it's the current month, hide passed dates
            if (celebMonth === currentMonth && day < currentDay) return false;

            return true;
        }).sort((a, b) => new Date(a.DateOfJoining || a.doj).getDate() - new Date(b.DateOfJoining || b.doj).getDate()).slice(0, 3);
    };

    const getProfileCompletion = (emp) => {
        const fields = [
            emp.Name, emp.DOB, emp.Gender, emp.Email, emp.Phone,
            emp.AadharNumber, emp.PAN, emp.Designation, emp.Department,
            emp.Resume, emp.Photo, emp.BankName, emp.AccountNumber
        ];
        const completed = fields.filter(f => f && f !== "-" && f !== "").length;
        return Math.round((completed / fields.length) * 100);
    };

    const filteredEmployees = employees
        .filter(emp => {
            const matchesSearch = (emp.EmpID || emp.employee_code || "").toString().includes(searchId) ||
                (emp.Name || "").toLowerCase().includes(searchId.toLowerCase());
            const matchesDept = filterDept === "All" || (emp.Department || emp.department) === filterDept;
            const matchesGender = filterGender === "All" || (emp.Gender || emp.gender)?.toLowerCase() === filterGender.toLowerCase();
            const empStatus = emp.Status || emp.status;
            const matchesStatus = (filterStatus === "All") ||
                (filterStatus === "Active" && (!empStatus || empStatus.toLowerCase() === 'active')) ||
                (filterStatus === "Inactive" && empStatus?.toLowerCase() === 'inactive') ||
                (filterStatus === "PIP" && empStatus?.toLowerCase() === 'pip') ||
                (filterStatus === "Inactive Suspend" && empStatus?.toLowerCase() === 'inactive suspend') ||
                (filterStatus === "Abscond" && empStatus?.toLowerCase() === 'abscond');

            const empConfType = emp.ConfirmationType || emp.confirmationType;
            const matchesConfirmation = filterEmploymentType === "All" || (() => {
                if (empConfType) return (empConfType.toLowerCase() === filterEmploymentType.toLowerCase());
                const doj = new Date(emp.DateOfJoining || emp.doj);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const isProbation = doj > threeMonthsAgo;
                return (filterEmploymentType === "Probation" && isProbation) || (filterEmploymentType === "Confirmed" && !isProbation);
            })();

            const empEmploymentType = emp.EmploymentType || emp.employmentType;
            const matchesCategory = filterEmploymentCategory === "All" || (empEmploymentType?.toLowerCase() === filterEmploymentCategory.toLowerCase());

            return matchesSearch && matchesDept && matchesGender && matchesStatus && matchesConfirmation && matchesCategory;
        })
        .sort((a, b) => {
            if (sortBy === "name") return (a.Name || "").localeCompare(b.Name || "");
            if (sortBy === "id") return (a.EmpID || "").localeCompare(b.EmpID || "");
            if (sortBy === "doj") return new Date(a.DateOfJoining || a.doj) - new Date(b.DateOfJoining || b.doj);
            return 0;
        });

    useEffect(() => {
        setUniqueDepts([...new Set(employees.map(e => normalizeDept(e.Department || e.department)))].filter(d => d && d !== "-"));
    }, [employees]);

    const departments = ["All", ...uniqueDepts];

    const searchEmployee = () => {
        if (!searchId) return loadEmployees();
        const filtered = employees.filter(emp => (emp.EmpID || emp.employee_code || "").toString().includes(searchId));
        setEmployees(filtered);
    };

    const deleteEmployee = async (empId) => {
        if (!window.confirm(`Are you sure you want to delete employee ${empId}?`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${SCRIPT_URL}?action=deleteEmployee&empId=${empId}`);
            const data = await res.json();
            if (data.status === "success") {
                alert("Employee deleted successfully");
                loadEmployees();
                setSelectedEmployee(null);
            } else {
                alert("Error deleting employee: " + data.message);
            }
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete employee");
        } finally {
            setLoading(false);
        }
    };

    // const handleDownloadDocs = (empId, name) => {
    //     const url = `${SCRIPT_URL}?action=downloadDocs&empId=${empId}&name=${name}`;
    //     window.open(url, "_blank");
    // };
    const handleExcelDownload = async (empId) => {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=downloadExcel&empId=${empId}`);
            const data = await res.json();
            if (data.status === "success") {
                window.open(data.url, "_blank");
            } else {
                alert("Download failed");
            }
        } catch (err) {
            console.error(err);
            alert("Error downloading file");
        }
    };

    const handleUpdateStatus = async (empId, fields) => {
        try {
            setLoading(true);
            const formData = new URLSearchParams();
            formData.append("action", "updateEmployee");
            formData.append("empId", empId);

            Object.keys(fields).forEach(key => {
                formData.append(key, fields[key]);
            });

            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (data.status === "success") {
                alert("Status updated successfully");
                loadEmployees();
                if (selectedEmployee && (selectedEmployee.EmpID || selectedEmployee.employee_code) === empId) {
                    setSelectedEmployee({ ...selectedEmployee, ...fields });
                }
            } else {
                alert("Error updating status: " + data.message);
            }
        } catch (err) {
            console.error("Update Status Error:", err);
            alert("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mg-portal-container">
            {/* Sidebar Navigation */}
            <div className="mg-side-panel">
                <div className="mg-brand-section">
                    <img src="/chn-logo.png" alt="Company Logo" />

                </div>
                <div className="mg-nav-group">
                    <div className={`mg-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span>Insights</span>
                    </div>
                    <div className={`mg-nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Team Members</span>
                    </div>
                </div>
                <div className="mg-nav-link mg-logout-btn" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9' }} onClick={() => navigate("/manager-login")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="mg-main-view">
                <div className="mg-page-header">
                    <div>
                        <h1>Team Insights</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Workforce analytics and team management</p>
                    </div>
                    <div className="mg-header-actions">
                        <div className="mg-search-bar">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input
                                type="text"
                                placeholder="Search by ID or Name..."
                                value={searchId}
                                onChange={(e) => setSearchId(e.target.value)}
                                onKeyUp={(e) => e.key === 'Enter' && searchEmployee()}
                            />
                        </div>
                        {(() => {
                            const today = new Date();
                            const currM = today.getMonth() + 1;
                            const bdayCount = employees.filter(e => {
                                const d = new Date(e.DOB || e.dob);
                                return (d.getMonth() + 1) === currM;
                            }).length;
                            const anniCount = employees.filter(e => {
                                const d = new Date(e.DateOfJoining || e.doj);
                                return (d.getMonth() + 1) === currM && d.getFullYear() < today.getFullYear();
                            }).length;

                            return (
                                <div className="celebration-hub">
                                    <div className="hub-icon">✨</div>
                                    <div className="hub-content">
                                        <span className="hub-label">Celebrations:</span>
                                        <span className="hub-stats">
                                            <strong>{bdayCount}</strong> 🎂 • 
                                            <strong>{anniCount}</strong> 🎊
                                        </span>
                                    </div>
                                </div>
                            );
                        })()}
                        <button className="mg-primary-action-btn" onClick={loadEmployees}>
                            Refresh
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="mg-dashboard-body">
                        {/* Manager Stats Grid */}
                        <div className="mg-insights-grid">
                            <StatCardV2
                                label="Total Team Count"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                                color="#2563eb"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('All'); }}
                            />
                            <StatCardV2
                                label="Active Members"
                                value={employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                                color="#10b981"
                                percentage={employees.length > 0 ? Math.round((employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length / employees.length) * 100) : 0}
                                onClick={() => { setActiveTab('employees'); setFilterStatus('Active'); }}
                            />
                            <StatCardV2
                                label="Profile Quality"
                                value={`${employees.length > 0 ? Math.round(employees.reduce((acc, e) => acc + getProfileCompletion(e), 0) / employees.length) : 0}%`}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M9 20v-10M15 20v-2M18 20V4M6 20v-4"></path></svg>}
                                color="#3b82f6"
                            />
                            <StatCardV2
                                label="New Joiners (30d)"
                                value={employees.filter(e => {
                                    const joinDate = new Date(e.DateOfJoining || e.doj);
                                    const thirtyDaysAgo = new Date();
                                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                    return joinDate >= thirtyDaysAgo;
                                }).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>}
                                color="#f97316"
                            />
                        </div>

                        <div className="mg-widget-row">
                            <div className="mg-widget-panel">
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Workforce Tenancy</h4>
                                </div>
                                <div className="mg-tenure-grid">
                                    {(() => {
                                        const buckets = [
                                            { label: 'Freshers', color: '#10b981', filter: e => (parseInt(e.TotalExpYears) || 0) === 0 },
                                            { label: '1-3 Years', color: '#3b82f6', filter: e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3 },
                                            { label: '4-7 Years', color: '#f59e0b', filter: e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7 },
                                            { label: '8+ Years', color: '#ef4444', filter: e => (parseInt(e.TotalExpYears) || 0) >= 8 }
                                        ];
                                        return buckets.map(b => {
                                            const val = employees.filter(b.filter).length;
                                            const pct = employees.length > 0 ? Math.round((val / employees.length) * 100) : 0;
                                            return (
                                                <div key={b.label} className="mg-tenure-tile" style={{ '--accent': b.color }}>
                                                    <div className="mg-tile-header">
                                                        <span>{b.label}</span>
                                                        <small>{pct}%</small>
                                                    </div>
                                                    <div className="mg-tile-body">
                                                        <h3>{val}</h3>
                                                        <div className="mg-tile-mini-bar">
                                                            <div className="mg-tile-fill" style={{ width: `${pct}%`, background: b.color }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            </div>


                            <div className="mg-widget-panel">
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 15l-2 5 2-1 2 1-2-5z"></path><path d="M12 15V3"></path><path d="M8 21l2-5 2 1 2-1 2 5"></path><circle cx="12" cy="9" r="6"></circle></svg>
                                    <h4>Team Veterans</h4>
                                </div>
                                <div className="mg-relieved-list">
                                    {(() => {
                                        const veterans = [...employees]
                                            .filter(e => e.DateOfJoining || e.doj)
                                            .sort((a, b) => new Date(a.DateOfJoining || a.doj) - new Date(b.DateOfJoining || b.doj))
                                            .slice(0, 3);

                                        return veterans.length > 0 ? veterans.map(emp => (
                                            <div key={emp.EmpID || emp.employee_code} className="mg-relieved-item" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }}>
                                                <div className="mg-relieved-main">
                                                    <div className="mg-relieved-avatar" style={{ background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}>{emp.Name?.charAt(0)}</div>
                                                    <div className="mg-relieved-meta">
                                                        <h6>{emp.Name}</h6>
                                                        <span>Joined: {formatDate(emp.DateOfJoining || emp.doj)}</span>
                                                    </div>
                                                </div>
                                                <div className="mg-tenure-badge">
                                                    {(() => {
                                                        const joined = new Date(emp.DateOfJoining || emp.doj);
                                                        const now = new Date();
                                                        const diff = now.getFullYear() - joined.getFullYear();
                                                        return diff > 0 ? `${diff}y+` : '< 1y';
                                                    })()}
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="mg-empty-relieved">
                                                <p>Insufficient data to calculate tenure</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Events Widget */}
                        <div className="mg-widget-row" style={{ marginTop: '20px' }}>
                            <div className="mg-widget-panel" style={{ flex: 1 }}>
                                <div className="mg-widget-title-area" style={{ justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                        <h4>Upcoming Celebrations</h4>
                                    </div>
                                    <select
                                        className="mg-celeb-select"
                                        value={celebMonth}
                                        onChange={(e) => setCelebMonth(parseInt(e.target.value))}
                                    >
                                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                            <option key={m} value={i + 1}>{m}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mg-celebration-list">
                                    {(() => {
                                        const bdays = getUpcomingBirthdays();
                                        const anniversaries = getWorkAnniversaries();
                                        return (bdays.length > 0 || anniversaries.length > 0) ? (
                                            <>
                                                {bdays.map((emp, i) => (
                                                    <div key={`b-${i}`} className="mg-celebration-row" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }} style={{ cursor: 'pointer' }}>
                                                        <div className="mg-date-badge">
                                                            <span>{new Date(emp.DOB || emp.dob).getDate()}</span>
                                                            <small>{new Date(emp.DOB || emp.dob).toLocaleString('default', { month: 'short' })}</small>
                                                        </div>
                                                        <div className="mg-event-details">
                                                            <h5>{emp.Name}</h5>
                                                            <p>Birthday Celebration</p>
                                                        </div>
                                                        <div className="mg-event-emoji">🎂</div>
                                                    </div>
                                                ))}
                                                {anniversaries.map((emp, i) => (
                                                    <div key={`a-${i}`} className="mg-celebration-row" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }} style={{ cursor: 'pointer' }}>
                                                        <div className="mg-date-badge">
                                                            <span>{new Date(emp.DateOfJoining || emp.doj).getDate()}</span>
                                                            <small>{new Date(emp.DateOfJoining || emp.doj).toLocaleString('default', { month: 'short' })}</small>
                                                        </div>
                                                        <div className="mg-event-details">
                                                            <h5>{emp.Name}</h5>
                                                            <p>{new Date().getFullYear() - new Date(emp.DateOfJoining || emp.doj).getFullYear()} Year Anniversary</p>
                                                        </div>
                                                        <div className="mg-event-emoji">🎊</div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center', padding: '20px' }}>No celebrations in this month</p>;
                                    })()}
                                </div>
                            </div>

                            <div className="mg-widget-panel" style={{ flex: 1.5 }}>
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                    <h4>Department Breakdown</h4>
                                </div>
                                <div className="mg-dept-distribution">
                                    {(() => {
                                        const deptCounts = Object.entries(
                                            employees.reduce((acc, curr) => {
                                                const dept = normalizeDept(curr.Department || curr.department);
                                                if (dept && dept !== "-") {
                                                    acc[dept] = (acc[dept] || 0) + 1;
                                                }
                                                return acc;
                                            }, {})
                                        ).sort((a, b) => b[1] - a[1]);

                                        const heroes = deptCounts.slice(0, 3);
                                        const chips = deptCounts.slice(3);
                                        const total = employees.length || 1;

                                        return (
                                            <>
                                                <div className="mg-dept-heroes">
                                                    {heroes.map(([dept, count]) => (
                                                        <div key={dept} className="mg-dept-hero">
                                                            <div className="mg-hero-info">
                                                                <h5>{dept}</h5>
                                                                <small>{Math.round((count / total) * 100)}% of team</small>
                                                            </div>
                                                            <h3>{count}</h3>
                                                        </div>
                                                    ))}
                                                </div>
                                                {chips.length > 0 && (
                                                    <div className="mg-dept-chip-cloud">
                                                        {chips.map(([dept, count]) => (
                                                            <div key={dept} className="mg-dept-chip">
                                                                <span>{dept}</span>
                                                                <strong>{count}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mg-team-explorer">
                        <div className="mg-filter-shelf">
                            <div className="mg-filter-unit">
                                <label>Department</label>
                                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Gender</label>
                                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                    <option value="All">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Status</label>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                    <option value="PIP">PIP</option>
                                    <option value="Inactive Suspend">Inactive Suspend</option>
                                    <option value="Abscond">Abscond</option>
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Employment Type</label>
                                <select value={filterEmploymentCategory} onChange={(e) => setFilterEmploymentCategory(e.target.value)}>
                                    <option value="All">All Types</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Training">Trainee</option>
                                    <option value="Intern">Intern</option>
                                    <option value="Consultant">Consultant</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Confirmation Status</label>
                                <select value={filterEmploymentType} onChange={(e) => setFilterEmploymentType(e.target.value)}>
                                    <option value="All">All Status</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Probation">Probation</option>
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Sort By</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name">Name</option>
                                    <option value="id">Employee ID</option>
                                    <option value="doj">Joining Date</option>
                                </select>
                            </div>
                            
                        </div>

                        <div className="mg-member-grid">
                            {filteredEmployees.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                    <p style={{ color: '#64748b' }}>No team members match your filters.</p>
                                </div>
                            ) : (
                                filteredEmployees.map((emp, idx) => {
                                    const empId = emp.EmpID || emp.employee_code;
                                    return (
                                        <div key={idx} className="mg-member-card">
                                            <div className="mg-member-header">
                                                <div className="mg-avatar-wrap" style={{
                                                    background: emp.Gender?.toLowerCase() === 'female' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                                                    color: emp.Gender?.toLowerCase() === 'female' ? '#ec4899' : '#6366f1'
                                                }}>
                                                    <span>{emp.Name ? emp.Name.charAt(0) : "?"}</span>
                                                </div>
                                                <div className="mg-member-info">
                                                    <h4>{emp.Name || "Unknown Name"}</h4>
                                                    <p>{emp.Designation || "Role Not Assigned"}</p>
                                                </div>
                                            </div>
                                            <div style={{ padding: '15px 0', borderTop: '1px solid #f1f5f9', fontSize: '12px', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '600' }}>Employee ID</span>
                                                    <strong style={{ color: '#0f172a', fontSize: '13px' }}>{empId}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontWeight: '600' }}>Department</span>
                                                    <strong style={{ color: '#0f172a' }}>{emp.Department || "General"}</strong>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '6px',
                                                        background: (emp.Status || 'Active').toLowerCase() === 'active' ? '#ecfdf5' : '#fef2f2',
                                                        color: (emp.Status || 'Active').toLowerCase() === 'active' ? '#10b981' : '#ef4444',
                                                        fontSize: '10px', fontWeight: '800', textTransform: 'uppercase'
                                                    }}>{emp.Status || 'Active'}</span>
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '6px',
                                                        background: '#eff6ff', color: '#3b82f6',
                                                        fontSize: '10px', fontWeight: '800', textTransform: 'uppercase'
                                                    }}>{emp.ConfirmationType || 'Probation'}</span>
                                                </div>
                                            </div>
                                            <div className="mg-member-actions">
                                                <button className="mg-action-view" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }}>Detail</button>
                                                <button className="mg-action-export" onClick={() => handleExcelDownload(empId)}>Excel</button>
                                                <button className="mg-action-remove" onClick={() => deleteEmployee(empId)}>Delete</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Employee Details Modal */}
            {/* Employee Details Modal */}
            {selectedEmployee && (
                <div className="mg-modal-mask" onClick={() => setSelectedEmployee(null)}>
                    <div className="mg-modal-core animate-modal-up" onClick={e => e.stopPropagation()}>
                        <div className="mg-modal-top-bar">
                            <div className="mg-modal-header-info">
                                <div className="mg-modal-avatar">{selectedEmployee.Name?.charAt(0)}</div>
                                <div className="mg-modal-title-wrap">
                                    <h2 className="mg-modal-name">{selectedEmployee.Name}</h2>
                                    <p className="mg-modal-id">Employee ID: {selectedEmployee.EmpID}</p>
                                </div>
                            </div>
                            <button className="mg-modal-dismiss" onClick={() => setSelectedEmployee(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="mg-modal-pill-nav">
                            <button className={`mg-modal-pill-item ${detailTab === 'personal' ? 'active' : ''}`} onClick={() => setDetailTab('personal')}>Personal</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'education' ? 'active' : ''}`} onClick={() => setDetailTab('education')}>Education</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'experience' ? 'active' : ''}`} onClick={() => setDetailTab('experience')}>Experience</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'statutory' ? 'active' : ''}`} onClick={() => setDetailTab('statutory')}>Statutory</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'documents' ? 'active' : ''}`} onClick={() => setDetailTab('documents')}>Documents</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'admin' ? 'active' : ''}`} onClick={() => setDetailTab('admin')}>Admin Actions</button>
                        </div>

                        <div className="mg-modal-body">
                            {detailTab === 'personal' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Personal Details</h3>
                                    <div className="mg-profile-grid">
                                        <InfoItem label="Full Name" value={selectedEmployee.Name} />
                                        <InfoItem label="Email Address" value={selectedEmployee.Email} />
                                        <InfoItem label="Phone Number" value={selectedEmployee.Phone} />
                                        <InfoItem label="Gender" value={selectedEmployee.Gender} />
                                        <InfoItem label="Date of Birth" value={formatDate(selectedEmployee.DOB)} />
                                        <InfoItem label="Blood Group" value={selectedEmployee.BloodGroup} />
                                        <InfoItem label="Father's Name" value={selectedEmployee.FatherName} />
                                        <InfoItem label="Mother's Name" value={selectedEmployee.MotherName} />
                                        <InfoItem label="Marital Status" value={selectedEmployee.MaritalStatus} />
                                        {selectedEmployee.MaritalStatus === 'Married' && <InfoItem label="Spouse Name" value={selectedEmployee.SpouseName} />}
                                        <InfoItem label="Aadhar Number" value={selectedEmployee.AadharNumber} />
                                        <InfoItem label="PAN Number" value={selectedEmployee.PAN} />
                                        <InfoItem label="Present Address" value={selectedEmployee.PresentAddress} span={2} />
                                        <InfoItem label="Permanent Address" value={selectedEmployee.PermanentAddress} span={2} />
                                    </div>
                                </div>
                            )}

                            {detailTab === 'personal' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Professional & Emergency Info</h3>
                                    <div className="mg-profile-grid">
                                        <InfoItem label="Designation" value={selectedEmployee.Designation} />
                                        <InfoItem label="Department" value={selectedEmployee.Department} />
                                        <InfoItem label="Confirmation Status" value={selectedEmployee.ConfirmationType || "Probation"} />
                                        <InfoItem label="Employment Type" value={selectedEmployee.EmploymentType || "Regular"} />
                                        <InfoItem label="Date of Joining" value={formatDate(selectedEmployee.DateOfJoining)} />
                                        <div style={{ gridColumn: '1/-1', height: '1px', background: '#f1f5f9', margin: '10px 0' }}></div>
                                        <InfoItem label="Emergency Contact" value={selectedEmployee.EmergencyName} />
                                        <InfoItem label="Relationship" value={selectedEmployee.EmergencyRelation} />
                                        <InfoItem label="Emergency Phone" value={selectedEmployee.EmergencyPhone} />
                                    </div>
                                </div>
                            )}

                            {detailTab === 'education' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Educational Qualifications</h3>
                                    <div className="mg-profile-grid">
                                        <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Schooling (10th & 12th)</h4>
                                            <div className="mg-profile-grid">
                                                <InfoItem label="10th School" value={selectedEmployee["10thSchool"]} />
                                                <InfoItem label="10th Board" value={selectedEmployee["10thBoard"]} />
                                                <InfoItem label="10th Year" value={selectedEmployee["10thYear"]} />
                                                <InfoItem label="10th %" value={selectedEmployee["10thPercent"]} />
                                                <InfoItem label="12th School" value={selectedEmployee["12thSchool"]} />
                                                <InfoItem label="12th Board" value={selectedEmployee["12thBoard"]} />
                                                <InfoItem label="12th Year" value={selectedEmployee["12thYear"]} />
                                                <InfoItem label="12th %" value={selectedEmployee["12thPercent"]} />
                                            </div>
                                        </div>
                                        {selectedEmployee.DiplomaDegree && (
                                            <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '10px' }}>
                                                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Diploma</h4>
                                                <div className="mg-profile-grid">
                                                    <InfoItem label="Degree" value={selectedEmployee.DiplomaDegree} />
                                                    <InfoItem label="Specialization" value={selectedEmployee.DiplomaSpecialization || selectedEmployee.DiplomaSpecification} />
                                                    <InfoItem label="College" value={selectedEmployee.DiplomaCollege} />
                                                    <InfoItem label="Year of Passing" value={selectedEmployee.DiplomaYear} />
                                                    <InfoItem label="Percentage/CGPA" value={selectedEmployee.DiplomaPercent} />
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '20px', borderRadius: '16px', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Undergraduate (UG)</h4>
                                            <div className="mg-profile-grid">
                                                <InfoItem label="Degree" value={selectedEmployee.UGDegree} />
                                                <InfoItem label="Specialization" value={selectedEmployee.UGSpecification || selectedEmployee.UGSpecialization} />
                                                <InfoItem label="College" value={selectedEmployee.UGCollege} />
                                                <InfoItem label="Year of Passing" value={selectedEmployee.UGYear} />
                                                <InfoItem label="Percentage/CGPA" value={selectedEmployee.UGPercent} />
                                            </div>
                                        </div>
                                        {selectedEmployee.PGDegree && (
                                            <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
                                                <h4 style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#64748b', fontWeight: '700' }}>Postgraduate (PG)</h4>
                                                <div className="mg-profile-grid">
                                                    <InfoItem label="Degree" value={selectedEmployee.PGDegree} />
                                                    <InfoItem label="Specialization" value={selectedEmployee.PGSpecification || selectedEmployee.PGSpecialization} />
                                                    <InfoItem label="College" value={selectedEmployee.PGCollege} />
                                                    <InfoItem label="Year of Passing" value={selectedEmployee.PGYear} />
                                                    <InfoItem label="Percentage/CGPA" value={selectedEmployee.PGPercent} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'experience' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Professional Experience</h3>
                                    <div className="mg-profile-grid" style={{ marginBottom: '30px' }}>
                                        <InfoItem label="Total Experience" value={`${selectedEmployee.TotalExpYears || 0} Years ${selectedEmployee.TotalExpMonths || 0} Months`} />
                                        <InfoItem label="Career Break" value={selectedEmployee.CareerBreak} />
                                        <InfoItem label="Department" value={selectedEmployee.Department} />
                                        <InfoItem label="Designation" value={selectedEmployee.Designation} />
                                        <InfoItem label="Confirmation Status" value={selectedEmployee.ConfirmationType || "Probation"} />
                                        <InfoItem label="Employment Type" value={selectedEmployee.EmploymentType || "Regular"} />
                                        <InfoItem label="Date of Joining" value={formatDate(selectedEmployee.DateOfJoining)} />
                                    </div>
                                    <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '15px', fontWeight: '700' }}>Professional Trainings</h4>
                                    <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                                        <table className="mg-data-table">
                                            <thead>
                                                <tr>
                                                    <th>Training</th>
                                                    <th>Institute</th>
                                                    <th>Duration</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let trainings = [];
                                                    try {
                                                        const raw = selectedEmployee.Trainings;
                                                        trainings = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                                    } catch (e) { }
                                                    return trainings.length > 0 ? trainings.map((t, i) => (
                                                        <tr key={i}>
                                                            <td>{t.name || t.training_name}</td>
                                                            <td>{t.institute}</td>
                                                            <td>{t.duration || t.period || (t.StartDate && t.EndDate ? `${t.StartDate} to ${t.EndDate}` : (t.start_date && t.end_date ? `${t.start_date} to ${t.end_date}` : (t.StartDate || t.EndDate || t.start_date || t.end_date || "-")))}</td>
                                                        </tr>
                                                    )) : <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No training records found</td></tr>;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                    <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '15px', fontWeight: '700' }}>Employment History</h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="mg-data-table">
                                            <thead>
                                                <tr>
                                                    <th>Organization</th>
                                                    <th>Designation</th>
                                                    <th>Duration</th>
                                                    <th>Salary</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let history = [];
                                                    try {
                                                        const raw = selectedEmployee.EmploymentHistory || selectedEmployee.employments;
                                                        history = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                                    } catch (e) { }
                                                    return history.length > 0 ? history.map((exp, i) => (
                                                        <tr key={i}>
                                                            <td>{exp.organization}</td>
                                                            <td>{exp.designation}</td>
                                                            <td>{exp.duration || exp.period || (exp.startDate && exp.endDate ? `${exp.startDate} to ${exp.endDate}` : "-")}</td>
                                                            <td>{exp.salary}</td>
                                                        </tr>
                                                    )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No experience records</td></tr>;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                    {(() => {
                                        const hasLast = selectedEmployee.LastHrName || selectedEmployee.LastMgrName;
                                        const hasPrev = selectedEmployee.PrevHrName || selectedEmployee.PrevMgrName;

                                        if (!hasLast && !hasPrev) return null;

                                        return (
                                            <>
                                                {hasLast && (
                                                    <div style={{ marginTop: '30px' }}>
                                                        <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '15px', fontWeight: '700' }}>Professional Reference - Last Company</h4>
                                                        <div className="mg-profile-grid">
                                                            <InfoItem label="HR Name" value={selectedEmployee.LastHrName} />
                                                            <InfoItem label="HR Contact" value={selectedEmployee.LastHrContact} />
                                                            <InfoItem label="HR Email" value={selectedEmployee.LastHrEmail} />
                                                            <InfoItem label="Manager Name" value={selectedEmployee.LastMgrName} />
                                                            <InfoItem label="Manager Contact" value={selectedEmployee.LastMgrContact} />
                                                            <InfoItem label="Manager Email" value={selectedEmployee.LastMgrEmail} />
                                                        </div>
                                                    </div>
                                                )}
                                                {hasPrev && (
                                                    <div style={{ marginTop: '30px' }}>
                                                        <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '15px', fontWeight: '700' }}>Professional Reference - Previous Company</h4>
                                                        <div className="mg-profile-grid">
                                                            <InfoItem label="HR Name" value={selectedEmployee.PrevHrName} />
                                                            <InfoItem label="HR Contact" value={selectedEmployee.PrevHrContact} />
                                                            <InfoItem label="HR Email" value={selectedEmployee.PrevHrEmail} />
                                                            <InfoItem label="Manager Name" value={selectedEmployee.PrevMgrName} />
                                                            <InfoItem label="Manager Contact" value={selectedEmployee.PrevMgrContact} />
                                                            <InfoItem label="Manager Email" value={selectedEmployee.PrevMgrEmail} />
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            )}

                            {detailTab === 'statutory' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Dependent Details</h3>
                                    <div style={{ overflowX: 'auto', marginBottom: '30px' }}>
                                        <table className="mg-data-table">
                                            <thead>
                                                <tr>
                                                    <th>Name</th>
                                                    <th>Relation</th>
                                                    <th>Aadhar</th>

                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let deps = [];
                                                    try {
                                                        const raw = selectedEmployee.Dependents;
                                                        deps = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                                    } catch (e) { }
                                                    return deps.length > 0 ? deps.map((d, i) => (
                                                        <tr key={i}>
                                                            <td>{d.name}</td>
                                                            <td>{d.relation}</td>
                                                            <td>{d.aadharNumber || d.aadhar_number}</td>
                                                        </tr>
                                                    )) : <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No dependent records found</td></tr>;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                    <h3>Bank & Statutory Details</h3>
                                    <div className="mg-profile-grid">
                                        <InfoItem label="Account Holder" value={selectedEmployee.BankAccountHolder || selectedEmployee.accountHolderName} />
                                        <InfoItem label="Bank Name" value={selectedEmployee.BankName} />
                                        <InfoItem label="Account Number" value={selectedEmployee.AccountNumber} />
                                        <InfoItem label="IFSC Code" value={selectedEmployee.IFSC} />
                                        <InfoItem label="Branch" value={selectedEmployee.Branch} />
                                        <InfoItem label="UAN Number" value={selectedEmployee.UAN} />
                                        <InfoItem label="PF Number" value={selectedEmployee.PF} />
                                        <InfoItem label="ESI Number" value={selectedEmployee.ESINumber} />
                                    </div>
                                </div>
                            )}

                            {detailTab === 'documents' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <h3>Document Vault</h3>
                                    {(() => {
                                        const emp = selectedEmployee;
                                        const coreDocs = [
                                            ["Profile Photograph", emp.Photo],
                                            ["Current Resume", emp.Resume],
                                            ["Identity - Aadhar", emp.AadharFile],
                                            ["Tax Card - PAN", emp.PANFile],
                                            ["Academic - SSLC", emp.SSLC],
                                            ["Academic - HSC", emp.HSC],
                                            ["Degree Certificate", emp.DegreeCertificate],
                                            ["Diploma Certificate", emp.DiplomaCertificate],
                                            ["Post Graduation", emp.PGCertificate],
                                            ["Father's Aadhar", emp.AadharFather],
                                            ["Mother's Aadhar", emp.AadharMother],
                                            ["Experience Letter", emp.ExperienceLetter],
                                            ["Bank Passbook", emp.BankPassbook],
                                            ["Offer Letter", emp.OfferLetter],
                                            ["Latest Payslip", emp.Payslip]
                                        ];

                                        const dependentDocs = parseJSON(emp.Dependents).flatMap((dep, idx) => [
                                            [`Dep. ${idx + 1} Photo`, dep.photoUrl],
                                            [`Dep. ${idx + 1} Aadhar`, dep.aadharUrl],
                                            [`Dep. ${idx + 1} PAN`, dep.panUrl]
                                        ]).filter(doc => doc[1]);

                                        const trainingDocs = parseJSON(emp.Trainings).map((tr, idx) =>
                                            [`Training: ${tr.name}`, tr.certificateUrl]
                                        ).filter(doc => doc[1]);

                                        const allDocs = [...coreDocs, ...dependentDocs, ...trainingDocs];

                                        return (
                                            <div className="mg-credential-wall">
                                                {allDocs.map(([label, url], i) => (
                                                    <div key={i} className={`mg-credential-card ${url ? 'uploaded' : 'missing'}`}>
                                                        <div className="mg-credential-info">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                            <span>{label}</span>
                                                        </div>
                                                        <div className="mg-credential-actions">
                                                            {url ? (
                                                                <>
                                                                    <a href={getDriveDirectLink(url)} target="_blank" rel="noreferrer" className="mg-credential-link">View File</a>
                                                                    <span className="mg-status-tag valid">VERIFIED</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>File Not Found</span>
                                                                    <span className="mg-status-tag pending">PENDING</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                            {detailTab === 'admin' && (
                                <div className="mg-profile-section animate-fade-in">
                                    <AdminActionsContent
                                        employee={selectedEmployee}
                                        onUpdate={(fields) => handleUpdateStatus(selectedEmployee.EmpID || selectedEmployee.employee_code, fields)}
                                    />
                                </div>
                            )}
                        </div>

                        {detailTab === 'documents' && (
                            <div className="mg-modal-footer">
                                <button className="mg-cmd-btn" onClick={() => handleExcelDownload(selectedEmployee.EmpID)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                                    Download Excel
                                </button>
                                <button className="mg-cmd-btn" style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }} onClick={() => window.print()}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                    Print Profile
                                </button>
                                <button className="mg-cmd-btn" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }} onClick={() => deleteEmployee(selectedEmployee.EmpID)}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                    Delete Profile
                                </button>
                                <button className="mg-cmd-btn" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: 'none' }} onClick={() => setSelectedEmployee(null)}>Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Print Section (Hidden on screen, visible on print) */}
            {selectedEmployee && <PrintProfile employee={selectedEmployee} />}

            {loading && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000 }}>
                    <div className="mg-sync-pulse" style={{ background: '#059669' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Syncing data...</span>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value, span = 1 }) {
    return (
        <div className="mg-info-item" style={{ gridColumn: `span ${span}` }}>
            <label>{label}</label>
            <span>{value || "Not Provided"}</span>
        </div>
    );
}

function StatCardV2({ label, value, percentage, icon, color, onClick }) {
    const rgb = color.startsWith('#') ? hexToRgb(color) : '16, 185, 129';
    return (
        <div className="mg-stat-card" style={{ '--accent-color': color, '--accent-rgb': rgb, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div className="mg-stat-icon-wrap">
                {icon}
            </div>
            <div className="mg-stat-info">
                <span>{label}</span>
                <h3>{value}</h3>
            </div>
            {percentage !== undefined && (
                <div className="mg-stat-badge">{percentage}%</div>
            )}
        </div>
    );
}


function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        '16, 185, 129';
}

export default ManagerDashboard;