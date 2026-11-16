import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { PublishPropertyPage } from './pages/PublishPropertyPage';
import { AgenciesPage } from './pages/AgenciesPage';
import { AboutPage, ContactPage } from './pages/InfoPages';
import { AuthPage } from './pages/AuthPage';
import { IndividualDashboardPage } from './pages/IndividualDashboardPage';
import { AgencyDashboardPage } from './pages/AgencyDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SupabaseTestPage } from './pages/SupabaseTestPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalogue" element={<CatalogPage />} />
        <Route path="/biens/:slug" element={<PropertyDetailPage />} />
        <Route path="/publier" element={<PublishPropertyPage />} />
        <Route path="/agences" element={<AgenciesPage />} />
        <Route path="/a-propos" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/connexion" element={<AuthPage />} />
        <Route path="/test-supabase" element={<SupabaseTestPage />} />
        <Route path="/espace-particulier" element={<IndividualDashboardPage />} />
        <Route path="/espace-agence" element={<AgencyDashboardPage />} />
        <Route path="/administration" element={<AdminDashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
