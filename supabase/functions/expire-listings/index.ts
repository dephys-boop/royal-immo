// Supabase Edge Function: expire-listings
// Scheduled cron job to automatically expire listings past expires_at and send upcoming expiration alerts.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const nowIso = new Date().toISOString();
  const soonIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

  // 1. Expire listings past due
  const { data: expiredProps } = await supabaseAdmin
    .from('properties')
    .update({ status: 'expired', is_featured: false })
    .eq('status', 'published')
    .lt('expires_at', nowIso)
    .select('id, owner_id, title');

  for (const prop of expiredProps || []) {
    await supabaseAdmin.from('publication_history').insert({
      property_id: prop.id,
      action: 'expired',
      notes: 'Expiration automatique arrivée à échéance',
    });

    await supabaseAdmin.from('notifications').insert({
      user_id: prop.owner_id,
      type: 'listing_expired',
      title: 'Annonce expirée',
      body: `Votre annonce « ${prop.title} » est arrivée à échéance. Vous pouvez la renouveler depuis votre espace.`,
      link_url: '/espace-particulier',
    });
  }

  // 2. Notify listings expiring within 48 hours
  const { data: expiringSoon } = await supabaseAdmin
    .from('properties')
    .select('id, owner_id, title, expires_at')
    .eq('status', 'published')
    .gte('expires_at', nowIso)
    .lte('expires_at', soonIso);

  for (const prop of expiringSoon || []) {
    await supabaseAdmin.from('notifications').insert({
      user_id: prop.owner_id,
      type: 'listing_expiring',
      title: 'Annonce bientôt expirée',
      body: `Votre annonce « ${prop.title} » expire dans moins de 48 heures. Pensez à la renouveler.`,
      link_url: '/espace-particulier',
    });
  }

  return new Response(
    JSON.stringify({
      expiredCount: expiredProps?.length || 0,
      notifiedExpiringSoon: expiringSoon?.length || 0,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
