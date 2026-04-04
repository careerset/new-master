import { useEffect, useState, useRef } from "react";
import PrintProfile from "./PrintProfile";
import "./print.css";
import "./hr.css";
import { renderAsync } from "docx-preview";
import JSZip from "jszip";
import ShiftMapModal from "./ShiftMapModal";


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
    } catch {
        return dateString;
    }
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
    try {
        return typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
    } catch {
        return [];
    }
};

const normalizeDept = (dept) => {
    if (!dept) return "";
    const name = dept.trim();
    if (name === "HRD") return "HR";
    if (name === "Management") return "Admin"; // Redirecting deleted Management to Admin or similar if needed
    return name;
};

function AdminActionsContent({ employee, onUpdate }) {
    const [status, setStatus] = useState(employee.Status || "Active");
    const [empType, setEmpType] = useState(employee.EmploymentType || "regular");
    const [newId, setNewId] = useState(employee.EmpID || employee.employee_code || "");
    const [isIdEditing, setIsIdEditing] = useState(false);

    const [confType, setConfType] = useState(employee.ConfirmationType || (new Date(employee.DateOfJoining || employee.doj) > new Date(new Date().setMonth(new Date().getMonth() - 3)) ? "Probation" : "Permanent"));

    return (
        <div className="profile-section" style={{ border: '2px dashed #fecaca', padding: '25px', borderRadius: '16px', background: '#fffafb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                <h3 style={{ margin: 0, color: '#991b1b' }}>Admin Management</h3>
            </div>
            <p style={{ fontSize: '14px', color: '#7f1d1d', marginBottom: '25px', opacity: 0.8 }}>Use these controls to manually override employee status. Changes are saved instantly to the master records.</p>

            <div className="profile-grid">
                <div className="info-item">
                    <label>Current Employment Status</label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}
                    >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="PIP">PIP</option>
                        <option value="Inactive Suspend">Inactive Suspend</option>
                        <option value="Abscond">Abscond</option>
                    </select>
                </div>
                <div className="info-item">
                    <label>Employment Type</label>
                    <select
                        value={empType}
                        onChange={(e) => setEmpType(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}
                    >
                        <option value="regular">Regular</option>
                        <option value="contract">Contract</option>
                        <option value="training">Training</option>
                        <option value="intern">Intern</option>
                        <option value="consultant">Consultant</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                {empType === "regular" && (
                    <div className="info-item">
                        <label>Confirmation Status</label>
                        <select
                            value={confType}
                            onChange={(e) => setConfType(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #fecaca' }}
                        >
                            <option value="Probation">Probation</option>
                            <option value="Confirmed">Confirmed</option>
                        </select>
                    </div>
                )}
            </div>

            <div style={{ marginTop: '25px', padding: '15px', background: '#fff', borderRadius: '12px', border: '1px solid #fecaca' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <label style={{ fontSize: '13px', fontWeight: '700', color: '#991b1b' }}>Employee ID Management</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: isIdEditing ? '#ef4444' : '#64748b' }}>Update ID</span>
                        <label className="switch" style={{ width: '34px', height: '18px' }}>
                            <input type="checkbox" checked={isIdEditing} onChange={(e) => setIsIdEditing(e.target.checked)} />
                            <span className="slider round" style={{ borderRadius: '18px' }}></span>
                        </label>
                    </div>
                </div>
                {isIdEditing ? (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={newId}
                            onChange={(e) => setNewId(e.target.value)}
                            placeholder="Enter new Employee ID"
                            style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ef4444', fontSize: '14px' }}
                        />
                        <div style={{ fontSize: '11px', color: '#ef4444', alignSelf: 'center', maxWidth: '150px' }}>
                            ⚠️ Changing the ID will update all historical records.
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#64748b', fontSize: '13px' }}>
                        Current ID: <strong>{employee.EmpID || employee.employee_code}</strong> (Locked)
                    </div>
                )}
            </div>

            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                    className="hr-btn-icon"
                    style={{ background: '#ef4444', width: 'auto', padding: '12px 30px' }}
                    onClick={() => {
                        const updateData = { Status: status, EmploymentType: empType };
                        if (empType === "regular") updateData.ConfirmationType = confType;
                        if (newId && newId !== employee.EmpID) updateData.newEmpId = newId;

                        onUpdate(updateData);
                    }}
                >
                    Apply Changes
                </button>
            </div>
        </div>
    );
}

function HrDashboard() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
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
    const [viewingDoc, setViewingDoc] = useState(null);
    const [policies, setPolicies] = useState([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [globalAttendance, setGlobalAttendance] = useState([]);
    const [attFilterDate, setAttFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [attFilterDept, setAttFilterDept] = useState("All");
    const [attFilterStatus, setAttFilterStatus] = useState("All");

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

    const loadPolicies = async () => {
        try {
            const res = await fetch(`${SCRIPT_URL}?action=getHRPolicies`);
            const data = await res.json();
            if (data.status === "success" && data.policies) {
                setPolicies(data.policies.map(p => ({
                    ...p,
                    // Store the raw ID and ensure download/view URLs are correct
                    fileId: p.id
                })));
            } else if (data.status === "success" && (!data.policies || data.policies.length === 0)) {
                // If it's success but empty, we can show fallbacks or keep it empty

            }
        } catch (err) {
            console.error("Error loading policies:", err);
            // Default fallbacks only on hard network failure

        }
    };

    const handleDeletePolicy = async (policyId, label) => {
        if (!window.confirm(`Are you sure you want to delete the policy "${label}"? This action cannot be undone.`)) return;

        setLoading(true);
        try {
            const res = await fetch(`${SCRIPT_URL}?action=deleteHRPolicy&id=${policyId}`);
            const data = await res.json();

            if (data.status === "success") {
                alert("Policy deleted successfully!");
                loadPolicies();
            } else {
                throw new Error(data.message || "Failed to delete policy.");
            }
        } catch (err) {
            console.error(err);
            alert("Deletion failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };
    const loadGlobalAttendance = async () => {
        try {
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
        }
    };

    useEffect(() => {
        const cached = localStorage.getItem("employee_cache");
        if (cached) setEmployees(JSON.parse(cached));
        loadEmployees();
        loadPolicies();
        loadGlobalAttendance();
        const interval = setInterval(() => {
            loadEmployees();
            loadPolicies();
            loadGlobalAttendance();
        }, 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const searchEmployee = () => {
        if (!searchId) return loadEmployees();
        const filtered = employees.filter(emp => (emp.EmpID || emp.employee_code || "").toString().includes(searchId));
        setEmployees(filtered);
    };

    const viewEmployee = (empId) => {
        setLoading(true);
        fetch(`${SCRIPT_URL}?action=getEmployee&empId=${empId}`)
            .then(res => res.json())
            .then(data => {
                setSelectedEmployee(data.employee);
                setLoading(false);
            })
            .catch(err => setLoading(false));
    };

    const handleDownloadDocs = (empId, name) => {
        const url = `${SCRIPT_URL}?action=downloadDocs&empId=${empId}&name=${name}`;
        window.open(url, "_blank");
    };

    const handleExcelDownload = async (empId) => {
        try {
            const res = await fetch(
                `${SCRIPT_URL}?action=downloadExcel&empId=${empId}`
            );

            const data = await res.json();

            if (data.status === "success") {
                window.open(data.url, "_blank"); // ✅ triggers Excel download
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

            // Append only the fields we want to update
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
                loadEmployees(); // Refresh list

                // Refresh single view if open
                if (selectedEmployee && (selectedEmployee.EmpID === empId || selectedEmployee.employee_code === empId)) {
                    const nextEmpId = fields.newEmpId || empId;
                    setSelectedEmployee({ ...selectedEmployee, ...fields, EmpID: nextEmpId });
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

    // --- Innovative Logic ---
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
                // Fallback logic
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

    const getRecentHires = () => {
        return [...employees].sort((a, b) => {
            const dateA = new Date(a.DateOfJoining || a.doj || 0);
            const dateB = new Date(b.DateOfJoining || b.doj || 0);
            return dateB - dateA;
        }).slice(0, 3);
    };

    return (
        <div className="hr-page-wrapper">
            {/* Sidebar Navigation */}
            <div className="hr-sidebar">
                <div className="hr-sidebar-logo">
                    <img src="/chn-logo.png" alt="Company Logo" />

                </div>
                <div className="hr-nav">
                    <div className={`hr-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        <span>Dashboard</span>
                    </div>
                    <div className={`hr-nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Employees</span>
                    </div>
                    <div className={`hr-nav-item ${activeTab === 'hrbook' ? 'active' : ''}`} onClick={() => setActiveTab('hrbook')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                        <span>HR Book</span>
                    </div>
                    <div className={`hr-nav-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="3"></circle></svg>
                        <span>Attendance</span>
                    </div>
                </div>
                <div className="hr-nav-item" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9' }} onClick={() => window.location.href = "/"}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="hr-main">
                <div className="hr-header">
                    <div>
                        <h1>Employee Overview</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Welcome back, HR Manager</p>
                    </div>
                    <div className="hr-header-actions">
                        {activeTab === 'employees' && (
                            <div className="hr-search-bar">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input
                                    type="text"
                                    placeholder="Search by ID..."
                                    value={searchId}
                                    onChange={(e) => setSearchId(e.target.value)}
                                    onKeyUp={(e) => e.key === 'Enter' && searchEmployee()}
                                />
                            </div>
                        )}
                        <div className="celebration-hub">
                            <div className="hub-icon">✨</div>
                            <div className="hub-content">
                                <span className="hub-label">Celebrations:</span>
                                <span className="hub-stats">
                                    <strong>{getUpcomingBirthdays().length}</strong> 🎂 •
                                    <strong>{getWorkAnniversaries().length}</strong> 🎊
                                </span>
                            </div>
                        </div>
                        <button className="hr-btn-icon" onClick={loadEmployees}>Refresh</button>
                    </div>
                </div>

                {activeTab === 'dashboard' ? (
                    <div className="dashboard-content">
                        {/* Top Stats Grid */}
                        <div className="hr-stats-grid">
                            <StatCardV2
                                label="Total Workforce"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                                color="#2563eb"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('All'); setFilterEmploymentType('All'); }}
                            />
                            <StatCardV2
                                label="Active Employees"
                                value={employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                                color="#10b981"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('Active'); setFilterEmploymentType('All'); }}
                            />
                            <StatCardV2
                                label="Inactive Employees"
                                value={employees.filter(e => ['inactive', 'inactive suspend', 'abscond'].includes(e.Status?.toLowerCase())).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>}
                                color="#64748b"
                                onClick={() => { setActiveTab('employees'); setFilterStatus('Inactive'); setFilterEmploymentType('All'); }}
                            />
                            <StatCardV2
                                label="Probation"
                                value={employees.filter(e => {
                                    if (e.ConfirmationType?.toLowerCase() === 'probation') return true;
                                    if (e.ConfirmationType) return false;
                                    const doj = new Date(e.DateOfJoining || e.doj);
                                    const threeMonthsAgo = new Date();
                                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                    return doj > threeMonthsAgo;
                                }).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                                color="#f59e0b"
                                onClick={() => { setActiveTab('employees'); setFilterEmploymentType('Probation'); setFilterStatus('All'); }}
                            />
                            <StatCardV2
                                label="Confirmed"
                                value={employees.filter(e => {
                                    if (e.ConfirmationType?.toLowerCase() === 'confirmed') return true;
                                    if (e.ConfirmationType) return false;
                                    const doj = new Date(e.DateOfJoining || e.doj);
                                    const threeMonthsAgo = new Date();
                                    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                    return doj <= threeMonthsAgo;
                                }).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                color="#8b5cf6"
                                onClick={() => { setActiveTab('employees'); setFilterEmploymentType('Confirmed'); setFilterStatus('All'); }}
                            />
                            <StatCardV2
                                label="Monthly Joinees"
                                value={employees.filter(e => {
                                    const doj = new Date(e.DateOfJoining || e.doj);
                                    return doj.getMonth() === new Date().getMonth() && doj.getFullYear() === new Date().getFullYear();
                                }).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>}
                                color="#ec4899"
                            />
                            <StatCardV2
                                label="Today's Presence"
                                value={`${globalAttendance.filter(a => a.status === 'In' && a.date === new Date().toISOString().split('T')[0]).length} / ${employees.length}`}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>}
                                color="#8b5cf6"
                                onClick={() => setActiveTab('attendance')}
                            />
                        </div>

                        {/* Gender Distribution Widget */}
                        {/* Distribution Widgets Row */}
                        <div className="dashboard-widgets-row" style={{ marginBottom: '20px' }}>
                            {/* Gender Distribution Widget */}
                            <div className="widget-card" style={{ flex: '1' }}>
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10z"></path></svg>
                                    <h4>Gender Distribution</h4>
                                </div>
                                <div className="gender-dist-container" style={{ display: 'flex', gap: '20px', alignItems: 'center', padding: '10px 0' }}>
                                    <div className="gender-item" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Male</span>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7' }}>{employees.filter(e => (e.Gender || e.gender)?.toLowerCase() === 'male').length}</span>
                                        </div>
                                        <div className="dept-bar-bg" style={{ height: '8px' }}>
                                            <div className="dept-bar-fill" style={{
                                                width: `${(employees.filter(e => (e.Gender || e.gender)?.toLowerCase() === 'male').length / (employees.length || 1)) * 100}%`,
                                                background: '#0284c7',
                                                height: '100%',
                                                borderRadius: '4px'
                                            }}></div>
                                        </div>
                                    </div>
                                    <div className="gender-item" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Female</span>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#db2777' }}>{employees.filter(e => (e.Gender || e.gender)?.toLowerCase() === 'female').length}</span>
                                        </div>
                                        <div className="dept-bar-bg" style={{ height: '8px' }}>
                                            <div className="dept-bar-fill" style={{
                                                width: `${(employees.filter(e => (e.Gender || e.gender)?.toLowerCase() === 'female').length / (employees.length || 1)) * 100}%`,
                                                background: '#db2777',
                                                height: '100%',
                                                borderRadius: '4px'
                                            }}></div>
                                        </div>
                                    </div>
                                    <div className="gender-item" style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#64748b' }}>Others</span>
                                            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#6366f1' }}>{employees.filter(e => {
                                                const g = (e.Gender || e.gender)?.toLowerCase();
                                                return g && g !== 'male' && g !== 'female';
                                            }).length}</span>
                                        </div>
                                        <div className="dept-bar-bg" style={{ height: '8px' }}>
                                            <div className="dept-bar-fill" style={{
                                                width: `${(employees.filter(e => {
                                                    const g = (e.Gender || e.gender)?.toLowerCase();
                                                    return g && g !== 'male' && g !== 'female';
                                                }).length / (employees.length || 1)) * 100}%`,
                                                background: '#6366f1',
                                                height: '100%',
                                                borderRadius: '4px'
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Workforce Composition Widget */}
                            <div className="widget-card" style={{ flex: '1.2' }}>
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Workforce Composition</h4>
                                </div>
                                <div className="gender-dist-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px 0' }}>
                                    {(() => {
                                        const total = employees.length || 1;
                                        const activeCount = employees.filter(e => !e.Status || ['active', 'pip'].includes(e.Status?.toLowerCase())).length;
                                        const inactiveCount = employees.filter(e => ['inactive', 'inactive suspend', 'abscond'].includes(e.Status?.toLowerCase())).length;
                                        const probCount = employees.filter(e => {
                                            if (e.ConfirmationType?.toLowerCase() === 'probation') return true;
                                            if (e.ConfirmationType) return false;
                                            const doj = new Date(e.DateOfJoining || e.doj);
                                            const threeMonthsAgo = new Date();
                                            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                            return doj > threeMonthsAgo;
                                        }).length;
                                        const permCount = employees.filter(e => {
                                            if (e.ConfirmationType?.toLowerCase() === 'confirmed') return true;
                                            if (e.ConfirmationType) return false;
                                            const doj = new Date(e.DateOfJoining || e.doj);
                                            const threeMonthsAgo = new Date();
                                            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
                                            return doj <= threeMonthsAgo;
                                        }).length;

                                        return (
                                            <>
                                                <div className="comp-item">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Employment Type</span>
                                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                            Probation: <strong style={{ color: '#f59e0b' }}>{probCount}</strong> | Confirmed: <strong style={{ color: '#8b5cf6' }}>{permCount}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="dept-bar-bg" style={{ height: '8px', display: 'flex', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(probCount / total) * 100}%`, background: '#f59e0b', height: '100%' }} title="Probation"></div>
                                                        <div style={{ width: `${(permCount / total) * 100}%`, background: '#8b5cf6', height: '100%' }} title="Permanent"></div>
                                                    </div>
                                                </div>
                                                <div className="comp-item">
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Workforce Status</span>
                                                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                            Active: <strong style={{ color: '#10b981' }}>{activeCount}</strong> | Inactive: <strong style={{ color: '#64748b' }}>{inactiveCount}</strong>
                                                        </span>
                                                    </div>
                                                    <div className="dept-bar-bg" style={{ height: '8px', display: 'flex', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${(activeCount / total) * 100}%`, background: '#10b981', height: '100%' }} title="Active"></div>
                                                        <div style={{ width: `${(inactiveCount / total) * 100}%`, background: '#64748b', height: '100%' }} title="Inactive"></div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Middle Row Widgets */}
                        <div className="dashboard-widgets-row">
                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>
                                    <h4>Recent Onboardings</h4>
                                </div>
                                <div className="recent-hires-list">
                                    {getRecentHires().length > 0 ? getRecentHires().map((emp, i) => (
                                        <div key={i} className="hire-item">
                                            <div className="hire-avatar">
                                                {emp.Name?.[0] || 'E'}
                                            </div>
                                            <div className="hire-info">
                                                <h6>{emp.Name}</h6>
                                                <span>Joined {formatDate(emp.DateOfJoining || emp.doj)}</span>
                                            </div>
                                            <div className="hire-dept-badge">{emp.Department || 'IT'}</div>
                                        </div>
                                    )) : <p style={{ fontSize: '12px', color: '#94a3b8' }}>No recent hires found</p>}
                                </div>
                            </div>

                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                                    <h4>Department Breakdown</h4>
                                </div>
                                <div className="dept-list">
                                    {Object.entries(
                                        employees.reduce((acc, curr) => {
                                            const dept = normalizeDept(curr.Department || curr.department);
                                            if (dept && dept !== "-") {
                                                acc[dept] = (acc[dept] || 0) + 1;
                                            }
                                            return acc;
                                        }, {})
                                    )
                                        .sort((a, b) => b[1] - a[1]) // Sort by count descending
                                        .map(([dept, count]) => (
                                            <div key={dept} className="dept-item">
                                                <div className="dept-name">{dept}</div>
                                                <div className="dept-bar-bg">
                                                    <div className="dept-bar-fill" style={{ width: `${(count / employees.length) * 100}%` }}></div>
                                                </div>
                                                <div className="dept-count">{count}</div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    <h4>Experience Levels</h4>
                                </div>
                                <div className="exp-levels-grid">
                                    <div className="exp-box" style={{ '--box-color': '#10b981' }}>
                                        <h3>{employees.filter(e => (parseInt(e.TotalExpYears) || 0) === 0).length}</h3>
                                        <span>Fresher</span>
                                    </div>
                                    <div className="exp-box" style={{ '--box-color': '#3b82f6' }}>
                                        <h3>{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3).length}</h3>
                                        <span>1-3 yrs</span>
                                    </div>
                                    <div className="exp-box" style={{ '--box-color': '#f59e0b' }}>
                                        <h3>{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7).length}</h3>
                                        <span>4-7 yrs</span>
                                    </div>
                                    <div className="exp-box" style={{ '--box-color': '#ef4444' }}>
                                        <h3>{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 8).length}</h3>
                                        <span>8+ yrs</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Row Widgets */}
                        <div className="bottom-widgets-row">
                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    <h4>Status Overview</h4>
                                </div>
                                <div className="status-list">
                                    <StatusItem label="Single" count={employees.filter(e => e.MaritalStatus?.toLowerCase() === 'single' || e.maritalStatus?.toLowerCase() === 'single').length} total={employees.length} color="#3b82f6" />
                                    <StatusItem label="ESI Active" count={employees.filter(e => e.ESIApplicable?.toLowerCase() === 'yes' || e.esiNumber).length} total={employees.length} color="#10b981" />
                                    <StatusItem label="PF Enrolled" count={employees.filter(e => e.PF || e.UAN || e.pfNumber).length} total={employees.length} color="#6366f1" />
                                </div>
                            </div>

                            {/* Upcoming Events Innovation Widget */}
                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                    <h4>Upcoming Celebrations</h4>
                                </div>
                                <div className="events-list">
                                    {[...getUpcomingBirthdays(), ...getWorkAnniversaries()].length > 0 ? (
                                        <>
                                            {getUpcomingBirthdays().map((emp, i) => (
                                                <div key={`b-${i}`} className="event-item">
                                                    <div className="event-date">
                                                        <span>{new Date(emp.DOB || emp.dob).getDate()}</span>
                                                        <small>{new Date(emp.DOB || emp.dob).toLocaleString('default', { month: 'short' })}</small>
                                                    </div>
                                                    <div className="event-info">
                                                        <h5>{emp.Name}</h5>
                                                        <p>Birthday Celebration</p>
                                                    </div>
                                                    <div className="event-action">🎂</div>
                                                </div>
                                            ))}
                                            {getWorkAnniversaries().map((emp, i) => (
                                                <div key={`a-${i}`} className="event-item">
                                                    <div className="event-date">
                                                        <span>{new Date(emp.DateOfJoining || emp.doj).getDate()}</span>
                                                        <small>{new Date(emp.DateOfJoining || emp.doj).toLocaleString('default', { month: 'short' })}</small>
                                                    </div>
                                                    <div className="event-info">
                                                        <h5>{emp.Name}</h5>
                                                        <p>{new Date().getFullYear() - new Date(emp.DateOfJoining || emp.doj).getFullYear()} Year Anniversary</p>
                                                    </div>
                                                    <div className="event-action">🎊</div>
                                                </div>
                                            ))}
                                        </>
                                    ) : <p style={{ fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>No celebrations this month</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'employees' ? (
                    <div className="employees-view-container">
                        {/* Advanced Filters Innovation */}
                        <div className="filters-row">
                            <div className="filter-group">
                                <label>Department</label>
                                <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Gender</label>
                                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
                                    <option value="All">All Genders</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                </select>
                            </div>
                            <div className="filter-group">
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
                            <div className="filter-group">
                                <label>Employment Type</label>
                                <select value={filterEmploymentCategory} onChange={(e) => setFilterEmploymentCategory(e.target.value)}>
                                    <option value="All">All Types</option>
                                    <option value="Regular">Regular</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Training">Trainer</option>
                                    <option value="Intern">Intern</option>
                                    <option value="Consultant">Consultant</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Confirmation Status</label>
                                <select value={filterEmploymentType} onChange={(e) => setFilterEmploymentType(e.target.value)}>
                                    <option value="All">All Statuses</option>
                                    <option value="Confirmed">Confirmed</option>
                                    <option value="Probation">Probation</option>
                                </select>
                            </div>
                            <div className="filter-group">
                                <label>Sort By</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                    <option value="name">Name</option>
                                    <option value="id">Employee ID</option>
                                    <option value="doj">Joining Date</option>
                                </select>
                            </div>
                            <div className="filter-stats">
                                Showing <strong>{filteredEmployees.length}</strong> of {employees.length} Employees
                            </div>
                        </div>

                        <div className="employees-grid">
                            {filteredEmployees.length === 0 ? (
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                    <p style={{ color: '#64748b' }}>No employees match your search/filters.</p>
                                </div>
                            ) : (
                                filteredEmployees.map((emp, idx) => {
                                    const empId = emp.EmpID || emp.employee_code;
                                    return (
                                        <div key={idx} className="emp-modern-card">
                                            <div className="emp-card-header">
                                                <div className="emp-initials">{emp.Name ? emp.Name.charAt(0) : "E"}</div>
                                                <div className="emp-card-info">
                                                    <h4>{emp.Name}</h4>
                                                    <p>{emp.Designation || "Designation Not Set"}</p>
                                                </div>
                                            </div>
                                            <div className="emp-card-body">
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Employee ID:</span>
                                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{empId}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Department:</span>
                                                    <span style={{ fontWeight: '600', color: '#1e293b' }}>{emp.Department || "-"}</span>
                                                </div>
                                            </div>
                                            <div className="emp-card-footer">
                                                <button className="btn-view" onClick={() => { viewEmployee(empId); setDetailTab("personal"); }}>View Profile</button>
                                                <button className="btn-download" onClick={() => handleDownloadDocs(empId, emp.Name)}>Download Docs</button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : activeTab === 'hrbook' ? (
                    /* HR Book Tab Content */
                    <div className="animate-fade-in">
                        <div className="widget-card" style={{ background: 'white', borderRadius: '24px', padding: '30px' }}>
                            <div className="widget-header" style={{ marginBottom: '25px' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                                <h4 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'none' }}>HR Policy repository</h4>
                                <button
                                    className="hr-btn-icon"
                                    style={{ marginLeft: 'auto', background: 'var(--manager-gradient)' }}
                                    onClick={() => setIsUploadModalOpen(true)}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    Upload New Policy
                                </button>
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
                                        <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                            <button
                                                className="hr-btn-icon"
                                                style={{ flex: 1, fontSize: '13px', padding: '10px', height: 'auto', justifyContent: 'center' }}
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
                                            <button
                                                className="hr-btn-icon btn-delete-policy"
                                                style={{ width: '40px', padding: '10px', height: 'auto', justifyContent: 'center', background: '#fee2e2', color: '#ef4444', border: '1px solid #fecaca' }}
                                                onClick={() => handleDeletePolicy(policy.id || policy.fileId, policy.label)}
                                                title="Delete Policy"
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                            </button>
                                        </div>

                                    </div>
                                )) : (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                                        No policies found. Click "Upload New Policy" to add one.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'attendance' ? (
                    <div className="attendance-central-panel animate-fade-in">
                        <div className="filter-shelf" style={{ background: 'white', padding: '25px', borderRadius: '20px', marginBottom: '25px', display: 'flex', gap: '20px', alignItems: 'flex-end', border: '1px solid #f1f5f9' }}>
                            <div className="filter-unit" style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Tracking Date</label>
                                <input type="date" value={attFilterDate} onChange={(e) => setAttFilterDate(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }} />
                            </div>
                            <div className="filter-unit" style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Department</label>
                                <select value={attFilterDept} onChange={(e) => setAttFilterDept(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    {[ "All", ...uniqueDepts].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div className="filter-unit" style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>Punch Status</label>
                                <select value={attFilterStatus} onChange={(e) => setAttFilterStatus(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <option value="All">All Status</option>
                                    <option value="In">Present (In)</option>
                                    <option value="Out">Left (Out)</option>
                                    <option value="Late">Late Checking</option>
                                    <option value="Early">Early Exit</option>
                                    <option value="Missing">Not Punched</option>
                                </select>
                            </div>
                            <button className="hr-btn-icon" onClick={loadGlobalAttendance} style={{ height: '42px', width: '120px' }}>Sync Logs</button>
                        </div>

                        <div className="widget-card" style={{ background: 'white', borderRadius: '24px', padding: '0', overflow: 'hidden' }}>
                            <div style={{ padding: '25px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Global Attendance Ledger</h3>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    Showing logs for <strong>{formatDate(attFilterDate)}</strong>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="hr-data-table">
                                    <thead>
                                        <tr>
                                            <th>Employee</th>
                                            <th>Dept / ID</th>
                                            <th>In Time</th>
                                            <th>Out Time</th>
                                            <th>Status</th>
                                            <th>Location Info</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {employees.filter(e => attFilterDept === "All" || normalizeDept(e.Department) === attFilterDept).map(emp => {
                                            const logs = globalAttendance.filter(a => a.empId === (emp.EmpID || emp.employee_code) && a.date === attFilterDate);
                                            const latest = logs[logs.length - 1]; // Get latest punch of the day
                                            
                                            if (attFilterStatus !== "All") {
                                                if (attFilterStatus === "Missing" && latest) return null;
                                                if (attFilterStatus === "In" && (!latest || latest.status !== "In")) return null;
                                                if (attFilterStatus === "Out" && (!latest || latest.status !== "Out")) return null;
                                                if (attFilterStatus === "Late" && (!latest || !isLate(latest.inTime))) return null;
                                                if (attFilterStatus === "Early" && (!latest || !isEarly(latest.outTime))) return null;
                                                if (attFilterStatus === "Missing" && !latest) { /* keep */ }
                                            }

                                            return (
                                                <tr key={emp.EmpID || emp.employee_code}>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div className="hire-avatar" style={{ background: '#f1f5f9', color: '#64748b' }}>{emp.Name?.[0]}</div>
                                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                <span style={{ fontWeight: '700', fontSize: '14px' }}>{emp.Name}</span>
                                                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{emp.Designation}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span style={{ fontWeight: '600', fontSize: '13px' }}>{normalizeDept(emp.Department)}</span>
                                                            <span style={{ fontSize: '11px', color: '#64748b' }}>{emp.EmpID || emp.employee_code}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {formatTime(latest?.inTime)}
                                                            {isLate(latest?.inTime) && (
                                                                <span style={{ 
                                                                    fontSize: '9px', background: '#fee2e2', color: '#ef4444', 
                                                                    padding: '2px 6px', borderRadius: '4px', fontWeight: '900', letterSpacing: '0.5px' 
                                                                }}>LATE</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontSize: '13px', color: '#dc2626', fontWeight: '600' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            {formatTime(latest?.outTime)}
                                                            {isEarly(latest?.outTime) && (
                                                                <span style={{ 
                                                                    fontSize: '9px', background: '#fff7ed', color: '#f97316', 
                                                                    padding: '2px 6px', borderRadius: '4px', fontWeight: '900', letterSpacing: '0.5px' 
                                                                }}>EARLY</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`status-pill ${latest?.status === 'In' ? 'active' : latest?.status === 'Out' ? 'inactive' : 'missing'}`} style={{ 
                                                            padding: '6px 12px', borderRadius: '20px', fontSize: '10px', fontWeight: '800',
                                                            background: latest?.status === 'In' ? '#ecfdf5' : latest?.status === 'Out' ? '#f1f5f9' : '#fff1f2',
                                                            color: latest?.status === 'In' ? '#10b981' : latest?.status === 'Out' ? '#64748b' : '#ef4444',
                                                            border: 'none'
                                                        }}>
                                                            {latest?.status === 'In' ? 'PUNCHED IN' : latest?.status === 'Out' ? 'PUNCHED OUT' : 'NOT PUNCHED'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontSize: '11px', color: '#94a3b8', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{latest?.location || "No GeoData"}</span>
                                                            {latest && (
                                                                <button 
                                                                    onClick={() => loadEmployeeTrail(emp.EmpID || emp.employee_code, attFilterDate)}
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
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>Select a tab to begin</div>
                )}
            </div>

            {/* Employee Details Modal */}
            {selectedEmployee && (
                <div className="details-overlay">
                    <div className="details-modal">
                        <div className="modal-header">
                            <div>
                                <h2 style={{ fontSize: '24px', margin: '0 0 5px 0' }}>{selectedEmployee.Name}</h2>
                                <p style={{ color: '#2563eb', fontWeight: '600', margin: 0 }}>ID: {selectedEmployee.EmpID}</p>
                            </div>
                            <div className="modal-top-actions">
                                <div className="completion-status-large">
                                    <div className="progress-text">Profile Completion: {getProfileCompletion(selectedEmployee)}%</div>
                                    <div className="progress-bar-container">
                                        <div className="progress-bar-fill" style={{ width: `${getProfileCompletion(selectedEmployee)}%` }}></div>
                                    </div>
                                </div>
                                <button className="modal-close" onClick={() => setSelectedEmployee(null)}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>

                        {/* Detail Tabs Innovation */}
                        <div className="detail-tabs">
                            <button className={detailTab === 'personal' ? 'active' : ''} onClick={() => setDetailTab('personal')}>Personal</button>
                            <button className={detailTab === 'education' ? 'active' : ''} onClick={() => setDetailTab('education')}>Education</button>
                            <button className={detailTab === 'experience' ? 'active' : ''} onClick={() => setDetailTab('experience')}>Experience</button>
                            <button className={detailTab === 'statutory' ? 'active' : ''} onClick={() => setDetailTab('statutory')}>Bank & Statutory</button>
                            <button className={detailTab === 'documents' ? 'active' : ''} onClick={() => setDetailTab('documents')}>Documents</button>
                            <button className={detailTab === 'admin' ? 'active' : ''} style={{ color: '#ef4444' }} onClick={() => setDetailTab('admin')}>Admin Actions</button>
                        </div>

                        <div className="tab-content-wrapper">
                            {detailTab === 'personal' && (
                                <>
                                    <div className="profile-section">
                                        <h3>Personal Information</h3>
                                        <div className="profile-grid">
                                            <InfoItem label="Full Name" value={selectedEmployee.Name || selectedEmployee.name} />
                                            <InfoItem label="Date of Birth" value={formatDate(selectedEmployee.DOB || selectedEmployee.dob)} />
                                            <InfoItem label="Gender" value={selectedEmployee.Gender || selectedEmployee.gender} />
                                            <InfoItem label="Blood Group" value={selectedEmployee.BloodGroup || selectedEmployee.bloodGroup} />
                                            <InfoItem label="Father Name" value={selectedEmployee.FatherName || selectedEmployee.fatherName} />
                                            <InfoItem label="Mother Name" value={selectedEmployee.MotherName || selectedEmployee.motherName} />
                                            <InfoItem label="Marital Status" value={selectedEmployee.MaritalStatus || selectedEmployee.maritalStatus} />
                                            {(selectedEmployee.MaritalStatus === 'Married' || selectedEmployee.maritalStatus === 'Married') && <InfoItem label="Spouse Name" value={selectedEmployee.SpouseName || selectedEmployee.spouseName} />}
                                            <InfoItem label="Aadhar Number" value={selectedEmployee.AadharNumber || selectedEmployee.aadharNumber} />
                                            <InfoItem label="PAN Number" value={selectedEmployee.PAN || selectedEmployee.panNumber} />
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Professional Info</h3>
                                        <div className="profile-grid">
                                            <InfoItem label="Designation" value={selectedEmployee.Designation || selectedEmployee.designation} />
                                            <InfoItem label="Department" value={selectedEmployee.Department || selectedEmployee.department} />
                                            <InfoItem label="Confirmation Status" value={selectedEmployee.ConfirmationType || "Probation"} />
                                            <InfoItem label="Employment Type" value={selectedEmployee.EmploymentType || "regular"} />
                                            <InfoItem label="Date of Joining" value={formatDate(selectedEmployee.DateOfJoining || selectedEmployee.doj)} />
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Contact Details</h3>
                                        <div className="profile-grid">
                                            <InfoItem label="Email" value={selectedEmployee.Email || selectedEmployee.email} />
                                            <InfoItem label="Phone" value={selectedEmployee.Phone || selectedEmployee.phone} />
                                            <InfoItem label="Permanent Address" value={selectedEmployee.PermanentAddress || selectedEmployee.permanentAddress} span={2} />
                                            <InfoItem label="Present Address" value={selectedEmployee.PresentAddress || selectedEmployee.presentAddress} span={2} />
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Emergency Contact</h3>
                                        <div className="profile-grid">
                                            <InfoItem label="Contact Name" value={selectedEmployee.EmergencyName || selectedEmployee.emergencyName} />
                                            <InfoItem label="Relationship" value={selectedEmployee.EmergencyRelation || selectedEmployee.emergencyRelation} />
                                            <InfoItem label="Contact Phone" value={selectedEmployee.EmergencyPhone || selectedEmployee.emergencyPhone} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {detailTab === 'education' && (
                                <div className="profile-section">
                                    <h3>Education Background</h3>
                                    <div className="profile-grid">
                                        <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '12px', color: '#64748b' }}>10th (Secondary)</strong>
                                            <div className="profile-grid" style={{ marginTop: '5px' }}>
                                                <InfoItem label="School" value={selectedEmployee["10thSchool"]} />
                                                <InfoItem label="Board" value={selectedEmployee["10thBoard"]} />
                                                <InfoItem label="Year" value={selectedEmployee["10thYear"]} />
                                                <InfoItem label="Percentage" value={selectedEmployee["10thPercent"]} />
                                            </div>
                                        </div>
                                        <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '12px', color: '#64748b' }}>12th (Higher Secondary)</strong>
                                            <div className="profile-grid" style={{ marginTop: '5px' }}>
                                                <InfoItem label="School" value={selectedEmployee["12thSchool"]} />
                                                <InfoItem label="Board" value={selectedEmployee["12thBoard"]} />
                                                <InfoItem label="Year" value={selectedEmployee["12thYear"]} />
                                                <InfoItem label="Percentage" value={selectedEmployee["12thPercent"]} />
                                            </div>
                                        </div>
                                        {selectedEmployee.DiplomaDegree && (
                                            <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                                <strong style={{ fontSize: '12px', color: '#64748b' }}>Diploma</strong>
                                                <div className="profile-grid" style={{ marginTop: '5px' }}>
                                                    <InfoItem label="Degree" value={selectedEmployee.DiplomaDegree} />
                                                    <InfoItem label="Specialization / Specification" value={selectedEmployee.DiplomaSpecialization || selectedEmployee.DiplomaSpecification} />
                                                    <InfoItem label="College" value={selectedEmployee.DiplomaCollege} />
                                                    <InfoItem label="Year" value={selectedEmployee.DiplomaYear} />
                                                    <InfoItem label="Percentage" value={selectedEmployee.DiplomaPercent} />
                                                </div>
                                            </div>
                                        )}
                                        <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                            <strong style={{ fontSize: '12px', color: '#64748b' }}>Undergraduate (UG)</strong>
                                            <div className="profile-grid" style={{ marginTop: '5px' }}>
                                                <InfoItem label="Degree" value={selectedEmployee.UGDegree} />
                                                <InfoItem label="Specialization / Specification" value={selectedEmployee.UGSpecification || selectedEmployee.UGSpecialization} />
                                                <InfoItem label="College" value={selectedEmployee.UGCollege} />
                                                <InfoItem label="Year" value={selectedEmployee.UGYear} />
                                                <InfoItem label="Percentage" value={selectedEmployee.UGPercent} />
                                            </div>
                                        </div>
                                        {selectedEmployee.PGDegree && (
                                            <div style={{ gridColumn: '1/-1' }}>
                                                <strong style={{ fontSize: '12px', color: '#64748b' }}>Postgraduate (PG)</strong>
                                                <div className="profile-grid" style={{ marginTop: '5px' }}>
                                                    <InfoItem label="Degree" value={selectedEmployee.PGDegree} />
                                                    <InfoItem label="Specialization / Specification" value={selectedEmployee.PGSpecification || selectedEmployee.PGSpecialization} />
                                                    <InfoItem label="College" value={selectedEmployee.PGCollege} />
                                                    <InfoItem label="Year" value={selectedEmployee.PGYear} />
                                                    <InfoItem label="Percentage" value={selectedEmployee.PGPercent} />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {detailTab === 'experience' && (
                                <>
                                    <div className="profile-section">
                                        <h3>Professional Trainings</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="details-table">
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
                                                        try { trainings = typeof selectedEmployee.Trainings === 'string' ? JSON.parse(selectedEmployee.Trainings) : selectedEmployee.Trainings || []; } catch (e) { }
                                                        if (trainings.length === 0) return <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>;
                                                        return trainings.map((t, i) => (
                                                            <tr key={i}>
                                                                <td>{t.name || t.training_name}</td>
                                                                <td>{t.institute}</td>
                                                                <td>{t.duration || t.period || (t.StartDate && t.EndDate ? `${t.StartDate} to ${t.EndDate}` : (t.start_date && t.end_date ? `${t.start_date} to ${t.end_date}` : (t.StartDate || t.EndDate || t.start_date || t.end_date || "-")))}</td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Employment History</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="details-table">
                                                <thead>
                                                    <tr>
                                                        <th>Organization</th>
                                                        <th>Designation</th>
                                                        <th>Duration</th>
                                                        <th>Salary</th>
                                                        <th>Reason</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        let employments = [];
                                                        try { employments = typeof selectedEmployee.EmploymentHistory === 'string' ? JSON.parse(selectedEmployee.EmploymentHistory) : selectedEmployee.EmploymentHistory || []; } catch (e) { }
                                                        if (employments.length === 0) return <tr><td colSpan="5" style={{ textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>;
                                                        return employments.map((e, i) => (
                                                            <tr key={i}>
                                                                <td>{e.organization}</td>
                                                                <td>{e.designation}</td>
                                                                <td>{e.duration || (e.startDate && e.endDate ? `${e.startDate} to ${e.endDate}` : (e.period || "-"))}</td>
                                                                <td>{e.salary}</td>
                                                                <td>{e.reason}</td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {(() => {
                                        const hasLast = selectedEmployee.LastHrName || selectedEmployee.LastMgrName;
                                        const hasPrev = selectedEmployee.PrevHrName || selectedEmployee.PrevMgrName;

                                        if (!hasLast && !hasPrev) return null;

                                        return (
                                            <>
                                                {hasLast && (
                                                    <div className="profile-section">
                                                        <h3>Professional Reference - Last Company</h3>
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
                                                    <div className="profile-section">
                                                        <h3>Professional Reference - Previous Company</h3>
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
                                </>
                            )}

                            {detailTab === 'statutory' && (
                                <>
                                    <div className="profile-section">
                                        <h3>Dependent Details</h3>
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="details-table">
                                                <thead>
                                                    <tr>
                                                        <th>Name</th>
                                                        <th>Relation</th>
                                                        <th>Aadhar</th>
                                                        <th>PAN</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        let dependents = [];
                                                        try { dependents = typeof selectedEmployee.Dependents === 'string' ? JSON.parse(selectedEmployee.Dependents) : selectedEmployee.Dependents || []; } catch (e) { }
                                                        if (dependents.length === 0) return <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>;
                                                        return dependents.map((dep, i) => (
                                                            <tr key={i}>
                                                                <td>{dep.name}</td>
                                                                <td>{dep.relation}</td>
                                                                <td>{dep.aadharNumber || dep.aadhar_number}</td>
                                                                <td>{dep.panNumber || dep.pan_number}</td>
                                                            </tr>
                                                        ));
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    <div className="profile-section">
                                        <h3>Bank & Statutory</h3>
                                        <div className="profile-grid">
                                            <InfoItem label="Account Holder" value={selectedEmployee.BankAccountHolder || selectedEmployee.accountHolderName} />
                                            <InfoItem label="Bank Name" value={selectedEmployee.BankName || selectedEmployee.bankName} />
                                            <InfoItem label="Account Number" value={selectedEmployee.AccountNumber || selectedEmployee.accountNumber} />
                                            <InfoItem label="IFSC Code" value={selectedEmployee.IFSC || selectedEmployee.ifscCode} />
                                            <InfoItem label="UAN Number" value={selectedEmployee.UAN || selectedEmployee.uanNumber} />
                                            <InfoItem label="PF Number" value={selectedEmployee.PF || selectedEmployee.pfNumber} />
                                            <InfoItem label="ESI Number" value={selectedEmployee.ESINumber || selectedEmployee.esiNumber} />
                                        </div>
                                    </div>
                                </>
                            )}

                            {detailTab === 'documents' && (() => {
                                const emp = selectedEmployee;
                                const coreDocs = [
                                    ["Profile Photograph", emp.Photo, "user"],
                                    ["Current Resume", emp.Resume, "file"],
                                    ["Identity - Aadhar", emp.AadharFile, "shield"],
                                    ["Tax Card - PAN", emp.PANFile, "id-card"],
                                    ["Academic - SSLC", emp.SSLC, "award"],
                                    ["Academic - HSC", emp.HSC, "award"],
                                    ["Diploma Certificate", emp.DiplomaCertificate || emp.Diploma, "award"],
                                    ["Degree Certificate", emp.DegreeCertificate || emp.Degree, "award"],
                                    ["Post Graduation Certificate", emp.PGCertificate, "award"],
                                    ["Father's Aadhar", emp.AadharFather, "shield"],
                                    ["Mother's Aadhar", emp.AadharMother, "shield"],
                                    ["Experience Letter", emp.ExperienceLetter, "briefcase"],
                                    ["Latest Payslip", emp.Payslip, "credit-card"],
                                    ["Bank Passbook", emp.BankPassbook, "bank"],
                                    ["Offer Letter", emp.OfferLetter, "briefcase"]
                                ];

                                const dependentDocs = parseJSON(emp.Dependents).flatMap((dep, idx) => [
                                    [`Dependent ${idx + 1} Photo (${dep.name})`, dep.photoUrl, "user"],
                                    [`Dependent ${idx + 1} Aadhar (${dep.name})`, dep.aadharUrl, "shield"],
                                    [`Dependent ${idx + 1} PAN (${dep.name})`, dep.panUrl, "id-card"]
                                ]).filter(doc => doc[1]);

                                const trainingDocs = parseJSON(emp.Trainings).map((tr, idx) =>
                                    [`Training: ${tr.name} Certificate`, tr.certificateUrl, "award"]
                                ).filter(doc => doc[1]);

                                const allDocs = [...coreDocs, ...dependentDocs, ...trainingDocs];

                                return (
                                    <div className="bento-item bento-full animate-fade">
                                        <h3 className="section-subtitle">Digital Vault - Verified Documents</h3>
                                        <div className="doc-bento-grid">
                                            {allDocs.map(([lbl, link, icon], i) => (
                                                <div key={i} className="doc-tile">
                                                    <div className="tile-head">
                                                        <div className="tile-icon">
                                                            {(lbl.toLowerCase().includes("photo") || lbl.toLowerCase().includes("photograph")) && link ? (
                                                                <img src={getDriveDirectLink(link)} alt="Mini" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2.5">
                                                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                    <polyline points="14 2 14 8 20 8"></polyline>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div className="tile-meta">
                                                            <h4>{lbl}</h4>
                                                            <span className={`tile-status ${link ? 'status-valid' : 'status-missing'}`}>
                                                                {link ? "VERIFIED" : "PENDING"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    {link ? (
                                                        <a href={link} target="_blank" rel="noreferrer" className="btn-open">View Original File</a>
                                                    ) : (
                                                        <button className="btn-open" disabled style={{ opacity: 0.5, cursor: 'not-allowed', color: '#94a3b8' }}>Unavailable</button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                            {detailTab === 'admin' && (
                                <AdminActionsContent
                                    employee={selectedEmployee}
                                    onUpdate={(fields) => handleUpdateStatus(selectedEmployee.EmpID, fields)}
                                />
                            )}
                        </div>



                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
                            <button className="hr-btn-icon" onClick={() => handleExcelDownload(selectedEmployee.EmpID)}>Download Excel</button>
                            <button className="hr-btn-icon" style={{ background: '#64748b' }} onClick={() => window.print()}>Print Profile</button>
                            <button className="hr-btn-icon" style={{ background: '#f1f5f9', color: '#1e293b' }} onClick={() => setSelectedEmployee(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Policy Upload Modal */}
            {isUploadModalOpen && (
                <PolicyUploadModal
                    onClose={() => setIsUploadModalOpen(false)}
                    onSuccess={() => {
                        setIsUploadModalOpen(false);
                        loadPolicies();
                    }}
                    apiUrl={SCRIPT_URL}
                />
            )}

            {loading && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000 }}>
                    <div className="loader-dot"></div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Syncing data...</span>
                </div>
            )}

            {/* Print Section (Hidden on screen, visible on print) */}
            {selectedEmployee && <PrintProfile employee={selectedEmployee} />}
        </div>
    );
}

function InfoItem({ label, value, span = 1 }) {
    return (
        <div className="info-item" style={{ gridColumn: `span ${span}` }}>
            <label>{label}</label>
            <span>{value || "Not Provided"}</span>
        </div>
    );
}

function StatCardV2({ label, value, percentage, icon, color, onClick }) {
    const rgb = color.startsWith('#') ? hexToRgb(color) : '37, 99, 235';
    return (
        <div className="stat-card-v2" style={{ '--accent-color': color, '--accent-rgb': rgb, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <div className="stat-icon-box">
                {icon}
            </div>
            <div className="stat-info">
                <span>{label}</span>
                <h3>{value}</h3>
            </div>
            {percentage !== undefined && (
                <div className="stat-percentage">{percentage}%</div>
            )}
        </div>
    );
}

function StatusItem({ label, count, total, color }) {
    const percent = total > 0 ? (count / total) * 100 : 0;
    return (
        <div className="status-item">
            <div className="status-label-group">
                <div className="status-dot" style={{ '--dot-color': color }}></div>
                <div className="status-text">{label}</div>
            </div>
            <div className="dept-bar-bg">
                <div className="dept-bar-fill" style={{ width: `${percent}%`, background: color }}></div>
            </div>
            <div className="dept-count">{count}</div>
        </div>
    );
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        '37, 99, 235';
}

function PolicyUploadModal({ onClose, onSuccess, apiUrl }) {
    const [file, setFile] = useState(null);
    const [label, setLabel] = useState("");
    const [description, setDescription] = useState("");
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !label || !description) return alert("Please fill all fields");

        setIsUploading(true);
        try {
            const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });

            const payload = {
                action: "uploadHRPolicy",
                fileName: file.name,
                fileType: file.type,
                label: label,
                description: description,
                fileData: base64
            };

            const res = await fetch(apiUrl, {
                method: "POST",
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.status === "success") {
                alert("Policy uploaded and indexed successfully!");
                onSuccess();
            } else {
                throw new Error(data.message || "Failed to index policy in spreadsheet.");
            }
        } catch (err) {
            console.error(err);
            alert("Upload failed. Please check console for details.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="mg-modal-mask" style={{ zIndex: 2000 }} onClick={onClose}>
            <div className="mg-modal-core animate-fade-in" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                <div className="mg-modal-top-bar">
                    <h3 style={{ margin: 0 }}>Upload New Policy</h3>
                    <button className="mg-modal-dismiss" onClick={onClose}>&times;</button>
                </div>
                <div className="mg-modal-body">
                    <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="form-group">
                            <label>Policy Label (e.g. Leave Policy)</label>
                            <input
                                type="text"
                                value={label}
                                onChange={e => setLabel(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Brief Description</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Document File (.docx, .pdf)</label>
                            <input
                                type="file"
                                accept=".docx,.pdf"
                                onChange={e => setFile(e.target.files[0])}
                                required
                                style={{ width: '100%', padding: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}
                            />
                        </div>
                        <button
                            type="submit"
                            className="hr-btn-icon"
                            disabled={isUploading}
                            style={{ background: 'var(--admin-gradient)', justifyContent: 'center' }}
                        >
                            {isUploading ? "Uploading..." : "Start Upload"}
                        </button>
                    </form>
                </div>
            </div>
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

                // 1. Check if it's a PDF
                const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.title?.toLowerCase().includes('pdf');

                if (isPdf) {
                    // PDF can be viewed directly via Google Drive Preview Link
                    // This is much more reliable than docx-preview for PDFs
                    setLoading(false);
                    return;
                }

                // 2. It's likely a DOCX, fetch via proxy to bypass CORS
                const proxyUrl = `${SCRIPT_URL}?action=proxyFile&fileId=${doc.fileId}`;
                const response = await fetch(proxyUrl);
                const data = await response.json();

                if (data.status !== "success") throw new Error(data.message || "Failed to fetch document content");

                // Convert base64 to blob
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
                console.error("Document rendering error:", err);
                if (isMounted) {
                    setError("Could not render document automatically. You can still download it using the icon above.");
                    setLoading(false);
                }
            }
        }
        loadDoc();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                        <a href={doc.downloadPath} download className="hr-btn-icon" style={{ padding: '8px 12px', background: '#f8fafc', color: '#475569', textDecoration: 'none', height: 'auto', boxShadow: 'none' }}>
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

export default HrDashboard;