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

  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ error: 'Missing required parameter: email' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Find visitor
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (visitorError || !visitor) {
      return res.status(200).json({ visited: [], total: 16 });
    }

    // Get all check-ins for this visitor
    const { data: checkins, error: checkinError } = await supabase
      .from('checkins')
      .select('location_id')
      .eq('visitor_id', visitor.id);

    if (checkinError) {
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    const visited = checkins.map(c => c.location_id);

    return res.status(200).json({ visited, total: 16 });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
