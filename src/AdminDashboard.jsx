import { useEffect, useState } from "react";
import "./admindashboard.css";
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

function AdminDashboard() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [filterDept, setFilterDept] = useState("All");
    const [filterGender, setFilterGender] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [filterEmploymentType, setFilterEmploymentType] = useState("All");
    const [detailTab, setDetailTab] = useState("personal");
    const [sortBy, setSortBy] = useState("name");
    const [uniqueDepts, setUniqueDepts] = useState([]);
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
    }, [activeTab]);

    const getUpcomingBirthdays = () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        return employees.filter(emp => {
            if (!emp.DOB && !emp.dob) return false;
            const dob = new Date(emp.DOB || emp.dob);
            return (dob.getMonth() + 1) === currentMonth;
        }).slice(0, 3);
    };

    const getWorkAnniversaries = () => {
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        return employees.filter(emp => {
            if (!emp.DateOfJoining && !emp.doj) return false;
            const doj = new Date(emp.DateOfJoining || emp.doj);
            return (doj.getMonth() + 1) === currentMonth && doj.getFullYear() < today.getFullYear();
        }).slice(0, 3);
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

            return matchesSearch && matchesDept && matchesGender && matchesStatus && matchesConfirmation;
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
        if (!window.confirm(`Admin Warning: Are you sure you want to PERMANENTLY delete employee ${empId}?`)) return;

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

    return (
        <div className="ad-portal-layout">
            {/* Sidebar Navigation */}
            <div className="ad-sidebar-strip">
                <div className="ad-logo-wrap">
                    <img src="/chn-logo.png" alt="Company Logo" />
                    <h2>Admin Panel</h2>
                </div>
                <div className="ad-nav-stack">
                    <div className={`ad-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        <span>System Overview</span>
                    </div>
                    <div className={`ad-nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Manage Records</span>
                    </div>
                </div>
                <div className="ad-nav-link" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9' }} onClick={() => navigate("/admin-login")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="ad-viewport">
                <div className="ad-top-nav">
                    <div>
                        <h1>System Command Center</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Global Administrative Control & Audit</p>
                    </div>
                    <div className="ad-action-shelf">
                        {activeTab === 'employees' && (
                            <div className="ad-search-field">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    type="text"
                                    placeholder="Search Records..."
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && searchEmployee()}
                                />
                            </div>
                        )}
                        <div className="celebration-hub">
                            <div className="hub-icon">✨</div>
                            <div className="hub-content">
                                <span className="hub-label">Global Events:</span>
                                <span className="hub-stats">
                                    <strong>{getUpcomingBirthdays().length}</strong> 🎂 •
                                    <strong>{getWorkAnniversaries().length}</strong> 🎊
                                </span>
                            </div>
                        </div>
                        <button className="ad-cmd-btn" onClick={loadEmployees} style={{ background: 'var(--ad-gradient)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Refresh System
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' ?
                    <div className="ad-grid-layout">
                        {/* Admin Global Stats */}
                        <div className="ad-stats-deck">
                            <StatCardV2
                                label="Total Workforce"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                                color="#6366f1"
                                onClick={() => setActiveTab('employees')}
                            />
                            <StatCardV2
                                label="Active Records"
                                value={employees.filter(e => !e.Status || e.Status?.toLowerCase() === 'active').length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                                color="#10b981"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('Active'); }}
                            />
                            <StatCardV2
                                label="Data Quality Score"
                                value={`${Math.round(employees.reduce((acc, curr) => acc + getProfileCompletion(curr), 0) / (employees.length || 1))}%`}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>}
                                color="#8b5cf6"
                            />
                            <StatCardV2
                                label="Critical Audits"
                                value={employees.filter(e => !e.AadharNumber || !e.PAN || !e.Photo).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                                color="#ef4444"
                            />
                        </div>

                        <div className="ad-widget-row">
                            <div className="ad-widget-box">
                                <div className="ad-widget-top">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Gender Distribution</h4>
                                </div>
                                <div className="ad-dept-list">
                                    <div className="ad-dept-row">
                                        <div className="ad-dept-label">Male</div>
                                        <div className="ad-bar-track">
                                            <div className="ad-bar-fill" style={{ width: `${(employees.filter(e => e.Gender?.toLowerCase() === 'male').length / (employees.length || 1)) * 100}%`, background: '#3b82f6' }}></div>
                                        </div>
                                        <div className="ad-bar-value">{employees.filter(e => e.Gender?.toLowerCase() === 'male').length}</div>
                                    </div>
                                    <div className="ad-dept-row">
                                        <div className="ad-dept-label">Female</div>
                                        <div className="ad-bar-track">
                                            <div className="ad-bar-fill" style={{ width: `${(employees.filter(e => e.Gender?.toLowerCase() === 'female').length / (employees.length || 1)) * 100}%`, background: '#ec4899' }}></div>
                                        </div>
                                        <div className="ad-bar-value">{employees.filter(e => e.Gender?.toLowerCase() === 'female').length}</div>
                                    </div>
                                    <div className="ad-dept-row">
                                        <div className="ad-dept-label">Not Specified</div>
                                        <div className="ad-bar-track">
                                            <div className="ad-bar-fill" style={{ width: `${(employees.filter(e => !e.Gender || e.Gender === '-').length / (employees.length || 1)) * 100}%`, background: '#94a3b8' }}></div>
                                        </div>
                                        <div className="ad-bar-value">{employees.filter(e => !e.Gender || e.Gender === '-').length}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="ad-widget-box">
                                <div className="ad-widget-top">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                    <h4>Global Department Layout</h4>
                                </div>
                                <div className="ad-dept-list overflow-auto" style={{ maxHeight: '200px' }}>
                                    {Object.entries(
                                        employees.reduce((acc, curr) => {
                                            const dept = normalizeDept(curr.Department || curr.department);
                                            if (dept && dept !== "-") {
                                                acc[dept] = (acc[dept] || 0) + 1;
                                            }
                                            return acc;
                                        }, {})
                                    )
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([dept, count]) => (
                                            <div key={dept} className="ad-dept-row">
                                                <div className="ad-dept-label">{dept}</div>
                                                <div className="ad-bar-track">
                                                    <div className="ad-bar-fill" style={{ width: `${(count / (employees.length || 1)) * 100}%` }}></div>
                                                </div>
                                                <div className="ad-bar-value">{count}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        <div className="ad-widget-row" style={{ marginTop: '20px' }}>
                            <div className="ad-widget-box" style={{ flex: 1.5 }}>
                                <div className="ad-widget-top">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    <h4>System Audit Timeline</h4>
                                </div>
                                <div className="ad-audit-log">
                                    {employees.slice(0, 5).map((emp, i) => (
                                        <div key={i} className="ad-log-entry">
                                            <div className="ad-log-bullet"></div>
                                            <div className="ad-log-body">
                                                <span>Record synced for {emp.Name}</span>
                                                <small>{formatDate(new Date())}</small>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="ad-widget-box" style={{ flex: 1 }}>
                                <div className="ad-widget-top">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                                    <h4>Experience Levels</h4>
                                </div>
                                <div className="ad-status-stack">
                                    <StatusItem label="Junior (0-2y)" count={employees.filter(e => (parseInt(e.TotalExpYears) || 0) <= 2).length} total={employees.length} color="#10b981" />
                                    <StatusItem label="Mid-Level (3-5y)" count={employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 3 && (parseInt(e.TotalExpYears) || 0) <= 5).length} total={employees.length} color="#3b82f6" />
                                    <StatusItem label="Senior (6-10y)" count={employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 6 && (parseInt(e.TotalExpYears) || 0) <= 10).length} total={employees.length} color="#f59e0b" />
                                    <StatusItem label="Expert (10y+)" count={employees.filter(e => (parseInt(e.TotalExpYears) || 0) > 10).length} total={employees.length} color="#ef4444" />
                                </div>
                            </div>
                        </div>
                    </div>
                    :
                    <div className="ad-manage-section">
                        <div className="ad-filter-bar">
                            <div className="ad-filter-unit">
                                <label>Department</label>
                                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="ad-filter-unit">
                                <label>Gender</label>
                                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                    <option value="All">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="ad-filter-unit">
                                <label>Status</label>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="All">All Status</option>
                                    <option value="Active">Active Only</option>
                                    <option value="Inactive">Inactive Only</option>
                                    <option value="PIP">PIP</option>
                                    <option value="Inactive Suspend">Inactive Suspend</option>
                                    <option value="Abscond">Abscond</option>
                                </select>
                            </div>
                            <div className="ad-filter-unit">
                                <label>Confirmation</label>
                                <select value={filterEmploymentType} onChange={(e) => setFilterEmploymentType(e.target.value)}>
                                    <option value="All">All Statuses</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Probation">Probation</option>
                                </select>
                            </div>
                            <div className="ad-filter-unit">
                                <label>Sort By</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name">Name</option>
                                    <option value="id">Employee ID</option>
                                    <option value="doj">Joining Date</option>
                                </select>
                            </div>
                            <div className="ad-filter-count">
                                Records: <strong>{filteredEmployees.length}</strong>
                            </div>
                        </div>

                        <div className="ad-card-canvas">
                            {filteredEmployees.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                    <p style={{ color: '#64748b' }}>No system records match your search criteria.</p>
                                </div>
                            ) : (
                                filteredEmployees.map((emp, idx) => {
                                    const empId = emp.EmpID || emp.employee_code;
                                    return (
                                        <div key={idx} className="ad-emp-card animate-fade-in">
                                            <div className="ad-emp-top">
                                                <div className="ad-avatar-frame">
                                                    <div className="ad-avatar-text">
                                                        <span>{emp.Name ? emp.Name.charAt(0) : "E"}</span>
                                                    </div>
                                                </div>
                                                <div className="ad-emp-info">
                                                    <h4 style={{ margin: 0, fontSize: '16px' }}>{emp.Name}</h4>
                                                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>{emp.Designation || "Team Member"}</p>
                                                </div>
                                            </div>
                                            <div className="ad-emp-mid">
                                                <div className="ad-emp-meta">
                                                    <div className="ad-meta-row">
                                                        <span className="ad-meta-key">ID:</span>
                                                        <span className="ad-meta-val">{empId}</span>
                                                    </div>
                                                    <div className="ad-meta-row">
                                                        <span className="ad-meta-key">Dept:</span>
                                                        <span className="ad-meta-val">{emp.Department || "Unassigned"}</span>
                                                    </div>
                                                </div>
                                                <div className="ad-tag-box">
                                                    <span className={`ad-tag-status ${(emp.Status || 'Active').toLowerCase()}`}>{emp.Status || 'Active'}</span>
                                                    <span className="ad-tag-type">{emp.ConfirmationType || 'Confirmed'}</span>
                                                    <span className="ad-tag-category">{emp.EmploymentType || 'regular'}</span>
                                                </div>
                                            </div>
                                            <div className="ad-emp-bottom">
                                                <button className="ad-btn-detail" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    Detail
                                                </button>
                                                <button className="ad-btn-excel" onClick={() => handleExcelDownload(empId)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                                                    Excel
                                                </button>
                                                <button className="ad-btn-remove" onClick={() => deleteEmployee(empId)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                }
            </div>

            {/* Employee Details Modal */}
            {selectedEmployee && (
                <div className="ad-modal-mask">
                    <div className="ad-modal-core">
                        <div className="ad-modal-top-bar">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div className="ad-avatar-text" style={{ width: '60px', height: '60px', background: 'rgba(255,255,255,0.2)', color: 'white' }}>{selectedEmployee.Name?.charAt(0)}</div>
                                <div>
                                    <h2 style={{ fontSize: '24px', margin: 0 }}>{selectedEmployee.Name}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '600', margin: 0 }}>ID: {selectedEmployee.EmpID}</p>
                                </div>
                            </div>
                            <button className="ad-nav-link" style={{ background: 'transparent', color: 'white', border: 'none', padding: 0 }} onClick={() => setSelectedEmployee(null)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="ad-modal-pill-nav">
                            <button className={`ad-nav-link ${detailTab === 'personal' ? 'active' : ''}`} onClick={() => setDetailTab('personal')}>Personal</button>
                            <button className={`ad-nav-link ${detailTab === 'education' ? 'active' : ''}`} onClick={() => setDetailTab('education')}>Education</button>
                            <button className={`ad-nav-link ${detailTab === 'experience' ? 'active' : ''}`} onClick={() => setDetailTab('experience')}>Experience</button>
                            <button className={`ad-nav-link ${detailTab === 'statutory' ? 'active' : ''}`} onClick={() => setDetailTab('statutory')}>Statutory</button>
                            <button className={`ad-nav-link ${detailTab === 'documents' ? 'active' : ''}`} onClick={() => setDetailTab('documents')}>Documents</button>
                        </div>

                        <div className="ad-modal-body-scroll">
                            {detailTab === 'personal' && (
                                <div className="profile-section animate-fade-in">
                                    <h3>Personal Details</h3>
                                    <div className="profile-grid">
                                        <InfoItem label="Full Name" value={selectedEmployee.Name} />
                                        <InfoItem label="Email Address" value={selectedEmployee.Email} />
                                        <InfoItem label="Phone Number" value={selectedEmployee.Phone} />
                                        <InfoItem label="Gender" value={selectedEmployee.Gender} />
                                        <InfoItem label="Date of Birth" value={formatDate(selectedEmployee.DOB)} />
                                        <InfoItem label="Blood Group" value={selectedEmployee.BloodGroup} />
                                        <InfoItem label="Father's Name" value={selectedEmployee.FatherName} />
                                        <InfoItem label="Mother's Name" value={selectedEmployee.MotherName} />
                                        <InfoItem label="Marital Status" value={selectedEmployee.MaritalStatus} />
                                        <InfoItem label="Aadhar Number" value={selectedEmployee.AadharNumber} />
                                        <InfoItem label="PAN Number" value={selectedEmployee.PAN} />
                                        <InfoItem label="Present Address" value={selectedEmployee.PresentAddress} span={2} />
                                        <InfoItem label="Permanent Address" value={selectedEmployee.PermanentAddress} span={2} />
                                    </div>
                                </div>
                            )}

                            {detailTab === 'education' && (
                                <div className="profile-section animate-fade-in">
                                    <h3>Educational Qualifications</h3>
                                    <div className="profile-grid">
                                        <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Schooling (10th & 12th)</h4>
                                            <div className="profile-grid">
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
                                        <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Undergraduate (UG)</h4>
                                            <div className="profile-grid">
                                                <InfoItem label="Degree" value={selectedEmployee.UGDegree} />
                                                <InfoItem label="Specialization" value={selectedEmployee.UGSpecialization} />
                                                <InfoItem label="College" value={selectedEmployee.UGCollege} />
                                                <InfoItem label="Year of Passing" value={selectedEmployee.UGYear} />
                                                <InfoItem label="Percentage/CGPA" value={selectedEmployee.UGPercent} />
                                            </div>
                                        </div>
                                        {selectedEmployee.PGDegree && (
                                            <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Postgraduate (PG)</h4>
                                                <div className="profile-grid">
                                                    <InfoItem label="Degree" value={selectedEmployee.PGDegree} />
                                                    <InfoItem label="Specialization" value={selectedEmployee.PGSpecialization} />
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
                                <div className="profile-section animate-fade-in">
                                    <h3>Professional Experience</h3>
                                    <div className="profile-grid" style={{ marginBottom: '20px' }}>
                                        <InfoItem label="Total Experience" value={`${selectedEmployee.TotalExpYears || 0} Years ${selectedEmployee.TotalExpMonths || 0} Months`} />
                                        <InfoItem label="Career Break" value={selectedEmployee.CareerBreak} />
                                        <InfoItem label="Department" value={selectedEmployee.Department} />
                                        <InfoItem label="Designation" value={selectedEmployee.Designation} />
                                        <InfoItem label="Confirmation Status" value={selectedEmployee.ConfirmationType || "Probation"} />
                                        <InfoItem label="Employment Type" value={selectedEmployee.EmploymentType || "regular"} />
                                        <InfoItem label="Date of Joining" value={formatDate(selectedEmployee.DateOfJoining)} />
                                    </div>
                                    <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>Employment History</h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="details-table">
                                            <thead>
                                                <tr>
                                                    <th>Organization</th>
                                                    <th>Designation</th>
                                                    <th>Period</th>
                                                    <th>Salary</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(() => {
                                                    let history = [];
                                                    try {
                                                        history = typeof selectedEmployee.EmploymentHistory === 'string'
                                                            ? JSON.parse(selectedEmployee.EmploymentHistory)
                                                            : selectedEmployee.EmploymentHistory || [];
                                                    } catch (e) { }
                                                    return history.length > 0 ? history.map((exp, i) => (
                                                        <tr key={i}>
                                                            <td>{exp.organization}</td>
                                                            <td>{exp.designation}</td>
                                                            <td>{exp.period}</td>
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
                                                    <div className="profile-section" style={{ marginTop: '20px' }}>
                                                        <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>Professional Reference - Last Company</h4>
                                                        <div className="profile-grid">
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
                                                    <div className="profile-section" style={{ marginTop: '20px' }}>
                                                        <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>Professional Reference - Previous Company</h4>
                                                        <div className="profile-grid">
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
                                <div className="profile-section animate-fade-in">
                                    <h3>Bank & Statutory Details</h3>
                                    <div className="profile-grid">
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
                                <div className="profile-section animate-fade-in">
                                    <h3>Document Verification</h3>
                                    {(() => {
                                        const emp = selectedEmployee;
                                        const coreDocs = [
                                            ["Photo", emp.Photo],
                                            ["Resume", emp.Resume],
                                            ["Aadhar Card", emp.AadharFile],
                                            ["PAN Card", emp.PANFile],
                                            ["10th Certificate", emp.SSLC],
                                            ["12th Certificate", emp.HSC],
                                            ["UG Certificate", emp.DegreeCertificate],
                                            ["Diploma Certificate", emp.DiplomaCertificate],
                                            ["PG Certificate", emp.PGCertificate],
                                            ["Father's Aadhar", emp.AadharFather],
                                            ["Mother's Aadhar", emp.AadharMother],
                                            ["Exp/Relieving Letter", emp.ExperienceLetter],
                                            ["Bank Passbook", emp.BankPassbook],
                                            ["Offer Letter", emp.OfferLetter],
                                            ["Payslip", emp.Payslip]
                                        ];

                                        const dependentDocs = parseJSON(emp.Dependents).flatMap((dep, idx) => [
                                            [`Dep. ${idx+1} Photo`, dep.photoUrl],
                                            [`Dep. ${idx+1} Aadhar`, dep.aadharUrl],
                                            [`Dep. ${idx+1} PAN`, dep.panUrl]
                                        ]).filter(doc => doc[1]);

                                        const trainingDocs = parseJSON(emp.Trainings).map((tr, idx) => 
                                            [`Training: ${tr.name}`, tr.certificateUrl]
                                        ).filter(doc => doc[1]);

                                        const allDocs = [...coreDocs, ...dependentDocs, ...trainingDocs];

                                        return (
                                            <div className="doc-grid">
                                                {allDocs.map(([label, url], i) => (
                                                    <div key={i} className={`doc-status-card ${url ? 'uploaded' : 'missing'}`}>
                                                        <div className="doc-info">
                                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                            <span>{label}</span>
                                                        </div>
                                                        {url ? <a href={url} target="_blank" rel="noreferrer" className="doc-view-link">View</a> : <span className="doc-missing-text">None</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>

                        <div className="ad-modal-footer">
                            <button className="ad-cmd-btn" onClick={() => handleExcelDownload(selectedEmployee.EmpID)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                                Download Excel
                            </button>
                            <button className="ad-cmd-btn" style={{ background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' }} onClick={() => window.print()}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                                Print Profile
                            </button>
                            <button className="ad-cmd-btn" style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }} onClick={() => deleteEmployee(selectedEmployee.EmpID)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Delete Profile
                            </button>
                            <button className="ad-cmd-btn" style={{ background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', boxShadow: 'none' }} onClick={() => setSelectedEmployee(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Section (Hidden on screen, visible on print) */}
            {selectedEmployee && <PrintProfile employee={selectedEmployee} />}

            {loading && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000 }}>
                    <div className="loader-dot" style={{ background: 'var(--ad-primary)', width: '10px', height: '10px', borderRadius: '50%' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>System Syncing...</span>
                </div>
            )}
        </div>
    );
}

function InfoItem({ label, value, span = 1 }) {
    return (
        <div className="ad-meta-row" style={{ gridColumn: `span ${span}`, flexDirection: 'column', alignItems: 'flex-start', gap: '5px', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#64748b' }}>{label}</label>
            <span style={{ fontSize: '15px', fontWeight: '600', color: '#1e1b4b' }}>{value || "Not Provided"}</span>
        </div>
    );
}

function StatCardV2({ label, value, percentage, icon, color, onClick }) {
    const rgb = color.startsWith('#') ? hexToRgb(color) : '99, 102, 241';
    return (
        <div className="ad-stat-box" style={{ '--accent-color': color, '--accent-rgb': rgb, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div className="ad-stat-icon" style={{ backgroundColor: `rgba(${rgb}, 0.1)`, color: color }}>
                {icon}
            </div>
            <div className="ad-stat-data">
                <span>{label}</span>
                <h3>{value}</h3>
            </div>
            {percentage !== undefined && (
                <div className="ad-stat-tag">{percentage}%</div>
            )}
        </div>
    );
}

function StatusItem({ label, count, total, color }) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="ad-status-record">
            <div className="ad-status-header">
                <div className="ad-status-led" style={{ backgroundColor: color }}></div>
                <div className="ad-status-title">{label}</div>
            </div>
            <div className="ad-bar-track" style={{ marginTop: '8px', marginBottom: '4px' }}>
                <div className="ad-bar-fill" style={{ width: `${percent}%`, background: color }}></div>
            </div>
            <div className="ad-bar-value" style={{ fontSize: '12px' }}>{count}</div>
        </div>
    );
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        '79, 70, 229';
}

export default AdminDashboard;