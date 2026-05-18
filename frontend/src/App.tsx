import { Dashboard } from './components/Dashboard';
import { ToastContainer } from './components/Toast';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-dark-900 font-sans text-slate-100">
        <Dashboard />
        <ToastContainer />
      </div>
    </LanguageProvider>
  );
}

export default App;
