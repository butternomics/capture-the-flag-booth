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

  // GET: fetch all submissions with visitor info and photos
  if (req.method === 'GET') {
    const statusFilter = req.query.status || 'all';

    try {
      // Get all submissions with visitor info
      let query = supabase
        .from('submissions')
        .select('id, status, reviewed_by, reviewed_at, created_at, visitor_id')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: submissions, error: subError } = await query;

      if (subError || !submissions) {
        return res.status(500).json({ error: 'Failed to fetch submissions' });
      }

      // Enrich each submission with visitor + check-in data
      const enriched = [];
      for (const sub of submissions) {
        // Get visitor
        const { data: visitor } = await supabase
          .from('visitors')
          .select('id, email, first_name, created_at')
          .eq('id', sub.visitor_id)
          .single();

        // Get all check-ins with photos
        const { data: checkins } = await supabase
          .from('checkins')
          .select('location_id, format, photo_url, created_at')
          .eq('visitor_id', sub.visitor_id)
          .order('created_at');

        enriched.push({
          ...sub,
          visitor: visitor || null,
          checkins: checkins || [],
        });
      }

      // Also get summary stats
      const { count: totalVisitors } = await supabase
        .from('visitors')
        .select('*', { count: 'exact', head: true });

      const { count: totalCheckins } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true });

      const { count: pendingCount } = await supabase
        .from('submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      return res.status(200).json({
        submissions: enriched,
        stats: {
          totalVisitors: totalVisitors || 0,
          totalCheckins: totalCheckins || 0,
          pendingSubmissions: pendingCount || 0,
        },
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
