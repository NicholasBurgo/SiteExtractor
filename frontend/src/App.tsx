import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Generator } from './pages/Generator';
import { Review } from './pages/Review';
import { RunView } from './pages/RunView';
import ConfirmPage from './pages/ConfirmPage';
import SiteGenerator from './pages/SiteGenerator';
import Checkpoint from './components/Checkpoint';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SiteGenerator />} />
        <Route path="/generator" element={<Generator />} />
        <Route path="/review/:runId" element={<Review />} />
        <Route path="/confirm/:runId" element={<ConfirmPage />} />
        <Route path="/checkpoint/:runId" element={<Checkpoint />} />
        <Route path="/runs/:runId" element={<RunView />} />
      </Routes>
    </Router>
  );
}