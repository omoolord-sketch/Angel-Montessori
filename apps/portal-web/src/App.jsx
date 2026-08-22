import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import AdmissionsPage from './pages/AdmissionsPage';
import ContactPage from './pages/ContactPage';
import ReportCardDashboard from './pages/ReportCardDashboard';
import AttendanceDashboard from './pages/AttendanceDashboard';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/dashboard/report-card" element={<div>Report Card OK</div>} />
        <Route path="/dashboard/attendance" element={<AttendanceDashboard />} />
      </Routes>
    </Router>
  );
}