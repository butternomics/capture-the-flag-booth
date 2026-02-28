import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Missing required field: email' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Find visitor
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('id, first_name')
      .eq('email', normalizedEmail)
      .single();

    if (visitorError || !visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Verify they actually have all 16 check-ins
    const { data: checkins } = await supabase
      .from('checkins')
      .select('location_id, photo_url')
      .eq('visitor_id', visitor.id);

    if (!checkins || checkins.length < 16) {
      return res.status(400).json({
        error: 'Not all locations captured',
        captured: checkins ? checkins.length : 0,
        required: 16,
      });
    }

    // Check all check-ins have photos
    const missingPhotos = checkins.filter(c => !c.photo_url);
    if (missingPhotos.length > 0) {
      return res.status(400).json({
        error: 'Some locations are missing photos',
        missingPhotos: missingPhotos.map(c => c.location_id),
      });
    }

    // Create or update submission
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .upsert(
        { visitor_id: visitor.id, status: 'pending' },
        { onConflict: 'visitor_id' }
      )
      .select()
      .single();

    if (subError) {
      return res.status(500).json({ error: 'Failed to create submission' });
    }

    return res.status(201).json({
      success: true,
      submissionId: submission.id,
      status: submission.status,
    });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
