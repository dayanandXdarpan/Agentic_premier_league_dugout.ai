import { Dashboard } from './components/Dashboard';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import { LanguageProvider } from './context/LanguageContext';

function App() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-black font-sans text-slate-100 flex flex-col">
        <div className="flex-1">
          <Dashboard />
        </div>
        <Footer />
        <ToastContainer />
      </div>
    </LanguageProvider>
  );
}

export default App;
