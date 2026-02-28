import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, locationId, imageData } = req.body;

  if (!email || !locationId || !imageData) {
    return res.status(400).json({ error: 'Missing required fields: email, locationId, imageData' });
  }

  try {
    // Decode base64 image data (strip data URL prefix if present)
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // Generate unique filename
    const normalizedEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
    const timestamp = Date.now();
    const filePath = `${normalizedEmail}/${locationId}-${timestamp}.jpg`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('checkin-photos')
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return res.status(500).json({ error: 'Failed to upload photo' });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('checkin-photos')
      .getPublicUrl(filePath);

    const photoUrl = urlData.publicUrl;

    // Update the check-in record with the photo URL
    const { data: visitor } = await supabase
      .from('visitors')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .single();

    if (visitor) {
      await supabase
        .from('checkins')
        .update({ photo_url: photoUrl })
        .eq('visitor_id', visitor.id)
        .eq('location_id', locationId);
    }

    return res.status(200).json({ success: true, photoUrl });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
