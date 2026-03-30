import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";

function ManagerLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    // ENV-based credentials
    const defaultUsername = (process.env.REACT_APP_MANAGER_USER || "").replace(/"/g, '').trim();
    const defaultPassword = (process.env.REACT_APP_MANAGER_PASS || "").replace(/"/g, '').trim();

    if (username.trim() === defaultUsername && password.trim() === defaultPassword) {
      localStorage.setItem("managerLoggedIn", "true");
      localStorage.setItem("loginTime", Date.now().toString());
      navigate("/manager-dashboard");
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
            Manager Control Access. Authorized personnel only. Access your team's onboarding statistics and operational data here.
          </p>
          <button className="learn-more-btn">Management Hub</button>
        </div>

        {/* Right Section */}
        <div className="login-form-area">
          <div className="login-card-inner">
            <img src="/workforzback.png" alt="Workforz Logo" className="login-logo" />
            <h2>Manager Sign in</h2>

            <form onSubmit={handleLogin}>
              <span className="form-label">Username</span>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="manager_id"
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

              <button type="submit" className="submit-btn" >Submit</button>
            </form>

            <div className="social-icons-row">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"></path><path d="M2 17l10 5 10-5"></path><path d="M2 12l10 5 10-5"></path></svg>
            </div>

            <div className="footer-links">
              <p onClick={() => navigate("/")}><span>Back to Employee Login</span></p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default ManagerLogin;