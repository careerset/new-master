import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { renderAsync } from "docx-preview";
import JSZip from "jszip";
import * as faceapi from "@vladmandic/face-api";
import "./employeeDashboard.css";

function LegendNode({ color, label, solid }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: '#475569' }}>
            <div style={{ 
                width: '14px', height: '14px', borderRadius: '4px', 
                background: solid ? 'transparent' : color, 
                border: solid ? `2.5px solid ${color}` : 'none',
                boxShadow: solid ? 'none' : `0 4px 10px ${color}20`
            }}></div>
            {label}
        </div>
    );
}

// Required for docx-preview to work correctly in some environments
window.JSZip = JSZip;

const SCRIPT_URL = process.env.REACT_APP_API_URL;

let MODELS_LOADED = false;

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

const getDriveDirectLink = (url) => {
  if (!url) return null;
  if (url.includes("drive.google.com")) {
    const id = url.match(/[-\w]{25,}/);
    if (id) return `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
    // Fallback uc method
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

function EmployeeDashboard() {
  const navigate = useNavigate();
  const [employeeData, setEmployeeData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [viewingDoc, setViewingDoc] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState("Punched Out");
  const [punchLoading, setPunchLoading] = useState(false);
  const [todayPunch, setTodayPunch] = useState(null);
  const [showFaceVerify, setShowFaceVerify] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("employeeLoggedIn");
    const employeeId = localStorage.getItem("employeeId");

    if (!isLoggedIn || !employeeId) {
      navigate("/");
      return;
    }

    if (!API_URL) {
      console.error("API URL is not configured. Please check your .env file and RESTART the dev server.");
      return;
    }
    fetch(`${API_URL}?action=getEmployee&empId=${employeeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Network response was not ok");
        return res.json();
      })
      .then((data) => {
        if (data.status === "success") {
          setEmployeeData(data.employee);
        }
      })
      .catch((err) => console.log(err));

    async function fetchPolicies() {
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
            // Fallback demo policies
            setPolicies([
              { label: "Travel Policy", viewUrl: "/Hrpolicy/Travel Policy_Final.docx", downloadUrl: "/Hrpolicy/Travel Policy_Final.docx", description: "Guidelines for official travel, expenses, and trip reimbursements" }
            ]);
        }
    }
    async function fetchAttendance() {
        try {
            const res = await fetch(`${API_URL}?action=getAttendanceStatus&empId=${employeeId}`);
            const data = await res.json();
            if (data.status === "success") {
                setAttendanceStatus(data.isPunchedIn ? "Punched In" : "Punched Out");
                setTodayPunch(data.punchDetails);
            }
        } catch (err) {
            console.error("Error fetching attendance status:", err);
        }
    }

    fetchPolicies();
    fetchAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, API_URL]);

  useEffect(() => {
    if (activeTab === 'attendance' && attendanceHistory.length === 0) {
        fetchAttendanceHistory();
    }
  }, [activeTab]);

  const fetchAttendanceHistory = useCallback(async () => {
    const employeeId = localStorage.getItem("employeeId");
    if (!employeeId || !API_URL) return;

    setIsAttendanceLoading(true);
    try {
      const res = await fetch(`${API_URL}?action=getGlobalAttendance`);
      const data = await res.json();
      if (data.status === "success" && data.attendance) {
        const filtered = data.attendance.filter(a => 
          (a.empid || a.empId || a.EmplID || a.employee_code) === employeeId
        ).map(a => ({
          date: a.date || a.Date,
          inTime: a.intime || a.inTime || a.InTime,
          outTime: a.outtime || a.outTime || a.OutTime,
          status: a.status || a.Status,
          location: a.location || a.Location
        })).reverse();
        setAttendanceHistory(filtered);
      }
    } catch (err) {
      console.error("Error loading attendance history:", err);
    } finally {
      setIsAttendanceLoading(false);
    }
  }, [API_URL]);

  const proceedWithPunch = useCallback(async () => {
    const employeeId = localStorage.getItem("employeeId");
    if (!employeeId || !API_URL || punchLoading) return;

    setPunchLoading(true);
    const newStatus = attendanceStatus === "Punched In" ? "Out" : "In";
    
    try {
        const formData = new URLSearchParams();
        formData.append("action", "punchAttendance");
        formData.append("empId", employeeId);
        formData.append("status", newStatus);
        
        if (navigator.geolocation) {
            await new Promise((resolve) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        formData.append("location", `${pos.coords.latitude},${pos.coords.longitude}`);
                        resolve();
                    },
                    () => resolve()
                );
            });
        }

        const res = await fetch(API_URL, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        if (data.status === "success") {
            setAttendanceStatus(newStatus === "In" ? "Punched In" : "Punched Out");
            setTodayPunch(data.punchDetails);
            setShowFaceVerify(false); // Close first!
            alert(`Punched ${newStatus === "In" ? "In" : "Out"} successfully!`);
        } else {
            alert("Error: " + (data.message || "Failed to mark attendance"));
        }
    } catch (err) {
        console.error("Punch error:", err);
        alert("Server connection error during punch-in.");
    } finally {
        setPunchLoading(false);
    }
  }, [attendanceStatus, API_URL, punchLoading]);

  const handlePunch = useCallback(async () => {
    // Check for face verification requirement
    if (employeeData?.Photo) {
      setShowFaceVerify(true);
      return;
    }
    // If no photo set, proceed with standard punch
    proceedWithPunch();
  }, [employeeData, proceedWithPunch]);

  const handleLogout = () => {
    localStorage.removeItem("employeeLoggedIn");
    localStorage.removeItem("employeeId");
    navigate("/");
  };

  if (!employeeData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
        <p style={{ fontWeight: 800, color: '#4f46e5', fontSize: '20px', animation: 'pulse 1.5s infinite' }}>Accessing Secure Portal...</p>
      </div>
    );
  }

  const emp = employeeData;

  const navItems = [
    { id: "overview", label: "At a glance", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { id: "profile", label: "My Hub", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg> },
    { id: "career", label: "Growth Path", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 10l-6-6-6 6 6 6 6-6z"></path><path d="M6 10L0 16l6 6 6-6-6-6z"></path></svg> },
    { id: "documents", label: "Digital Vault", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg> },
    { id: "attendance", label: "Attendance", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
    { id: "books", label: "HR Books", icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg> }
  ];

  return (
    <div className={`emp-dashboard-container ${isSidebarOpen ? 'sidebar-mobile-active' : ''}`}>
      {/* Mobile Header */}
      <div className="mobile-dash-header">
        <img src="/chn-logo.png" alt="Logo" className="mobile-logo" />
        <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          )}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`dash-sidebar ${isSidebarOpen ? 'active' : ''}`}>
        <div className="brand-section">
          <img src="/chn-logo.png" alt="CHN" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after selection
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          {emp.Photo ? (
            <img src={getDriveDirectLink(emp.Photo)} alt="Me" className="user-mini-img" />
          ) : (
            <div className="user-mini-img" style={{ background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>{(emp.Name || "E").charAt(0)}</div>
          )}
          <div className="user-mini-info">
            <span className="name">{emp.Name || "Employee"}</span>
            <span className="role">{emp.Designation || "Team Member"}</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="dash-main">
        <header className="dash-header">
          <div className="header-title">
            <h1>Workspace</h1>
            <p>Welcome back, {emp.Name?.split(' ')[0] || "Employee"}!</p>
          </div>
          <div className="header-actions">
            <button className="btn-edit-profile" onClick={() => navigate(`/employee-form?edit=true&empId=${localStorage.getItem("employeeId")}`)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
              Edit Profile
            </button>
            <button className="btn-signout" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sign Out
            </button>
          </div>
        </header>

        {activeTab === "overview" && (
          <div className="bento-grid animate-fade">
            {/* User Profile Card */}
            <div className="bento-item bento-large" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div className="profile-img-big" style={{ position: 'relative', marginBottom: '20px' }}>
                {getDriveDirectLink(emp.Photo) ? (
                  <img
                    src={getDriveDirectLink(emp.Photo)}
                    alt="Avatar"
                    style={{ width: '120px', height: '120px', borderRadius: '35px', objectFit: 'cover', border: '5px solid #f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  />
                ) : (
                  <div style={{ width: '120px', height: '120px', borderRadius: '35px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '800', border: '5px solid #f8fafc', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    {emp.Name ? emp.Name.charAt(0) : "E"}
                  </div>
                )}
                <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: '#22c55e', width: '20px', height: '20px', borderRadius: '50%', border: '4px solid white' }}></div>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0' }}>{emp.Name}</h2>
              <p style={{ color: '#64748b', fontSize: '15px', fontWeight: 600, margin: '8px 0 20px 0' }}>{emp.Designation} • {emp.Department}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span style={{ padding: '6px 14px', background: '#eff6ff', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>ID: {emp.EmpID || emp.employee_code}</span>
                <span style={{ padding: '6px 14px', background: '#fef2f2', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: '#ef4444' }}>{emp.BloodGroup || "N/A"}</span>
                <span style={{ padding: '6px 14px', background: '#ecfdf5', borderRadius: '10px', fontSize: '12px', fontWeight: 700, color: '#10b981' }}>{emp.Gender || "N/A"}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bento-item">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#fdf4ff', color: '#d946ef' }}>📅</div>
                <div className="bento-title">Tenure</div>
              </div>
              <div className="bento-content">
                <div className="info-pair">
                  <label>Joining Date</label>
                  <div className="val">{formatDate(emp.DateOfJoining || emp.doj)}</div>
                </div>
              </div>
            </div>

            <div className="bento-item">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📞</div>
                <div className="bento-title">Connect</div>
              </div>
              <div className="bento-content">
                <div className="info-pair">
                  <label>Personal Phone</label>
                  <div className="val">{emp.Phone || emp.Phone}</div>
                  <label>Personal Email</label>
                  <div className="val">{emp.Email || emp.email}</div>

                </div>
              </div>
            </div>

            {/* Address Bento */}
            <div className="bento-item bento-wide">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#fff7ed', color: '#f97316' }}>📍</div>
                <div className="bento-title">Domicile</div>
              </div>
              <div className="bento-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div className="info-pair">
                    <label>Permanent Address</label>
                    <div className="val" style={{ fontSize: '13px' }}>{emp.PermanentAddress}</div>
                  </div>
                  <div className="info-pair">
                    <label>Current Address</label>
                    <div className="val" style={{ fontSize: '13px' }}>{emp.PresentAddress}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Bento */}
            <div className="bento-item">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>🛡️</div>
                <div className="bento-title">Support</div>
              </div>
              <div className="bento-content">
                <div className="info-pair">
                  <label>Emergency Contact</label>
                  <div className="val">{emp.EmergencyName}</div>
                  <div className="val" style={{ fontSize: '13px', marginTop: '4px' }}>{emp.EmergencyPhone} ({emp.EmergencyRelation})</div>
                </div>
              </div>
            </div>

            {/* Attendance Punch Bento */}
            <div className={`bento-item punch-bento ${attendanceStatus === "Punched In" ? "active-punch" : ""}`}>
              <div className="bento-header">
                <div className="bento-icon" style={{ background: attendanceStatus === "Punched In" ? "#ecfdf5" : "#fef2f2", color: attendanceStatus === "Punched In" ? "#10b981" : "#ef4444" }}>⏱️</div>
                <div className="bento-title">Daily Attendance</div>
              </div>
              <div className="bento-content" style={{ textAlign: 'center', paddingTop: '10px' }}>
                <div className={`punch-status-label ${attendanceStatus === "Punched In" ? "in" : "out"}`}>
                  {attendanceStatus}
                </div>
                {todayPunch && (
                  <p className="punch-time-info">
                  {attendanceStatus === "Punched In" ? `Shift Started: ${formatTime(todayPunch.inTime)}` : todayPunch.outTime ? `Shift Ended: ${formatTime(todayPunch.outTime)}` : "Not started yet"}
                  </p>
                )}
                <button 
                  className={`punch-action-btn ${attendanceStatus === "Punched In" ? "out-btn" : "in-btn"}`}
                  onClick={handlePunch}
                  disabled={punchLoading}
                >
                  {punchLoading ? <div className="spinner mini"></div> : (attendanceStatus === "Punched In" ? "Punch Out" : "Punch In Now")}
                </button>
              </div>
            </div>

            {/* Marital Bento */}
            <div className="bento-item">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>💍</div>
                <div className="bento-title">Life</div>
              </div>
              <div className="bento-content">
                <div className="info-pair">
                  <label>Status</label>
                  <div className="val">{emp.MaritalStatus || "Single"}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="bento-grid animate-fade">
            {/* Identity Group */}
            <div className="bento-item bento-wide">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>📄</div>
                <div className="bento-title">Identity Registry</div>
              </div>
              <div className="protocol-strip-container">
                <ProtocolStrip icon="💳" label="Aadhar ID" value={emp.AadharNumber} />
                <ProtocolStrip icon="🏷️" label="Tax PAN" value={emp.PAN} />
              </div>
            </div>

            {/* Statutory Group */}
            <div className="bento-item bento-wide">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>📈</div>
                <div className="bento-title">Statutory Stream</div>
              </div>
              <div className="protocol-strip-container">
                <ProtocolStrip icon="🏛️" label="PF Account" value={emp.PF || emp.pfNumber} />
                <ProtocolStrip icon="🔗" label="UAN Index" value={emp.UAN || emp.uanNumber} />
                <ProtocolStrip icon="🏥" label="ESI Number" value={emp.ESINumber || emp.esiNumber} />
              </div>
            </div>

            {/* Financial Group */}
            <div className="bento-item bento-wide">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#fff7ed', color: '#f97316' }}>🏦</div>
                <div className="bento-title">Financial Profile</div>
              </div>
              <div className="protocol-strip-container">
                <ProtocolStrip icon="🏧" label="Bank Name" value={emp.BankName || emp.bankName} />
                <ProtocolStrip icon="🔢" label="Account Number" value={emp.AccountNumber || emp.accountNumber} />
                <ProtocolStrip icon="📍" label="IFSC code " value={emp.IFSC || emp.ifscCode} />
                <ProtocolStrip icon="📍" label="Branch Name " value={emp.Branch || emp.branchName} />
              </div>
            </div>

            {/* Personal Group */}
            <div className="bento-item bento-wide">
              <div className="bento-header">
                <div className="bento-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>🌳</div>
                <div className="bento-title">Personal Roots</div>
              </div>
              <div className="bento-content">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <Field label="Father's Name" value={emp.FatherName} />
                  <Field label="Mother's Name" value={emp.MotherName} />
                  <Field label="Birth Date" value={formatDate(emp.DOB || emp.dob)} />
                  <Field label="Relationship" value={emp.MaritalStatus || "Single"} />
                  {(emp.MaritalStatus === "Married" || emp.maritalStatus === "Married") && (
                    <Field label="Spouse Name" value={emp.SpouseName || emp.spouseName} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "career" && (
          <div className="bento-grid">
            <div className="bento-item bento-full">
              <h3 className="section-subtitle">Academic Timeline</h3>
              <div className="glass-table-wrap">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Qualification</th>
                      <th>Specialization / Board</th>
                      <th>Institution</th>
                      <th>Year</th>
                      <th>Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emp.PGDegree && <tr><td style={{ fontWeight: 800 }}>{emp.PGDegree}</td><td>{emp.PGSpecification || emp.PGSpecialization}</td><td>{emp.PGCollege}</td><td>{emp.PGYear}</td><td>{emp.PGPercent}%</td></tr>}
                    {emp.DiplomaDegree && <tr><td style={{ fontWeight: 800 }}>Diploma</td><td>{emp.DiplomaDegree} ({emp.DiplomaSpecialization || emp.DiplomaSpecification})</td><td>{emp.DiplomaCollege}</td><td>{emp.DiplomaYear}</td><td>{emp.DiplomaPercent}%</td></tr>}
                    <tr><td style={{ fontWeight: 800 }}>{emp.UGDegree}</td><td>{emp.UGSpecification || emp.UGSpecialization}</td><td>{emp.UGCollege}</td><td>{emp.UGYear}</td><td>{emp.UGPercent}%</td></tr>
                    <tr><td style={{ fontWeight: 800 }}>Higher Secondary</td><td>{emp["12thBoard"]}</td><td>{emp["12thSchool"]}</td><td>{emp["12thYear"]}</td><td>{emp["12thPercent"]}%</td></tr>
                    <tr><td style={{ fontWeight: 800 }}>Standard X</td><td>{emp["10thBoard"]}</td><td>{emp["10thSchool"]}</td><td>{emp["10thYear"]}</td><td>{emp["10thPercent"]}%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bento-item bento-full">
              <h3 className="section-subtitle">Employment Track Record</h3>
              <div className="glass-table-wrap">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Role</th>
                      <th>Duration</th>
                      <th>Salary Package</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseJSON(emp.EmploymentHistory).length > 0 ? parseJSON(emp.EmploymentHistory).map((exp, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800 }}>{exp.organization}</td>
                        <td>{exp.designation}</td>
                        <td>{exp.duration || exp.period || (exp.startDate && exp.endDate ? `${exp.startDate} to ${exp.endDate}` : (exp.startDate || exp.endDate || "-"))}</td>
                        <td>{exp.salary}</td>
                      </tr>
                    )) : <tr><td colSpan="4" style={{ textAlign: 'center', color: '#94a3b8' }}>No corporate history records found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bento-item bento-full">
              <h3 className="section-subtitle">Specialized Certifications</h3>
              <div className="glass-table-wrap">
                <table className="glass-table">
                  <thead>
                    <tr>
                      <th>Certification Name</th>
                      <th>Issuing Institute</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parseJSON(emp.Trainings).length > 0 ? parseJSON(emp.Trainings).map((tr, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800 }}>{tr.name}</td>
                        <td>{tr.institute}</td>
                        <td>{tr.duration || tr.period || (tr.StartDate && tr.EndDate ? `${formatDate(tr.StartDate)} to ${formatDate(tr.EndDate)}` : (formatDate(tr.StartDate) || formatDate(tr.EndDate) || "-"))}</td>
                      </tr>
                    )) : <tr><td colSpan="3" style={{ textAlign: 'center' }}>No certification records found</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>

            {(() => {
              const hasLast = emp.LastHrName || emp.LastMgrName;
              const hasPrev = emp.PrevHrName || emp.PrevMgrName;
              if (!hasLast && !hasPrev) return null;

              return (
                <>
                  {hasLast && (
                    <div className="bento-item bento-full" style={{ marginTop: '20px' }}>
                      <h3 className="section-subtitle">Professional Reference - Last Company</h3>
                      <div className="protocol-strip-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '15px' }}>
                        <ProtocolStrip icon="👤" label="HR Name" value={emp.LastHrName} />
                        <ProtocolStrip icon="📞" label="HR Contact" value={emp.LastHrContact} />
                        <ProtocolStrip icon="📧" label="HR Email" value={emp.LastHrEmail} />
                        <ProtocolStrip icon="👤" label="Manager Name" value={emp.LastMgrName} />
                        <ProtocolStrip icon="📞" label="Manager Contact" value={emp.LastMgrContact} />
                        <ProtocolStrip icon="📧" label="Manager Email" value={emp.LastMgrEmail} />
                      </div>
                    </div>
                  )}
                  {hasPrev && (
                    <div className="bento-item bento-full" style={{ marginTop: '20px' }}>
                      <h3 className="section-subtitle">Professional Reference - Previous Company</h3>
                      <div className="protocol-strip-container" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', background: 'rgba(255,255,255,0.5)', padding: '15px', borderRadius: '15px' }}>
                        <ProtocolStrip icon="👤" label="HR Name" value={emp.PrevHrName} />
                        <ProtocolStrip icon="📞" label="HR Contact" value={emp.PrevHrContact} />
                        <ProtocolStrip icon="📧" label="HR Email" value={emp.PrevHrEmail} />
                        <ProtocolStrip icon="👤" label="Manager Name" value={emp.PrevMgrName} />
                        <ProtocolStrip icon="📞" label="Manager Contact" value={emp.PrevMgrContact} />
                        <ProtocolStrip icon="📧" label="Manager Email" value={emp.PrevMgrEmail} />
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === "documents" && (() => {
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
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        )}
                      </div>
                      <div className="tile-meta">
                        <h4>{lbl}</h4>
                        <span className={`tile-status ${link ? 'status-valid' : 'status-missing'}`}>{link ? "VERIFIED" : "UNAVAILABLE"}</span>
                      </div>
                    </div>
                    {link ? (
                      <a href={link} target="_blank" rel="noreferrer" className="btn-open">View Original File</a>
                    ) : (
                      <button className="btn-open" disabled style={{ opacity: 0.5, cursor: 'not-allowed', color: '#94a3b8' }}>Pending Task</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {activeTab === "attendance" && (() => {
            const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
            const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            const currentMonth = viewDate.getMonth();
            const currentYear = viewDate.getFullYear();
            
            const totalDays = daysInMonth(currentMonth, currentYear);
            const startOffset = firstDayOfMonth(currentMonth, currentYear);
            
            const getStatusForDate = (dayNum) => {
                const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const record = attendanceHistory.find(a => a.date === dateStr);
                if (record) {
                    if (isLate(record.intime || record.inTime)) return "late";
                    return "present";
                }
                
                const checkDate = new Date(currentYear, currentMonth, dayNum);
                const today = new Date();
                today.setHours(0,0,0,0);
                
                if (checkDate < today) {
                    const dayOfWeek = checkDate.getDay();
                    const isSecondSaturday = dayOfWeek === 6 && Math.ceil(dayNum / 7) === 2;
                    if (dayOfWeek === 0 || isSecondSaturday) return "week-off";
                    return "absent";
                }
                return "future";
            };

            const monthStats = { present: 0, absent: 0, weekOff: 0, late: 0 };
            for (let d = 1; d <= totalDays; d++) {
                const status = getStatusForDate(d);
                if (status === "present") monthStats.present++;
                else if (status === "late") monthStats.late++;
                else if (status === "absent") monthStats.absent++;
                else if (status === "week-off") monthStats.weekOff++;
            }

            const totalPresent = monthStats.present + monthStats.late;
            const activeWorkDays = totalPresent + monthStats.absent;
            const presencePercentage = activeWorkDays > 0 ? Math.round((totalPresent / activeWorkDays) * 100) : 0;
            const circleCircumference = 2 * Math.PI * 45;
            const dashOffset = circleCircumference - (presencePercentage / 100) * circleCircumference;

            return (
                <div className="animate-fade-in" style={{ padding: '20px' }}>
                    {/* Performance Hub Strip */}
                    <div className="glass-panel" style={{ 
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.7))',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '32px',
                        padding: '30px',
                        marginBottom: '30px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '40px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        border: '1px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 15px 35px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
                            {/* Circular Progress */}
                            <div style={{ position: 'relative', width: '110px', height: '110px' }}>
                                <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                                    <circle cx="55" cy="55" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                                    <circle cx="55" cy="55" r="45" fill="none" stroke="url(#presenceGradient)" strokeWidth="10" strokeDasharray={circleCircumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
                                    <defs>
                                        <linearGradient id="presenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#3b82f6" />
                                        </linearGradient>
                                    </defs>
                                </svg>
                                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '20px', fontWeight: '900', color: '#0f172a' }}>{presencePercentage}%</span>
                                    <span style={{ fontSize: '9px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Presence</span>
                                </div>
                            </div>
                            
                            <div>
                                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>Attendance Hub</h1>
                                <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '600' }}>Your work-cycle metrics for {monthNames[currentMonth]} {currentYear}</p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '20px' }}>
                            <div className="hub-stat-node" style={{ background: 'white', padding: '15px 20px', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>On Time</span>
                                <span style={{ fontSize: '20px', fontWeight: '800' }}>{monthStats.present}</span>
                            </div>
                            <div className="hub-stat-node" style={{ background: 'white', padding: '15px 20px', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>Late In</span>
                                <span style={{ fontSize: '20px', fontWeight: '800' }}>{monthStats.late}</span>
                            </div>
                            <div className="hub-stat-node" style={{ background: 'white', padding: '15px 20px', borderRadius: '20px', boxShadow: '0 5px 15px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <span style={{ display: 'block', fontSize: '10px', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', marginBottom: '4px' }}>Missed</span>
                                <span style={{ fontSize: '20px', fontWeight: '800' }}>{monthStats.absent}</span>
                            </div>
                            <button onClick={fetchAttendanceHistory} style={{ 
                                background: '#0f172a', color: 'white', border: 'none', padding: '15px 25px', borderRadius: '20px', 
                                fontWeight: '800', cursor: 'pointer', transition: 'transform 0.2s', alignSelf: 'center'
                            }} onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                {isAttendanceLoading ? "Syncing..." : "Sync Records"}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.5fr) 1fr', gap: '30px' }}>
                        {/* Interactive Calendar */}
                        <div className="glass-panel" style={{ 
                            background: 'white', borderRadius: '32px', padding: '30px', boxShadow: '0 20px 40px rgba(0,0,0,0.03)',
                            border: '1px solid rgba(255,255,255,1)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
                                <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '900' }}>{monthNames[currentMonth]} {currentYear}</h3>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <button onClick={() => setViewDate(new Date(currentYear, currentMonth - 1, 1))} className="nav-btn-crystal">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                                    </button>
                                    <button onClick={() => setViewDate(new Date(currentYear, currentMonth + 1, 1))} className="nav-btn-crystal">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '15px' }}>
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                    <div key={day} style={{ fontSize: '12px', fontWeight: '900', color: '#cbd5e1', textAlign: 'center', marginBottom: '10px' }}>{day}</div>
                                ))}
                                {Array.from({ length: startOffset }).map((_, i) => <div key={`o-${i}`} />)}
                                {Array.from({ length: totalDays }).map((_, i) => {
                                    const day = i + 1;
                                    const status = getStatusForDate(day);
                                    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
                                    
                                    let style = { 
                                        height: '55px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '16px', fontWeight: '800', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', cursor: 'default',
                                        position: 'relative'
                                    };

                                    if (status === 'present') {
                                        style.background = 'linear-gradient(135deg, #ecfdf5, #d1fae5)';
                                        style.color = '#059669';
                                        style.boxShadow = '0 4px 15px rgba(16, 185, 129, 0.1)';
                                    } else if (status === 'late') {
                                        style.background = 'linear-gradient(135deg, #fffbeb, #fef3c7)';
                                        style.color = '#d97706';
                                        style.boxShadow = '0 4px 15px rgba(245, 158, 11, 0.1)';
                                    } else if (status === 'absent') {
                                        style.background = 'linear-gradient(135deg, #fff1f2, #ffe4e6)';
                                        style.color = '#e11d48';
                                    } else if (status === 'week-off') {
                                        style.color = '#94a3b8';
                                        style.background = '#f8fafc';
                                    } else {
                                        style.color = '#64748b';
                                    }

                                    if (isToday) {
                                        style.border = '2px solid #4f46e5';
                                        style.boxShadow = '0 0 20px rgba(79, 70, 229, 0.15)';
                                    }

                                    return (
                                        <div key={day} style={style} className="calendar-pills" onMouseOver={(e) => {
                                            e.currentTarget.style.transform = 'scale(1.08) translateY(-2px)';
                                            e.currentTarget.style.zIndex = '1';
                                        }} onMouseOut={(e) => {
                                            e.currentTarget.style.transform = 'scale(1) translateY(0)';
                                            e.currentTarget.style.zIndex = '0';
                                        }}>
                                            {day}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Side Details Pane */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            <div className="glass-panel" style={{ background: '#0f172a', borderRadius: '32px', padding: '30px', color: 'white' }}>
                                <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '800' }}>Work Schedule</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Standard Shift</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>09:30 AM - 06:30 PM</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '15px' }}>
                                        <span style={{ fontSize: '13px', color: '#94a3b8' }}>Week Offs</span>
                                        <span style={{ fontSize: '13px', fontWeight: '700' }}>SUN & 2ND SAT</span>
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ background: 'white', borderRadius: '32px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                                <h4 style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Legend</h4>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <LegendNode color="#10b981" label="On Time" />
                                    <LegendNode color="#f59e0b" label="Late Arrival" />
                                    <LegendNode color="#f97316" label="Early Departure" />
                                    <LegendNode color="#ef4444" label="Not Reported" />
                                    <LegendNode color="#94a3b8" label="Week Off" />
                                    <LegendNode color="#4f46e5" label="Current Day" solid={true} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })()}



        {activeTab === "books" && (
          <div className="bento-item bento-full animate-fade">
            <h3 className="section-subtitle">HR Handbooks & Policies</h3>
            <div className="doc-bento-grid">
              {policies.length > 0 ? policies.map((policy, i) => (
                <div key={i} className="doc-tile" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="tile-head">
                    <div className="tile-icon" style={{ background: '#f8fafc' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <div className="tile-meta">
                      <h4 style={{ marginBottom: '4px' }}>{policy.label}</h4>
                      <span className="tile-status status-valid" style={{ background: '#dcfce7', color: '#16a34a' }}>AUTHORIZED</span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px', marginBottom: '15px' }}>{policy.description}</p>
                  <button
                    className="btn-open"
                    onClick={() => {
                        setViewingDoc({ 
                            title: policy.label, 
                            fileId: policy.id || policy.fileId,
                            fileName: policy.fileName,
                            downloadPath: policy.downloadUrl 
                        });
                    }}
                    style={{ marginTop: 'auto', cursor: 'pointer', width: '100%', border: '1px solid #e2e8f0', background: 'white', color: '#4f46e5', fontWeight: '800', padding: '10px', borderRadius: '10px' }}
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
        )}
      </main>

      {viewingDoc && (
        <PolicyModal
          doc={viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {showFaceVerify && (
        <FaceVerifyModal
          profilePhoto={getDriveDirectLink(emp.Photo)}
          onVerified={proceedWithPunch}
          onClose={() => setShowFaceVerify(false)}
          scriptUrl={SCRIPT_URL}
        />
      )}
    </div>
  );
}

function FaceVerifyModal({ profilePhoto, onVerified, onClose, scriptUrl }) {
    const videoRef = useRef();
    const [status, setStatus] = useState("Initializing AI Models...");
    const [matchStatus, setMatchStatus] = useState(null);
    const [loadingModels, setLoadingModels] = useState(true);

    const hasTriggered = useRef(false);

    useEffect(() => {
        let stream = null;
        let isMounted = true;

        async function init() {
            try {
                // 1. Load Face API models once per session
                if (!MODELS_LOADED) {
                    setStatus("Waking up Biometric Engine...");
                    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
                    await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
                    await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
                    MODELS_LOADED = true;
                }
                
                if (!isMounted) return;
                setLoadingModels(false);

                // 2. Start Camera
                setStatus("Accessing Secure Camera...");
                stream = await navigator.mediaDevices.getUserMedia({ video: {} });
                if (videoRef.current) videoRef.current.srcObject = stream;

                // 3. Process Profile Photo to get Descriptor
                setStatus("Extracting Registered Features...");
                
                let photoImg;
                try {
                    const res = await fetch(profilePhoto);
                    if (!res.ok) throw new Error("Direct fetch status: " + res.status);
                    const blob = await res.blob();
                    photoImg = await faceapi.bufferToImage(blob);
                } catch (err) {
                    console.warn("Direct profile photo fetch failed, trying proxy...", err);
                    
                    const driveIdMatch = profilePhoto.match(/[-\w]{25,}/);
                    const fileId = profilePhoto.includes('id=') ? profilePhoto.split('id=')[1] : (driveIdMatch ? driveIdMatch[0] : null);
                    
                    if (!fileId) throw new Error("Could not find a valid photo ID to load.");

                    const proxyRes = await fetch(`${scriptUrl}?action=proxyFile&fileId=${fileId}`);
                    
                    if (!proxyRes.ok) {
                        throw new Error(`Cloud Proxy Error: ${proxyRes.status} ${proxyRes.statusText}`);
                    }

                    const contentType = proxyRes.headers.get("content-type");
                    if (!contentType || !contentType.includes("application/json")) {
                        throw new Error("Server returned an invalid response format (HTML instead of data). Check your script deployment.");
                    }

                    const proxyData = await proxyRes.json();
                    if (proxyData.status === "success") {
                        const blob = await (await fetch(`data:${proxyData.mimeType};base64,${proxyData.base64}`)).blob();
                        photoImg = await faceapi.bufferToImage(blob);
                    } else {
                        throw new Error(proxyData.message || "Cloud data retrieval failed.");
                    }
                }

                // Enhanced profile descriptor extraction
                const profileDetection = await faceapi.detectSingleFace(photoImg).withFaceLandmarks().withFaceDescriptor();
                if (!profileDetection) {
                    throw new Error("Face not detected in your registered profile photo. Please contact HR to update your photo.");
                }

                const faceMatcher = new faceapi.FaceMatcher(profileDetection.descriptor, 0.6);

                // 4. Start Continuous Verification
                setStatus("Aligning... Please stay in frame and look at the camera.");
                let detectionCount = 0;
                
                const checkFace = async () => {
                    if (!isMounted || !videoRef.current || hasTriggered.current) return;
                    
                    detectionCount++;
                    if (detectionCount % 5 === 0 && matchStatus !== "verified") {
                        setStatus("Still searching for your face... Try moving closer or improving light.");
                    }

                    const detections = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();
                    
                    if (detections) {
                        setStatus("Face detected! Comparing with profile...");
                        const bestMatch = faceMatcher.findBestMatch(detections.descriptor);
                        
                        if (bestMatch.label !== 'unknown' && !hasTriggered.current) {
                            hasTriggered.current = true;
                            setMatchStatus("verified");
                            setStatus("Identity Confirmed!");
                            setTimeout(() => { if (isMounted) onVerified(); }, 1500);
                            return;
                        } else {
                            // Calculate match percentage for better feedback
                            const matchScore = Math.round((1 - bestMatch.distance) * 100);
                            setMatchStatus("mismatch");
                            setStatus(`Identity Mismatch (${matchScore}% match). Please look directly at the camera.`);
                        }
                    } else if (matchStatus !== "verified") {
                        // Keep current status unless we just verified
                    }
                    
                    setTimeout(checkFace, 400);
                };

                checkFace();

            } catch (err) {
                console.error("Biometric Error:", err);
                setStatus("Verification Error: " + err.message);
                setMatchStatus("mismatch");
            }
        }

        init();
        return () => {
            isMounted = false;
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [profilePhoto, onVerified, scriptUrl, matchStatus]);

    return (
        <div className="face-verify-overlay" onClick={onClose}>
            <div className="face-verify-content animate-pop" onClick={e => e.stopPropagation()}>
                <div className="face-verify-header">
                    <h3>Secure Identity Verification</h3>
                    <button className="btn-close-modal" onClick={onClose}>×</button>
                </div>
                <div className="face-verify-body">
                    <div className={`camera-container ${matchStatus}`}>
                        <video ref={videoRef} autoPlay muted playsInline></video>
                        <div className="scanner-line"></div>
                        {loadingModels && <div className="loader-overlay"><div className="spinner"></div></div>}
                    </div>
                    <div className="status-shelf">
                        <div className={`status-node ${matchStatus === 'verified' ? 'success' : ''}`}>
                            <div className="status-pulse"></div>
                            <span>{status}</span>
                        </div>
                    </div>
                </div>
                <div className="face-verify-footer">
                    <p>Comparison performed locally on device • Data not stored</p>
                </div>
            </div>
        </div>
    );
}

function ProtocolStrip({ icon, label, value }) {
  return (
    <div className="protocol-strip">
      <div className="strip-icon">{icon}</div>
      <div className="strip-info">
        <label>{label}</label>
        <div className="val">{value || "NOT_PROVIDED"}</div>
      </div>
      <div className="strip-status"></div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="info-pair">
      <label>{label}</label>
      <div className="val">{value || "—"}</div>
    </div>
  );
}

function PolicyModal({ doc, onClose }) {
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isPdf = doc.fileName?.toLowerCase().endsWith('.pdf') || doc.title?.toLowerCase().includes('pdf');

  useEffect(() => {
    let isMounted = true;
    async function loadDoc() {
        try {
            setLoading(true);
            setError(null);
            
            if (isPdf) {
                setLoading(false);
                return;
            }

            const proxyUrl = `${SCRIPT_URL}?action=proxyFile&fileId=${doc.fileId}`;
            const response = await fetch(proxyUrl);
            const data = await response.json();

            if (data.status !== "success") throw new Error(data.message || "Failed to fetch document content");
            
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
    }, [doc.fileId, isPdf, doc.fileName, doc.title]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-info">
            <div className="modal-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            </div>
            <h3>{doc.title}</h3>
          </div>
          <div className="modal-header-actions">
            <a href={doc.downloadPath} download className="btn-download-mini" title="Download copy">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </a>
            <button className="btn-close-modal" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>
        <div className="modal-body">
          <div className="viewer-container" style={{ height: '100%', overflow: 'auto', background: '#f8fafc', padding: '20px' }}>
            {loading && (
              <div className="viewer-loader">
                <div className="spinner"></div>
                <p>Establishing secure connection...</p>
                <span className="viewer-note">Preparing document bytes for rendering...</span>
              </div>
            )}
            {error && (
              <div className="viewer-loader">
                <div className="bento-icon" style={{ background: '#fee2e2', color: '#ef4444', marginBottom: '15px' }}>⚠️</div>
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

export default EmployeeDashboard;