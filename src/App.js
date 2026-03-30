import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './Login';
import Signup from './Signup';
import EmployeeDashboard from './EmployeeDashboard';
import EmployeeForm from './EmployeeForm';
import HrDashboard from './Hrdashboard';
import ManagerDashboard from './ManagerDashboard';
import AdminDashboard from './AdminDashboard';


import SessionManager from './SessionManager';

function App() {
    return (
    <Router>
      <SessionManager>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="/employee-form" element={<EmployeeForm />} />
          <Route path="/hr-dashboard" element={<HrDashboard />} />
          <Route path="/manager-dashboard" element={<ManagerDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
        </Routes>
      </SessionManager>
    </Router>
  );
}



export default App;
