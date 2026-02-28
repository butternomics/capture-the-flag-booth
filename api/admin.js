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

  // GET: full dashboard data — all visitors, check-ins, leaderboard, activity
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
        .select('id, visitor_id, location_id, format, photo_url, created_at')
        .order('created_at', { ascending: false });

      // All submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('id, visitor_id, status, reviewed_by, reviewed_at, created_at')
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
          const uniqueLocs = [...new Set(cks.map(c => c.location_id))];
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

  return res.status(405).json({ error: 'Method not allowed' });
}
