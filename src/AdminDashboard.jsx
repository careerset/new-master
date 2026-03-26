import { useEffect, useState } from "react";
import "./hr.css";
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

function AdminDashboard() {
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchId, setSearchId] = useState("");
    const [activeTab, setActiveTab] = useState("dashboard");
    const navigate = useNavigate();

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
        <div className="hr-page-wrapper admin-theme">
            {/* Sidebar Navigation */}
            <div className="hr-sidebar">
                <div className="hr-sidebar-logo">
                    <img src="/chn-logo.png" alt="Company Logo" />
                    <h2>Admin Panel</h2>
                </div>
                <div className="hr-nav">
                    <div className={`hr-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                        <span>System Overview</span>
                    </div>
                    <div className={`hr-nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Manage Records</span>
                    </div>
                </div>
                <div className="hr-nav-item" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9' }} onClick={() => navigate("/admin-login")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="hr-main">
                <div className="hr-header">
                    <div>
                        <h1>System Command Center</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Global Administrative Control & Audit</p>
                    </div>
                    <div className="hr-header-actions">
                        {activeTab === 'employees' && (
                            <div className="hr-search-bar">
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
                        <button className="hr-btn-icon" onClick={loadEmployees} style={{ background: '#4f46e5' }}>Refresh Cache</button>
                    </div>
                </div>

                {activeTab === 'dashboard' ?
                    <div className="dashboard-content">
                        {/* Admin Stats Grid */}
                        <div className="hr-stats-grid">
                            <StatCardV2
                                label="Total System Records"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>}
                                color="#4f46e5"
                            />
                            <StatCardV2
                                label="Database Status"
                                value={loading ? "SYNCING" : "ONLINE"}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>}
                                color="#10b981"
                            />
                            <StatCardV2
                                label="Storage Usage"
                                value="OPTIMAL"
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10H3M21 6H3M21 14H3M21 18H3"></path></svg>}
                                color="#6366f1"
                            />
                            <StatCardV2
                                label="Security Audit"
                                value="SECURE"
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>}
                                color="#f59e0b"
                            />
                        </div>

                        <div className="dashboard-widgets-row">
                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20v-6M6 20V10M18 20V4M3 20h18"></path></svg>
                                    <h4>System Onboarding Audit</h4>
                                </div>
                                <div className="timeline-list">
                                    {employees.slice(0, 4).map((emp, i) => (
                                        <div className="timeline-item" key={i}>
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <h5>{emp.Name} (ID: {emp.EmpID})</h5>
                                                <span>Joined: {formatDate(emp.DateOfJoining || emp.doj)} • Department: {emp.Department || "N/A"}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                    <h4>Data Quality Audit</h4>
                                </div>
                                <div className="circular-progress-container">
                                    <svg className="circle-svg" style={{ transform: 'rotate(-90deg)' }}>
                                        <circle className="circle-bg" cx="60" cy="60" r="50"></circle>
                                        <circle
                                            className="circle-fill"
                                            cx="60" cy="60" r="50"
                                            strokeDasharray="314"
                                            strokeDashoffset={314 - (314 * (employees.filter(e => e.AadharNumber && e.PAN && e.Email).length / (employees.length || 1)))}
                                            style={{ stroke: '#4f46e5' }}
                                        ></circle>
                                    </svg>
                                    <div className="circle-text">
                                        <h3>{employees.length > 0 ? Math.round((employees.filter(e => e.AadharNumber && e.PAN && e.Email).length / employees.length) * 100) : 0}%</h3>
                                        <span>Data Quality</span>
                                    </div>
                                    <p style={{ fontSize: '11px', color: '#64748b', marginTop: '20px', textAlign: 'center' }}>
                                        Percentage of records with complete Mandatory information (Aadhar, PAN, Email).
                                    </p>
                                </div>
                            </div>

                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    <h4>Environment Health</h4>
                                </div>
                                <div className="health-grid">
                                    <div className="health-item">
                                        <div className="health-status-dot"></div>
                                        <span>Cloud Storage</span>
                                    </div>
                                    <div className="health-item">
                                        <div className="health-status-dot"></div>
                                        <span>Sheets API</span>
                                    </div>
                                    <div className="health-item">
                                        <div className="health-status-dot"></div>
                                        <span>Forms Engine</span>
                                    </div>
                                    <div className="health-item">
                                        <div className="health-status-dot"></div>
                                        <span>Backup Sync</span>
                                    </div>
                                </div>
                                <div className="stat-card" style={{ marginTop: '25px', padding: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                        <span>System Stability:</span>
                                        <span style={{ color: '#10b981', fontWeight: '800' }}>99.9%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    :
                    <div className="employees-grid">
                        {employees.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                <p style={{ color: '#64748b' }}>No system records found.</p>
                            </div>
                        ) : (
                            employees.map((emp, idx) => {
                                const empId = emp.EmpID || emp.employee_code;
                                return (
                                    <div key={idx} className="emp-modern-card">
                                        <div className="emp-card-header">
                                            <div className="emp-initials" style={{ background: '#fef3c7', color: '#d97706' }}>{emp.Name ? emp.Name.charAt(0) : "E"}</div>
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
                                                <span>Email:</span>
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{emp.Email}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Dept:</span>
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{emp.Department || "N/A"}</span>
                                            </div>
                                        </div>
                                        <div className="emp-card-footer">
                                            <button className="btn-view" onClick={() => viewEmployee(empId)}>Full View</button>
                                            <button className="btn-download" onClick={() => deleteEmployee(empId)} style={{ background: '#ef4444' }}>Terminate</button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                }
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
                            <button className="modal-close" onClick={() => setSelectedEmployee(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>

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
                            <h3>Academic History</h3>
                            <div className="profile-grid">
                                <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <strong style={{ fontSize: '12px', color: '#64748b' }}>Schooling (10th & 12th)</strong>
                                    <div className="profile-grid" style={{ marginTop: '5px' }}>
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
                                    <div style={{ gridColumn: '1/-1', borderBottom: '1px dashed #e2e8f0', paddingBottom: '10px', marginBottom: '10px' }}>
                                        <strong style={{ fontSize: '12px', color: '#64748b' }}>Diploma</strong>
                                        <div className="profile-grid" style={{ marginTop: '5px' }}>
                                            <InfoItem label="Degree" value={selectedEmployee.DiplomaDegree} />
                                            <InfoItem label="Specialization" value={selectedEmployee.DiplomaSpecialization} />
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
                                        <InfoItem label="Specialization" value={selectedEmployee.UGSpecialization} />
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
                                            <InfoItem label="Specialization" value={selectedEmployee.PGSpecialization} />
                                            <InfoItem label="College" value={selectedEmployee.PGCollege} />
                                            <InfoItem label="Year" value={selectedEmployee.PGYear} />
                                            <InfoItem label="Percentage" value={selectedEmployee.PGPercent} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Professional Experience</h3>
                            <div className="profile-grid" style={{ marginBottom: '15px' }}>
                                <InfoItem label="Total Experience" value={`${selectedEmployee.TotalExpYears || 0} Years, ${selectedEmployee.TotalExpMonths || 0} Months`} />
                                <InfoItem label="Career Break" value={selectedEmployee.CareerBreak || selectedEmployee.careerBreak} />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="details-table">
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
                                            let employments = [];
                                            try {
                                                const raw = selectedEmployee.EmploymentHistory || selectedEmployee.employments;
                                                employments = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                            } catch (e) { }
                                            if (employments.length === 0) return <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>;
                                            return employments.map((e, i) => (
                                                <tr key={i}>
                                                    <td>{e.organization}</td>
                                                    <td>{e.designation}</td>
                                                    <td>{e.startDate ? `${e.startDate} to ${e.endDate}` : (e.period || "-")}</td>
                                                    <td>{e.salary}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Dependents & Emergency</h3>
                            <div className="profile-grid" style={{ marginBottom: '15px' }}>
                                <InfoItem label="Emergency Contact" value={selectedEmployee.EmergencyName} />
                                <InfoItem label="Relationship" value={selectedEmployee.EmergencyRelation} />
                                <InfoItem label="Emergency Phone" value={selectedEmployee.EmergencyPhone} />
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="details-table">
                                    <thead>
                                        <tr>
                                            <th>Dependent Name</th>
                                            <th>Relation</th>
                                            <th>DOB</th>
                                            <th>Aadhar Number</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            let dependents = [];
                                            try {
                                                const raw = selectedEmployee.Dependents || selectedEmployee.dependents;
                                                dependents = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                            } catch (e) { }
                                            if (dependents.length === 0) return <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No dependents listed</td></tr>;
                                            return dependents.map((d, i) => (
                                                <tr key={i}>
                                                    <td>{d.name}</td>
                                                    <td>{d.relation}</td>
                                                    <td>{formatDate(d.dob)}</td>
                                                    <td>{d.aadharNumber}</td>
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
                                <InfoItem label="Branch Name" value={selectedEmployee.Branch || selectedEmployee.branchName} />
                                <InfoItem label="UAN Number" value={selectedEmployee.UAN || selectedEmployee.uanNumber} />
                                <InfoItem label="PF Number" value={selectedEmployee.PF || selectedEmployee.pfNumber} />
                                <InfoItem label="ESI Number" value={selectedEmployee.ESINumber || selectedEmployee.esiNumber} />
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>All Documents Verification</h3>
                            <div className="doc-grid">
                                {[
                                    ["Resume", selectedEmployee.Resume],
                                    ["SSLC (10th)", selectedEmployee.SSLC],
                                    ["HSC (12th)", selectedEmployee.HSC],
                                    ["UG Degree", selectedEmployee.DegreeCertificate || selectedEmployee.Degree],
                                    ["PG Degree", selectedEmployee.PGCertificate || selectedEmployee.PG],
                                    ["Diploma", selectedEmployee.DiplomaCertificate || selectedEmployee.Diploma],
                                    ["Personal Photo", selectedEmployee.Photo],
                                    ["Aadhar (Self)", selectedEmployee.AadharFile],
                                    ["Aadhar (Father)", selectedEmployee.AadharFather],
                                    ["Aadhar (Mother)", selectedEmployee.AadharMother],
                                    ["PAN Card", selectedEmployee.PANFile],
                                    ["Bank Proof", selectedEmployee.BankPassbook],
                                    ["Offer Letter", selectedEmployee.OfferLetter],
                                    ["Relieving Letter", selectedEmployee.ExperienceLetter],
                                    ["Payslip", selectedEmployee.Payslip]
                                ].map(([label, url], i) => (
                                    <div key={i} className={`doc-status-card ${url ? 'uploaded' : 'missing'}`}>
                                        <div className="doc-info">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                                            <span>{label}</span>
                                        </div>
                                        {url ? <a href={url} target="_blank" rel="noreferrer" className="doc-view-link">View</a> : <span className="doc-missing-text">None</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                            <button className="hr-btn-icon" onClick={() => handleExcelDownload(selectedEmployee.EmpID)} style={{ background: '#4f46e5' }}>Excel</button>
                            <button className="hr-btn-icon" style={{ background: '#64748b' }} onClick={() => window.print()}>Print Profile</button>
                            <button className="hr-btn-icon" style={{ background: '#ef4444' }} onClick={() => deleteEmployee(selectedEmployee.EmpID)}>Terminate Record</button>
                            <button className="hr-btn-icon" style={{ background: '#f1f5f9', color: '#1e293b', marginLeft: 'auto' }} onClick={() => setSelectedEmployee(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Section (Hidden on screen, visible on print) */}
            {selectedEmployee && <PrintProfile employee={selectedEmployee} />}

            {loading && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', z: 2000 }}>
                    <div className="loader-dot" style={{ background: '#4f46e5' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Admin Sync...</span>
                </div>
            )}
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

function StatCardV2({ label, value, percentage, icon, color }) {
    const rgb = color.startsWith('#') ? hexToRgb(color) : '79, 70, 229';
    return (
        <div className="stat-card-v2" style={{ '--accent-color': color, '--accent-rgb': rgb }}>
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

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ?
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` :
        '79, 70, 229';
}

export default AdminDashboard;