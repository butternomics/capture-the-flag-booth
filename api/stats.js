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
    // Total unique visitors
    const { count: totalVisitors } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true });

    // Total check-ins
    const { count: totalCheckins } = await supabase
      .from('checkins')
      .select('*', { count: 'exact', head: true });

    // Check-ins per location
    const { data: checkins } = await supabase
      .from('checkins')
      .select('location_id');

    const locationCounts = {};
    if (checkins) {
      for (const c of checkins) {
        locationCounts[c.location_id] = (locationCounts[c.location_id] || 0) + 1;
      }
    }

    // Check-ins per format
    const { data: formatData } = await supabase
      .from('checkins')
      .select('format');

    const formatCounts = {};
    if (formatData) {
      for (const c of formatData) {
        formatCounts[c.format] = (formatCounts[c.format] || 0) + 1;
      }
    }

    // Visitors who completed all 16 locations
    const { data: allCheckins } = await supabase
      .from('checkins')
      .select('visitor_id, location_id');

    let completedAll = 0;
    if (allCheckins) {
      const visitorLocs = {};
      for (const c of allCheckins) {
        if (!visitorLocs[c.visitor_id]) visitorLocs[c.visitor_id] = new Set();
        visitorLocs[c.visitor_id].add(c.location_id);
      }
      completedAll = Object.values(visitorLocs).filter(s => s.size >= 16).length;
    }

    // Check-ins over time (last 30 days, grouped by date)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentCheckins } = await supabase
      .from('checkins')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at');

    const dailyCounts = {};
    if (recentCheckins) {
      for (const c of recentCheckins) {
        const day = c.created_at.split('T')[0];
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      }
    }

    return res.status(200).json({
      totalVisitors: totalVisitors || 0,
      totalCheckins: totalCheckins || 0,
      completedAll,
      locationCounts,
      formatCounts,
      dailyCounts,
    });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
