import type { FeaturedBadge, PaymentProvider, PaymentStatus, PropertyStatus, TransactionType } from '../types/database';

export function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(amount))} FCFA`;
}

export function formatDateFR(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function transactionLabel(tx: TransactionType): string {
  switch (tx) {
    case 'sale':
      return 'Vente';
    case 'rent':
      return 'Location';
    case 'seasonal':
      return 'Résidence meublée';
  }
}

export function featuredBadgeLabel(badge: FeaturedBadge | null): string | null {
  if (!badge) return null;
  switch (badge) {
    case 'featured':
      return 'À la une';
    case 'new':
      return 'Nouveau';
    case 'exclusive':
      return 'Exclusivité';
    case 'price_reduced':
      return 'Prix réduit';
    case 'verified':
      return 'Vérifié';
  }
}

export function propertyStatusLabel(status: PropertyStatus): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  switch (status) {
    case 'published':
      return { label: 'Publiée', tone: 'success' };
    case 'pending_validation':
      return { label: 'En attente de validation', tone: 'warning' };
    case 'pending_payment':
      return { label: 'Paiement en attente', tone: 'warning' };
    case 'rejected':
      return { label: 'Refusée', tone: 'danger' };
    case 'expired':
      return { label: 'Expirée', tone: 'neutral' };
    case 'archived':
      return { label: 'Archivée', tone: 'neutral' };
    default:
      return { label: 'Brouillon', tone: 'neutral' };
  }
}

export function paymentProviderLabel(provider: PaymentProvider): string {
  switch (provider) {
    case 'orange_money':
      return 'Orange Money';
    case 'mtn_momo':
      return 'MTN Mobile Money';
    case 'moov_money':
      return 'Moov Money';
    case 'wave':
      return 'Wave';
    case 'card':
      return 'Carte bancaire';
    case 'manual':
      return 'Paiement manuel (justificatif)';
  }
}

export function paymentStatusLabel(status: PaymentStatus): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  switch (status) {
    case 'succeeded':
      return { label: 'Réussi', tone: 'success' };
    case 'pending':
      return { label: 'En attente', tone: 'warning' };
    case 'failed':
      return { label: 'Échoué', tone: 'danger' };
    case 'refunded':
      return { label: 'Remboursé', tone: 'neutral' };
    case 'cancelled':
      return { label: 'Annulé', tone: 'neutral' };
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
