import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import ResultsList from './pages/ResultsList';
import Dashboard from './pages/Dashboard';
import ResultDetails from './pages/ResultDetails';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import './index.css';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/upload" element={<div className="container"><UploadPage /></div>} />
          <Route path="/results" element={<div className="container"><ResultsList /></div>} />
          <Route path="/results/:id" element={<div className="container"><ResultDetails /></div>} />
          <Route path="/dashboard/:id" element={<div className="container"><Dashboard /></div>} />
          <Route path="/admin/login" element={<div className="container"><AdminLogin /></div>} />
          <Route path="/admin" element={<div className="container"><AdminDashboard /></div>} />
          <Route path="/admin/*" element={<div className="container"><AdminDashboard /></div>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
