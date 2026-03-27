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
    }, []);

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

            const empEmploymentType = emp.EmploymentType || emp.employmentType;
            const matchesEmployment = filterEmploymentType === "All" || (() => {
                if (empEmploymentType) return (empEmploymentType.toLowerCase() === filterEmploymentType.toLowerCase());
                const doj = new Date(emp.DateOfJoining || emp.doj);
                const threeMonthsAgo = new Date();
                threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                const isProbation = doj > threeMonthsAgo;
                return (filterEmploymentType === "Probation" && isProbation) || (filterEmploymentType === "Permanent" && !isProbation);
            })();

            return matchesSearch && matchesDept && matchesGender && matchesStatus && matchesEmployment;
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

    return (
        <div className="mg-portal-container">
            {/* Sidebar Navigation */}
            <div className="mg-side-panel">
                <div className="mg-brand-section">
                    <img src="/chn-logo.png" alt="Company Logo" />
                    <h2>Manager Portal</h2>
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
                        {activeTab === 'employees' && (
                            <div className="mg-search-box-wrapper">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    type="text"
                                    placeholder="Search Team..."
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && searchEmployee()}
                                />
                            </div>
                        )}
                        <div className="mg-event-indicator">
                            <div className="mg-event-emoji">🎊</div>
                            <div className="mg-event-text">
                                <span className="mg-event-label">Team Events This Month:</span>
                                <span className="mg-event-stats">
                                    <strong>{getUpcomingBirthdays().length}</strong> Birthdays • 
                                    <strong>{getWorkAnniversaries().length}</strong> Anniversaries
                                </span>
                            </div>
                        </div>
                        <button className="mg-primary-action-btn" onClick={loadEmployees} style={{ background: 'var(--manager-gradient)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            Sync Team
                        </button>
                    </div>
                </div>

                {activeTab === 'dashboard' ?
                    <div className="mg-dashboard-body">
                        {/* Manager Stats Grid */}
                        <div className="mg-insights-grid">
                            <StatCardV2
                                label="Total Team Size"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                                color="#059669"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('All'); }}
                            />
                            <StatCardV2
                                label="Active Employees"
                                value={employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                                color="#10b981"
                                percentage={employees.length > 0 ? Math.round((employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length / employees.length) * 100) : 0}
                                onClick={() => { setActiveTab('employees'); setFilterStatus('Active'); }}
                            />
                            <StatCardV2
                                label="Data Quality"
                                value={`${employees.length > 0 ? Math.round(employees.reduce((acc, e) => acc + getProfileCompletion(e), 0) / employees.length) : 0}%`}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M9 20v-10M15 20v-2M18 20V4M6 20v-4"></path></svg>}
                                color="#6366f1"
                            />
                            <StatCardV2
                                label="Hiring Velocity"
                                value={employees.filter(e => {
                                    const joinDate = new Date(e.DateOfJoining || e.doj);
                                    const thirtyDaysAgo = new Date();
                                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                    return joinDate >= thirtyDaysAgo;
                                }).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>}
                                color="#f59e0b"
                            />
                        </div>

                        <div className="mg-widget-row">
                            <div className="mg-widget-panel">
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Workforce Tenancy</h4>
                                </div>
                                <div className="mg-data-list">
                                    <div className="mg-data-row">
                                        <div className="mg-data-label">Freshers</div>
                                        <div className="mg-progress-track">
                                            <div className="mg-progress-bar" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) === 0).length / (employees.length || 1)) * 100}%`, background: '#10b981' }}></div>
                                        </div>
                                        <div className="mg-data-value">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) === 0).length}</div>
                                    </div>
                                    <div className="mg-data-row">
                                        <div className="mg-data-label">1-3 Years</div>
                                        <div className="mg-progress-track">
                                            <div className="mg-progress-bar" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3).length / (employees.length || 1)) * 100}%`, background: '#3b82f6' }}></div>
                                        </div>
                                        <div className="mg-data-value">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3).length}</div>
                                    </div>
                                    <div className="mg-data-row">
                                        <div className="mg-data-label">4-7 Years</div>
                                        <div className="mg-progress-track">
                                            <div className="mg-progress-bar" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7).length / (employees.length || 1)) * 100}%`, background: '#f59e0b' }}></div>
                                        </div>
                                        <div className="mg-data-value">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7).length}</div>
                                    </div>
                                    <div className="mg-data-row">
                                        <div className="mg-data-label">8+ Years</div>
                                        <div className="mg-progress-track">
                                            <div className="mg-progress-bar" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 8).length / (employees.length || 1)) * 100}%`, background: '#ef4444' }}></div>
                                        </div>
                                        <div className="mg-data-value">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 8).length}</div>
                                    </div>
                                </div>
                            </div>


                            <div className="mg-widget-panel">
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <h4>Team Demographics</h4>
                                </div>
                                <div className="mg-status-set">
                                    <StatusItem label="UG Graduates" count={employees.filter(e => e.UGDegree).length} total={employees.length} color="#3b82f6" />
                                    <StatusItem label="PG Graduates" count={employees.filter(e => e.PGDegree).length} total={employees.length} color="#6366f1" />
                                    <StatusItem label="ESI Active" count={employees.filter(e => e.ESIApplicable?.toLowerCase() === 'yes' || e.esiNumber).length} total={employees.length} color="#10b981" />
                                    <StatusItem label="Married" count={employees.filter(e => e.MaritalStatus?.toLowerCase() === 'married' || e.maritalStatus?.toLowerCase() === 'married').length} total={employees.length} color="#ec4899" />
                                </div>
                            </div>
                        </div>

                        {/* Upcoming Events Widget */}
                        <div className="mg-widget-row" style={{ marginTop: '20px' }}>
                            <div className="mg-widget-panel" style={{ flex: 1 }}>
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    <h4>Upcoming Celebrations</h4>
                                </div>
                                <div className="mg-celebration-list">
                                    {[...getUpcomingBirthdays(), ...getWorkAnniversaries()].length > 0 ? (
                                        <>
                                            {getUpcomingBirthdays().map((emp, i) => (
                                                <div key={`b-${i}`} className="mg-celebration-row">
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
                                            {getWorkAnniversaries().map((emp, i) => (
                                                <div key={`a-${i}`} className="mg-celebration-row">
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
                                    ) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No celebrations this month</p>}
                                </div>
                            </div>
                            <div className="mg-widget-panel" style={{ flex: 1.5 }}>
                                <div className="mg-widget-title-area">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                    <h4>Department Breakdown</h4>
                                </div>
                                <div className="mg-data-list">
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
                                        .map(([dept, count]) => (
                                            <div key={dept} className="mg-data-row">
                                                <div className="mg-data-label">{dept}</div>
                                                <div className="mg-progress-track">
                                                    <div className="mg-progress-bar" style={{ width: `${(count / (employees.length || 1)) * 100}%` }}></div>
                                                </div>
                                                <div className="mg-data-value">{count}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    :
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
                                    <option value="Active">Active Only</option>
                                    <option value="Inactive">Inactive Only</option>
                                    <option value="PIP">PIP</option>
                                    <option value="Inactive Suspend">Inactive Suspend</option>
                                    <option value="Abscond">Abscond</option>
                                </select>
                            </div>
                            <div className="mg-filter-unit">
                                <label>Confirmation</label>
                                <select value={filterEmploymentType} onChange={(e) => setFilterEmploymentType(e.target.value)}>
                                    <option value="All">All Types</option>
                                    <option value="Permanent">Confirmed</option>
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
                            <div className="mg-filter-summary">
                                Team: <strong>{filteredEmployees.length}</strong>
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
                                        <div key={idx} className="mg-member-card animate-fade-in">
                                            <div className="mg-member-header">
                                                <div className="mg-avatar-wrap">
                                                    <div className="mg-avatar-text">
                                                        <span>{emp.Name ? emp.Name.charAt(0) : "E"}</span>
                                                    </div>
                                                </div>
                                                <div className="mg-member-info">
                                                    <h4>{emp.Name}</h4>
                                                    <p>{emp.Designation || "Team Member"}</p>
                                                </div>
                                            </div>
                                            <div className="mg-member-body">
                                                <div className="mg-member-stats">
                                                    <div className="mg-stat-bit">
                                                        <span className="mg-stat-label">ID:</span>
                                                        <span className="mg-stat-data">{empId}</span>
                                                    </div>
                                                    <div className="mg-stat-bit">
                                                        <span className="mg-stat-label">Dept:</span>
                                                        <span className="mg-stat-data">{emp.Department || "Unassigned"}</span>
                                                    </div>
                                                </div>
                                                <div className="mg-tag-cloud">
                                                    <span className={`mg-pill-status ${(emp.Status || 'Active').toLowerCase()}`}>{emp.Status || 'Active'}</span>
                                                    <span className="mg-pill-type">{emp.EmploymentType || 'Confirmed'}</span>
                                                </div>
                                            </div>
                                            <div className="mg-member-actions" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                                                <button className="mg-action-view" onClick={() => { setSelectedEmployee(emp); setDetailTab("personal"); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                    Detail
                                                </button>
                                                <button className="mg-action-export" onClick={() => handleExcelDownload(empId)}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                                                    Excel
                                                </button>
                                                <button className="mg-action-remove" onClick={() => deleteEmployee(empId)}>
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
            {/* Employee Details Modal */}
            {selectedEmployee && (
                <div className="mg-modal-mask" onClick={() => setSelectedEmployee(null)}>
                    <div className="mg-modal-core animate-modal-up" onClick={e => e.stopPropagation()}>
                        <div className="mg-modal-top-bar" style={{ background: 'var(--manager-gradient)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div className="mg-modal-avatar">{selectedEmployee.Name?.charAt(0)}</div>
                                <div>
                                    <h2 style={{ fontSize: '24px', margin: 0, color: 'white' }}>{selectedEmployee.Name}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', margin: 0 }}>ID: {selectedEmployee.EmpID}</p>
                                </div>
                            </div>
                            <button className="mg-modal-dismiss" onClick={() => setSelectedEmployee(null)}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

                        <div className="mg-modal-pill-nav">
                            <button className={`mg-modal-pill-item ${detailTab === 'personal' ? 'active' : ''}`} onClick={() => setDetailTab('personal')}>Personal</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'education' ? 'active' : ''}`} onClick={() => setDetailTab('education')}>Education</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'experience' ? 'active' : ''}`} onClick={() => setDetailTab('experience')}>Experience</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'statutory' ? 'active' : ''}`} onClick={() => setDetailTab('statutory')}>Statutory</button>
                            <button className={`mg-modal-pill-item ${detailTab === 'documents' ? 'active' : ''}`} onClick={() => setDetailTab('documents')}>Documents</button>
                        </div>

                        <div className="mg-modal-body-scroll">
                            {detailTab === 'personal' && (
                                <div className="mg-detail-section animate-fade-in">
                                    <h3>Personal Details</h3>
                                    <div className="mg-detail-grid">
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
                                <div className="mg-detail-section animate-fade-in">
                                    <h3>Educational Qualifications</h3>
                                    <div className="mg-detail-grid">
                                        <div style={{ gridColumn: '1/-1', background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '10px' }}>
                                            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#475569' }}>Schooling (10th & 12th)</h4>
                                            <div className="mg-detail-grid">
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
                                            <div className="mg-detail-grid">
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
                                                <div className="mg-detail-grid">
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
                                <div className="mg-detail-section animate-fade-in">
                                    <h3>Professional Experience</h3>
                                    <div className="mg-detail-grid" style={{ marginBottom: '20px' }}>
                                        <InfoItem label="Total Experience" value={`${selectedEmployee.TotalExpYears || 0} Years ${selectedEmployee.TotalExpMonths || 0} Months`} />
                                        <InfoItem label="Career Break" value={selectedEmployee.CareerBreak} />
                                        <InfoItem label="Department" value={selectedEmployee.Department} />
                                        <InfoItem label="Designation" value={selectedEmployee.Designation} />
                                        <InfoItem label="Date of Joining" value={formatDate(selectedEmployee.DateOfJoining)} />
                                    </div>
                                    <h4 style={{ fontSize: '14px', color: '#475569', marginBottom: '10px' }}>Employment History</h4>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="mg-data-table">
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
                                                        const raw = selectedEmployee.EmploymentHistory || selectedEmployee.employments;
                                                        history = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                                    } catch (e) { }
                                                    return history.length > 0 ? history.map((exp, i) => (
                                                        <tr key={i}>
                                                            <td>{exp.organization}</td>
                                                            <td>{exp.designation}</td>
                                                            <td>{exp.period || (exp.startDate ? `${exp.startDate} to ${exp.endDate}` : "-")}</td>
                                                            <td>{exp.salary}</td>
                                                        </tr>
                                                    )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No experience records</td></tr>;
                                                })()}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {detailTab === 'statutory' && (
                                <div className="mg-detail-section animate-fade-in">
                                    <h3>Bank & Statutory Details</h3>
                                    <div className="mg-detail-grid">
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
                                <div className="mg-detail-section animate-fade-in">
                                    <h3>Document Verification</h3>
                                    <div className="mg-credential-wall">
                                        {[
                                            ["Photo", selectedEmployee.Photo],
                                            ["Resume", selectedEmployee.Resume],
                                            ["Aadhar Card", selectedEmployee.AadharFile],
                                            ["PAN Card", selectedEmployee.PANFile],
                                            ["10th Certificate", selectedEmployee.SSLC],
                                            ["12th Certificate", selectedEmployee.HSC],
                                            ["UG Certificate", selectedEmployee.DegreeCertificate],
                                            ["Relieving Letter", selectedEmployee.RelievingLetter || selectedEmployee.Relieving_Letter],
                                            ["Bank Passbook", selectedEmployee.BankPassbook]
                                        ].map(([label, url], i) => (
                                            <div key={i} className={`mg-credential-card ${url ? 'uploaded' : 'missing'}`}>
                                                <div className="mg-credential-info">
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                                    <span>{label}</span>
                                                </div>
                                                {url ? <a href={url} target="_blank" rel="noreferrer" className="mg-credential-link">View</a> : <span className="mg-credential-empty">None</span>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

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
        <div className="mg-detail-item" style={{ gridColumn: `span ${span}` }}>
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

function StatusItem({ label, count, total, color }) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="mg-status-row">
            <div className="mg-status-label-wrap">
                <div className="mg-status-indicator" style={{ '--dot-color': color }}></div>
                <div className="mg-status-label">{label}</div>
            </div>
            <div className="mg-progress-bg">
                <div className="mg-progress-fill" style={{ width: `${percent}%`, background: color }}></div>
            </div>
            <div className="mg-progress-val">{count}</div>
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