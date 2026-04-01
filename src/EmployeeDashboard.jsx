import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { renderAsync } from "docx-preview";
import JSZip from "jszip";
import "./employeeDashboard.css";

// Required for docx-preview to work correctly in some environments
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
    fetchPolicies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

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

            // It's likely a DOCX, fetch via proxy to bypass CORS
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
    }, [doc.fileId, isPdf]);

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