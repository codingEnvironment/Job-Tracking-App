import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, JobResult, JobSearchFilters } from './lib/api';
import LoginPage from './pages/LoginPage';
import BoardPage from './pages/BoardPage';
import SettingsPage from './pages/SettingsPage';
import SearchPage from './pages/SearchPage';
import TopBar from './components/TopBar';

type AuthState = 'loading' | 'in' | 'out';

const DEFAULT_FILTERS: JobSearchFilters = {
  location: '',
  remote: false,
  role: '',
  salaryMin: '',
  salaryMax: '',
};

export default function App() {
  const [auth, setAuth] = useState<AuthState>('loading');
  const navigate = useNavigate();

  // Lifted so search results survive navigation away and back
  const [searchFilters, setSearchFilters] = useState<JobSearchFilters>(DEFAULT_FILTERS);
  const [searchResults, setSearchResults] = useState<JobResult[] | null>(null);
  // Index-based tracking — two results can share a title/empty URL, so identity
  // is the card's position within the current results array.
  const [searchAddedIndexes, setSearchAddedIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    api
      .whoami()
      .then(() => setAuth('in'))
      .catch(() => setAuth('out'));
  }, []);

  if (auth === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-ink-subtle text-[13px]">
        Loading…
      </div>
    );
  }

  if (auth === 'out') {
    return (
      <Routes>
        <Route path="*" element={<LoginPage onLoggedIn={() => setAuth('in')} />} />
      </Routes>
    );
  }

  const onLogout = async () => {
    await api.logout();
    setAuth('out');
    navigate('/');
  };

  return (
    <div className="flex h-full flex-col">
      <TopBar onLogout={onLogout} />
      <main className="flex-1 overflow-hidden">
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route path="/search" element={
            <SearchPage
              filters={searchFilters}
              results={searchResults}
              addedIndexes={searchAddedIndexes}
              onFiltersChange={setSearchFilters}
              onResultsChange={setSearchResults}
              onAddedIndexesChange={setSearchAddedIndexes}
            />
          } />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
