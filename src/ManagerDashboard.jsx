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
        <div className="hr-page-wrapper manager-theme">
            {/* Sidebar Navigation */}
            <div className="hr-sidebar">
                <div className="hr-sidebar-logo">
                    <img src="/chn-logo.png" alt="Company Logo" />
                    <h2>Manager Portal</h2>
                </div>
                <div className="hr-nav">
                    <div className={`hr-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                        <span>Insights</span>
                    </div>
                    <div className={`hr-nav-item ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                        <span>Team Members</span>
                    </div>
                </div>
                <div className="hr-nav-item" style={{ marginTop: 'auto', borderTop: '1px solid #f1f5f9' }} onClick={() => navigate("/manager-login")}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                    <span>Logout</span>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="hr-main">
                <div className="hr-header">
                    <div>
                        <h1>Team Insights</h1>
                        <p style={{ color: '#64748b', margin: '5px 0 0 0', fontSize: '14px' }}>Workforce analytics and team management</p>
                    </div>
                    <div className="hr-header-actions">
                        {activeTab === 'employees' && (
                            <div className="hr-search-bar">
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
                        <button className="hr-btn-icon" onClick={loadEmployees} style={{ background: '#059669' }}>Refresh Team</button>
                    </div>
                </div>

                {activeTab === 'dashboard' ?
                    <div className="dashboard-content">
                        {/* Manager Stats Grid */}
                        <div className="hr-stats-grid">
                            <StatCardV2
                                label="Active Team Size"
                                value={employees.length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                                color="#059669"
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
                                color="#10b981"
                                percentage={employees.length > 0 ? Math.round((employees.filter(e => {
                                    const joinDate = new Date(e.DateOfJoining || e.doj);
                                    const thirtyDaysAgo = new Date();
                                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                    return joinDate >= thirtyDaysAgo;
                                }).length / employees.length) * 100) : 0}
                            />
                            <StatCardV2
                                label="Senior Talent (4y+)"
                                value={employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                                color="#2563eb"
                            />
                            <StatCardV2
                                label="Emergency Contacts"
                                value={employees.filter(e => e.EmergencyPhone).length}
                                icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>}
                                color="#ef4444"
                            />
                        </div>

                        <div className="dashboard-widgets-row">
                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                                    <h4>Workforce Tenancy</h4>
                                </div>
                                <div className="dept-list">
                                    <div className="dept-item">
                                        <div className="dept-name">Freshers</div>
                                        <div className="dept-bar-bg">
                                            <div className="dept-bar-fill" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) === 0).length / (employees.length || 1)) * 100}%`, background: '#10b981' }}></div>
                                        </div>
                                        <div className="dept-count">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) === 0).length}</div>
                                    </div>
                                    <div className="dept-item">
                                        <div className="dept-name">1-3 Years</div>
                                        <div className="dept-bar-bg">
                                            <div className="dept-bar-fill" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3).length / (employees.length || 1)) * 100}%`, background: '#3b82f6' }}></div>
                                        </div>
                                        <div className="dept-count">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 1 && (parseInt(e.TotalExpYears) || 0) <= 3).length}</div>
                                    </div>
                                    <div className="dept-item">
                                        <div className="dept-name">4-7 Years</div>
                                        <div className="dept-bar-bg">
                                            <div className="dept-bar-fill" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7).length / (employees.length || 1)) * 100}%`, background: '#f59e0b' }}></div>
                                        </div>
                                        <div className="dept-count">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 4 && (parseInt(e.TotalExpYears) || 0) <= 7).length}</div>
                                    </div>
                                    <div className="dept-item">
                                        <div className="dept-name">8+ Years</div>
                                        <div className="dept-bar-bg">
                                            <div className="dept-bar-fill" style={{ width: `${(employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 8).length / (employees.length || 1)) * 100}%`, background: '#ef4444' }}></div>
                                        </div>
                                        <div className="dept-count">{employees.filter(e => (parseInt(e.TotalExpYears) || 0) >= 8).length}</div>
                                    </div>
                                </div>
                            </div>


                            <div className="widget-card">
                                <div className="widget-header">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                                    <h4>Team Demographics</h4>
                                </div>
                                <div className="status-list">
                                    <StatusItem label="UG Graduates" count={employees.filter(e => e.UGDegree).length} total={employees.length} color="#3b82f6" />
                                    <StatusItem label="PG Graduates" count={employees.filter(e => e.PGDegree).length} total={employees.length} color="#6366f1" />
                                    <StatusItem label="Relieve Pending" count={0} total={employees.length} color="#f59e0b" />
                                    <StatusItem label="Married" count={employees.filter(e => e.MaritalStatus?.toLowerCase() === 'married' || e.maritalStatus?.toLowerCase() === 'married').length} total={employees.length} color="#ec4899" />
                                </div>
                            </div>
                        </div>
                    </div>
                    :
                    <div className="employees-grid">
                        {employees.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                <p style={{ color: '#64748b' }}>No employee records found.</p>
                            </div>
                        ) : (
                            employees.map((emp, idx) => {
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
                                                <span>Email:</span>
                                                <span style={{ fontWeight: '600', color: '#1e293b' }}>{emp.Email}</span>
                                            </div>
                                        </div>
                                        <div className="emp-card-footer">
                                            <button className="btn-view" onClick={() => viewEmployee(empId)}>View Profile</button>
                                            <button className="btn-download" onClick={() => deleteEmployee(empId)} style={{ background: '#ef4444' }}>Delete</button>
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
                            <h3>Academic Background</h3>
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
                            <h3>Experience & History</h3>
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
                            <h3>Professional Trainings</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="details-table">
                                    <thead>
                                        <tr>
                                            <th>Training</th>
                                            <th>Institute</th>
                                            <th>Duration/Period</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            let trainings = [];
                                            try {
                                                const raw = selectedEmployee.Trainings || selectedEmployee.trainings;
                                                trainings = typeof raw === 'string' ? JSON.parse(raw) : raw || [];
                                            } catch (e) { }
                                            if (trainings.length === 0) return <tr><td colSpan="3" style={{ textAlign: 'center', color: '#94a3b8' }}>No records found</td></tr>;
                                            return trainings.map((t, i) => (
                                                <tr key={i}>
                                                    <td>{t.name || t.training_name}</td>
                                                    <td>{t.institute}</td>
                                                    <td>{t.period || (t.StartDate && t.EndDate ? `${formatDate(t.StartDate)} to ${formatDate(t.EndDate)}` : (formatDate(t.StartDate) || formatDate(t.EndDate) || "-"))}</td>
                                                </tr>
                                            ));
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Dependent Details</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="details-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
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
                            <h3>Emergency Contact</h3>
                            <div className="profile-grid">
                                <InfoItem label="Contact Name" value={selectedEmployee.EmergencyName || selectedEmployee.emergencyName} />
                                <InfoItem label="Relationship" value={selectedEmployee.EmergencyRelation || selectedEmployee.emergencyRelation} />
                                <InfoItem label="Contact Phone" value={selectedEmployee.EmergencyPhone || selectedEmployee.emergencyPhone} />
                            </div>
                        </div>

                        <div className="profile-section">
                            <h3>Document Verification</h3>
                            <div className="doc-grid">
                                {[
                                    ["Photo", selectedEmployee.Photo],
                                    ["Resume", selectedEmployee.Resume],
                                    ["Aadhar (Self)", selectedEmployee.AadharFile],
                                    ["PAN Card", selectedEmployee.PANFile],
                                    ["SSLC (10th)", selectedEmployee.SSLC],
                                    ["HSC (12th)", selectedEmployee.HSC],
                                    ["UG Degree", selectedEmployee.DegreeCertificate || selectedEmployee.Degree],
                                    ["PG Degree", selectedEmployee.PGCertificate || selectedEmployee.PG],
                                    ["Bank Proof", selectedEmployee.BankPassbook],
                                    ["Offer Letter", selectedEmployee.OfferLetter]
                                ].map(([label, url], i) => (
                                    <div key={i} className={`doc-status-card ${url ? 'uploaded' : 'missing'}`} style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '500' }}>{label}</span>
                                        {url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: '#059669', fontSize: '13px', textDecoration: 'none', fontWeight: '600' }}>View</a> : <span style={{ color: '#ef4444', fontSize: '12px' }}>None</span>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '30px' }}>
                            <button className="hr-btn-icon" onClick={() => handleExcelDownload(selectedEmployee.EmpID)} style={{ background: '#059669' }}>Download Excel</button>
                            <button className="hr-btn-icon" style={{ background: '#64748b' }} onClick={() => window.print()}>Print Profile</button>
                            <button className="hr-btn-icon" style={{ background: '#f1f5f9', color: '#1e293b' }} onClick={() => setSelectedEmployee(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Section (Hidden on screen, visible on print) */}
            {selectedEmployee && <PrintProfile employee={selectedEmployee} />}

            {loading && (
                <div style={{ position: 'fixed', bottom: '30px', right: '30px', background: 'white', padding: '15px 25px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '10px', z: 2000 }}>
                    <div className="loader-dot" style={{ background: '#059669' }}></div>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>Syncing data...</span>
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
    const rgb = color.startsWith('#') ? hexToRgb(color) : '16, 185, 129';
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
        '16, 185, 129';
}

export default ManagerDashboard;