import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Top 20 visitors by number of unique locations visited
    // Using a raw SQL query via Supabase RPC or manual join
    const { data: leaders, error: leaderError } = await supabase
      .rpc('get_leaderboard', { limit_count: 20 });

    if (leaderError) {
      // Fallback: manual query approach
      const { data: checkins } = await supabase
        .from('checkins')
        .select('visitor_id, location_id');

      const { data: visitors } = await supabase
        .from('visitors')
        .select('id, first_name');

      if (!checkins || !visitors) {
        return res.status(200).json({ leaders: [], locationStats: [] });
      }

      // Count unique locations per visitor
      const counts = {};
      for (const c of checkins) {
        if (!counts[c.visitor_id]) counts[c.visitor_id] = new Set();
        counts[c.visitor_id].add(c.location_id);
      }

      const visitorMap = {};
      for (const v of visitors) {
        visitorMap[v.id] = v.first_name;
      }

      const leaderList = Object.entries(counts)
        .map(([id, locs]) => ({
          first_name: visitorMap[id] || 'Anonymous',
          count: locs.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      // Location popularity stats
      const locCounts = {};
      for (const c of checkins) {
        locCounts[c.location_id] = (locCounts[c.location_id] || 0) + 1;
      }
      const locationStats = Object.entries(locCounts)
        .map(([id, count]) => ({ location_id: id, count }))
        .sort((a, b) => b.count - a.count);

      return res.status(200).json({ leaders: leaderList, locationStats });
    }

    return res.status(200).json({ leaders: leaders || [], locationStats: [] });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
