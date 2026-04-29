import { supabase } from './supabase';

const isTransientNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error || '');
  return (
    message.includes('Network request failed') ||
    message.includes('AuthRetryableFetchError') ||
    message.includes('Failed to fetch')
  );
};

/**
 * Updates user's online status
 * @param isOnline - Whether the user is online
 * @returns Success status
 */
export const updateOnlineStatus = async (
  isOnline: boolean
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      if (isTransientNetworkError(userError)) {
        console.warn('⚠️ Could not get current user (network unavailable)');
      } else {
        console.error('❌ Could not get current user:', userError);
      }
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const userId = user.id;

    // Update online status in user_profiles or a separate online_status table
    // For now, we'll use a simple approach with a presence table
    // In production, you might want to create a dedicated online_status table
    const { error } = await supabase
      .from('user_online_status')
      .upsert({
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      // If table doesn't exist, that's okay - we'll handle it gracefully
      console.warn('⚠️ Could not update online status (table may not exist):', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception updating online status:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Gets online status for a user
 * @param userId - User ID to check
 * @returns Online status
 */
export const getOnlineStatus = async (
  userId: string
): Promise<{ success: boolean; isOnline?: boolean; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('user_online_status')
      .select('is_online, last_seen')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If table doesn't exist or user not found, assume offline
      return {
        success: true,
        isOnline: false,
      };
    }

    // Check if user was online in the last 5 minutes
    if (data?.is_online && data?.last_seen) {
      const lastSeen = new Date(data.last_seen);
      const now = new Date();
      const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;
      
      return {
        success: true,
        isOnline: diffMinutes < 5, // Consider online if last seen within 5 minutes
      };
    }

    return {
      success: true,
      isOnline: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception getting online status:', errorMessage);
    return {
      success: true,
      isOnline: false,
    };
  }
};

/**
 * Gets online status for multiple users at once (batch operation)
 * @param userIds - Array of user IDs to check
 * @returns Map of user IDs to their online status
 */
export const getOnlineStatusBatch = async (
  userIds: string[]
): Promise<Map<string, boolean>> => {
  try {
    if (userIds.length === 0) {
      return new Map();
    }

    const { data, error } = await supabase
      .from('user_online_status')
      .select('user_id, is_online, last_seen')
      .in('user_id', userIds);

    if (error) {
      // If table doesn't exist, return all users as offline
      console.warn('⚠️ Could not fetch online statuses (table may not exist):', error.message);
      const offlineMap = new Map<string, boolean>();
      userIds.forEach(userId => offlineMap.set(userId, false));
      return offlineMap;
    }

    // Create a map of user statuses
    const statusMap = new Map<string, boolean>();
    const now = new Date();

    // Process fetched data
    data?.forEach((record: any) => {
      let isOnline = false;
      if (record.is_online && record.last_seen) {
        const lastSeen = new Date(record.last_seen);
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / 60000;
        isOnline = diffMinutes < 5; // Consider online if last seen within 5 minutes
      }
      statusMap.set(record.user_id, isOnline);
    });

    // Set offline status for users not found in the database
    userIds.forEach(userId => {
      if (!statusMap.has(userId)) {
        statusMap.set(userId, false);
      }
    });

    return statusMap;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Exception getting online status batch:', errorMessage);
    // Return all users as offline on error
    const offlineMap = new Map<string, boolean>();
    userIds.forEach(userId => offlineMap.set(userId, false));
    return offlineMap;
  }
};

