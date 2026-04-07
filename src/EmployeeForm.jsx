import { useState, useRef, useEffect } from "react";
import "./googleform.css";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from 'xlsx';

const COUNTRIES = [

  { name: "India", code: "+91" },
  { name: "United States", code: "+1" },
  { name: "United Kingdom", code: "+44" },
  { name: "United Arab Emirates", code: "+971" },
  { name: "Australia", code: "+61" },
  { name: "Singapore", code: "+65" },
  { name: "Canada", code: "+1" },
  { name: "Germany", code: "+49" },
  { name: "France", code: "+33" },
  { name: "Japan", code: "+81" }
];

const DEPARTMENT_DESIGNATIONS = {



  "Sales & Marketing": [

    "Executive - Administration & Telesales",
    "Lead - Sales",
    "Executive - Digital Marketing",
    "Sales Executive",
    "Business Development Associate",
    "Account Manager",
    "Inside Sales Specialist"
  ],

  "WFM": [
    "Senior HR Recruiter",
    "Executive - Talent Acquisition",
    "Senior Executive - Talent Acquisition",
    "Assistant Manager-Recruitment",
    "Manager - Operations",
    "Team Lead - Recruitment"
  ],

  "P&C": [
    "Lead - Payroll",
    "Executive - Payroll",
    "Executive - Compliance"
  ],

  "Technology": [
    "Trainee- software developer",
    "Engineer - Software Developer",
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "Web Developer",
    "QA Engineer",
    "IT Analyst",
    "System Admin",
    "Data Scientist",
    "Implementation Team",
    "Executive IT Support",
    "Senior Executive - IT Support",
    " UI/UX Designer"
  ],

  "HR": [
    "Executive",
    "Senior Executive"
  ],

  "Accounting & Finance": [
    "Executive Accounts",
    "Accountant",
    "Finance Manager",
    "Financial Analyst",
    "Audit Associate",
    "Tax Consultant"
  ],

  "Legal": [
    "Executive"
  ],

  "Digital Marketing": [
    "Digital Marketing Executive",
    "Marketing Manager",
    "Content Writer",
    "SEO Specialist",
    "Social Media Manager",
    "Growth Marketer",
    "UI/UX Designer"
  ],

  "Construction": [
    "Admin & CRM",
    "Telecalling",
    "Executive / Manager"
  ],

  "T&D": [
    "Lead / Manager",
    "Executive",
    "Learning and Development Specialist"
  ],


  "Administration": [
    "Administrative Assistant",
    "Facility Manager",
    "Office Coordinator",
    "Executive Assistant",
    "Receptionist",
    "Driver",
  ],

  "Other": [
    "Consultant",
    "Assistant",
    "Manager",
    "Executive",
    "Other"
  ]
};
const COUNTRY_STATES = {
  "India": ["Tamil Nadu", "Karnataka", "Maharashtra", "Delhi", "Gujarat", "Kerala", "Telangana", "Uttar Pradesh", "West Bengal"],
  "United States": ["California", "New York", "Texas", "Florida", "Washington"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"]
};

const TAMIL_NADU_COLLEGES = [
  "Indian Institute of Technology Madras (IIT Madras), Chennai",
  "Anna University, Chennai",
  "College of Engineering Guindy (CEG), Chennai",
  "Madras Institute of Technology (MIT), Chennai",
  "Alagappa College of Technology (ACT), Chennai",
  "Vellore Institute of Technology (VIT), Vellore",
  "National Institute of Technology (NIT), Tiruchirappalli",
  "SRM Institute of Science and Technology, Kattankulathur",
  "Amrita Vishwa Vidyapeetham, Coimbatore",
  "Loyola College, Chennai",
  "Madras Christian College (MCC), Chennai",
  "PSG College of Arts and Science, Coimbatore",
  "PSG College of Technology, Coimbatore",
  "SASTRA (Deemed to be University), Thanjavur",
  "Sathyabama Institute of Science and Technology, Chennai",
  "Presidency College, Chennai",
  "Ethiraj College for Women, Chennai",
  "Women's Christian College (WCC), Chennai",
  "Stella Maris College, Chennai",
  "Guru Nanak College, Chennai",
  "St. Joseph's College, Tiruchirappalli",
  "Kumaraguru College of Technology, Coimbatore",
  "Sri Sivasubramaniya Nadar College of Engineering (SSN), Kalavakkam",
  "Chennai Institute of Technology, Chennai",
  "Indian Institute of Management (IIM) Tiruchirappalli",
  "IIITDM Kancheepuram",
  "IIIT Tiruchirappalli",
  "Central University of Tamil Nadu, Tiruvarur",
  "Kalasalingam Academy of Research and Education (KARE)",
  "University of Madras, Chennai",
  "Bharathiar University, Coimbatore",
  "Dr. MGR Educational and Research Institute, Chennai",
  "Saveetha University, Chennai",
  "Tamil Nadu Agricultural University, Coimbatore",
  "Sri Ramakrishna College of Arts and Science, Coimbatore",
  "Nehru Arts and Science College, Coimbatore",
  "Kumaraguru College of Liberal Arts & Science (KCLAS)",
  "Thiagarajar College of Engineering, Madurai",
  "Government College of Technology (GCT), Coimbatore",
  "Madurai Kamaraj University, Madurai",
  "Annamalai University, Chidambaram",
  "Gandhigram Rural Institute, Dindigul",
  "Bishop Heber College, Tiruchirappalli",
  "Holy Cross College, Tiruchirappalli",
  "Jamal Mohamed College, Tiruchirappalli",
  "Kongu Engineering College, Perundurai",
  "Bannari Amman Institute of Technology, Sathyamangalam",
  "Mepco Schlenk Engineering College, Sivakasi",
  "St. Xavier's College, Palayamkottai",
  "Scott Christian College, Nagercoil",
  "American College, Madurai",
  "Lady Doak College, Madurai",
  "Fatima College, Madurai",
  "Vivekananda College, Madurai",
  "Ayya Nadar Janaki Ammal College, Sivakasi",
  "Adhiyaman College of Engineering, Hosur",
  "Government College of Engineering, Salem",
  "Government College of Engineering, Bargur",
  "Government College of Engineering, Tirunelveli",
  "Other"
];

const PASSING_YEARS = Array.from({ length: 51 }, (_, i) => (new Date().getFullYear() + 4 - i).toString());

const TAMIL_NADU_DISTRICTS = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri", "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur", "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal", "Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet", "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur", "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar"
];

const DISTRICT_CITIES = {
  "Ariyalur": ["Ariyalur", "Jayankondam", "Sendurai", "Udayarpalayam"],
  "Chengalpattu": ["Chengalpattu", "Maduranthakam", "Tambaram", "Pallavaram", "Vandalur", "Guduvanchery"],
  "Chennai": ["Adyar", "Anna Nagar", "T. Nagar", "Velachery", "Mylapore", "Tambaram", "Guindy", "Chromepet", "Kotturpuram", "Besant Nagar", "Nungambakkam", "Purasaiwalkam"],
  "Coimbatore": ["Coimbatore City", "Pollachi", "Mettupalayam", "Sulur", "Valparai", "Annur", "Kinathukadavu"],
  "Cuddalore": ["Cuddalore", "Chidambaram", "Panruti", "Neyveli", "Virudhachalam", "Tittakudi", "Kattumannarkoil"],
  "Dharmapuri": ["Dharmapuri", "Harur", "Palacode", "Pennagaram", "Pappireddipatti", "Nallampalli"],
  "Dindigul": ["Dindigul", "Palani", "Kodaikanal", "Oddanchatram", "Nilakottai", "Natham", "Vedasandur"],
  "Erode": ["Erode City", "Gobichettipalayam", "Bhavani", "Perundurai", "Sathyamangalam", "Anthiyur", "Kodumudi"],
  "Kallakurichi": ["Kallakurichi", "Sankarapuram", "Tirukkoyilur", "Ulundurpet", "Chinnasalem"],
  "Kanchipuram": ["Kanchipuram", "Sriperumbudur", "Walajabad", "Kundrathur", "Uthiramerur"],
  "Kanyakumari": ["Nagercoil", "Padmanabhapuram", "Kuzhithurai", "Colachel", "Thuckalay", "Kanyakumari"],
  "Karur": ["Karur", "Kulithalai", "Aravakurichi", "Krishnarayapuram", "Pugalur"],
  "Krishnagiri": ["Krishnagiri", "Hosur", "Denkanikottai", "Pochampalli", "Uthangarai", "Bargur", "Shoolagiri"],
  "Madurai": ["Madurai City", "Melur", "Vadipatti", "Usilampatti", "Thirumangalam", "Thirupparankundram"],
  "Mayiladuthurai": ["Mayiladuthurai", "Sirkazhi", "Tharangambadi", "Kuthalam"],
  "Nagapattinam": ["Nagapattinam", "Velankanni", "Kilvelur", "Thalaignayiru", "Vedaranyam"],
  "Namakkal": ["Namakkal", "Tiruchengode", "Rasipuram", "Paramathi Velur", "Sendamangalam", "Kumarapalayam"],
  "Nilgiris": ["Ooty", "Coonoor", "Gudalur", "Kotagiri", "Kundah", "Pandalur"],
  "Perambalur": ["Perambalur", "Veppanthattai", "Alathur", "Kunnam"],
  "Pudukkottai": ["Pudukkottai", "Aranthangi", "Ponnamaravathi", "Illuppur", "Alangudi", "Gandarvakottai"],
  "Ramanathapuram": ["Ramanathapuram", "Rameshwaram", "Paramakudi", "Kamuthi", "Mudukulathur", "Tiruvadanai", "Kadaladi"],
  "Ranipet": ["Ranipet", "Arakkonam", "Arcot", "Walajah", "Sholinghur", "Nemili"],
  "Salem": ["Salem City", "Attur", "Mettur", "Omalur", "Sankagiri", "Edappadi", "Yercaud"],
  "Sivaganga": ["Sivaganga", "Karaikudi", "Devakottai", "Manamadurai", "Kalayarkoil", "Thiruppuvanam", "Ilayangudi", "Singampunari", "Tiruppathur"],
  "Tenkasi": ["Tenkasi", "Sankarankovil", "Kadayanallur", "Alangulam", "Shenkottai", "Pavoorchatram"],
  "Thanjavur": ["Thanjavur City", "Kumbakonam", "Pattukkottai", "Orathanadu", "Thiruvaiyaru", "Peravurani", "Adirampattinam"],
  "Theni": ["Theni", "Periyakulam", "Bodinayakanur", "Cumbum", "Uthamapalayam", "Andipatti"],
  "Thoothukudi": ["Thoothukudi City", "Tiruchendur", "Kovilpatti", "Ettayapuram", "Sathankulam", "Srivaikuntam", "Vilathikulam"],
  "Tiruchirappalli": ["Trichy City", "Srirangam", "Manapparai", "Thuraiyur", "Musiri", "Lalgudi", "Manachanallur"],
  "Tirunelveli": ["Tirunelveli City", "Palayamkottai", "Ambasamudram", "Nanguneri", "Radhapuram", "Cheranmahadevi"],
  "Tirupathur": ["Tirupathur", "Vaniyambadi", "Ambur", "Natrampalli"],
  "Tiruppur": ["Tiruppur City", "Avinashi", "Dharapuram", "Kangeyam", "Palladam", "Udumalaipettai", "Madathukulam"],
  "Tiruvallur": ["Tiruvallur", "Avadi", "Poonamallee", "Ponneri", "Gummidipoondi", "Tiruttani", "Ambattur", "Madhavaram"],
  "Tiruvannamalai": ["Tiruvannamalai", "Arni", "Chengam", "Polur", "Wandiwash", "Kalasapakkam", "Jawadhu Hills"],
  "Tiruvarur": ["Tiruvarur", "Mannargudi", "Nannilam", "Thiruthuraipoondi", "Kudavasal", "Valangaiman"],
  "Vellore": ["Vellore City", "Katpadi", "Gudiyatham", "Pernambut", "Anaicut", "K.V. Kuppam"],
  "Viluppuram": ["Viluppuram", "Tindivanam", "Gingee", "Marakkanam", "Vikravandi", "Vanur"],
  "Virudhunagar": ["Virudhunagar", "Sivakasi", "Rajapalayam", "Aruppukkottai", "Sattur", "Srivilliputhur", "Watrap"]
};

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  if (typeof dateStr !== 'string') return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) { }
  return "";
};

function EmployeeForm() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const API_URL = process.env.REACT_APP_API_URL;

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const isEditMode = queryParams.get("edit") === "true";
  const editEmpId = queryParams.get("empId");

  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState("");
  const [isExperienced, setIsExperienced] = useState(false);
  const [esiApplicable, setEsiApplicable] = useState("no");
  const [careerBreak, setCareerBreak] = useState("no");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [sameAsPermanent, setSameAsPermanent] = useState(false);

  const [dependents, setDependents] = useState([
    { name: "", dob: "", relation: "", aadharNumber: "", aadharPhoto: null, photo: null }
  ]);
  const [trainings, setTrainings] = useState([
    { name: "", institute: "", duration: "", certificatePhoto: null }
  ]);

  const excelInputRef = useRef(null);
  const [employmentHistory, setEmploymentHistory] = useState([
    { organization: "", designation: "", duration: "", salary: "", nature: "", reason: "" }
  ]);
  const [educationHistory, setEducationHistory] = useState([
    { level: "", institution: "", yearOfPassing: "", score: "" }
  ]);


  /* ================= EDIT MODE PRE-FILL ================= */
  useEffect(() => {
    if (isEditMode && editEmpId) {
      setUploadProgressMsg("Fetching profile data...");
      fetch(`${API_URL}?action=getEmployee&empId=${editEmpId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "success" && data.employee) {
            const emp = data.employee;

            // Helper to split comma-separated addresses
            const splitAddress = (addrStr) => {
              if (!addrStr) return {};
              const parts = addrStr.split(',').map(p => p.trim());
              return {
                street: parts[0] || "",
                city: parts[parts.length - 3] || "",
                district: parts[parts.length - 4] || "",
                state: parts[parts.length - 5] || "",
                country: parts[parts.length - 2] || "",
                postalCode: parts[parts.length - 1] || ""
              };
            };

            const permAddr = splitAddress(emp.PermanentAddress);
            const presAddr = splitAddress(emp.PresentAddress);

            // Map sheet headers to form fields
            const newFormData = {
              firstName: (emp.Name || "").split(' ')[0],
              lastName: (emp.Name || "").split(' ').slice(1).join(' '),
              dob: formatDateForInput(emp.DOB),
              gender: emp.Gender,
              phone: String(emp.Phone || ""),
              email: emp.Email,
              doj: formatDateForInput(emp.DateOfJoining || emp.doj),
              fatherName: emp.FatherName,
              motherName: emp.MotherName,
              department: emp.Department,
              designation: emp.Designation,
              maritalStatus: emp.MaritalStatus,
              spouseName: emp.SpouseName,
              bloodGroup: emp.BloodGroup,
              aadharNumber: String(emp.AadharNumber || ""),
              panNumber: emp.PAN,

              residenceStreet: permAddr.street,
              residenceCity: permAddr.city,
              residenceDistrict: permAddr.district,
              residenceState: permAddr.state,
              residenceCountry: permAddr.country,
              residencePostalCode: permAddr.postalCode,

              presentStreet: presAddr.street,
              presentCity: presAddr.city,
              presentDistrict: presAddr.district,
              presentState: presAddr.state,
              presentCountry: presAddr.country,
              presentPostalCode: presAddr.postalCode,

              emergencyName: emp.EmergencyName,
              emergencyRelation: emp.EmergencyRelation,
              emergencyPhone: emp.EmergencyPhone,
              "10thSchool": emp["10thSchool"],
              "10thYear": emp["10thYear"],
              "10thPercent": emp["10thPercent"],
              "10thBoard": emp["10thBoard"],
              "12thSchool": emp["12thSchool"],
              "12thYear": emp["12thYear"],
              "12thPercent": emp["12thPercent"],
              "12thBoard": emp["12thBoard"],
              DiplomaDegree: emp.DiplomaDegree,
              DiplomaSpecialization: emp.DiplomaSpecialization || emp.DiplomaSpecification,
              DiplomaCollege: emp.DiplomaCollege,
              DiplomaYear: emp.DiplomaYear,
              DiplomaPercent: emp.DiplomaPercent,
              UGDegree: emp.UGDegree,
              UGSpecification: emp.UGSpecification || emp.UGSpecialization,
              UGCollege: emp.UGCollege,
              UGYear: emp.UGYear,
              UGPercent: emp.UGPercent,
              PGDegree: emp.PGDegree,
              PGSpecification: emp.PGSpecification || emp.PGSpecialization,
              PGCollege: emp.PGCollege,
              PGYear: emp.PGYear,
              PGPercent: emp.PGPercent,
              totalExpYears: emp.TotalExpYears,
              totalExpMonths: emp.TotalExpMonths,
              careerBreak: emp.CareerBreak,
              careerBreakDuration: emp.CareerBreakDuration,
              careerBreakReason: emp.CareerBreakReason,
              accountHolderName: emp.BankAccountHolder,
              bankName: emp.BankName,
              accountNumber: emp.AccountNumber,
              ifscCode: emp.IFSC,
              branchName: emp.Branch,
              esiApplicable: emp.ESIApplicable,
              uanNumber: emp.UAN,
              pfNumber: emp.PF,
              esiNumber: emp.ESINumber,
              // Existing Documents
              resumeUrl: emp.Resume,
              sslcUrl: emp.SSLC,
              hscUrl: emp.HSC,
              degreeUrl: emp.DegreeCertificate,
              diplomaUrl: emp.DiplomaCertificate,
              pgUrl: emp.PGCertificate,
              aadharUrl: emp.AadharFile,
              photoUrl: emp.Photo,
              aadharFatherUrl: emp.AadharFather,
              aadharMotherUrl: emp.AadharMother,
              panUrl: emp.PANFile,
              bankPassbookUrl: emp.BankPassbook,
              offerLetterUrl: emp.OfferLetter,
              experienceLetterUrl: emp.ExperienceLetter,
              payslipUrl: emp.Payslip,
              relievingUrl: emp.RelievingLetter
            };

            setFormData(newFormData);
            setMaritalStatus(emp.MaritalStatus || "");
            setCareerBreak(emp.CareerBreak || "no");

            if (emp.EmploymentHistory) {
              try {
                const exps = JSON.parse(emp.EmploymentHistory).map(e => ({
                  ...e,
                  startDate: formatDateForInput(e.startDate || e.period?.split(' - ')[0] || ""),
                  endDate: formatDateForInput(e.endDate || e.period?.split(' - ')[1] || "")
                }));
                setEmploymentHistory(exps);
                setIsExperienced(true);
              } catch (e) { }
            }
            if (emp.Trainings) {
              try {
                const trs = JSON.parse(emp.Trainings).map(t => ({
                  ...t,
                  duration: t.duration || t.period || (t.StartDate && t.EndDate ? `${t.StartDate} to ${t.EndDate}` : (t.StartDate || t.EndDate || "")),
                  certificateUrl: t.certificate || t.certificatePhoto
                }));
                setTrainings(trs);
              } catch (e) { }
            }
            if (emp.Dependents) {
              try {
                const deps = JSON.parse(emp.Dependents).map(d => ({
                  ...d,
                  dob: formatDateForInput(d.dob),
                  photoUrl: d.photo,
                  aadharUrl: d.aadharPhoto
                }));
                setDependents(deps);
              } catch (e) { }
            }
          }
          setUploadProgressMsg("");
        })
        .catch(err => {
          console.error("Fetch Error:", err);
          setUploadProgressMsg("Error loading data");
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, editEmpId, API_URL]);

  /* ================= HANDLERS ================= */

  useEffect(() => {
    try {
      const draft = localStorage.getItem('employeeFormDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        // if (parsed.currentStep) setCurrentStep(parsed.currentStep); // Always start at Introduction (Step 1)
        if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }));
        if (parsed.trainings) setTrainings(parsed.trainings);
        if (parsed.employmentHistory) setEmploymentHistory(parsed.employmentHistory);
        if (parsed.educationHistory) setEducationHistory(parsed.educationHistory);
        if (parsed.dependents) setDependents(parsed.dependents);
        if (parsed.esiApplicable) setEsiApplicable(parsed.esiApplicable);
        if (parsed.careerBreak) setCareerBreak(parsed.careerBreak);
        if (parsed.isExperienced !== undefined) setIsExperienced(parsed.isExperienced);
        if (parsed.sameAsPermanent !== undefined) setSameAsPermanent(parsed.sameAsPermanent);
      }
    } catch (e) { console.error("Could not load draft", e); }
  }, []);

  const handleSaveDraft = (e) => {
    e.preventDefault();
    const draftData = {
      formData,
      trainings,
      employmentHistory,
      educationHistory,
      dependents,
      esiApplicable,
      careerBreak,
      isExperienced,
      sameAsPermanent,
      currentStep
    };
    try {
      localStorage.setItem('employeeFormDraft', JSON.stringify(draftData));
      alert("Form progress saved locally! Attached files will need to be reselected.");
    } catch (err) {
      alert("Could not save progress right now.");
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleNumberOnly = (e, maxLength, field) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > maxLength) value = value.slice(0, maxLength);
    e.target.value = value;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateFile = (file) => {
    if (!file) return true;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      alert("Invalid file type. Please upload only PDF, JPG, or JPEG files.");
      return false;
    }
    const maxFileSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxFileSize) {
      alert("File is too large. Maximum allowed size is 2MB.");
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && !validateFile(file)) {
      e.target.value = ""; return;
    }
    setFiles(prev => ({ ...prev, [e.target.name]: file }));
  };

  const handleDependentChange = (index, e) => {
    setDependents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  const handleDependentFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file && !validateFile(file)) {
      e.target.value = ""; return;
    }
    setDependents(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: file };
      return updated;
    });
  };

  const addDependentRow = () => {
    setDependents([...dependents, { name: "", dob: "", relation: "", aadharNumber: "", aadharPhoto: null, photo: null }]);
  };

  const handleTrainingChange = (index, e) => {
    setTrainings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  const handleTrainingFileChange = (index, e) => {
    const file = e.target.files[0];
    if (file && !validateFile(file)) {
      e.target.value = ""; return;
    }
    setTrainings(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: file };
      return updated;
    });
  };

  const addTrainingRow = () => {
    setTrainings([...trainings, { name: "", institute: "", duration: "", certificatePhoto: null }]);
  };

  const handleEmploymentChange = (index, e) => {
    setEmploymentHistory(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [e.target.name]: e.target.value };
      return updated;
    });
  };

  const addEmploymentRow = () => {
    setEmploymentHistory([...employmentHistory, { organization: "", designation: "", duration: "", salary: "", nature: "", reason: "" }]);
  };

  const uploadSingleRow = async (rowObj, index, total) => {
    try {
      setUploadProgressMsg(`Uploading ${index + 1} of ${total}: ${rowObj.firstName || 'Employee'}...`);
      const submitData = new FormData();
      submitData.append("action", "submitEmployee");
      Object.keys(rowObj).forEach(key => {
        if (rowObj[key] !== undefined) submitData.append(key, rowObj[key]);
      });

      submitData.append("trainings", "[]");
      submitData.append("employments", "[]");
      submitData.append("dependents", "[]");
      const response = await fetch(API_URL, { method: "POST", body: submitData });
      const result = await response.json();
      return result.status === "success";
    } catch (err) {
      console.error("Bulk upload failure at row", index, err);
      return false;
    }
  };

  const processBulkRows = async (rows, headersClean, fieldMapRaw) => {
    setIsSubmitting(true);
    let successCount = 0;
    const total = rows.length - 1;
    for (let i = 1; i < rows.length; i++) {
      const rowData = rows[i];
      if (!rowData || rowData.length === 0) continue;
      const rowObj = {};
      headersClean.forEach((h, idx) => {
        const field = fieldMapRaw[h];
        if (field) {
          let val = rowData[idx];
          if (field === 'dob' || field === 'doj' || field.endsWith('Year')) {
            if (typeof val === 'number' && val > 1000) {
              const d = new Date((val - (25567 + 2)) * 86400 * 1000);
              val = d.toISOString().split('T')[0];
            }
          }
          rowObj[field] = val?.toString() || "";
        }
      });
      const success = await uploadSingleRow(rowObj, i - 1, total);
      if (success) successCount++;
    }
    setIsSubmitting(false);
    setUploadProgressMsg("");
    alert(`Bulk Process Finished! ${successCount} of ${total} employees onboarded successfully.`);
  };



  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (rows.length < 2) return alert("Sheet is empty or has no data rows");

        const cleanForMap = (str) => (str || "").toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const headersRaw = rows[0].map(h => (h || "").toString());
        const headersClean = headersRaw.map(h => cleanForMap(h));

        const fieldMapRaw = {
          "firstname": "firstName", "fname": "firstName",
          "lastname": "lastName", "lname": "lastName",
          "dob": "dob", "dateofbirth": "dob", "birthdate": "dob",
          "gender": "gender", "sex": "gender",
          "phone": "phone", "mobile": "phone", "contact": "phone", "mobilenumber": "phone",
          "email": "email", "emailaddress": "email", "mailid": "email",
          "doj": "doj", "dateofjoining": "doj", "joiningdate": "doj", "joindate": "doj", "hiredate": "doj",
          "department": "department", "dept": "department",
          "designation": "designation", "role": "designation", "jobtitle": "designation",
          "aadhar": "aadharNumber", "aadharnumber": "aadharNumber", "aadhaar": "aadharNumber",
          "fathername": "fatherName", "father": "fatherName", "fathersname": "fatherName",
          "mothername": "motherName", "mother": "motherName", "mothersname": "motherName",
          "bloodgroup": "bloodGroup", "bg": "bloodGroup",
          "maritalstatus": "maritalStatus", "marital": "maritalStatus",
          "accountnumber": "accountNumber", "accnumber": "accountNumber", "bankaccount": "accountNumber",
          "bankname": "bankName", "bank": "bankName",
          "ifsc": "ifscCode", "ifsccode": "ifscCode",
          "uan": "uanNumber", "uannumber": "uanNumber",
          "pf": "pfNumber", "pfnumber": "pfNumber",
          "pannumber": "panNumber", "pan": "panNumber", "pannum": "panNumber",
          "emergencyname": "emergencyName", "emergencycontact": "emergencyName",
          "emergencyrelation": "emergencyRelation",
          "emergencyphone": "emergencyPhone",
          "country": "residenceCountry", "residencecountry": "residenceCountry",
          "state": "residenceState", "residencestate": "residenceState",
          "district": "residenceDistrict", "residencedistrict": "residenceDistrict",
          "city": "residenceCity", "residencecity": "residenceCity",
          "streetaddress": "residenceStreet", "address": "residenceStreet",
          "postalcode": "residencePostalCode", "pincode": "residencePostalCode",
          "10thschool": "10thSchool", "10thinstitution": "10thSchool",
          "10thyear": "10thYear", "10thpassingyear": "10thYear",
          "10thpercentage": "10thPercent", "10thscore": "10thPercent",
          "12thschool": "12thSchool", "12thinstitution": "12thSchool",
          "12thyear": "12thYear", "12thpassingyear": "12thYear",
          "12thpercentage": "12thPercent", "12thscore": "12thPercent",
          "ugdegree": "UGDegree", "ugcollege": "UGCollege",
          "ugyear": "UGYear", "ugpercentage": "UGPercent",
          "pgdegree": "PGDegree", "pgcollege": "PGCollege",
          "pgyear": "PGYear", "pgpercentage": "PGPercent",
          "totalexpyears": "totalExpYears", "totalexpmonths": "totalExpMonths",
          "10thboard": "10thBoard", "12thboard": "12thBoard",
          "diplomadegree": "DiplomaDegree", "diplomacollege": "DiplomaCollege",
          "diplomayear": "DiplomaYear", "diplomapercentage": "DiplomaPercent",
          "diplomaspecialization": "DiplomaSpecialization", "diplomaspecification": "DiplomaSpecialization",
          "ugspecialization": "UGSpecification", "ugspecification": "UGSpecification",
          "pgspecialization": "PGSpecification", "pgspecification": "PGSpecification"
        };

        if (rows.length > 2) {
          const isBulk = window.confirm(`This file contains ${rows.length - 1} records. Do you want to perform a BULK UPLOAD? \n\n'OK' will add all to database. \n'Cancel' will only pre-fill current form with the first record.`);
          if (isBulk) return processBulkRows(rows, headersClean, fieldMapRaw);
        }

        const rowData = rows[1];
        const newFormData = { ...formData };
        headersClean.forEach((h, idx) => {
          const field = fieldMapRaw[h];
          if (field) {
            let val = rowData[idx];
            if (field === 'dob' || field === 'doj' || field.endsWith('Year')) {
              if (typeof val === 'number' && val > 1000) {
                const d = new Date((val - (25567 + 2)) * 86400 * 1000);
                val = d.toISOString().split('T')[0];
              }
            }
            newFormData[field] = val?.toString() || "";
          }
        });
        setFormData(newFormData);
        alert("Form pre-filled successfully!");
      } catch (err) {
        console.error("Excel Parsing Error:", err);
      }
      e.target.value = "";
    };
    reader.readAsArrayBuffer(file);
  };

  // eslint-disable-next-line no-unused-vars
  const downloadTemplate = (e) => {
    e.preventDefault();
    const headers = [
      "First Name", "Last Name", "Email", "Phone", "DOB", "Gender",
      "Joining Date", "Department", "Designation", "Aadhar Number", "PAN Number",
      "Father Name", "Mother Name", "Blood Group", "Marital Status",
      "Emergency Name", "Emergency Relation", "Emergency Phone",
      "Country", "State", "District", "City", "Street Address", "Postal Code",
      "Account Number", "Bank Name", "IFSC Code", "UAN Number", "PF Number",
      "10th School", "10th Year", "10th Percentage", "10th Board",
      "12th School", "12th Year", "12th Percentage", "12th Board",
      "UG Degree", "UG Specification", "UG College", "UG Year", "UG Percentage",
      "Diploma Degree", "Diploma Specification", "Diploma College", "Diploma Year", "Diploma Percentage",
      "PG Degree", "PG Specification", "PG College", "PG Year", "PG Percentage",
      "Dependent 1 Name", "Dependent 1 Relation", "Dependent 1 DOB", "Dependent 1 Aadhar"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  const handleSameAsPermanentChange = (e) => {
    const checked = e.target.checked;
    setSameAsPermanent(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        presentCountry: prev.residenceCountry,
        presentState: prev.residenceState,
        presentDistrict: prev.residenceDistrict,
        presentCity: prev.residenceCity,
        presentStreet: prev.residenceStreet,
        presentPostalCode: prev.residencePostalCode
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Robust length validation
    const phoneStr = String(formData.phone || "").trim();
    const aadharStr = String(formData.aadharNumber || "").trim();

    if (phoneStr.length !== 10) return alert("Phone must be 10 digits");
    if (aadharStr.length !== 12) return alert("Aadhar must be 12 digits");

    setIsSubmitting(true);
    setUploadProgressMsg("Preparing form data...");

    // ✅ FIXED: Convert file to base64 with proper type checking
    const fileToBase64 = (file) => {
      return new Promise((resolve, reject) => {
        // Check if file is valid
        if (!file) {
          resolve("");
          return;
        }

        // Check if it's actually a File or Blob
        if (!(file instanceof File) && !(file instanceof Blob)) {
          console.warn("Not a valid file:", file);
          resolve("");
          return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // Returns "data:image/png;base64,..."
        reader.onerror = (error) => {
          console.error("FileReader error:", error);
          resolve(""); // Return empty instead of rejecting
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      const submitData = new FormData();
      submitData.append("action", isEditMode ? "updateEmployee" : "submitEmployee");
      if (isEditMode) submitData.append("empId", editEmpId);

      // Append core form data
      Object.keys(formData).forEach(key => {
        if (formData[key] !== undefined) submitData.append(key, formData[key]);
      });

      // Append state arrays securely stringified
      submitData.append("trainings", JSON.stringify(trainings.map(t => ({
        name: t.name,
        institute: t.institute,
        duration: t.duration,
        // Fallback for older systems that check for specific period keys
        period: t.duration,
        StartDate: t.duration?.split(' - ')[0] || t.duration,
        EndDate: t.duration?.split(' - ')[1] || ""
      }))));
      submitData.append("employments", JSON.stringify(employmentHistory.map(e => ({
        ...e,
        // Ensure both period/duration keys are present for backward compatibility
        period: e.duration,
        duration: e.duration
      }))));
      submitData.append("dependents", JSON.stringify(dependents.map(d => ({
        name: d.name,
        dob: d.dob,
        relation: d.relation,
        aadharNumber: d.aadharNumber,
        panNumber: d.panNumber
      }))));

      // ✅ File processing map
      const fileKeyMap = {
        resume: { name: "resumeName", type: "resumeType" },
        sslc: { name: "sslcName", type: "sslcType" },
        hsc: { name: "hscName", type: "hscType" },
        aadharSelf: { name: "aadharName", type: "aadharType" },
        photo: { name: "photoName", type: "photoType" },
        panSelf: { name: "panName", type: "panType" },
        bankPassbookPhoto: { name: "bankNameFile", type: "bankTypeFile" },
        degreeCertificate: { name: "degreeName", type: "degreeType" },
        pgCertificate: { name: "pgName", type: "pgType" },
        diplomaCertificate: { name: "diplomaName", type: "diplomaType" },
        offerLetter: { name: "offerName", type: "offerType" },
        experienceLetter: { name: "expName", type: "expType" },
        relievingLetter: { name: "relievingName", type: "relievingType" },
        payslip: { name: "payName", type: "payType" },
        aadharFather: { name: "aadharFatherName", type: "aadharFatherType" },
        aadharMother: { name: "aadharMotherName", type: "aadharMotherType" }
      };

      const friendlyNames = {
        resume: "Resume", sslc: "SSLC", hsc: "HSC",
        aadharSelf: "Aadhar", photo: "Photo", panSelf: "PAN",
        bankPassbookPhoto: "Bank Passbook", degreeCertificate: "Degree",
        pgCertificate: "PG Certificate", diplomaCertificate: "Diploma",
        offerLetter: "Offer Letter", experienceLetter: "Experience Letter",
        relievingLetter: "Relieving Letter",
        payslip: "Payslip", aadharFather: "Father's Aadhar", aadharMother: "Mother's Aadhar"
      };

      // ✅ Process main files with proper checking
      for (const key of Object.keys(fileKeyMap)) {
        const file = files[key];

        // Skip if no file or not a valid File object
        if (!file || !(file instanceof File)) {
          continue;
        }

        const friendlyName = friendlyNames[key] || key;
        setUploadProgressMsg(`Processing ${friendlyName}...`);

        try {
          const base64 = await fileToBase64(file);
          if (base64) {
            submitData.append(key, base64);
            submitData.append(fileKeyMap[key].name, file.name);
            submitData.append(fileKeyMap[key].type, file.type);
          }
        } catch (err) {
          console.error(`Error processing ${key}:`, err);
        }
      }

      // ✅ Process Training Files with proper checking
      for (let i = 0; i < trainings.length; i++) {
        const certFile = trainings[i].certificatePhoto;

        if (certFile && certFile instanceof File) {
          setUploadProgressMsg(`Processing Training Certificate ${i + 1}...`);
          try {
            const base64 = await fileToBase64(certFile);
            if (base64) {
              submitData.append(`trPhoto_${i}`, base64);
              submitData.append(`trName_${i}`, certFile.name);
              submitData.append(`trType_${i}`, certFile.type);
            }
          } catch (err) {
            console.error(`Error processing training cert ${i}:`, err);
          }
        }
      }

      // ✅ Process Dependent Files with proper checking
      for (let i = 0; i < dependents.length; i++) {
        const dep = dependents[i];
        const depName = dep.name || `Dependent ${i + 1}`;

        // Dependent Photo
        if (dep.photo && dep.photo instanceof File) {
          setUploadProgressMsg(`Processing Photo for ${depName}...`);
          try {
            const base64 = await fileToBase64(dep.photo);
            if (base64) {
              submitData.append(`depPhoto_${i}`, base64);
              submitData.append(`depPhotoName_${i}`, dep.photo.name);
              submitData.append(`depPhotoType_${i}`, dep.photo.type);
            }
          } catch (err) {
            console.error(`Error processing dep photo ${i}:`, err);
          }
        }

        // Dependent Aadhar
        if (dep.aadharPhoto && dep.aadharPhoto instanceof File) {
          setUploadProgressMsg(`Processing Aadhar for ${depName}...`);
          try {
            const base64 = await fileToBase64(dep.aadharPhoto);
            if (base64) {
              submitData.append(`depAadhar_${i}`, base64);
              submitData.append(`depAadharName_${i}`, dep.aadharPhoto.name);
              submitData.append(`depAadharType_${i}`, dep.aadharPhoto.type);
            }
          } catch (err) {
            console.error(`Error processing dep aadhar ${i}:`, err);
          }
        }

        // Dependent PAN and Certificate skipped per user request
      }

      setUploadProgressMsg("Uploading to server... Please wait.");

      // ✅ Debug: Log what we're sending
      // console.log("Payload keys:", Object.keys(payload)); // No longer applicable for FormData
      // console.log("Files being sent:", Object.keys(payload).filter(k => payload[k]?.startsWith?.("data:"))); // No longer applicable for FormData

      // ✅ Send as FormData POST with no-cors
      await fetch(API_URL, {
        method: "POST",
        mode: "no-cors", // Required for cross-origin requests to Google Apps Script
        body: submitData,
      });

      // With 'no-cors', the response is opaque, so we cannot read its status or body.
      // We assume success if the fetch call doesn't throw an error.
      setUploadProgressMsg("Upload complete!");
      alert("Employee Data Submitted Successfully!");
      localStorage.removeItem('employeeFormDraft');
      navigate("/");

    } catch (error) {
      console.error("Submission error:", error);
      alert("Submission failed: " + error.message);
    } finally {
      setIsSubmitting(false);
      setUploadProgressMsg("");
    }
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 6));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const steps = [
    { id: 1, label: "Introduction" },
    { id: 2, label: "Personal data" },
    { id: 3, label: "Education & Work" },
    { id: 4, label: "Contacts" },
    { id: 5, label: "Bank Details" },
    { id: 6, label: "Documents" }
  ];

  return (
    <div className="onboarding-app">
      {/* Mobile Top Header */}
      <div className="mobile-form-header">
        <div className="mobile-header-top">
          <img src="/chn-logo.png" alt="Logo" className="mobile-logo-img" />
          <div className="mobile-step-pill">Step {currentStep} of 6</div>
        </div>
        <div className="mobile-progress-track">
          <div className="mobile-progress-bar" style={{ width: `${(currentStep / 6) * 100}%` }}></div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-logo">
          <img src="/chn-logo.png" alt="Logo" />

        </div>

        <div className="stepper-nav">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`stepper-nav-item ${currentStep === step.id ? "active" : ""}`}
              onClick={() => setCurrentStep(step.id)}
            >
              <div className="step-circle">{step.id}</div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar">{formData.firstName ? formData.firstName.charAt(0).toUpperCase() : "U"}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--primary-color)' }}>{formData.firstName || "Employee"}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Online</span>
            </div>
          </div>
          <span className="logout-link" onClick={() => navigate("/")}>Logout</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="deadline-info">
            <h3>10 days left</h3>
            <p>To submit the onboarding form.</p>
          </div>
          {/* <a href="#" className="help-link">Need help?</a> */}
        </div>

        <div className="content-card">
          {currentStep === 1 && (
            <div className="intro-step">
              <div className="intro-image">
                <img
                  src="https://i.pinimg.com/736x/be/c6/77/bec677860a0ac4bbed6027deaf01edf4.jpg"
                  alt="Welcome"
                  style={{ width: '100%', height: '400px', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                />
              </div>

              <div className="intro-text">
                <h2 style={{ fontSize: '48px', color: 'var(--primary-color)' }}>Welcome {formData.firstName || "Employee"}!</h2>
                <p style={{ fontSize: '18px', maxWidth: '400px' }}>Your journey at CHN starts here. All of your hiring processes will happen on Tierr!</p>

                <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                  <input
                    type="file"
                    ref={excelInputRef}
                    onChange={handleImportExcel}
                    accept=".xlsx, .xls"
                    style={{ display: 'none' }}
                  />
                  {/* <button
                    className="btn-next"
                    style={{ background: '#0891b2', fontSize: '14px', padding: '12px 20px' }}
                    onClick={() => excelInputRef.current.click()}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    Import from Excel
                  </button>
                  <button
                    className="btn-prev"
                    style={{ fontSize: '14px', padding: '12px 20px' }}
                    onClick={downloadTemplate}
                  >
                    Download Template
                  </button> */}
                </div>

                <div className="info-banner" style={{ marginTop: '40px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                  <span style={{ fontWeight: '500' }}>We save your data automatically, you might continue the process at any time.</span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="form-step">
              <h2 className="step-title">Personal data</h2>
              <div className="form-card form-grid">
                <FormGroup label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} />
                <FormGroup label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} />
                <FormGroup label="Date of Birth" name="dob" type="date" value={formData.dob} onChange={handleChange} />
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select Gender</option><option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Country & Phone Number *</label>
                  <div className="phone-input-complex">
                    <select
                      name="countryName"
                      value={formData.countryName || "India"}
                      onChange={(e) => {
                        const selectedCountry = COUNTRIES.find(c => c.name === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          countryName: e.target.value,
                          countryCode: selectedCountry?.code || ""
                        }));
                      }}
                      className="country-name-select"
                    >
                      <option value="">Select Country</option>
                      {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="phone-code-input-group">

                      <span className="static-code">{formData.countryCode || "+91"}</span>
                      <input
                        type="text"
                        name="phone"
                        placeholder="9876543210"
                        maxLength={10}
                        value={formData.phone || ""}
                        onChange={(e) => handleNumberOnly(e, 10, "phone")}
                        required
                      />
                    </div>
                  </div>
                </div>
                <FormGroup label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} />
                <FormGroup label="Date of Joining" name="doj" type="date" value={formData.doj} onChange={handleChange} />

                <div className="form-group">
                  <label>Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={(e) => {
                      handleChange(e);
                      // Reset designation when department changes
                      setFormData(prev => ({ ...prev, designation: "" }));
                    }}
                    required
                  >
                    <option value="">Select Department</option>
                    <option value="Technology">Technology</option>
                    <option value="HR">HR</option>

                    <option value="WFM">WFM</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Administration">Administration</option>
                    <option value="Accounting & Finance">Accounting & Finance</option>
                    <option value="Business Development">Business Development</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Designation *</label>
                  <select
                    name="designation"
                    value={formData.designation}
                    onChange={handleChange}
                    required
                    disabled={!formData.department}
                  >
                    <option value="">{formData.department ? "Select Designation" : "Please select department first"}</option>
                    {formData.department && DEPARTMENT_DESIGNATIONS[formData.department]?.map(desig => (
                      <option key={desig} value={desig}>{desig}</option>
                    ))}
                  </select>
                </div>
                <FormGroup label="Father Name" name="fatherName" value={formData.fatherName} onChange={handleChange} required />
                <FormGroup label="Mother Name" name="motherName" value={formData.motherName} onChange={handleChange} required />
                <div className="form-group">
                  <label>Marital Status *</label>
                  <select name="maritalStatus" value={maritalStatus} onChange={(e) => { setMaritalStatus(e.target.value); handleChange(e); }} required>
                    <option value="">Select Status</option><option value="Single">Single</option><option value="Married">Married</option><option value="Divorced">Divorced</option>
                  </select>
                </div>
                {maritalStatus === "Married" && <FormGroup label="Spouse Name" name="spouseName" value={formData.spouseName} onChange={handleChange} required={false} />}
                <FormGroup label="Blood Group" name="bloodGroup" value={formData.bloodGroup || ""} onChange={handleChange} required />
                <FormGroup label="Aadhar Number" name="aadharNumber" maxLength={12} value={formData.aadharNumber} onChange={(e) => handleNumberOnly(e, 12, "aadharNumber")} required />
                <FormGroup label="PAN Number" name="panNumber" value={formData.panNumber} onChange={handleChange} required />
              </div>

              <div className="form-card" style={{ gridColumn: 'span 2', marginTop: '20px' }}>
                <h4 className="section-heading" style={{ marginTop: '0' }}>Permanent Address</h4>

                <div className="residence-fields">


                  <div className="residence-field">
                    <label>Country</label>
                    <select name="residenceCountry" value={formData.residenceCountry || ""} onChange={handleChange} required>
                      <option value="">Select country</option>
                      {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="residence-field">
                    <label>State</label>
                    <select name="residenceState" value={formData.residenceState} onChange={handleChange} required>
                      <option value="">Select State</option>
                      {formData.residenceCountry && COUNTRY_STATES[formData.residenceCountry]?.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="residence-field">
                    <label>District</label>
                    {formData.residenceState === "Tamil Nadu" ? (
                      <select
                        name="residenceDistrict"
                        value={formData.residenceDistrict}
                        onChange={(e) => {
                          handleChange(e);
                          // Reset City when District changes
                          setFormData(prev => ({ ...prev, residenceCity: "" }));
                        }}
                        required
                      >
                        <option value="">Select District</option>
                        {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="residenceDistrict"
                        placeholder="Enter district"
                        value={formData.residenceDistrict || ""}
                        onChange={handleChange}
                        required
                      />
                    )}
                  </div>

                  <div className="residence-field">
                    <label>City/Town</label>
                    {formData.residenceDistrict && DISTRICT_CITIES[formData.residenceDistrict] ? (
                      <select name="residenceCity" value={formData.residenceCity} onChange={handleChange} required>
                        <option value="">Select City/Town</option>
                        {DISTRICT_CITIES[formData.residenceDistrict].map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <input
                        type="text"
                        name="residenceCity"
                        placeholder="Enter city or town"
                        value={formData.residenceCity || ""}
                        onChange={handleChange}
                        required
                      />
                    )}
                  </div>
                  <div className="residence-field">
                    <label>Street Name</label>
                    <input
                      type="text"
                      name="residenceStreet"
                      placeholder="Door No, Street name, Area"
                      value={formData.residenceStreet || ""}
                      onChange={handleChange}
                      required
                    />
                  </div>



                  <div className="residence-field">
                    <label>Postal Code</label>
                    <input
                      type="text"
                      name="residencePostalCode"
                      placeholder=" postal code"
                      maxLength={6}
                      value={formData.residencePostalCode || ""}
                      onChange={(e) => handleNumberOnly(e, 6, "residencePostalCode")}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Present Address */}
              <div className="form-card" style={{ gridColumn: 'span 2', marginTop: '30px' }}>
                <h4 className="section-heading" style={{ marginTop: '0' }}>Present Address</h4>

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="sameAsPermanent"
                    checked={sameAsPermanent}
                    onChange={handleSameAsPermanentChange}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="sameAsPermanent" style={{ fontSize: '14px', cursor: 'pointer', color: 'var(--primary-color)', fontWeight: '600' }}>Same as Permanent Address</label>
                </div>

                {!sameAsPermanent && (
                  <div className="residence-fields">
                    <div className="residence-field">
                      <label>Country</label>
                      <select name="presentCountry" value={formData.presentCountry || ""} onChange={handleChange} required>
                        <option value="">Select country</option>
                        {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="residence-field">
                      <label>State</label>
                      <select name="presentState" value={formData.presentState} onChange={handleChange} required>
                        <option value="">Select State</option>
                        {formData.presentCountry && COUNTRY_STATES[formData.presentCountry]?.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="residence-field">
                      <label>District</label>
                      {formData.presentState === "Tamil Nadu" ? (
                        <select
                          name="presentDistrict"
                          value={formData.presentDistrict}
                          onChange={(e) => {
                            handleChange(e);
                            setFormData(prev => ({ ...prev, presentCity: "" }));
                          }}
                          required
                        >
                          <option value="">Select District</option>
                          {TAMIL_NADU_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="presentDistrict"
                          placeholder="Enter district"
                          value={formData.presentDistrict || ""}
                          onChange={handleChange}
                          required
                        />
                      )}
                    </div>

                    <div className="residence-field">
                      <label>City/Town</label>
                      {formData.presentDistrict && DISTRICT_CITIES[formData.presentDistrict] ? (
                        <select name="presentCity" value={formData.presentCity} onChange={handleChange} required>
                          <option value="">Select City/Town</option>
                          {DISTRICT_CITIES[formData.presentDistrict].map(city => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          name="presentCity"
                          placeholder="Enter city or town"
                          value={formData.presentCity || ""}
                          onChange={handleChange}
                          required
                        />
                      )}
                    </div>

                    <div className="residence-field">
                      <label>Street Name</label>
                      <input
                        type="text"
                        name="presentStreet"
                        placeholder="Door No, Street name, Area"
                        value={formData.presentStreet || ""}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="residence-field">
                      <label>Postal Code</label>
                      <input
                        type="text"
                        name="presentPostalCode"
                        placeholder=" postal code"
                        maxLength={6}
                        value={formData.presentPostalCode || ""}
                        onChange={(e) => handleNumberOnly(e, 6, "presentPostalCode")}
                        required
                      />
                    </div>
                  </div>
                )}
                {sameAsPermanent && (
                  <div className="info-banner" style={{ margin: '0' }}>
                    <span>Present address is currently mirrored from permanent address.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="form-step">
              <h2 className="step-title">Dependents & Emergency Contact</h2>



              <h4 className="section-heading">Dependents</h4>
              {dependents.map((dep, i) => (
                <div key={i} className="form-card form-grid">
                  <FormGroup label="Dependent Name" name="name" value={dep.name} onChange={(e) => handleDependentChange(i, e)} />
                  <div className="form-group">
                    <label>Relationship</label>
                    <select name="relation" value={dep.relation} onChange={(e) => handleDependentChange(i, e)}>
                      <option value="">Select Relationship</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>

                    </select>
                  </div>
                  <FormGroup label="Date of Birth" name="dob" type="date" value={dep.dob} onChange={(e) => handleDependentChange(i, e)} />
                  <FormGroup label="Aadhar Number" name="aadharNumber" value={dep.aadharNumber} onChange={(e) => handleDependentChange(i, e)} />
                </div>
              ))}
              <button className="btn-add" style={{ marginBottom: '20px' }} onClick={addDependentRow}>+ Add Another Dependent</button>
              <h4 className="section-heading">Emergency Contact</h4>
              <div className="form-card form-grid" style={{ marginBottom: '40px' }}>
                <FormGroup label="Contact Name" name="emergencyName" value={formData.emergencyName} onChange={handleChange} required />
                <div className="form-group">
                  <label>Relationship *</label>
                  <select name="emergencyRelation" value={formData.emergencyRelation} onChange={handleChange} required>
                    <option value="">Select Relationship</option>
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Son">Son</option>
                    <option value="Daughter">Daughter</option>
                    <option value="Brother">Brother</option>
                    <option value="Sister">Sister</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Emergency Country & Phone *</label>
                  <div className="phone-input-complex">
                    <select
                      name="emergencyCountryName"
                      value={formData.emergencyCountryName || "India"}
                      onChange={(e) => {
                        const selectedCountry = COUNTRIES.find(c => c.name === e.target.value);
                        setFormData(prev => ({
                          ...prev,
                          emergencyCountryName: e.target.value,
                          emergencyCountryCode: selectedCountry?.code || ""
                        }));
                      }}
                      className="country-name-select"
                      required
                    >
                      {COUNTRIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    <div className="phone-code-input-group">
                      <span className="static-code">{formData.emergencyCountryCode || "+91"}</span>
                      <input
                        type="text"
                        name="emergencyPhone"
                        placeholder="9876543210"
                        maxLength={10}
                        value={formData.emergencyPhone || ""}
                        onChange={(e) => handleNumberOnly(e, 10, "emergencyPhone")}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {currentStep === 6 && (
            <div className="form-step">
              <h2 className="step-title">Documents</h2>
              <div className="form-card form-grid">
                <FormGroup label="Personal Photo" type="file" name="photo" onChange={handleFileChange} fileName={files.photo?.name} existingUrl={formData.photoUrl} required />
                <FormGroup label="Resume / CV" type="file" name="resume" onChange={handleFileChange} fileName={files.resume?.name} existingUrl={formData.resumeUrl} required />
                <FormGroup label="Aadhar Card" type="file" name="aadharSelf" onChange={handleFileChange} fileName={files.aadharSelf?.name} existingUrl={formData.aadharUrl} required />
                <FormGroup label="PAN Card" type="file" name="panSelf" onChange={handleFileChange} fileName={files.panSelf?.name} existingUrl={formData.panUrl} required />
                <FormGroup label="SSLC / 10th Marksheet" type="file" name="sslc" onChange={handleFileChange} fileName={files.sslc?.name} existingUrl={formData.sslcUrl} required />
                <FormGroup label="HSC / 12th Marksheet" type="file" name="hsc" onChange={handleFileChange} fileName={files.hsc?.name} existingUrl={formData.hscUrl} required />
                <FormGroup label="Diploma Certificate" type="file" name="diplomaCertificate" onChange={handleFileChange} fileName={files.diplomaCertificate?.name} existingUrl={formData.diplomaUrl} required={false} />
                <FormGroup label="Degree Certificate" type="file" name="degreeCertificate" onChange={handleFileChange} fileName={files.degreeCertificate?.name} existingUrl={formData.degreeUrl} required />
                <FormGroup label="PG Certificate" type="file" name="pgCertificate" onChange={handleFileChange} fileName={files.pgCertificate?.name} existingUrl={formData.pgUrl} required={false} />
                <FormGroup label="Bank Passbook / Cheque" type="file" name="bankPassbookPhoto" onChange={handleFileChange} fileName={files.bankPassbookPhoto?.name} existingUrl={formData.bankPassbookUrl} required />
                <FormGroup label="Father's Aadhar" type="file" name="aadharFather" onChange={handleFileChange} fileName={files.aadharFather?.name} existingUrl={formData.aadharFatherUrl} required />
                <FormGroup label="Mother's Aadhar" type="file" name="aadharMother" onChange={handleFileChange} fileName={files.aadharMother?.name} existingUrl={formData.aadharMotherUrl} required />
                {isExperienced && (
                  <>
                    <FormGroup label="Relieving Letter" type="file" name="relievingLetter" onChange={handleFileChange} fileName={files.relievingLetter?.name} existingUrl={formData.relievingUrl} />
                    <FormGroup label="Experience Letter" type="file" name="experienceLetter" onChange={handleFileChange} fileName={files.experienceLetter?.name} existingUrl={formData.experienceLetterUrl} />
                    <FormGroup label="Latest Payslip" type="file" name="payslip" onChange={handleFileChange} fileName={files.payslip?.name} existingUrl={formData.payslipUrl} />
                  </>
                )}
                {trainings.map((t, idx) => (
                  <FormGroup key={idx} label={(t.name ? t.name : `Training ${idx + 1}`) + " Certificate Photo"} type="file" name="certificatePhoto" onChange={(e) => handleTrainingFileChange(idx, e)} fileName={t.certificatePhoto?.name} existingUrl={t.certificateUrl} />
                ))}
                {dependents.map((dep, idx) => (
                  <div key={idx} style={{ display: 'contents' }}>
                    <FormGroup label={(dep.name ? dep.name : `Dependent ${idx + 1}`) + " Photo"} type="file" name="photo" onChange={(e) => handleDependentFileChange(idx, e)} fileName={dep.photo?.name} existingUrl={dep.photoUrl} />
                    <FormGroup label={(dep.name ? dep.name : `Dependent ${idx + 1}`) + " Aadhar"} type="file" name="aadharPhoto" onChange={(e) => handleDependentFileChange(idx, e)} fileName={dep.aadharPhoto?.name} existingUrl={dep.aadharUrl} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="form-step">
              <h2 className="step-title">Education & Experience</h2>

              <div className="form-section">
                <h4 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>Education Details</h4>

                {/* 10TH */}
                <div className="form-card">
                  <h3 className="section-heading">10th</h3>
                  <div className="form-grid">
                    <FormGroup label="School Name" name="10thSchool" value={formData["10thSchool"]} onChange={handleChange} />
                    <div className="form-group">
                      <label>Year of Passing</label>
                      <select name="10thYear" value={formData["10thYear"]} onChange={handleChange}>
                        <option value="">Select Year</option>
                        {PASSING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <FormGroup label="Percentage" name="10thPercent" value={formData["10thPercent"]} onChange={handleChange} />
                    <div className="form-group">
                      <label>Board of Education</label>
                      <select name="10thBoard" value={formData["10thBoard"]} onChange={handleChange}>
                        <option value="">Select Board</option>
                        <option value="State Board">State Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="Matriculation">Matriculation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 12TH */}
                <div className="form-card">
                  <h3 className="section-heading">12th</h3>
                  <div className="form-grid">
                    <FormGroup label="School Name" name="12thSchool" value={formData["12thSchool"]} onChange={handleChange} />
                    <div className="form-group">
                      <label>Year of Passing</label>
                      <select name="12thYear" value={formData["12thYear"]} onChange={handleChange}>
                        <option value="">Select Year</option>
                        {PASSING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <FormGroup label="Percentage" name="12thPercent" value={formData["12thPercent"]} onChange={handleChange} />
                    <div className="form-group">
                      <label>Board of Education</label>
                      <select name="12thBoard" value={formData["12thBoard"]} onChange={handleChange}>
                        <option value="">Select Board</option>
                        <option value="State Board">State Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="Matriculation">Matriculation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* DIPLOMA OPTIONAL */}
                <div className="form-card">
                  <h3 className="section-heading">Diploma OR ITI (Optional)</h3>
                  <div className="form-grid">
                    <FormGroup label="Diploma OR ITI Degree" name="DiplomaDegree" value={formData.DiplomaDegree} onChange={handleChange} required={false} />
                    <FormGroup label="Specialization / Specification" name="DiplomaSpecialization" value={formData.DiplomaSpecialization} onChange={handleChange} placeholder="e.g. Electrical Engineering" required={false} />
                    <div className="form-group">
                      <label>Institution/University</label>
                      <select name="DiplomaCollege" value={TAMIL_NADU_COLLEGES.includes(formData.DiplomaCollege) ? formData.DiplomaCollege : (formData.DiplomaCollege ? "Other" : "")} onChange={(e) => {
                        if (e.target.value === "Other") {
                          setFormData(prev => ({ ...prev, DiplomaCollege: "", manualDiplomaCollege: "" }));
                        } else {
                          setFormData(prev => ({ ...prev, DiplomaCollege: e.target.value, manualDiplomaCollege: undefined }));
                        }
                      }} required={false}>
                        <option value="">Select Institution</option>
                        {TAMIL_NADU_COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {(formData.manualDiplomaCollege !== undefined || (formData.DiplomaCollege && !TAMIL_NADU_COLLEGES.includes(formData.DiplomaCollege))) && (
                        <input
                          type="text"
                          placeholder="Type your Institution Name"
                          value={formData.DiplomaCollege || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, DiplomaCollege: e.target.value, manualDiplomaCollege: e.target.value }))}
                          style={{ marginTop: '10px' }}
                          required={false}
                        />
                      )}
                    </div>
                    <div className="form-group">
                      <label>Year of Passing</label>
                      <select name="DiplomaYear" value={formData.DiplomaYear} onChange={handleChange} required={false}>
                        <option value="">Select Year</option>
                        {PASSING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <FormGroup label="Percentage" name="DiplomaPercent" value={formData.DiplomaPercent} onChange={handleChange} required={false} />
                  </div>
                </div>

                {/* UG */}
                <div className="form-card">
                  <h3 className="section-heading">Undergraduate (UG)</h3>
                  <div className="form-grid">
                    <FormGroup label="Degree " name="UGDegree" value={formData.UGDegree} onChange={handleChange} required={false} />
                    <FormGroup label="Specialization / Specification (Major)" name="UGSpecification" value={formData.UGSpecification} onChange={handleChange} placeholder="e.g. Computer Science" required={false} />

                    <div className="form-group">
                      <label>Institution/University</label>
                      <select name="UGCollege" value={TAMIL_NADU_COLLEGES.includes(formData.UGCollege) ? formData.UGCollege : (formData.UGCollege ? "Other" : "")} onChange={(e) => {
                        if (e.target.value === "Other") {
                          setFormData(prev => ({ ...prev, UGCollege: "", manualUGCollege: "" }));
                        } else {
                          setFormData(prev => ({ ...prev, UGCollege: e.target.value, manualUGCollege: undefined }));
                        }
                      }} required={false}>
                        <option value="">Select Institution</option>
                        {TAMIL_NADU_COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {(formData.manualUGCollege !== undefined || (formData.UGCollege && !TAMIL_NADU_COLLEGES.includes(formData.UGCollege))) && (
                        <input
                          type="text"
                          placeholder="Type your Institution Name"
                          value={formData.UGCollege || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, UGCollege: e.target.value, manualUGCollege: e.target.value }))}
                          style={{ marginTop: '10px' }}
                          required
                        />
                      )}
                    </div>
                    <div className="form-group">
                      <label>Year of Passing</label>
                      <select name="UGYear" value={formData.UGYear} onChange={handleChange} required={false}>
                        <option value="">Select Year</option>
                        {PASSING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <FormGroup label="Percentage" name="UGPercent" value={formData.UGPercent} onChange={handleChange} required={false} />
                  </div>
                </div>

                {/* PG OPTIONAL */}
                <div className="form-card">
                  <h3 className="section-heading">Postgraduate (PG) (Optional)</h3>
                  <div className="form-grid">
                    <FormGroup label="Degree" name="PGDegree" value={formData.PGDegree} onChange={handleChange} required={false} />
                    <FormGroup label="Specialization / Specification" name="PGSpecification" value={formData.PGSpecification} onChange={handleChange} placeholder="e.g. MBA Management" required={false} />

                    <div className="form-group">
                      <label>Institution/University</label>
                      <select name="PGCollege" value={TAMIL_NADU_COLLEGES.includes(formData.PGCollege) ? formData.PGCollege : (formData.PGCollege ? "Other" : "")} onChange={(e) => {
                        if (e.target.value === "Other") {
                          setFormData(prev => ({ ...prev, PGCollege: "", manualPGCollege: "" }));
                        } else {
                          setFormData(prev => ({ ...prev, PGCollege: e.target.value, manualPGCollege: undefined }));
                        }
                      }} required={false}>
                        <option value="">Select Institution</option>
                        {TAMIL_NADU_COLLEGES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {(formData.manualPGCollege !== undefined || (formData.PGCollege && !TAMIL_NADU_COLLEGES.includes(formData.PGCollege))) && (
                        <input
                          type="text"
                          placeholder="Type your Institution Name"
                          value={formData.PGCollege || ""}
                          onChange={(e) => setFormData(prev => ({ ...prev, PGCollege: e.target.value, manualPGCollege: e.target.value }))}
                          style={{ marginTop: '10px' }}
                          required={false}
                        />
                      )}
                    </div>

                    <div className="form-group">
                      <label>Year of Passing</label>
                      <select name="PGYear" value={formData.PGYear} onChange={handleChange} required={false}>
                        <option value="">Select Year</option>
                        {PASSING_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>

                    <FormGroup label="Percentage" name="PGPercent" value={formData.PGPercent} onChange={handleChange} required={false} />
                  </div>
                </div>
              </div>

              <h4 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '5px' }}>Work Experience</h4>
              <div className="form-grid">
                <FormGroup label="Total Exp (Years)" name="totalExpYears" value={formData.totalExpYears} onChange={handleChange} />
                <FormGroup label="Total Exp (Months)" name="totalExpMonths" value={formData.totalExpMonths} onChange={handleChange} />
                <div className="form-group">
                  <label>Career Break?</label>
                  <select name="careerBreak" value={careerBreak} onChange={(e) => setCareerBreak(e.target.value)}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </div>
                {careerBreak === "yes" && <FormGroup label="Break Reason" name="careerBreakReason" value={formData.careerBreakReason} onChange={handleChange} />}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Previous Employment Documents?</label>
                  <select onChange={(e) => setIsExperienced(e.target.value === "yes")}>
                    <option value="no">Fresher</option><option value="yes">Experienced</option>
                  </select>
                </div>
              </div>

              {isExperienced && (
                <div style={{ marginTop: '20px' }}>
                  <h4 className="section-heading">Employment History Details</h4>
                  {employmentHistory.map((exp, idx) => (
                    <div key={idx} className="form-card">
                      <h5 style={{ fontSize: '14px', color: '#64748b', marginBottom: '15px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {idx === 0 ? "Last Company Details" : idx === 1 ? "Previous Company Details" : `Company ${idx + 1} Details`}
                      </h5>
                      <div className="form-grid">
                        <FormGroup label="Company Name" name="organization" value={exp.organization} onChange={(e) => handleEmploymentChange(idx, e)} />
                        <FormGroup label="Designation" name="designation" value={exp.designation} onChange={(e) => handleEmploymentChange(idx, e)} />
                        <FormGroup label="Duration" name="duration" placeholder="e.g. Jan 2022 - Jun 2023" value={exp.duration} onChange={(e) => handleEmploymentChange(idx, e)} />
                        <FormGroup label="CTC Per Annum" name="salary" placeholder="e.g. 5,00,000" value={exp.salary} onChange={(e) => handleEmploymentChange(idx, e)} />
                        <FormGroup label="Reason for Leaving" name="reason" value={exp.reason} onChange={(e) => handleEmploymentChange(idx, e)} />
                      </div>

                      {/* Integrated Reference Section for Last and Previous Company */}
                      {(idx === 0 || idx === 1) && (
                        <div style={{ marginTop: '25px', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                          <h5 style={{ fontSize: '13px', color: '#475569', marginBottom: '15px', fontWeight: '600' }}>
                            PROFESSIONAL REFERENCE FOR {idx === 0 ? "LAST" : "PREVIOUS"} COMPANY
                          </h5>
                          <h4 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>HR Reference</h4>
                          <div className="form-grid">
                            <FormGroup label="HR Name" name={idx === 0 ? "lastHrName" : "prevHrName"} value={formData[idx === 0 ? "lastHrName" : "prevHrName"]} onChange={handleChange} required={isExperienced} />
                            <FormGroup label="HR Contact Number" name={idx === 0 ? "lastHrContact" : "prevHrContact"} value={formData[idx === 0 ? "lastHrContact" : "prevHrContact"]} onChange={(e) => handleNumberOnly(e, 10, idx === 0 ? "lastHrContact" : "prevHrContact")} required={isExperienced} />
                            <FormGroup label="HR Email ID" name={idx === 0 ? "lastHrEmail" : "prevHrEmail"} type="email" value={formData[idx === 0 ? "lastHrEmail" : "prevHrEmail"]} onChange={handleChange} required={isExperienced} />
                          </div>

                          <h4 style={{ fontSize: '14px', color: '#64748b', margin: '20px 0 10px' }}>Reporting Manager Reference</h4>
                          <div className="form-grid">
                            <FormGroup label="Manager Name" name={idx === 0 ? "lastMgrName" : "prevMgrName"} value={formData[idx === 0 ? "lastMgrName" : "prevMgrName"]} onChange={handleChange} required={isExperienced} />
                            <FormGroup label="Manager Contact Number" name={idx === 0 ? "lastMgrContact" : "prevMgrContact"} value={formData[idx === 0 ? "lastMgrContact" : "prevMgrContact"]} onChange={(e) => handleNumberOnly(e, 10, idx === 0 ? "lastMgrContact" : "prevMgrContact")} required={isExperienced} />
                            <FormGroup label="Manager Email ID" name={idx === 0 ? "lastMgrEmail" : "prevMgrEmail"} type="email" value={formData[idx === 0 ? "lastMgrEmail" : "prevMgrEmail"]} onChange={handleChange} required={isExperienced} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div style={{ marginBottom: '30px' }}>
                    <button className="btn-add" onClick={addEmploymentRow}>+ Add Company</button>
                  </div>
                </div>
              )}

              <h4 className="section-heading">Professional Certifications</h4>
              {trainings.map((t, idx) => (
                <div key={idx} className="form-card form-grid">
                  <FormGroup label="Course Name" name="name" value={t.name} onChange={(e) => handleTrainingChange(idx, e)} />
                  <FormGroup label="Institute" name="institute" value={t.institute} onChange={(e) => handleTrainingChange(idx, e)} />
                  <FormGroup label="Duration" name="duration" placeholder="e.g. Jan 2022 - Jun 2023" value={t.duration} onChange={(e) => handleTrainingChange(idx, e)} />
                </div>
              ))}
              <div style={{ marginBottom: '30px' }}>
                <button className="btn-add" onClick={addTrainingRow}>+ Add Training</button>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="form-step">
              <h2 className="step-title">Bank Details</h2>
              <h4 className="section-heading">Bank Account Details</h4>
              <div className="form-card form-grid" style={{ marginBottom: '40px' }}>
                <FormGroup label="Account Holder Name" name="accountHolderName" value={formData.accountHolderName} onChange={handleChange} required />
                <FormGroup label="Bank Name" name="bankName" value={formData.bankName} onChange={handleChange} required />
                <FormGroup label="Account Number" name="accountNumber" value={formData.accountNumber} onChange={(e) => handleNumberOnly(e, 20, "accountNumber")} required />
                <FormGroup label="IFSC Code" name="ifscCode" value={formData.ifscCode} onChange={handleChange} required />
                <FormGroup label="Branch Name" name="branchName" value={formData.branchName} onChange={handleChange} required />
              </div>

              <div className="form-card form-grid">
                <div className="form-group">
                  <label>ESI / PF Registration *</label>
                  <select value={esiApplicable} onChange={(e) => setEsiApplicable(e.target.value)}>
                    <option value="no">No</option><option value="yes">Yes</option>
                  </select>
                </div>
                {esiApplicable === "yes" && (
                  <>
                    <FormGroup label="UAN Number" name="uanNumber" value={formData.uanNumber} onChange={handleChange} />
                    <FormGroup label="PF Number" name="pfNumber" value={formData.pfNumber} onChange={handleChange} />
                    <FormGroup label="ESI Number" name="esiNumber" value={formData.esiNumber} onChange={handleChange} />
                  </>
                )}
              </div>
            </div>
          )}

          <div className="card-footer" style={{ display: 'flex', justifyContent: currentStep > 1 ? 'space-between' : 'flex-end', alignItems: 'center' }}>
            {currentStep > 1 && <button className="btn-prev" onClick={prevStep}>Previous</button>}
            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className="btn-prev"
                style={{ background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569' }}
                onClick={handleSaveDraft}
              >
                Save Draft
              </button>
              {currentStep < 6 ? (
                <button className="btn-next" onClick={nextStep}>
                  Next Step
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <button className="btn-next" style={{ background: '#22c55e' }} onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? <div className="bouncing-loader"><div></div><div></div><div></div></div> : (isEditMode ? "Update Profile" : "Submit Final Onboarding")}
                  </button>
                  {isSubmitting && uploadProgressMsg && (
                    <span style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', fontWeight: '500' }}>{uploadProgressMsg}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FormGroup({ label, name, type = "text", value, onChange, maxLength, placeholder, fileName, existingUrl, required = true }) {
  const getDriveDirectLink = (url) => {
    if (!url || !url.includes("drive.google.com")) return url;
    const fileId = url.split("/d/")[1]?.split("/")[0] || url.split("id=")[1]?.split("&")[0];
    return fileId ? `https://lh3.googleusercontent.com/u/0/d/${fileId}` : url;
  };

  return (
    <div className="form-group">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label style={{ marginBottom: 0 }}>{label}{required && " *"}</label>
        {type === "file" && existingUrl && (
          <a
            href={getDriveDirectLink(existingUrl)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
          >
            View Current
          </a>
        )}
      </div>
      {type === "file" ? (
        <label className="file-input-label">
          <input type="file" name={name} onChange={onChange} style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg" required={required && !existingUrl} />
          <div className="file-box" style={fileName ? { borderColor: '#22c55e', backgroundColor: '#f0fdf4' } : {}}>
            {fileName ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '100%', overflow: 'hidden' }}>
              <span style={fileName ? { color: '#166534', fontWeight: '600', fontSize: '12px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', padding: '0 10px', width: '100%' } : {}}>{fileName || label}</span>
              {!fileName && <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>PDF, JPG (Max 2MB)</span>}
            </div>
          </div>
        </label>
      ) : (
        <input
          type={type}
          name={name}
          value={value || ""}
          onChange={onChange}
          maxLength={maxLength}
          placeholder={placeholder}
          required={required}
        />
      )}
    </div>
  );
}

export default EmployeeForm;