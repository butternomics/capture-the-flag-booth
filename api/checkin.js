import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, firstName, locationId, format } = req.body;

  if (!email || !firstName || !locationId) {
    return res.status(400).json({ error: 'Missing required fields: email, firstName, locationId' });
  }

  // Normalize email
  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Upsert visitor (get or create by email)
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .upsert(
        { email: normalizedEmail, first_name: firstName.trim() },
        { onConflict: 'email', ignoreDuplicates: true }
      )
      .select('id')
      .single();

    if (visitorError) {
      // If upsert with ignoreDuplicates didn't return data, fetch the existing visitor
      const { data: existing, error: fetchError } = await supabase
        .from('visitors')
        .select('id')
        .eq('email', normalizedEmail)
        .single();

      if (fetchError || !existing) {
        return res.status(500).json({ error: 'Failed to find or create visitor' });
      }

      // Insert check-in with existing visitor ID
      const { error: checkinError } = await supabase
        .from('checkins')
        .insert({
          visitor_id: existing.id,
          location_id: locationId,
          format: format || 'portrait',
        });

      if (checkinError) {
        if (checkinError.code === '23505') {
          // Unique constraint violation — already checked in here
          return res.status(409).json({ message: 'Already checked in at this location' });
        }
        return res.status(500).json({ error: 'Failed to record check-in' });
      }

      return res.status(201).json({ success: true, visitorId: existing.id });
    }

    // Insert check-in with the upserted visitor ID
    const { error: checkinError } = await supabase
      .from('checkins')
      .insert({
        visitor_id: visitor.id,
        location_id: locationId,
        format: format || 'portrait',
      });

    if (checkinError) {
      if (checkinError.code === '23505') {
        return res.status(409).json({ message: 'Already checked in at this location' });
      }
      return res.status(500).json({ error: 'Failed to record check-in' });
    }

    return res.status(201).json({ success: true, visitorId: visitor.id });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
