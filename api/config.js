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

  // Cache for 60 seconds — phase changes aren't instant-critical
  res.setHeader('Cache-Control', 'public, max-age=60');

  try {
    // Get current phase
    const { data: config, error: configError } = await supabase
      .from('game_config')
      .select('phase')
      .eq('id', 1)
      .single();

    if (configError || !config) {
      return res.status(200).json({ phase: 'group_stage', overrides: [] });
    }

    const phase = config.phase;

    // If group stage, no overrides to fetch
    if (phase === 'group_stage') {
      return res.status(200).json({ phase, overrides: [] });
    }

    // Fetch overrides for the current phase
    const { data: overrides } = await supabase
      .from('location_overrides')
      .select('location_id, country, flag, tagline')
      .eq('phase', phase);

    return res.status(200).json({
      phase,
      overrides: overrides || [],
    });
  } catch {
    return res.status(200).json({ phase: 'group_stage', overrides: [] });
  }
}
