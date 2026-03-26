import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./employeesignup.css";

function Signup() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const API_URL = process.env.REACT_APP_API_URL;

  // SEND OTP
  const sendOtp = async () => {
    if (!email) {
      alert("Enter email first");
      return;
    }

    if (!API_URL) {
      alert("API URL is not configured. Please check your .env file and RESTART the dev server.");
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "sendOtp",
          email: email
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("OTP sent to email");
        setStep(2);
      } else {
        alert(data.message || "Failed to send OTP");
      }
    } catch (error) {
      console.error(error);
      alert("Server error");
    } finally {
      setIsLoading(false);
    }
  };

  // VERIFY OTP
  const verifyOtp = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "verifyOtp",
          email: email,
          otp: otpInput
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("OTP verified");
        setStep(3);
      } else {
        alert(data.message || "Invalid OTP");
      }
    } catch (error) {
      console.error(error);
      alert("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // COMPLETE SIGNUP
  const completeSignup = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(API_URL, {
        method: "POST",
        body: new URLSearchParams({
          action: "signup",
          email: email,
          password: password
        })
      });
      const data = await res.json();
      if (data.status === "success") {
        alert("Signup Successful");
        navigate("/employee-form");
      } else {
        alert(data.message || "Signup failed");
      }
    } catch (error) {
      console.error(error);
      alert("Signup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup-wrapper">
      <div className="signup-container">

        {/* Left Side: Progress */}
        <div className="signup-info-side">
          <h1>Join Us!</h1>
          <div className="welcome-line"></div>

          <div className="signup-stepper">
            <div className={`stepper-item ${step >= 1 ? "active" : ""}`}>
              <div className="step-num">1</div>
              <div className="step-label">Email Verification</div>
            </div>
            <div className={`stepper-item ${step >= 2 ? "active" : ""}`}>
              <div className="step-num">2</div>
              <div className="step-label">Verify OTP</div>
            </div>
            <div className={`stepper-item ${step >= 3 ? "active" : ""}`}>
              <div className="step-num">3</div>
              <div className="step-label">Create Password</div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Area */}
        <div className="signup-form-side">
          <div className="signup-card-inner">
            <img src="/workforzback.png" alt="Workforz Logo" className="login-logo" />
            <h2>{step === 1 ? "Get Started" : step === 2 ? "Check Email" : "Final Step"}</h2>

            {step === 1 && (
              <div className="step-form">
                <span className="form-label">Email Address</span>
                <div className="input-group">
                  <input
                    type="email"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button className="submit-btn" onClick={sendOtp} disabled={isLoading}>
                  {isLoading ? <span className="spinner"></span> : "Send OTP"}
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="step-form">
                <span className="form-label">Verification Code</span>
                <div className="input-group">
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    required
                  />
                </div>
                <span className="otp-help">Check your inbox for the code.</span>
                <button className="submit-btn" onClick={verifyOtp} disabled={isLoading}>
                  {isLoading ? <span className="spinner"></span> : "Verify OTP"}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="step-form">
                <span className="form-label">Create Password</span>
                <div className="input-group">
                  <span className="input-icon left-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="password-input"
                    required
                  />
                  <span className="input-icon right-icon" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    )}
                  </span>
                </div>
                <button className="submit-btn" onClick={completeSignup} disabled={isLoading}>
                  {isLoading ? <span className="spinner"></span> : "Complete Signup"}
                </button>
              </div>
            )}

            <div className="footer-links">
              Already have an account? <span onClick={() => navigate("/")}>Sign In</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Signup;