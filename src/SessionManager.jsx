import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const INACTIVITY_LIMIT = 10 * 60 * 1000; // 10 minutes
const SESSION_LIMIT = 60 * 60 * 1000;    // 1 hour

const SessionManager = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [lastActivity, setLastActivity] = useState(Date.now());

  const handleLogout = useCallback((reason) => {
    console.log(`Logging out: ${reason}`);
    
    // Clear all possible login states
    const itemsToRemove = [
      "employeeLoggedIn", "employeeId",
      "hrLoggedIn", "managerLoggedIn", 
      "superuserLoggedIn", "loginTime"
    ];
    itemsToRemove.forEach(item => localStorage.removeItem(item));
    
    // Redirect to home/login
    if (location.pathname !== "/" && !location.pathname.includes("login")) {
      alert(`Your session has expired due to ${reason}. Please login again.`);
      navigate("/");
    }
  }, [navigate, location.pathname]);

  const resetInactivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    // List of events to track as "activity"
    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 
      'scroll', 'touchstart', 'click'
    ];

    activityEvents.forEach(event => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Check timers every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      const loginTime = parseInt(localStorage.getItem("loginTime"));

      // 1. Check Absolute Session Timeout (1 hour)
      if (loginTime && (now - loginTime > SESSION_LIMIT)) {
        handleLogout("absolute session timeout (1 hour)");
      } 
      // 2. Check Inactivity Timeout (10 minutes)
      else if (now - lastActivity > INACTIVITY_LIMIT) {
        // Only trigger inactivity logout if a user IS logged in
        const isUserLoggedIn = 
          localStorage.getItem("employeeLoggedIn") || 
          localStorage.getItem("hrLoggedIn") || 
          localStorage.getItem("managerLoggedIn") || 
          localStorage.getItem("superuserLoggedIn");

        if (isUserLoggedIn) {
          handleLogout("inactivity (10 minutes)");
        }
      }
    }, 30000); // Check every 30s

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetInactivityTimer);
      });
      clearInterval(interval);
    };
  }, [lastActivity, resetInactivityTimer, handleLogout]);

  return children;
};

export default SessionManager;
