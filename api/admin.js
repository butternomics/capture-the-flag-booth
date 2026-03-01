import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const ADMIN_KEY = process.env.ADMIN_KEY || 'ctf-admin-2026';

function checkAuth(req) {
  const key = req.query.key || req.headers['x-admin-key'];
  return key === ADMIN_KEY;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!checkAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET: full dashboard data — all visitors, check-ins, leaderboard, activity, knockout config
  if (req.method === 'GET') {
    try {
      // All visitors
      const { data: visitors } = await supabase
        .from('visitors')
        .select('id, email, first_name, created_at')
        .order('created_at', { ascending: false });

      // All check-ins with photos
      const { data: checkins } = await supabase
        .from('checkins')
        .select('id, visitor_id, location_id, format, photo_url, phase, created_at')
        .order('created_at', { ascending: false });

      // All submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, visitor_id, status, reviewed_by, reviewed_at, created_at')
        .order('created_at', { ascending: false });

      // Venue offers
      const { data: venueOffers } = await supabase
        .from('venue_offers')
        .select('id, location_id, offer_text, offer_code, active, created_at, updated_at');

      // Game config
      const { data: gameConfig } = await supabase
        .from('game_config')
        .select('phase, updated_at, updated_by')
        .eq('id', 1)
        .single();

      // Location overrides
      const { data: locationOverrides } = await supabase
        .from('location_overrides')
        .select('id, location_id, phase, country, flag, tagline, created_at, updated_at')
        .order('created_at', { ascending: false });

      // Build leaderboard: visitors ranked by unique locations
      const visitorCheckins = {};
      for (const c of (checkins || [])) {
        if (!visitorCheckins[c.visitor_id]) visitorCheckins[c.visitor_id] = [];
        visitorCheckins[c.visitor_id].push(c);
      }

      const visitorMap = {};
      for (const v of (visitors || [])) {
        visitorMap[v.id] = v;
      }

      const submissionMap = {};
      for (const s of (submissions || [])) {
        submissionMap[s.visitor_id] = s;
      }

      const leaderboard = Object.entries(visitorCheckins)
        .map(([visitorId, cks]) => {
          const v = visitorMap[visitorId];
          const uniqueLocs = [...new Set(cks.filter(c => c.phase === 'group_stage').map(c => c.location_id))];
          return {
            visitorId: Number(visitorId),
            firstName: v?.first_name || 'Unknown',
            email: v?.email || '',
            joinedAt: v?.created_at || '',
            locationsCount: uniqueLocs.length,
            locations: uniqueLocs,
            checkins: cks,
            submission: submissionMap[visitorId] || null,
          };
        })
        .sort((a, b) => b.locationsCount - a.locationsCount);

      // Location popularity
      const locationCounts = {};
      for (const c of (checkins || [])) {
        locationCounts[c.location_id] = (locationCounts[c.location_id] || 0) + 1;
      }

      // Recent activity (last 50 check-ins with visitor info)
      const recentActivity = (checkins || []).slice(0, 50).map(c => ({
        ...c,
        visitorName: visitorMap[c.visitor_id]?.first_name || 'Unknown',
        visitorEmail: visitorMap[c.visitor_id]?.email || '',
      }));

      // Stats
      const totalVisitors = (visitors || []).length;
      const totalCheckins = (checkins || []).length;
      const completers = leaderboard.filter(l => l.locationsCount >= 16).length;
      const pendingSubmissions = (submissions || []).filter(s => s.status === 'pending').length;

      // Knockout stats: check-in counts by phase
      const knockoutStats = {};
      for (const c of (checkins || [])) {
        if (c.phase !== 'group_stage') {
          knockoutStats[c.phase] = (knockoutStats[c.phase] || 0) + 1;
        }
      }

      return res.status(200).json({
        stats: {
          totalVisitors,
          totalCheckins,
          completers,
          pendingSubmissions,
        },
        leaderboard,
        locationCounts,
        recentActivity,
        submissions: submissions || [],
        venueOffers: venueOffers || [],
        gameConfig: gameConfig || { phase: 'group_stage' },
        locationOverrides: locationOverrides || [],
        knockoutStats,
      });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PATCH: approve or reject a submission
  if (req.method === 'PATCH') {
    const { submissionId, status, reviewedBy } = req.body;

    if (!submissionId || !status) {
      return res.status(400).json({ error: 'Missing submissionId or status' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be approved or rejected' });
    }

    try {
      const { data, error } = await supabase
        .from('submissions')
        .update({
          status,
          reviewed_by: reviewedBy || 'admin',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update submission' });
      }

      return res.status(200).json({ success: true, submission: data });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // PUT: save-offer, advance-phase, or save-override
  if (req.method === 'PUT') {
    const { action } = req.body;

    if (action === 'save-offer') {
      const { locationId, offerText, offerCode, active } = req.body;
      if (!locationId || !offerText) {
        return res.status(400).json({ error: 'Missing locationId or offerText' });
      }

      try {
        const { data, error } = await supabase
          .from('venue_offers')
          .upsert(
            {
              location_id: locationId,
              offer_text: offerText,
              offer_code: offerCode || null,
              active: active !== false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'location_id' }
          )
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Failed to save offer' });
        }

        return res.status(200).json({ success: true, offer: data });
      } catch {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'advance-phase') {
      const { phase } = req.body;
      const validPhases = ['group_stage', 'knockout_r32', 'knockout_r16', 'semifinal'];

      if (!phase || !validPhases.includes(phase)) {
        return res.status(400).json({ error: 'Invalid phase. Must be one of: ' + validPhases.join(', ') });
      }

      try {
        const { data, error } = await supabase
          .from('game_config')
          .update({
            phase,
            updated_at: new Date().toISOString(),
            updated_by: 'admin',
          })
          .eq('id', 1)
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Failed to update phase' });
        }

        return res.status(200).json({ success: true, gameConfig: data });
      } catch {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    if (action === 'save-override') {
      const { locationId, phase, country, flag, tagline } = req.body;

      if (!locationId || !phase || !country || !flag) {
        return res.status(400).json({ error: 'Missing required fields: locationId, phase, country, flag' });
      }

      try {
        const { data, error } = await supabase
          .from('location_overrides')
          .upsert(
            {
              location_id: locationId,
              phase,
              country,
              flag,
              tagline: tagline || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'location_id,phase' }
          )
          .select()
          .single();

        if (error) {
          return res.status(500).json({ error: 'Failed to save override' });
        }

        return res.status(200).json({ success: true, override: data });
      } catch {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    return res.status(400).json({ error: 'Unknown action' });
  }

  // DELETE: remove venue offer or location override
  if (req.method === 'DELETE') {
    const { action, locationId, phase } = req.body;

    if (action === 'delete-override') {
      if (!locationId || !phase) {
        return res.status(400).json({ error: 'Missing locationId or phase' });
      }

      try {
        await supabase
          .from('location_overrides')
          .delete()
          .eq('location_id', locationId)
          .eq('phase', phase);

        return res.status(200).json({ success: true });
      } catch {
        return res.status(500).json({ error: 'Internal server error' });
      }
    }

    // Default: delete venue offer (backward compatible)
    if (!locationId) {
      return res.status(400).json({ error: 'Missing locationId' });
    }

    try {
      await supabase
        .from('venue_offers')
        .delete()
        .eq('location_id', locationId);

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
