import { useState, useRef } from "react";
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

  const isSubmitting = useRef(false);

  const API_URL = process.env.REACT_APP_API_URL;

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
        // After successful password login, send OTP for 2FA
        const otpRes = await fetch(API_URL, {
          method: "POST",
          body: new URLSearchParams({
            action: "sendOtp",
            email: email.trim(),
          }),
        });
        const otpData = await otpRes.json();

        if (otpData.status === "success") {
          alert("Login successful! Please verify the OTP sent to your email.");
          setStep(2);
        } else {
          alert(otpData.message || "Failed to send verification OTP");
        }
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
        <div className="login-welcome">
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
                {step === 1 ? (
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
