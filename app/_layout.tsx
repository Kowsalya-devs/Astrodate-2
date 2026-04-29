import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { updateOnlineStatus } from '@/lib/online-status';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const router = useRouter();
  const segments = useSegments();
  const [isLoading, setIsLoading] = useState(true);
  const didRedirectRef = useRef<boolean>(false);

  const isInOnboarding = segments.some(segment =>
    segment === 'onboarding' || segment?.includes('onboarding')
  );
  const isAtIndex = pathname === '/';
  const isInTabs = segments[0] === '(tabs)';
  const isProtectedRoute = !isInOnboarding && !isAtIndex;

  useEffect(() => {
    // Single source of truth for routing decisions on startup.
    // All initial routing is handled here — onAuthStateChange below only
    // handles SIGNED_OUT so the two paths never race against each other.
    const checkUserSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session check error:', error);
          setIsLoading(false);
          return;
        }

        if (session?.user?.id) {
          if (isInOnboarding) {
            // User is in onboarding (signup flow) - keep them signed in to complete onboarding
            setIsLoading(false);
            return;
          }

          // User is NOT in onboarding - verify they exist in database (login flow)
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .single();

          if (profileError || !profile) {
            // User session exists but user not in database - sign out
            console.warn('⚠️ Session invalid - user not found in database, signing out');
            await supabase.auth.signOut();
            setIsLoading(false);
            return;
          }

          // User is valid and verified — redirect to tabs if not already there
          if (!isInTabs && !didRedirectRef.current) {
            didRedirectRef.current = true;
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 100);
          }
          setIsLoading(false);
        } else {
          // No session - redirect away from protected screens
          didRedirectRef.current = false;
          if (isProtectedRoute) {
            router.replace('/onboarding/login');
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setIsLoading(false);
      }
    };

    // onAuthStateChange is intentionally limited to SIGNED_OUT only.
    // SIGNED_IN routing is handled entirely by checkUserSession above to
    // avoid a race where both paths call router.replace() simultaneously,
    // which causes screen flicker and occasional blank screens on Android.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      if (_event === 'SIGNED_IN') {
        // Routing after sign-in is handled by checkUserSession — do nothing here.
        return;
      }

      if (_event === 'SIGNED_OUT') {
        // User signed out — clear redirect flag and send to login
        didRedirectRef.current = false;
        if (isProtectedRoute) {
          router.replace('/onboarding/login');
        }
        setIsLoading(false);
      }
    });

    // Check session on mount
    checkUserSession();

    return () => {
      subscription?.unsubscribe();
    };
  }, [router, segments]);

  // Track app state and update online status
  useEffect(() => {
    let statusUpdateInterval: ReturnType<typeof setInterval> | null = null;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (nextAppState === 'active') {
        console.log('📱 App became active - setting user online');
        await updateOnlineStatus(true);

        statusUpdateInterval = setInterval(async () => {
          await updateOnlineStatus(true);
        }, 2 * 60 * 1000);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('📱 App went to background - setting user offline');
        if (statusUpdateInterval) {
          clearInterval(statusUpdateInterval);
          statusUpdateInterval = null;
        }
        await updateOnlineStatus(false);
      }
    };

    const setInitialStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('📱 App started - setting user online');
        await updateOnlineStatus(true);

        statusUpdateInterval = setInterval(async () => {
          await updateOnlineStatus(true);
        }, 2 * 60 * 1000);
      }
    };

    setInitialStatus();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          updateOnlineStatus(false).catch(console.error);
        }
      });
    };
  }, []);

  // Splash guard — blocks all screens until the session check resolves.
  // Prevents protected screens from flashing before the auth redirect fires.
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A0B2E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            contentStyle: {
              backgroundColor: Platform.OS === 'android' ? '#1A0B2E' : undefined,
            },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/login" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding/onboarding_ques" options={{ headerShown: false }} />
          <Stack.Screen name="profile-details" options={{ headerShown: false, animation: 'fade', gestureEnabled: true }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar
          style="auto"
          translucent={false}
          backgroundColor={Platform.OS === 'android' ? '#1A0B2E' : undefined}
        />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}