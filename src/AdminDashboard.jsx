import { useEffect, useState, useMemo, useRef } from "react";
import "./admindashboard.css";
import { useNavigate } from "react-router-dom";
import PrintProfile from "./PrintProfile";
import "./print.css";
import "./managerdashboard.css";
import ShiftMapModal from "./ShiftMapModal";

import { renderAsync } from "docx-preview";
import JSZip from "jszip";

// Required for docx-preview to work correctly
window.JSZip = JSZip;

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
    } catch { return dateString; }
};

const formatTime = (timeString) => {
    if (!timeString) return "-";
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return timeString;
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
    } catch { return timeString; }
};

const isLate = (timeString) => {
    if (!timeString) return false;
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return false;
        const hours = date.getHours();
        const minutes = date.getMinutes();
        // Shift starts at 9:30 + 10 min grace = 9:40 AM
        return (hours > 9) || (hours === 9 && minutes > 40);
    } catch { return false; }
};

const isEarly = (timeString) => {
    if (!timeString) return false;
    try {
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return false;
        const hours = date.getHours();
        const minutes = date.getMinutes();
        // Shift ends at 06:30 PM (18:30)
        return (hours < 18) || (hours === 18 && minutes < 30);
    } catch { return false; }
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
    try { return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString; }
    catch { return []; }
};

function AdminActionsContent({ employee, onUpdate }) {
    const [status, setStatus] = useState(employee.Status || "Active");
    const [empType, setEmpType] = useState(employee.EmploymentType || "regular");
    const [confType, setConfType] = useState(employee.ConfirmationType || (new Date(employee.DateOfJoining || employee.doj) > new Date(new Date().setMonth(new Date().getMonth() - 3)) ? "Probation" : "Permanent"));

    return (
        <div className="ad-oversight-card animate-fade-in">
            <div className="ad-oversight-header">
                <div className="ad-oversight-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div className="ad-oversight-title-wrap">
                    <h3>Administrative Oversight</h3>
                    <p>Manually override system record status and employment terms. Changes are synchronized across the global registry instantly.</p>
                </div>
            </div>

            <div className="ad-oversight-grid">
                <div className="ad-input-field">
                    <label>Record Status</label>
                    <select className="ad-admin-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="PIP">PIP (Performance Improvement)</option>
                        <option value="Inactive Suspend">Inactive - Suspended</option>
                        <option value="Abscond">Absconded</option>
                    </select>
                </div>
                <div className="ad-input-field">
                    <label>Employment Type</label>
                    <select className="ad-admin-select" value={empType} onChange={(e) => setEmpType(e.target.value)}>
                        <option value="regular">Regular</option>
                        <option value="contract">Contract</option>
                        <option value="training">Training</option>
                        <option value="intern">Intern</option>
                        <option value="consultant">Consultant</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div className="ad-input-field" style={{ opacity: empType === "regular" ? 1 : 0.4 }}>
                    <label>Confirmation State</label>
                    <select className="ad-admin-select" value={confType} onChange={(e) => setConfType(e.target.value)} disabled={empType !== "regular"}>
                        <option value="Probation">Probation</option>
                        <option value="Permanent">Permanent/Confirmed</option>
                    </select>
                </div>
            </div>

            <div className="ad-oversight-footer">
                <button
                    className="ad-apply-btn"
                    onClick={() => onUpdate({ Status: status, EmploymentType: empType, ConfirmationType: confType })}
                >
                    Apply System Update
                </button>
            </div>
        </div>
    );
}

function AdminUsersContent() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', role: 'Manager' });

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getAdminUsers`);
            const data = await res.json();
            if (data.status === "success") setUsers(data.users || []);
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!newUser.email || !newUser.password) return alert("All fields required");
        setLoading(true);
        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: new URLSearchParams({ ...newUser, action: "manageAdminUser" })
            });
            const data = await res.json();
            if (data.status === "success") {
                alert(data.message);
                setNewUser({ email: '', password: '', role: 'Manager' });
                fetchUsers();
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleDelete = async (email) => {
        if (!window.confirm(`Remove access for ${email}?`)) return;
        setLoading(true);
        try {
            const res = await fetch(SCRIPT_URL, {
                method: "POST",
                body: new URLSearchParams({ email, action: "manageAdminUser", subAction: "delete" })
            });
            const data = await res.json();
            if (data.status === "success") fetchUsers();
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    return (
        <div className="ad-oversight-card animate-fade-in" style={{ maxWidth: '900px' }}>
            <div className="ad-oversight-header">
                <div className="ad-oversight-icon" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                </div>
                <div className="ad-oversight-title-wrap">
                    <h3>Administrative Access Control</h3>
                    <p>Manage login credentials for authorized Manager and HR personnel. These users will have access to their respective dashboards.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="ad-oversight-grid" style={{ marginBottom: '30px', borderBottom: '1px solid #f1f5f9', paddingBottom: '25px' }}>
                <div className="ad-input-field">
                    <label>Email Address</label>
                    <input
                        className="ad-admin-select" // Reusing select styling for input
                        style={{ padding: '0 15px', height: '42px' }}
                        type="email"
                        placeholder="user@company.com"
                        value={newUser.email}
                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    />
                </div>
                <div className="ad-input-field">
                    <label>Password</label>
                    <input
                        className="ad-admin-select"
                        style={{ padding: '0 15px', height: '42px' }}
                        type="password"
                        placeholder="••••••••"
                        value={newUser.password}
                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    />
                </div>
                <div className="ad-input-field">
                    <label>Assigned Role</label>
                    <select className="ad-admin-select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                        <option value="Manager">Manager</option>
                        <option value="HR">HR Staff</option>
                    </select>
                </div>
                <div className="ad-input-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button type="submit" className="ad-apply-btn" style={{ width: '100%', margin: 0 }}>Grant Access</button>
                </div>
            </form>

            <div className="ad-table-wrapper">
                <table className="mg-data-table">
                    <thead>
                        <tr>
                            <th>Administrative Email</th>
                            <th>Role</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, idx) => (
                            <tr key={idx}>
                                <td style={{ fontWeight: '600', color: '#0f172a' }}>{user.email}</td>
                                <td>
                                    <span className={`ad-status-tag ${user.role === 'HR' ? 'active' : 'pip'}`} style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                                        {user.role}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button
                                        onClick={() => handleDelete(user.email)}
                                        style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '13px' }}
                                    >
                                        Revoke Access
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && !loading && (
                            <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No additional administrative users found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            {loading && <div style={{ textAlign: 'center', padding: '20px', color: '#6366f1' }}>Processing...</div>}
        </div>
    );
}

function AdminDashboard() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const [filterDept, setFilterDept] = useState("All");
    const [filterStatus, setFilterStatus] = useState("All");
    const [sortBy, setSortBy] = useState("name");
    const [detailTab, setDetailTab] = useState("personal");
    const [viewingDoc, setViewingDoc] = useState(null);
    const [policies, setPolicies] = useState([]);
    const [globalAttendance, setGlobalAttendance] = useState([]);
    const [attStartDate, setAttStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [attEndDate, setAttEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [attFilterDept, setAttFilterDept] = useState("All");
    const [attFilterStatus, setAttFilterStatus] = useState("All");
    const [selectedTrail, setSelectedTrail] = useState(null);
    const [isTrailModalOpen, setIsTrailModalOpen] = useState(false);

    const loadEmployeeTrail = async (empId, date) => {
        try {
            setLoading(true);
            const res = await fetch(`${SCRIPT_URL}?action=getEmployeeTrail&empId=${empId}&date=${date}`);
            const data = await res.json();
            if (data.status === "success" && data.trail && data.trail.length > 0) {
                setSelectedTrail({ empId, date, points: data.trail });
                setIsTrailModalOpen(true);
            } else {
                alert("No movement history found for this shift.");
            }
        } catch (err) {
            console.error("Error loading trail:", err);
            alert("Failed to load movement history.");
        } finally {
            setLoading(false);
        }
    };

    const navigate = useNavigate();

    const normalizeDept = (dept) => {
        if (!dept) return "";
        const name = dept.trim();
        return (name === "HRD" ? "HR" : (name === "Management" ? "Admin" : name));
    };

    const loadEmployees = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${SCRIPT_URL}?action=getAllEmployees`);
            const data = await res.json();
            if (data.status === "success") {
                setEmployees(data.employees || []);
                localStorage.setItem("employee_cache", JSON.stringify(data.employees || []));
            }
            setLoading(false);
        } catch (err) { console.error(err); setLoading(false); }
    };

    const loadPolicies = async () => {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getHRPolicies`);
            const data = await res.json();
            if (data.status === "success" && data.policies) {
                setPolicies(data.policies.map(p => ({
                    ...p,
                    fileId: p.id 
                })));
            }
        } catch (err) {
            console.error("Error loading policies:", err);
            setPolicies([
                { label: "Travel Policy", viewUrl: "/Hrpolicy/Travel Policy_Final.docx", downloadUrl: "/Hrpolicy/Travel Policy_Final.docx", description: "Guidelines for official travel, expenses, and trip reimbursements" }
            ]);
        }
    };    const loadGlobalAttendance = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${SCRIPT_URL}?action=getGlobalAttendance`);
            const data = await res.json();
            if (data.status === "success") {
                const rawAtt = data.attendance || [];
                const normalized = rawAtt.map(a => ({
                    empId: a.empid || a.empId || a.EmplID || a.employee_code || (a.EmployeeID ? a.EmployeeID.toString() : ""),
                    date: a.date || a.Date,
                    inTime: a.intime || a.inTime || a.InTime,
                    outTime: a.outtime || a.outTime || a.OutTime,
                    status: a.status || a.Status,
                    location: a.inlocation || a.location || a.InLocation || a.Location
                }));
                setGlobalAttendance(normalized);
            }
        } catch (err) {
            console.error("Error loading global attendance:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEmployees();
        loadPolicies();
        loadGlobalAttendance();
        const intv = setInterval(() => {
            loadEmployees();
            loadPolicies();
            loadGlobalAttendance();
        }, 15000);
        return () => clearInterval(intv);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filteredEmployees = useMemo(() => {
        return employees
            .filter(emp => {
                const matchesSearch = (emp.EmpID || emp.employee_code || "").toString().includes(searchId) ||
                    (emp.Name || "").toLowerCase().includes(searchId.toLowerCase());
                const matchesDept = filterDept === "All" || normalizeDept(emp.Department || emp.department) === filterDept;
                const matchesStatus = filterStatus === "All" || (emp.Status || 'Active').toLowerCase() === filterStatus.toLowerCase();
                return matchesSearch && matchesDept && matchesStatus;
            })
            .sort((a, b) => {
                if (sortBy === "name") return (a.Name || "").localeCompare(b.Name || "");
                if (sortBy === "id") return (a.EmpID || "").toString().localeCompare((b.EmpID || "").toString(), undefined, { numeric: true });
                if (sortBy === "doj") return new Date(a.DateOfJoining || a.doj) - new Date(b.DateOfJoining || b.doj);
                return 0;
            });
    }, [employees, searchId, filterDept, filterStatus, sortBy]);

    const stats = useMemo(() => {
        const total = employees.length;
        const active = employees.filter(e => !e.Status || e.Status === 'Active').length;
        const critical = employees.filter(e => !e.AadharNumber || !e.PAN || !e.Photo).length;
        return { total, active, critical };
    }, [employees]);

    const depts = useMemo(() => ["All", ...new Set(employees.map(e => normalizeDept(e.Department || e.department)).filter(d => d && d !== "-"))], [employees]);

    const deleteEmployee = async (empId) => {
        if (!window.confirm(`Admin Alert: Permanently delete record ${empId}?`)) return;
        setLoading(true);
        try {
            const res = await fetch(`${SCRIPT_URL}?action=deleteEmployee&empId=${empId}`);
            const data = await res.json();
            if (data.status === "success") { loadEmployees(); setSelectedEmployee(null); }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const handleUpdateStatus = async (empId, fields) => {
        try {
            setLoading(true);
            const formData = new URLSearchParams();
            formData.append("action", "updateEmployee");
            formData.append("empId", empId);
            Object.keys(fields).forEach(key => formData.append(key, fields[key]));

            const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
            const data = await res.json();
            if (data.status === "success") {
                alert("System record updated");
                loadEmployees();
                if (selectedEmployee && (selectedEmployee.EmpID || selectedEmployee.employee_code) === empId) {
                    setSelectedEmployee({ ...selectedEmployee, ...fields });
                }
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

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

    const exportAttendanceCSV = () => {
        const filtered = globalAttendance.filter(a => {
            const matchesDate = a.date >= attStartDate && a.date <= attEndDate;
            const emp = employees.find(e => (e.EmpID || e.employee_code) === a.empId);
            const matchesDept = attFilterDept === "All" || (emp && normalizeDept(emp.Department) === attFilterDept);
            return matchesDate && matchesDept;
        });

        if (filtered.length === 0) return alert("No data to export for selected filters");

        const headers = ["Date", "Employee ID", "Name", "Department", "In Time", "Out Time", "Status", "Location"];
        const rows = filtered.map(a => {
            const emp = employees.find(e => (e.EmpID || e.employee_code) === a.empId);
            return [
                a.date,
                a.empId,
                emp?.Name || "N/A",
                emp ? normalizeDept(emp.Department) : "N/A",
                a.inTime || "-",
                a.outTime || "-",
                a.status,
                a.location || "-"
            ];
        });

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", `attendance_report_${attStartDate}_to_${attEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="ad-portal-container">
            <div className="ad-side-panel">
                <div className="ad-brand-section">
                    <img src="/chn-logo.png" alt="Logo" />
                    {/* <h2>Admin Portal</h2> */}
                </div>
                <div className="ad-nav-group">
                    <div className={`ad-nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        <span>System Overview</span>
                    </div>
                    <div className={`ad-nav-link ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Manage Records</span>
                    </div>
                    <div className={`ad-nav-link ${activeTab === 'access' ? 'active' : ''}`} onClick={() => setActiveTab('access')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                        <span>System Access</span>
                    </div>
                    <div className={`ad-nav-link ${activeTab === 'hrbook' ? 'active' : ''}`} onClick={() => setActiveTab('hrbook')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        <span>HR Book</span>
                    </div>
                    <div className={`ad-nav-link ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="3"></circle></svg>
                        <span>Global Attendance</span>
                    </div>
                </div>
                <div className="ad-nav-link ad-logout-btn" onClick={() => navigate("/admin-login")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            <div className="ad-main-view">
                <div className="ad-page-header">
                    <div>
                        <h1>System Command</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Administrative oversight & global record management</p>
                    </div>
                    <div className="ad-header-actions">
                        <button className="ad-primary-action-btn" onClick={loadEmployees}>Refresh System</button>
                    </div>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="animate-fade-in">
                        <div className="ad-stats-grid">
                            <StatCard label="Total Workforce" value={stats.total} color="#6366f1" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>} />
                            <StatCard label="Active Records" value={stats.active} color="#10b981" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>} />
                            <StatCard label="Critical Audit" value={stats.critical} color="#ef4444" icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line></svg>} />
                            <StatCard 
                                label="Today Present" 
                                value={`${globalAttendance.filter(a => a.status === 'In' && a.date === new Date().toISOString().split('T')[0]).length} / ${stats.total}`} 
                                color="#8b5cf6" 
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>} 
                            />
                        </div>
                        <div className="ad-widget-row">
                            <div className="ad-widget-panel">
                                <div className="ad-widget-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Gender Spread</h4>
                                </div>
                                <DistributionBar label="Male" count={employees.filter(e => e.Gender?.toLowerCase() === 'male').length} total={stats.total} color="#3b82f6" />
                                <DistributionBar label="Female" count={employees.filter(e => e.Gender?.toLowerCase() === 'female').length} total={stats.total} color="#ec4899" />
                            </div>
                            <div className="ad-widget-panel">
                                <div className="ad-widget-title">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line></svg>
                                    <h4>Key Departments</h4>
                                </div>
                                {Object.entries(employees.reduce((acc, curr) => {
                                    const d = normalizeDept(curr.Department || curr.department);
                                    if (d) acc[d] = (acc[d] || 0) + 1;
                                    return acc;
                                }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, c]) => (
                                    <DistributionBar key={d} label={d} count={c} total={stats.total} color="#6366f1" />
                                ))}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'employees' ? (
                    <div className="ad-manage-section animate-fade-in">
                        <div className="ad-filter-shelf">
                            <div className="ad-filter-unit" style={{ flex: 1.5 }}><label>Search</label><input className="ad-search-input" type="text" placeholder="ID or Name..." value={searchId} onChange={(e) => setSearchId(e.target.value)} /></div>
                            <div className="ad-filter-unit"><label>Dept</label><select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>{depts.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div className="ad-filter-unit">
                                <label>Status</label>
                                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="All">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option><option value="PIP">PIP</option><option value="Abscond">Abscond</option>
                                </select>
                            </div>
                            <div className="ad-filter-unit"><label>Sort</label><select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name">Name</option><option value="id">Employee ID</option><option value="doj">Join Date</option></select></div>
                        </div>
                        <div className="ad-member-grid">
                            {filteredEmployees.map((emp, i) => (
                                <div key={i} className="ad-member-card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div className="ad-card-avatar">{emp.Name?.charAt(0)}</div>
                                        <div><h4 style={{ margin: 0, fontSize: '17px' }}>{emp.Name}</h4><p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '13px' }}>{emp.Designation || "DB RECORD"}</p></div>
                                    </div>
                                    <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '14px', margin: '20px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>ID: {emp.EmpID || emp.employee_code}</span>
                                            <span className={`ad-status-tag ${(emp.Status || 'Active').toLowerCase()}`}>{emp.Status || 'Active'}</span>
                                        </div>
                                    </div>
                                    <div className="ad-card-actions">
                                        <button className="ad-btn-view" onClick={() => setSelectedEmployee(emp)}>View Record</button>
                                        <button className="ad-btn-remove" onClick={() => deleteEmployee(emp.EmpID || emp.employee_code)}>Delete</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : activeTab === 'access' ? (
                    <AdminUsersContent />
                ) : activeTab === 'attendance' ? (
                    <div className="ad-attendance-panel animate-fade-in">
                        <div className="ad-filter-shelf" style={{ marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
                            <div className="ad-filter-unit" style={{ flex: 1 }}>
                                <label>Start Date</label>
                                <input type="date" value={attStartDate} onChange={(e) => setAttStartDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }} />
                            </div>
                            <div className="ad-filter-unit" style={{ flex: 1 }}>
                                <label>End Date</label>
                                <input type="date" value={attEndDate} onChange={(e) => setAttEndDate(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }} />
                            </div>
                            <div className="ad-filter-unit" style={{ flex: 1 }}>
                                <label>Department</label>
                                <select value={attFilterDept} onChange={(e) => setAttFilterDept(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>
                                    {depts.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="ad-filter-unit" style={{ flex: 1 }}>
                                <label>Status</label>
                                <select value={attFilterStatus} onChange={(e) => setAttFilterStatus(e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>
                                    <option value="All">All Status</option>
                                    <option value="In">Punched In</option>
                                    <option value="Out">Punched Out</option>
                                    <option value="Late">Late Arrival</option>
                                    <option value="Early">Early Exit</option>
                                </select>
                            </div>
                            <div className="ad-header-actions" style={{ marginBottom: '5px' }}>
                                <button className="ad-primary-action-btn" onClick={exportAttendanceCSV} style={{ background: '#059669' }}>Export Report</button>
                                <button className="ad-primary-action-btn" onClick={loadGlobalAttendance}>Refresh Logs</button>
                            </div>
                        </div>

                        <div className="ad-widget-panel" style={{ padding: '0', borderRadius: '16px', overflow: 'hidden', background: 'white' }}>
                            <div style={{ padding: '20px 25px', borderBottom: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '16px', fontWeight: '800' }}>Global Attendance Registry</h4>
                            </div>
                            <div className="ad-table-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                <table className="mg-data-table">
                                    <thead>
                                        <tr>
                                            <th style={{ background: '#f8fafc' }}>Date</th>
                                            <th style={{ background: '#f8fafc' }}>Employee</th>
                                            <th style={{ background: '#f8fafc' }}>In Time</th>
                                            <th style={{ background: '#f8fafc' }}>Out Time</th>
                                            <th style={{ background: '#f8fafc' }}>Status</th>
                                            <th style={{ background: '#f8fafc' }}>Geo Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {globalAttendance
                                            .filter(a => {
                                                const matchesDate = a.date >= attStartDate && a.date <= attEndDate;
                                                const emp = employees.find(e => (e.EmpID || e.employee_code) === a.empId);
                                                const matchesDept = attFilterDept === "All" || (emp && normalizeDept(emp.Department) === attFilterDept);
                                                if (attFilterStatus !== "All") {
                                                    if (attFilterStatus === "In" && a.status !== "In") return false;
                                                    if (attFilterStatus === "Out" && a.status !== "Out") return false;
                                                    if (attFilterStatus === "Late" && !isLate(a.inTime)) return false;
                                                    if (attFilterStatus === "Early" && !isEarly(a.outTime)) return false;
                                                }
                                                
                                                return matchesDate && matchesDept;
                                            })
                                            .reverse()
                                            .map((a, i) => {
                                                const emp = employees.find(e => (e.EmpID || e.employee_code) === a.empId);
                                                return (
                                                    <tr key={i}>
                                                        <td style={{ fontWeight: '700', fontSize: '13px' }}>{formatDate(a.date)}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: '700', color: '#0f172a' }}>{emp?.Name || "System Record"}</span>
                                                                <span style={{ fontSize: '11px', color: '#64748b' }}>{a.empId} • {emp ? normalizeDept(emp.Department) : "N/A"}</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ color: '#059669', fontWeight: '700' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {formatTime(a.inTime)}
                                                                {isLate(a.inTime) && (
                                                                    <span style={{ 
                                                                        fontSize: '9px', background: '#fee2e2', color: '#ef4444', 
                                                                        padding: '2px 6px', borderRadius: '4px', fontWeight: '900' 
                                                                    }}>LATE</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td style={{ color: '#dc2626', fontWeight: '700' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {formatTime(a.outTime)}
                                                                {isEarly(a.outTime) && (
                                                                    <span style={{ 
                                                                        fontSize: '9px', background: '#fff7ed', color: '#f97316', 
                                                                        padding: '2px 6px', borderRadius: '4px', fontWeight: '900' 
                                                                    }}>EARLY</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className={`ad-status-tag ${a.status === 'In' ? 'active' : 'inactive'}`} style={{ fontSize: '10px' }}>
                                                                {a.status === 'In' ? 'PUNCHED IN' : 'PUNCHED OUT'}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontSize: '11px', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                 <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.location || "No GeoData"}</span>
                                                                 {a.location && (
                                                                     <button 
                                                                         onClick={() => loadEmployeeTrail(a.empId, a.date)}
                                                                         style={{ 
                                                                             background: '#f1f5f9', border: 'none', padding: '5px', borderRadius: '6px', cursor: 'pointer',
                                                                             color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                         }}
                                                                         title="Track Movement"
                                                                     >
                                                                         <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                                                     </button>
                                                                 )}
                                                             </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        {globalAttendance.length === 0 && (
                                            <tr><td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No attendance logs found in database.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* HR Book Tab Content */
                    <div className="animate-fade-in">
                        <div className="ad-widget-panel" style={{ background: 'white', borderRadius: '24px', padding: '30px' }}>
                            <div className="mg-widget-title-area" style={{ marginBottom: '25px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0 }}>Organizational Handbooks & Policies</h3>
                            </div>

                            <div className="mg-books-grid">
                                {policies.length > 0 ? policies.map((policy, i) => (
                                    <div key={i} className="mg-book-card">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '8px', borderRadius: '10px' }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                            </div>
                                            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: '#1e293b' }}>{policy.label}</h4>
                                        </div>
                                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 20px 0', lineHeight: '1.5' }}>{policy.description}</p>
                                        <button
                                            className="hr-btn-icon"
                                            style={{ marginTop: 'auto', width: '100%', fontSize: '13px', padding: '10px', height: 'auto', justifyContent: 'center' }}
                                            onClick={() => {
                                                setViewingDoc({ 
                                                    title: policy.label, 
                                                    fileId: policy.id || policy.fileId,
                                                    fileName: policy.fileName,
                                                    downloadPath: policy.downloadUrl 
                                                });
                                            }}
                                        >
                                            View Document
                                        </button>
                                    </div>
                                )) : (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No policies found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Location Trail Modal */}
            <ShiftMapModal 
                isOpen={isTrailModalOpen} 
                onClose={() => setIsTrailModalOpen(false)} 
                selectedTrail={selectedTrail} 
                employees={employees} 
            />
            {/* Document Viewer Modal */}
            {viewingDoc && (
                <PolicyModal
                    doc={viewingDoc}
                    onClose={() => setViewingDoc(null)}
                />
            )}
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
                                    <h3>Personal & Identity Details</h3>
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
                                    <h3 style={{ marginTop: '30px' }}>Professional & Emergency Info</h3>
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

function StatCard({ label, value, color, icon }) {
    return (
        <div className="ad-stat-card" style={{ '--accent-color': color, '--accent-rgb': color.includes('63') ? '99,102,241' : (color.includes('10') ? '16,185,129' : '239,68,68') }}>
            <div className="ad-stat-icon-wrap">{icon}</div>
            <div className="ad-stat-info"><span>{label}</span><h3>{value}</h3></div>
        </div>
    );
}

function DistributionBar({ label, count, total, color }) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#64748b', fontWeight: '700' }}>{label}</span>
                <span style={{ color: '#0f172a', fontWeight: '800' }}>{count}</span>
            </div>
            <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: color, width: `${percent}%`, transition: 'width 1s ease-out' }}></div>
            </div>
        </div>
    );
}

function InfoItem({ label, value, span = 1 }) {
    return (
        <div className="ad-info-item" style={{ gridColumn: `span ${span}` }}>
            <label>{label}</label>
            <span>{value || "---"}</span>
        </div>
    );
}

function PolicyModal({ doc, onClose }) {
    const viewerRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function loadDoc() {
            try {
                setLoading(true);
                setError(null);

                const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.title?.toLowerCase().includes('pdf');
                
                if (isPdf) {
                    setLoading(false);
                    return;
                }

                // Fetch via proxy
                const proxyUrl = `${SCRIPT_URL}?action=proxyFile&fileId=${doc.fileId}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.status !== "success") throw new Error(data.message || "Failed to fetch document");
                
                const byteCharacters = atob(data.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: data.mimeType });

                if (isMounted && viewerRef.current) {
                    viewerRef.current.innerHTML = "";
                    await renderAsync(blob, viewerRef.current, viewerRef.current, {
                        className: "docx",
                        inWrapper: false,
                        ignoreWidth: false,
                        ignoreHeight: false,
                        debug: false
                    });
                    setLoading(false);
                }
            } catch (err) {
                console.error("Docx rendering error:", err);
                if (isMounted) {
                    setError("Could not render document automatically. You can still download it using the icon above.");
                    setLoading(false);
                }
            }
        }
        loadDoc();
        return () => { isMounted = false; };
    }, [doc.fileId, doc.fileName, doc.title]);

    const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.title?.toLowerCase().includes('pdf');

    return (
        <div className="mg-modal-mask" style={{ zIndex: 1000 }} onClick={onClose}>
            <div className="mg-modal-core animate-modal-up" style={{ width: '90%', height: '90%', maxWidth: '1200px' }} onClick={e => e.stopPropagation()}>
                <div className="mg-modal-top-bar">
                    <div className="mg-modal-header-info">
                        <div className="mg-modal-avatar" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        </div>
                        <div className="mg-modal-title-wrap">
                            <h2 className="mg-modal-name">{doc.title}</h2>
                            <p className="mg-modal-id">HR Policy Document</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <a href={doc.downloadPath} download className="ad-primary-action-btn" style={{ padding: '8px 12px', background: '#f8fafc', color: '#475569', textDecoration: 'none', height: 'auto' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </a>
                        <button className="mg-modal-dismiss" onClick={onClose}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>

                <div className="mg-modal-body" style={{ background: '#f8fafc', padding: '0' }}>
                    <div style={{ height: '100%', overflow: 'auto', padding: '40px 20px' }}>
                        {loading && (
                            <div style={{ textAlign: 'center', padding: '100px 0' }}>
                                <div className="mg-loader-spinner"></div>
                                <p style={{ color: '#64748b', marginTop: '15px' }}>Rendering Policy Content...</p>
                            </div>
                        )}
                        {error && (
                            <div style={{ textAlign: 'center', padding: '100px 20px', color: '#ef4444' }}>
                                <p>{error}</p>
                            </div>
                        )}
                        {isPdf && !error && (
                            <iframe 
                                src={`https://drive.google.com/file/d/${doc.fileId}/preview`}
                                style={{ width: '100%', height: 'calc(100vh - 200px)', border: 'none', borderRadius: '12px', background: 'white' }}
                                title={doc.title}
                            />
                        )}
                        {!isPdf && <div ref={viewerRef} className="docx-render-area"></div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;