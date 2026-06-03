import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

serve(async (req) => {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: photos, error: fetchError } = await supabaseAdmin
      .from('user_photos')
      .select('id, storage_path, photo_url');

    if (fetchError) throw fetchError;

    let updatedCount = 0;
    for (const photo of photos) {
      if (!photo.storage_path) continue; // skip old rows with no path
      
      const { data } = await supabaseAdmin.storage
        .from('user-photos')
        .createSignedUrl(photo.storage_path, 60 * 60 * 24 * 365); // 1 year
        
      if (data?.signedUrl) {
        await supabaseAdmin
          .from('user_photos')
          .update({ photo_url: data.signedUrl })
          .eq('id', photo.id);
        updatedCount++;
      }
    }

    return new Response(JSON.stringify({ success: true, updatedCount }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
