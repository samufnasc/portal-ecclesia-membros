import Dashboard from './components/Dashboard';

// Deploy Vercel trigger - Vers_09_10_Out_26
export default function App() {
  return (
    <main className="min-h-screen">
      <Dashboard onLogout={() => {
        localStorage.removeItem('portal_user_session');
        window.location.reload();
      }} />
    </main>
  );
}
