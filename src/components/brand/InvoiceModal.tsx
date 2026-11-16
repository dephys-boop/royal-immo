import React from 'react';
import { Printer } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Button } from '../ui/button';
import { RoyalImmoLogo } from './RoyalImmoLogo';
import type { PaymentRecord } from '../../types/database';
import { formatDateFR, formatFCFA, paymentProviderLabel, paymentStatusLabel } from '../../utils/format';

interface InvoiceModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ payment, onClose }) => {
  if (!payment) return null;
  const st = paymentStatusLabel(payment.status);

  return (
    <Dialog open={Boolean(payment)} onClose={onClose} title="Reçu & Facture Officielle" maxWidthClass="max-w-xl">
      <div className="space-y-6 rounded-xl border border-slate-200 p-6 dark:border-slate-800 bg-white dark:bg-[#0B1633]">
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <RoyalImmoLogo />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              L’immobilier en toute confiance · Abidjan, Côte d’Ivoire
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400">Facture N°</div>
            <div className="font-mono-tabular text-sm font-bold text-slate-900 dark:text-white">
              {payment.invoice_number || `RI-${payment.id.toUpperCase()}`}
            </div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatDateFR(payment.created_at)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Client / Émetteur</div>
            <div className="font-semibold text-slate-900 dark:text-white">{payment.user_name || 'Utilisateur ROYAL IMMO'}</div>
            {payment.payer_phone && (
              <div className="text-xs text-slate-600 dark:text-slate-300 font-mono-tabular">{payment.payer_phone}</div>
            )}
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Moyen de paiement</div>
            <div className="font-semibold text-slate-900 dark:text-white">{paymentProviderLabel(payment.provider)}</div>
            <div className="text-xs text-slate-600 dark:text-slate-300">Statut : {st.label}</div>
          </div>
        </div>

        <table className="w-full text-sm border-t border-b border-slate-200 dark:border-slate-800">
          <thead>
            <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
              <th className="py-2.5">Prestation</th>
              <th className="py-2.5 text-right">Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100 dark:border-slate-800">
              <td className="py-3">
                <div className="font-medium text-slate-900 dark:text-white">
                  Publication d’annonce ({payment.plan_name || 'Forfait ROYAL IMMO'})
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{payment.property_title}</div>
              </td>
              <td className="py-3 text-right font-mono-tabular font-semibold text-slate-900 dark:text-white">
                {formatFCFA(payment.amount_fcfa)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="flex items-center justify-between text-base font-bold">
          <span className="text-slate-700 dark:text-slate-200">Total payé (XOF)</span>
          <span className="font-mono-tabular text-[#1B3B8C] dark:text-[#C89B3C]">{formatFCFA(payment.amount_fcfa)}</span>
        </div>

        <div className="no-print flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button variant="default" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimer / PDF
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
