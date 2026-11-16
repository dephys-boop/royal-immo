// Supabase Edge Function: verify-payment
// Server-side payment verification & webhook handler for Orange Money, MTN MoMo, Moov Money, Wave, Card & Manual Payments.
// NEVER trusts browser-reported payment success.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const webhookSecret = Deno.env.get('PAYMENT_WEBHOOK_SECRET') || '';

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    // Mode 1: Aggregator Webhook (CinetPay / Wave / Paystack / Mobile Money callback)
    if (body.mode === 'webhook') {
      const signature = req.headers.get('x-webhook-signature') || '';
      if (!webhookSecret || signature !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'Signature webhook invalide' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { payment_id, provider_tx_id, verified_status, provider, amount_fcfa } = body;

      const { data: payment, error: pErr } = await supabaseAdmin
        .from('payments')
        .select('*, publication_plans(*)')
        .eq('id', payment_id)
        .single();

      if (pErr || !payment) {
        return new Response(JSON.stringify({ error: 'Paiement introuvable' }), { status: 404, headers: corsHeaders });
      }

      if (Number(amount_fcfa) !== Number(payment.amount_fcfa)) {
        return new Response(JSON.stringify({ error: 'Montant incohérent' }), { status: 400, headers: corsHeaders });
      }

      const finalStatus = verified_status === 'ACCEPTED' ? 'succeeded' : 'failed';

      await supabaseAdmin
        .from('payments')
        .update({
          status: finalStatus,
          external_reference: provider_tx_id,
          verified_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      const invoiceNumber = `RI-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;

      await supabaseAdmin.from('transactions').insert({
        payment_id: payment.id,
        user_id: payment.user_id,
        invoice_number: invoiceNumber,
        provider: provider || payment.provider,
        provider_tx_id,
        amount_fcfa: payment.amount_fcfa,
        fees_fcfa: 0,
        net_amount_fcfa: payment.amount_fcfa,
        status: finalStatus,
        webhook_payload: body,
      });

      if (finalStatus === 'succeeded') {
        // CRITICAL RULE: Move to 'pending_validation' for admin moderation, NEVER auto-publish!
        await supabaseAdmin
          .from('properties')
          .update({ status: 'pending_validation', plan_id: payment.plan_id })
          .eq('id', payment.property_id);

        await supabaseAdmin.from('publication_history').insert({
          property_id: payment.property_id,
          payment_id: payment.id,
          plan_id: payment.plan_id,
          action: 'paid',
          actor_id: payment.user_id,
          notes: `Paiement vérifié (${payment.provider}) - En attente de validation administrative`,
        });

        await supabaseAdmin.from('notifications').insert({
          user_id: payment.user_id,
          type: 'payment_confirmed',
          title: 'Paiement confirmé',
          body: `Votre paiement de ${payment.amount_fcfa} FCFA a été validé. Votre annonce est soumise à modération.`,
          link_url: '/espace-particulier',
        });
      } else {
        await supabaseAdmin.from('notifications').insert({
          user_id: payment.user_id,
          type: 'payment_failed',
          title: 'Paiement échoué',
          body: `Le paiement de ${payment.amount_fcfa} FCFA n'a pas abouti. Veuillez réessayer.`,
          link_url: '/espace-particulier',
        });
      }

      return new Response(JSON.stringify({ ok: true, status: finalStatus, invoice_number: invoiceNumber }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode 2: Initiate payment session (Authenticated user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentification requise' }), { status: 401, headers: corsHeaders });
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Utilisateur invalide' }), { status: 401, headers: corsHeaders });
    }

    const { property_id, plan_id, provider, payer_phone, manual_reference, manual_proof_url } = body;

    const { data: plan } = await supabaseAdmin
      .from('publication_plans')
      .select('*')
      .eq('id', plan_id)
      .eq('is_active', true)
      .single();

    if (!plan) {
      return new Response(JSON.stringify({ error: 'Forfait introuvable' }), { status: 404, headers: corsHeaders });
    }

    const { data: payment, error: insertErr } = await supabaseAdmin
      .from('payments')
      .insert({
        user_id: user.id,
        property_id,
        plan_id: plan.id,
        amount_fcfa: plan.price_fcfa,
        currency: 'XOF',
        provider,
        status: 'pending',
        payer_phone,
        manual_reference,
        manual_proof_url,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    await supabaseAdmin
      .from('properties')
      .update({ status: 'pending_payment', plan_id: plan.id })
      .eq('id', property_id)
      .eq('owner_id', user.id);

    return new Response(
      JSON.stringify({
        ok: true,
        payment,
        message:
          provider === 'manual'
            ? 'Justificatif transmis. Validation manuelle sous 2h ouvrées.'
            : 'Session de paiement initialisée. En attente de confirmation opérateur.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
