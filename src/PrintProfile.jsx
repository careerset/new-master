import React from 'react';
import './print.css';

const PrintProfile = ({ employee }) => {
  if (!employee) return null;

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

  const parseJSON = (str) => {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    try {
      return JSON.parse(str);
    } catch (e) {
      return [];
    }
  };

  const trainings = parseJSON(employee.Trainings || employee.trainings);
  const employmentHistory = parseJSON(employee.EmploymentHistory || employee.employments);
  const dependents = parseJSON(employee.Dependents || employee.dependents);

  return (
    <div className="print-container">
      <div className="print-page-border"></div>
      {/* HEADER SECTION */}
      <div className="print-header-new">
        <img src="/chn-logo.png" alt="Company Logo" className="print-logo" />
        <h1 className="print-title">Employee Onboarding Form</h1>
      </div>

      {/* PERSONAL DETAILS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Personal Details</h2>
        </div>
        <table className="grid-table">
          <tbody>
            <tr>
              <td className="label-cell">Employee Code</td>
              <td className="value-cell">{employee.EmpID || employee.employee_code || "EMP001"}</td>
              <td className="label-cell">Name</td>
              <td className="value-cell">{employee.Name}</td>
            </tr>
            <tr>
              <td className="label-cell">DOB</td>
              <td className="value-cell">{formatDate(employee.DOB || employee.dob)}</td>
              <td className="label-cell">Date Of Joining</td>
              <td className="value-cell">{formatDate(employee.DateOfJoining || employee.doj)}</td>
            </tr>
            <tr>
              <td className="label-cell">Gender</td>
              <td className="value-cell">{employee.Gender || employee.gender}</td>
              <td className="label-cell">Blood Group</td>
              <td className="value-cell">{employee.BloodGroup || employee.bloodGroup}</td>
            </tr>
            <tr>
              <td className="label-cell">Phone</td>
              <td className="value-cell">{employee.Phone || employee.phone}</td>
              <td className="label-cell">Email</td>
              <td className="value-cell">{employee.Email || employee.email}</td>
            </tr>
            <tr>
              <td className="label-cell">Father Name</td>
              <td className="value-cell">{employee.FatherName || employee.fatherName}</td>
              <td className="label-cell">Mother Name</td>
              <td className="value-cell">{employee.MotherName || employee.motherName}</td>
            </tr>
            <tr>
              <td className="label-cell">Marital Status</td>
              <td className="value-cell">{employee.MaritalStatus || employee.maritalStatus}</td>
              <td className="label-cell">Spouse Name</td>
              <td className="value-cell">{employee.SpouseName || "No"}</td>
            </tr>
            <tr>
              <td className="label-cell">PAN</td>
              <td className="value-cell">{employee.PAN || employee.panNumber}</td>
              <td className="label-cell">Aadhar</td>
              <td className="value-cell">{employee.AadharNumber || employee.aadharNumber}</td>
            </tr>
            <tr>
              <td className="label-cell">Department</td>
              <td className="value-cell">{employee.Department || employee.department}</td>
              <td className="label-cell">Designation</td>
              <td className="value-cell">{employee.Designation || employee.designation}</td>
            </tr>
            <tr>
              <td className="label-cell">Permanent Address</td>
              <td colSpan="3" className="value-cell">{employee.PermanentAddress || employee.permanentAddress}</td>
            </tr>
            <tr>
              <td className="label-cell">Present Address</td>
              <td colSpan="3" className="value-cell">{employee.PresentAddress || employee.presentAddress}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* EMERGENCY CONTACT */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Emergency Contact</h2>
        </div>
        <table className="grid-table">
          <tbody>
            <tr>
              <td className="label-cell" width="25%">Contact Name</td>
              <td className="value-cell" width="25%">{employee.EmergencyName || "-"}</td>
              <td className="label-cell" width="25%">Relationship</td>
              <td className="value-cell" width="25%">{employee.EmergencyRelation || "-"}</td>
            </tr>
            <tr>
              <td className="label-cell">Phone</td>
              <td colSpan="3" className="value-cell">{employee.EmergencyPhone || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* EXPERIENCE SUMMARY */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Experience Summary</h2>
        </div>
        <table className="grid-table">
          <tbody>
            <tr>
              <td className="label-cell" width="35%">Total Experience (Years)</td>
              <td className="value-cell" width="15%">{employee.TotalExpYears || 0}</td>
              <td className="label-cell" width="35%">Total Experience (Months)</td>
              <td className="value-cell" width="15%">{employee.TotalExpMonths || 0}</td>
            </tr>
            <tr>
              <td className="label-cell">Career Break</td>
              <td className="value-cell">{employee.CareerBreak || "No"}</td>
              <td className="label-cell">Duration</td>
              <td className="value-cell">{employee.CareerBreakReason || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* EDUCATION DETAILS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Education Details</h2>
        </div>
        <table className="print-table bordered-cells">
          <thead>
            <tr>
              <th width="15%">Level</th>
              <th width="20%">Board</th>
              <th width="28%">Degree</th>
              <th width="25%">Institution</th>
              <th width="12%">Year</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>10th</td>
              <td>{employee["10thBoard"] || "-"}</td>
              <td>-</td>
              <td>{employee["10thSchool"] || "-"}</td>
              <td>{employee["10thYear"] || "-"}</td>
            </tr>
            <tr>
              <td>12th</td>
              <td>{employee["12thBoard"] || "-"}</td>
              <td>-</td>
              <td>{employee["12thSchool"] || "-"}</td>
              <td>{employee["12thYear"] || "-"}</td>
            </tr>
            {employee.DiplomaDegree && (
              <tr>
                <td>Diploma</td>
                <td>{employee.DiplomaDegree || "-"} {employee.DiplomaSpecialization ? `(${employee.DiplomaSpecialization})` : ""}</td>
                <td>-</td>
                <td>{employee.DiplomaCollege || "-"}</td>
                <td>{employee.DiplomaYear || "-"}</td>
              </tr>
            )}
            <tr>
              <td>UG</td>
              <td>{employee.UGDegree || "-"} {employee.UGSpecialization ? `(${employee.UGSpecialization})` : ""}</td>
              <td>{employee.UGCollege || "-"}</td>
              <td>{employee.UGYear || "-"}</td>
              <td>{employee.UGPercent || "-"}%</td>
            </tr>
            {employee.PGDegree && (
              <tr>
                <td>PG</td>
                <td>{employee.PGDegree || "-"} {employee.PGSpecialization ? `(${employee.PGSpecialization})` : ""}</td>
                <td>{employee.PGCollege || "-"}</td>
                <td>{employee.PGYear || "-"}</td>
                <td>{employee.PGPercent || "-"}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* BANK DETAILS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Bank Details</h2>
        </div>
        <table className="grid-table">
          <tbody>
            <tr>
              <td className="label-cell" width="25%">Account Holder</td>
              <td className="value-cell" width="25%">{employee.BankAccountHolder || "-"}</td>
              <td className="label-cell" width="25%">Bank</td>
              <td className="value-cell" width="25%">{employee.BankName || "-"}</td>
            </tr>
            <tr>
              <td className="label-cell">Account No</td>
              <td className="value-cell">{employee.AccountNumber || "-"}</td>
              <td className="label-cell">IFSC</td>
              <td className="value-cell">{employee.IFSC || "-"}</td>
            </tr>
            <tr>
              <td className="label-cell">Branch</td>
              <td colSpan="3" className="value-cell">{employee.Branch || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ESI / PF DETAILS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>ESI / PF Details</h2>
        </div>
        <table className="grid-table">
          <tbody>
            <tr>
              <td className="label-cell" width="25%">ESI Applicable</td>
              <td className="value-cell" width="25%">{employee.ESIApplicable || "No"}</td>
              <td className="label-cell" width="25%">UAN</td>
              <td className="value-cell" width="25%">{employee.UAN || "-"}</td>
            </tr>
            <tr>
              <td className="label-cell">PF Number</td>
              <td className="value-cell">{employee.PF || "-"}</td>
              <td className="label-cell">ESI Number</td>
              <td className="value-cell">{employee.ESINumber || "-"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PROFESSIONAL TRAININGS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Professional Trainings</h2>
        </div>
        <table className="print-table bordered-cells">
          <thead>
            <tr>
              <th width="30%">Training</th>
              <th width="40%">Institute</th>
              <th width="30%">Duration/Period</th>
            </tr>
          </thead>
          <tbody>
            {trainings.length > 0 ? trainings.map((t, i) => (
              <tr key={i}>
                <td>{t.name || t.training_name}</td>
                <td>{t.institute}</td>
                <td>{t.period || (t.StartDate && t.EndDate ? `${t.StartDate} to ${t.EndDate}` : (t.StartDate || t.EndDate || t.duration || "-"))}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center' }}>No trainings recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* EMPLOYMENT HISTORY */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Employment History</h2>
        </div>
        <table className="print-table bordered-cells">
          <thead>
            <tr>
              <th width="25%">Organization</th>
              <th width="20%">Designation</th>
              <th width="20%">Period</th>
              <th width="15%">Salary</th>
              <th width="20%">Reason</th>
            </tr>
          </thead>
          <tbody>
            {employmentHistory.length > 0 ? employmentHistory.map((e, i) => (
              <tr key={i}>
                <td>{e.organization}</td>
                <td>{e.designation}</td>
                <td>{e.startDate ? `${e.startDate} to ${e.endDate}` : (e.period || "-")}</td>
                <td>{e.salary}</td>
                <td>{e.reason}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No employment history recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* PROFESSIONAL REFERENCES */}
      {(employee.LastHrName || employee.LastMgrName || employee.PrevHrName || employee.PrevMgrName) && (
        <div className="print-section-new">
          <div className="section-header">
            <span className="accent-bar"></span>
            <h2>Professional References</h2>
          </div>
          <table className="print-table bordered-cells">
            <thead>
              <tr>
                <th width="20%">Company</th>
                <th width="25%">HR Contact</th>
                <th width="25%">HR Email/Phone</th>
                <th width="15%">Manager</th>
                <th width="15%">Mgr Contact</th>
              </tr>
            </thead>
            <tbody>
              {(employee.LastHrName || employee.LastMgrName) && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Last Company</td>
                  <td>{employee.LastHrName || "-"}</td>
                  <td>{employee.LastHrEmail || employee.LastHrContact || "-"}</td>
                  <td>{employee.LastMgrName || "-"}</td>
                  <td>{employee.LastMgrContact || "-"}</td>
                </tr>
              )}
              {(employee.PrevHrName || employee.PrevMgrName) && (
                <tr>
                  <td style={{ fontWeight: 'bold' }}>Previous Company</td>
                  <td>{employee.PrevHrName || "-"}</td>
                  <td>{employee.PrevHrEmail || employee.PrevHrContact || "-"}</td>
                  <td>{employee.PrevMgrName || "-"}</td>
                  <td>{employee.PrevMgrContact || "-"}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* DEPENDENT DETAILS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Dependent Details</h2>
        </div>
        <table className="print-table bordered-cells">
          <thead>
            <tr>
              <th width="25%">Name</th>
              <th width="15%">DOB</th>
              <th width="15%">Relationship</th>
              <th width="25%">Aadhar Number</th>
              <th width="20%">PAN Number</th>
            </tr>
          </thead>
          <tbody>
            {dependents.length > 0 ? dependents.map((d, i) => (
              <tr key={i}>
                <td>{d.name}</td>
                <td>{formatDate(d.dob)}</td>
                <td>{d.relation}</td>
                <td>{d.aadharNumber}</td>
                <td>{d.panNumber || "-"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center' }}>No dependent details recorded</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* UPLOADED DOCUMENTS */}
      <div className="print-section-new">
        <div className="section-header">
          <span className="accent-bar"></span>
          <h2>Uploaded Documents Status</h2>
        </div>
        <table className="print-table bordered-cells">
          <thead>
            <tr>
              <th width="70%">Document Name</th>
              <th width="30%">Status</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Resume", employee.Resume],
              ["SSLC (10th)", employee.SSLC],
              ["HSC (12th)", employee.HSC],
              ["Diploma", employee.DiplomaCertificate || employee.Diploma],
              ["UG Degree", employee.DegreeCertificate],
              ["PG Degree", employee.PGCertificate],
              ["Aadhar Card", employee.AadharFile],
              ["PAN Card", employee.PANFile],
              ["Relieving Letter", employee.RelievingLetter],
              ["Bank Passbook", employee.BankPassbook]
            ].map(([label, url], i) => (
              <tr key={i}>
                <td>{label}</td>
                <td style={{ color: url ? 'green' : 'red', fontWeight: 'bold' }}>
                  {url ? "UPLOADED" : "MISSING"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="print-footer">
        <div className="declaration">
          <p>I hereby declare that the information provided above is true to the best of my knowledge.</p>
        </div>
        <div className="signature-area">
          <div className="signature-box">
            <p>Employee Signature</p>
          </div>
          <div className="signature-box">
            <p>HR Department</p>
          </div>
        </div>
        <p className="print-timestamp">Generated on: {new Date().toLocaleString()}</p>
      </div>
    </div>
  );
};

export default PrintProfile;
