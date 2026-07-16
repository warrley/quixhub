import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './lib/theme';
import { CalendarProvider } from './lib/calendarStore';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import DisciplineDetail from './pages/DisciplineDetail';
import Materials from './pages/Materials';
import MaterialDetail from './pages/MaterialDetail';
import Upload from './pages/Upload';
import ModerationQueue from './pages/ModerationQueue';
import FeedbackSubmit from './pages/FeedbackSubmit';
import Calendar from './pages/Calendar';
import EventDetail from './pages/EventDetail';
import Profile from './pages/Profile';

function Shell() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/catalogo/:id" element={<DisciplineDetail />} />
        <Route path="/catalogo/:id/feedback" element={<FeedbackSubmit />} />
        <Route path="/materiais" element={<Materials />} />
        <Route path="/materiais/enviar" element={<Upload />} />
        <Route path="/materiais/:id" element={<MaterialDetail />} />
        <Route path="/calendario" element={<Calendar />} />
        <Route path="/calendario/:id" element={<EventDetail />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/admin/moderacao" element={<ModerationQueue />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CalendarProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Register />} />
              <Route path="/*" element={<Shell />} />
            </Routes>
          </BrowserRouter>
        </CalendarProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
