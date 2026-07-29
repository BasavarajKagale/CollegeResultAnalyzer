import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LandingPage from './pages/LandingPage';
import UploadPage from './pages/UploadPage';
import ResultsList from './pages/ResultsList';
import Dashboard from './pages/Dashboard';
import ResultDetails from './pages/ResultDetails';
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;
