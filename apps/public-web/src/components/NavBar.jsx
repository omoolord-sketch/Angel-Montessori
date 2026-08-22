import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav style={{ padding: '10px', backgroundColor: '#f3e5f5' }}>
      <Link style={{ margin: '0 10px' }} to="/">Home</Link>
      <Link style={{ margin: '0 10px' }} to="/about">About</Link>
      <Link style={{ margin: '0 10px' }} to="/admissions">Admissions</Link>
      <Link style={{ margin: '0 10px' }} to="/contact">Contact</Link>
      <Link style={{ margin: '0 10px' }} to="/dashboard/report-card">Dashboard</Link>

      <img 
  src="/logo.png" 
  alt="Angel Montessori School Logo"
  style={{ height: "60px", marginRight: "10px" }}
/>
    </nav>
  );
}
