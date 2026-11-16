import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '../layouts/PublicLayout';
import { Button } from '../components/ui/button';
import { Input, Textarea } from '../components/ui/input';
import { usePlatform } from '../hooks/usePlatform';
import { formatFCFA } from '../utils/format';

export const AboutPage: React.FC = () => {
  const { plans } = usePlatform();

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 space-y-12">
        <div>
          <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">ROYAL IMMO Côte d’Ivoire</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            L’immobilier en toute confiance
          </h1>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
            ROYAL IMMO est un portail immobilier de nouvelle génération conçu spécifiquement pour répondre aux exigences du marché ivoirien : transparence foncière, modération systématique, paiement flexible à l’annonce en FCFA et séparation stricte des espaces agences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: 'Sécurité juridique & modération',
              body: 'Chaque bien soumis passe par une double vérification : confirmation serveur du paiement et approbation par nos modérateurs.',
            },
            {
              title: 'Paiements locaux natifs',
              body: 'Intégration architecturée pour Orange Money, MTN Mobile Money, Moov Money, Wave, carte bancaire et bordereaux manuels.',
            },
            {
              title: 'Architecture Supabase & RLS',
              body: 'Toutes les données sont protégées par Row Level Security PostgreSQL avec isolation stricte entre agences concurrentes.',
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0E172E]">
              <ShieldCheck className="h-6 w-6 text-[#C89B3C] mb-3" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{card.body}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#0E172E]">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-white">Grille tarifaire officielle</h2>
          <div className="mt-5 divide-y divide-slate-200 dark:divide-slate-800">
            {plans.map((p) => (
              <div key={p.id} className="py-3 flex items-center justify-between text-sm">
                <span className="font-medium">{p.name} ({p.duration_days} jours)</span>
                <span className="font-mono-tabular font-bold text-[#1B3B8C] dark:text-[#C89B3C]">{formatFCFA(p.price_fcfa)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <Link to="/publier">
              <Button variant="default">Publier une annonce</Button>
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setName('');
    setEmail('');
    setPhone('');
    setMessage('');
  };

  return (
    <PublicLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-[#1B3B8C] dark:text-[#C89B3C]">Assistance Côte d’Ivoire</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-white">
              Contacter ROYAL IMMO
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Une question sur la validation de votre annonce, l’ouverture d’un compte agence ou un paiement Mobile Money ? Notre équipe basée à Abidjan vous répond sous 2h ouvrées.
            </p>
          </div>

          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-[#C89B3C]" />
              <span>Cocody Deux Plateaux, Abidjan, Côte d’Ivoire</span>
            </div>
            <div className="flex items-center gap-3 font-mono-tabular">
              <Phone className="h-5 w-5 text-[#C89B3C]" />
              <span>+225 27 22 00 00 00</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-[#C89B3C]" />
              <span>contact@royalimmo.ci</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-[#0E172E]">
          {sent ? (
            <div className="py-10 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <h2 className="text-lg font-bold">Message reçu</h2>
              <p className="text-sm text-slate-500">Un conseiller ROYAL IMMO vous répondra très rapidement.</p>
              <Button variant="outline" onClick={() => setSent(false)}>Envoyer un autre message</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Nom complet</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">Email</label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.ci" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">Téléphone</label>
                  <Input required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+225 07..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Message</label>
                <Textarea required value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Précisez votre demande..." />
              </div>
              <Button type="submit" variant="default" className="w-full">
                Envoyer le message
              </Button>
            </form>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};
