import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

function HrLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    // ENV-based credentials
    const defaultUsername = (process.env.REACT_APP_HR_USER || "").replace(/"/g, '').trim();
    const defaultPassword = (process.env.REACT_APP_HR_PASS || "").replace(/"/g, '').trim();

    if (username.trim() === defaultUsername && password.trim() === defaultPassword) {
      localStorage.setItem("hrLoggedIn", "true");
      navigate("/hr-dashboard");
    } else {
      alert("Invalid Username or Password");
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">

        {/* Left Section */}
        <div className="login-welcome" style={{ backgroundImage: "url('/employee.jpg')", backgroundSize: "cover", backgroundPosition: "center" }}>
          <h1>Welcome!</h1>
          <div className="welcome-line"></div>
          <p>
            Human Resources Management. Sign in to review employee onboarding forms, verify documents, and generate professional reports.
          </p>
          <button className="learn-more-btn">HR Guidelines</button>
        </div>

        {/* Right Section */}
        <div className="login-form-area">
          <div className="login-card-inner">
            <img src="/workforzback.png" alt="Workforz Logo" className="login-logo" />
            <h2>HR Sign in</h2>

            <form onSubmit={handleLogin}>
              <span className="form-label">Username</span>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="hr_manager"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              <span className="form-label">Password</span>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="password-input"
                />
                <span
                  className="input-icon right-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  )}
                </span>
              </div>

              <button type="submit" className="submit-btn">Submit</button>
            </form>



            <div className="footer-links">
              <p onClick={() => navigate("/")}><span>Back to Employee Login</span></p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default HrLogin;