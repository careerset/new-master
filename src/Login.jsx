import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

function EmployeeLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [tempEmployeeId, setTempEmployeeId] = useState(null);
  const [isFaceScanMode, setIsFaceScanMode] = useState(false);
  const [storedPhoto, setStoredPhoto] = useState(null);
  const [faceScanStatus, setFaceScanStatus] = useState("Initializing...");
  const [faceScanError, setFaceScanError] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const isSubmitting = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const API_URL = process.env.REACT_APP_API_URL;

  // ================= FACE RECOGNITION SETUP =================
  useEffect(() => {
    const loadFaceApi = async () => {
      if (window.faceapi) return;

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js";
      script.async = true;
      script.onload = () => {
        console.log("Face-api loaded");
        loadModels();
      };
      document.body.appendChild(script);
    };

    const loadModels = async () => {
      try {
        setFaceScanStatus("Loading AI models...");
        const MODEL_URL = "https://vladmandic.github.io/face-api/model/";
        await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setFaceScanStatus("Ready for face scan");
      } catch (err) {
        console.error("Error loading models", err);
        setFaceScanError("Failed to load AI models. Please check your connection.");
      }
    };

    loadFaceApi();
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = async () => {
    try {
      setFaceScanError("");
      setFaceScanStatus("Starting camera...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: "user" 
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setFaceScanStatus("Camera active. Align your face.");
      }
    } catch (err) {
      console.error("Error starting camera", err);
      setFaceScanError("Camera access denied or not found.");
    }
  };

  // ================= LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();
    if (isSubmitting.current) return;

    if (!API_URL) {
      alert("API URL is not configured. Please check your .env file and RESTART the dev server.");
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "login",
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        setTempEmployeeId(data.employeeId);
        
        // Fetch profile to see if face scan is possible
        try {
          const profileRes = await fetch(`${API_URL}?action=getEmployee&empId=${data.employeeId}`);
          const profileData = await profileRes.json();
          
          if (profileData.status === "success" && profileData.employee?.Photo) {
            setStoredPhoto(profileData.employee.Photo);
            setIsFaceScanMode(true);
            startCamera();
            return; // Skip OTP for now, user can switch back if needed
          }
        } catch (profileErr) {
          console.error("Error fetching profile for face scan", profileErr);
        }

        // Directly login if no face scan profile is found
        localStorage.setItem("employeeLoggedIn", "true");
        localStorage.setItem("employeeId", data.employeeId);
        navigate("/employee-dashboard");
      } else {
        alert(data.message || "Invalid Email or Password");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  const handleFaceScanLogin = async () => {
    if (!email) {
      alert("Please enter your email to proceed with face scan.");
      return;
    }

    setIsLoading(true);
    setFaceScanStatus("Locating profile...");
    setFaceScanError("");

    try {
      // Step A: We need the employeeId. 
      // Since we don't have getEmployeeByEmail, we use our knowledge that existing action=login 
      // requires a password. However, there's getEmployee&empId.
      // I'll try to find the employee by email by fetching all and filtering, or 
      // just assume the user knows their ID if we add an ID field, but email is better.
      const res = await fetch(`${API_URL}?action=getAllEmployees`);
      const data = await res.json();
      
      if (data.status === "success") {
        const emp = data.employees.find(e => (e.Email || e.email)?.toLowerCase() === email.trim().toLowerCase());
        if (emp && emp.Photo) {
          setStoredPhoto(emp.Photo);
          setTempEmployeeId(emp.EmpID || emp.employee_code);
          setIsFaceScanMode(true);
          startCamera();
        } else if (emp && !emp.Photo) {
          alert("Face scan profile not found. Please contact HR to upload your profile photo.");
        } else {
          alert("Employee not found with this email.");
        }
      } else {
        alert("System error or profile not found.");
      }
    } catch (err) {
      console.error("Error initiating face scan login", err);
      alert("Failed to connect to authentication server.");
    } finally {
      setIsLoading(false);
    }
  };

  const getFaceDescriptor = async (input) => {
    try {
      if (!window.faceapi) return null;
      const detection = await window.faceapi
        .detectSingleFace(input, new window.faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();
      return detection ? detection.descriptor : null;
    } catch (err) {
      console.error("Error getting face descriptor", err);
      return null;
    }
  };

  const handleFaceVerify = async () => {
    if (!storedPhoto) {
      setFaceScanError("Profile photo not found. Please contact HR.");
      return;
    }

    if (!videoRef.current) return;

    setIsLoading(true);
    setFaceScanStatus("Analyzing face...");
    setFaceScanError("");

    try {
      // 1. Get descriptor from webcam
      const webcamDescriptor = await getFaceDescriptor(videoRef.current);
      if (!webcamDescriptor) {
        setFaceScanStatus("No face detected. Please align your face in the circle.");
        setIsLoading(false);
        return;
      }

      // 2. Get descriptor for stored photo
      setFaceScanStatus("Comparing with profile...");
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      // Handle drive links or direct base64
      let imgSrc = storedPhoto;
      if (storedPhoto.includes("drive.google.com")) {
        const id = storedPhoto.match(/[-\w]{25,}/);
        if (id) imgSrc = `https://lh3.googleusercontent.com/u/0/d/${id[0]}`;
      }
      img.src = imgSrc;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load profile photo"));
      });

      const storedDescriptor = await getFaceDescriptor(img);

      if (!storedDescriptor) {
        setFaceScanError("Could not verify: Profile photo is not clear enough.");
        setIsLoading(false);
        return;
      }

      // 3. Compare descriptors
      const distance = window.faceapi.euclideanDistance(storedDescriptor, webcamDescriptor);
      console.log("Face distance:", distance);

      // Threshold: 0.6 is common for face-recognition-net. 
      // Smaller means more strict.
      if (distance < 0.6) {
        setFaceScanStatus("Face verified! Accessing Dashboard...");
        setTimeout(() => {
          localStorage.setItem("employeeLoggedIn", "true");
          localStorage.setItem("employeeId", tempEmployeeId);
          stopCamera();
          navigate("/employee-dashboard");
        }, 1500);
      } else {
        setFaceScanError(`Face match failed (Distance: ${distance.toFixed(4)}). Try again.`);
      }
    } catch (err) {
      console.error("Verification error", err);
      setFaceScanError(`Verification error: ${err.message || "Unknown error"}. Try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // ================= SEND OTP =================
  const handleSendOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting.current) return;

    if (!email) {
      alert("Please enter your email address");
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "sendOtp",
          email: email.trim(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        alert("OTP sent to your email");
        setStep(2);
      } else {
        alert(data.message || "Email not found");
      }
    } catch (error) {
      console.error(error);
      alert("Error sending OTP");
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  // ================= VERIFY OTP =================
  const handleVerifyOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting.current) return;

    if (!otp) {
      alert("Please enter the OTP");
      return;
    }

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "verifyOtp",
          email: email.trim(),
          otp: otp.trim(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        if (isForgotMode) {
          alert("OTP Verified. Please set your new password.");
          setStep(3); // Go to set new password step
        } else {
          alert("Verification Successful! Accessing Dashboard.");
          localStorage.setItem("employeeLoggedIn", "true");
          localStorage.setItem("employeeId", tempEmployeeId);
          navigate("/employee-dashboard");
        }
      } else {
        alert(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error(error);
      alert("Error verifying OTP");
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  // ================= RESET PASSWORD WITH OTP =================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (isSubmitting.current) return;

    isSubmitting.current = true;
    setIsLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "resetPassword",
          email: email.trim(),
          otp: otp.trim(),
          password: newPassword.trim(),
        }),
      });

      const data = await res.json();

      if (data.status === "success") {
        alert("Password updated successfully");
        setIsForgotMode(false);
        setStep(1);
        setOtp("");
        setNewPassword("");
      } else {
        alert(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error(error);
      alert("Error resetting password");
    } finally {
      setIsLoading(false);
      isSubmitting.current = false;
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-welcome" style={{ backgroundImage: "url('/employee.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          {!isForgotMode ? (
            <>
              <h1>Employee portal</h1>
              <div className="welcome-line"></div>
              <p>Enter your credentials to access your secure workspace and managed onboarding tools.</p>
            </>
          ) : (
            <>
              <h1>Reset Password</h1>
              <div className="welcome-line"></div>
              <p>Don't worry, it happens to the best of us. {step === 1 ? "Enter your registered email to receive an OTP." : step === 2 ? "Enter the OTP sent to your email to verify your identity." : "Set a strong new password to secure your account."}</p>
            </>
          )}
          <button className="learn-more-btn" onClick={() => navigate("/")}>Explore Portal</button>
        </div>

        <div className="login-form-area">
          <div className="login-card-inner">
            <img src="/workforzback.png" alt="Workforz Logo" className="login-logo" />

            {!isForgotMode ? (
              <>
                <h2>Welcome back!</h2>
                
                {isFaceScanMode ? (
                  <div className="face-scan-container">
                    <div className="webcam-wrapper">
                      <video ref={videoRef} autoPlay muted playsInline className="webcam-view" />
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                      <div className="scan-overlay">
                        <div className="scan-frame"></div>
                      </div>
                    </div>
                    
                    <div className="scan-status-area">
                      <p className={`status-text ${faceScanError ? 'error' : ''}`}>
                        {faceScanError || faceScanStatus}
                      </p>
                      {isLoading && <div className="spinner mini" style={{ marginTop: '10px' }}></div>}
                    </div>

                    <div className="scan-actions">
                      <button 
                        className="submit-btn" 
                        onClick={handleFaceVerify}
                        disabled={isLoading || !modelsLoaded}
                      >
                        {isLoading ? "Verifying..." : "Verify Face"}
                      </button>
                      <button 
                        className="secondary-btn" 
                        type="button"
                        onClick={() => {
                          setIsFaceScanMode(false);
                          stopCamera();
                          // If they already entered password, go to dashboard. 
                          // If they came from "Login with Face", go back to login step 1.
                          if (step === 1 && password) {
                            localStorage.setItem("employeeLoggedIn", "true");
                            localStorage.setItem("employeeId", tempEmployeeId);
                            navigate("/employee-dashboard");
                          } else {
                            setStep(1);
                          }
                        }}
                      >
                        {step === 1 && password ? "Skip Face Scan" : "Back to Password Login"}
                      </button>
                    </div>
                  </div>
                ) : step === 1 ? (
                  <form onSubmit={handleLogin}>
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-group">
                        <input
                          type="email"
                          placeholder="name@company.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Password</label>
                      <div className="input-group">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="password-input"
                          disabled={isLoading}
                        />
                        <span
                          className="right-icon"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ cursor: 'pointer' }}
                        >
                          {showPassword ? "🙈" : "👁️"}
                        </span>
                      </div>
                    </div>

                    <div className="forgot-password-link">
                      <span
                        onClick={() => {
                          setIsForgotMode(true);
                          setStep(1);
                        }}
                      >
                        Forgot Password?
                      </span>
                    </div>

                    <button className="submit-btn" type="submit" disabled={isLoading}>
                      {isLoading ? <div className="spinner"></div> : "Sign In"}
                    </button>

                    <div style={{ margin: "15px 0", textAlign: "center", position: "relative" }}>
                      <hr style={{ border: "0", borderTop: "1px solid #e2e8f0" }} />
                      <span style={{ 
                        position: "absolute", 
                        top: "-10px", 
                        left: "50%", 
                        transform: "translateX(-50%)", 
                        background: "#fff", 
                        padding: "0 10px", 
                        fontSize: "12px", 
                        color: "#94a3b8" 
                      }}>OR</span>
                    </div>

                    <button 
                      className="secondary-btn" 
                      type="button" 
                      onClick={handleFaceScanLogin}
                      disabled={isLoading}
                      style={{ width: "100%", border: "2px solid var(--primary)", color: "var(--primary)" }}
                    >
                      {modelsLoaded ? "Login with Face Scan" : "Initializing Face AI..."}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp}>
                    <div className="form-group">
                      <label className="form-label">Verification Code</label>
                      <div className="input-group">
                        <input
                          type="text"
                          placeholder="6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                    <button className="submit-btn" type="submit" disabled={isLoading}>
                      {isLoading ? <div className="spinner"></div> : "Verify Access"}
                    </button>
                    <div className="back-to-login">
                      <span onClick={() => setStep(1)}>← Back to Login</span>
                    </div>
                  </form>
                )}
              </>
            ) : (
              <>
                <h2>Recover Password</h2>
                <form onSubmit={step === 1 ? handleSendOtp : step === 2 ? handleVerifyOtp : handleResetPassword}>
                  {step === 1 ? (
                    <div className="form-group">
                      <label className="form-label">Email Address</label>
                      <div className="input-group">
                        <input
                          type="email"
                          placeholder="Your registered email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  ) : step === 2 ? (
                    <div className="form-group">
                      <label className="form-label">OTP Code</label>
                      <div className="input-group">
                        <input
                          type="text"
                          placeholder="6-digit OTP"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">New Password</label>
                      <div className="input-group">
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}

                  <button className="submit-btn" type="submit" disabled={isLoading}>
                    {isLoading ? <div className="spinner"></div> : (step === 1 ? "Send OTP" : step === 2 ? "Verify OTP" : "Reset Password")}
                  </button>

                  <div className="back-to-login">
                    <span
                      onClick={() => {
                        setIsForgotMode(false);
                        setStep(1);
                      }}
                    >
                      ← Back to Sign in
                    </span>
                  </div>
                </form>
              </>
            )}

            {email === "hrlogin" && (
              <p
                style={{
                  marginTop: "20px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#0b1d61",
                  textAlign: "center"
                }}
                onClick={() => navigate("/hr-login")}
              >
                HR Login ?
              </p>
            )}
            {email === "managerlogin" && (
              <p
                style={{
                  marginTop: "20px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#0b1d61",
                  textAlign: "center"
                }}
                onClick={() => navigate("/manager-login")}
              >
                Manager Login ?
              </p>
            )}
            {email === "superuserlogin" && (
              <p
                style={{
                  marginTop: "20px",
                  fontSize: "14px",
                  cursor: "pointer",
                  color: "#0b1d61",
                  textAlign: "center"
                }}
                onClick={() => navigate("/superuser-login")}
              >
                Superuser Login ?
              </p>
            )}
            <div className="footer-links">
              <p>
                Don't have an account? <span onClick={() => navigate("/signup")} style={{ color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}>Sign Up</span>
              </p>
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

export default EmployeeLogin;
