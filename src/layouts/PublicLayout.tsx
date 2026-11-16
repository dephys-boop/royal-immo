import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, Moon, PlusCircle, Sun, User, X } from 'lucide-react';
import { RoyalImmoLogo } from '../components/brand/RoyalImmoLogo';
import { usePlatform, useTheme } from '../hooks/usePlatform';
import { isSupabaseConfigured } from '../integrations/supabase/client';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { currentUser } = usePlatform();
  const { dark, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const workspacePath =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin'
      ? '/administration'
      : currentUser?.role === 'agency' || currentUser?.role === 'agent'
        ? '/espace-agence'
        : '/espace-particulier';

  const navLinks = [
    { label: 'Accueil', to: '/' },
    { label: 'Acheter', to: '/catalogue?transaction=sale' },
    { label: 'Louer', to: '/catalogue?transaction=rent' },
    { label: 'Terrains', to: '/catalogue?category=Terrain' },
    { label: 'Agences', to: '/agences' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#070D1D] dark:text-slate-100">
      {!isSupabaseConfigured && (
        <div className="bg-[#0B1633] text-slate-200 text-xs py-2 px-4 text-center border-b border-white/10">
          Mode aperçu · Renseignez <code className="font-mono-tabular text-[#C89B3C]">VITE_SUPABASE_URL</code> et{' '}
          <code className="font-mono-tabular text-[#C89B3C]">VITE_SUPABASE_ANON_KEY</code> dans <code className="font-mono-tabular">.env</code>.
        </div>
      )}

      {/* Top Navigation Bar — Single-Row Contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-[#0B1633]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="whitespace-nowrap shrink-0">
            <RoyalImmoLogo />
          </Link>

          <nav className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className="whitespace-nowrap shrink-0 hover:text-[#1B3B8C] dark:hover:text-[#C89B3C] transition-colors"
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={dark ? 'Activer le mode clair' : 'Activer le mode sombre'}
              className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer shrink-0"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {currentUser ? (
              <button
                type="button"
                onClick={() => navigate(workspacePath)}
                className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <User className="h-3.5 w-3.5 text-[#C89B3C]" />
                <span className="max-w-[110px] truncate">{currentUser.full_name}</span>
              </button>
            ) : (
              <>
                <Link
                  to="/connexion"
                  className="hidden md:inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap shrink-0 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/connexion?mode=register"
                  className="hidden md:inline-flex items-center justify-center rounded-lg border border-[#C89B3C]/60 bg-[#C89B3C]/10 px-3 py-2 text-xs font-semibold text-[#8A6619] hover:bg-[#C89B3C]/20 dark:border-[#C89B3C]/40 dark:bg-[#C89B3C]/10 dark:text-[#E2BA64] whitespace-nowrap shrink-0 transition-colors"
                >
                  Inscription
                </Link>
              </>
            )}

            <Link
              to="/publier"
              className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1B3B8C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#142D6B] dark:bg-[#C89B3C] dark:text-[#0B1633] dark:hover:bg-[#B5892E] whitespace-nowrap shrink-0 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Publier une annonce
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Ouvrir le menu"
              className="inline-flex lg:hidden h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 dark:border-slate-800 dark:bg-[#0B1633]">
            {[
              { label: 'Accueil', to: '/' },
              { label: 'Acheter un bien', to: '/catalogue?transaction=sale' },
              { label: 'Louer un bien', to: '/catalogue?transaction=rent' },
              { label: 'Terrains', to: '/catalogue?category=Terrain' },
              { label: 'Agences immobilières', to: '/agences' },
              { label: 'À propos', to: '/a-propos' },
              { label: 'Contact', to: '/contact' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              {currentUser ? (
                <Link
                  to={workspacePath}
                  onClick={() => setMobileOpen(false)}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
                >
                  Mon espace ({currentUser.full_name})
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/connexion"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-center text-xs font-semibold text-slate-800 dark:border-slate-700 dark:text-slate-100"
                  >
                    Connexion
                  </Link>
                  <Link
                    to="/connexion?mode=register"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-[#C89B3C]/60 bg-[#C89B3C]/10 px-3 py-2.5 text-center text-xs font-semibold text-[#8A6619] dark:text-[#E2BA64]"
                  >
                    Inscription
                  </Link>
                </div>
              )}

              <Link
                to="/publier"
                onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full rounded-lg bg-[#1B3B8C] px-3 py-2.5 text-xs font-semibold text-white dark:bg-[#C89B3C] dark:text-[#0B1633]"
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Publier une annonce
              </Link>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">Apparence</span>
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium dark:border-slate-700 cursor-pointer"
              >
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                {dark ? 'Mode clair' : 'Mode sombre'}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Complete Professional Footer */}
      <footer className="border-t border-slate-200 bg-[#0B1633] text-slate-300">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <RoyalImmoLogo variant="light" />
            <p className="mt-3 text-sm font-medium text-[#C89B3C]">L’immobilier en toute confiance.</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Portail immobilier professionnel dédié au marché ivoirien. Annonces vérifiées, agences agréées et paiements sécurisés en FCFA.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Navigation</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li><Link to="/" className="hover:text-[#C89B3C]">Accueil</Link></li>
              <li><Link to="/catalogue?transaction=sale" className="hover:text-[#C89B3C]">Acheter</Link></li>
              <li><Link to="/catalogue?transaction=rent" className="hover:text-[#C89B3C]">Louer</Link></li>
              <li><Link to="/catalogue?category=Terrain" className="hover:text-[#C89B3C]">Terrains</Link></li>
              <li><Link to="/publier" className="hover:text-[#C89B3C]">Vendre & Publier une annonce</Link></li>
              <li><Link to="/agences" className="hover:text-[#C89B3C]">Agences immobilières</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Zones couvertes (CI)</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li><Link to="/catalogue?city=Abidjan" className="hover:text-[#C89B3C]">Abidjan (Cocody, Plateau, Marcory, Yopougon)</Link></li>
              <li><Link to="/catalogue?city=Bingerville" className="hover:text-[#C89B3C]">Bingerville & Route d’Alépé</Link></li>
              <li><Link to="/catalogue?city=Grand-Bassam" className="hover:text-[#C89B3C]">Grand-Bassam & Assinie</Link></li>
              <li><Link to="/catalogue?city=Yamoussoukro" className="hover:text-[#C89B3C]">Yamoussoukro & Bouaké</Link></li>
              <li><Link to="/catalogue?city=San%20Pedro" className="hover:text-[#C89B3C]">San Pedro, Divo, Gagnoa, Lakota</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Espaces & Assistance</h4>
            <ul className="mt-4 space-y-2.5 text-xs">
              <li><Link to="/a-propos" className="hover:text-[#C89B3C]">À propos de ROYAL IMMO</Link></li>
              <li><Link to="/contact" className="hover:text-[#C89B3C]">Contact & Support Abidjan</Link></li>
              <li><Link to="/connexion" className="hover:text-[#C89B3C]">Connexion / Inscription</Link></li>
              <li><Link to="/espace-particulier" className="hover:text-[#C89B3C]">Espace Particulier</Link></li>
              <li><Link to="/espace-agence" className="hover:text-[#C89B3C]">Espace Agence Immobilière</Link></li>
              <li><Link to="/administration" className="hover:text-[#C89B3C]">Administration</Link></li>
              <li><Link to="/test-supabase" className="hover:text-[#C89B3C]">Test connexion Supabase</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <span>© {new Date().getFullYear()} ROYAL IMMO Côte d’Ivoire. Tous droits réservés.</span>
            <span>Paiements acceptés : Orange Money · MTN MoMo · Moov Money · Wave · Carte Bancaire</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
