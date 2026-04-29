import { supabase } from './supabase';

export interface AstroDetails {
  user_id?: string;
  
  // Birth Details
  birth_date: string; // YYYY-MM-DD format
  birth_time: string; // HH:MM:SS format
  birth_location: string;
  birth_latitude?: number;
  birth_longitude?: number;
  
  // Astrological Signs
  western_sign?: string;
  indian_sign?: string;
  nakshatra_name?: string;
}

/**
 * Saves or updates astro details in the database
 * @param details - Astro details data to save
 * @returns Success status and details data
 */
export const saveAstroDetails = async (details: AstroDetails) => {
  try {
    // Get current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ Could not get current user:', userError);
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const userId = user.id;

    // Check if astro details already exist
    const { data: existingDetails, error: checkError } = await supabase
      .from('astro_details')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;

    if (existingDetails) {
      // Update existing details
      result = await supabase
        .from('astro_details')
        .update({
          birth_date: details.birth_date,
          birth_time: details.birth_time,
          birth_location: details.birth_location,
          birth_latitude: details.birth_latitude || null,
          birth_longitude: details.birth_longitude || null,
          western_sign: details.western_sign || null,
          indian_sign: details.indian_sign || null,
          nakshatra_name: details.nakshatra_name || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single();
    } else {
      // Insert new details
      result = await supabase
        .from('astro_details')
        .insert({
          user_id: userId,
          birth_date: details.birth_date,
          birth_time: details.birth_time,
          birth_location: details.birth_location,
          birth_latitude: details.birth_latitude || null,
          birth_longitude: details.birth_longitude || null,
          western_sign: details.western_sign || null,
          indian_sign: details.indian_sign || null,
          nakshatra_name: details.nakshatra_name || null,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error('❌ Error saving astro details:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    console.warn('✅ Astro details saved successfully');
    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception saving astro details:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Retrieves astro details by user ID
 * @param userId - Optional user ID (defaults to current user)
 * @returns Astro details data
 */
export const getAstroDetails = async (userId?: string) => {
  try {
    let targetUserId = userId;

    if (!targetUserId) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ Could not get current user:', userError);
        return { success: false, error: 'User not authenticated' };
      }
      targetUserId = user.id;
    }

    const { data, error } = await supabase
      .from('astro_details')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Error fetching astro details:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception fetching astro details:', errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Deletes astro details for current user
 * @returns Success status
 */
export const deleteAstroDetails = async () => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ Could not get current user:', userError);
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const { error } = await supabase
      .from('astro_details')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ Error deleting astro details:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log('✅ Astro details deleted successfully');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception deleting astro details:', errorMessage);
    return { success: false, error: errorMessage };
  }
};
