import { COUNTRIES, CountryCodePicker, type Country } from '@/components/country-code-picker';
import { supabase } from '@/lib/supabase';
import { verifyPhoneNumberExists } from '@/lib/user-profile';
import { isValidPhoneNumber } from '@/utils/phone-utils';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { makeRedirectUri } from 'expo-auth-session';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const navigation: any = useNavigation();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to India
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const onGenerateOTP = () => {
    handleGenerateOTP();
  };

  const handleOAuthSuccess = async (user: any, isSignup: boolean) => {
    // Check if user is new (for login, only existing users allowed)
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);

    // If user was created less than 2 minutes ago, they're new (should use signup)
    if (!isSignup && minutesSinceCreation <= 2) {
      setLoading(false);
      // Sign out the user since they shouldn't be logged in
      await supabase.auth.signOut();
      Alert.alert(
        'Account Not Found',
        'No account found with this Google email. Please sign up first.',
        [
          {
            text: 'Go to Signup',
            onPress: () => {
              router.replace('/onboarding/signup');
            },
          },
        ]
      );
      return;
    }

    console.log('✅ Login successful, navigating to home');
    setLoading(false);
    // Existing users go directly to home
    router.replace('/(tabs)');
  };

  const handleGenerateOTP = async () => {
    if (!phoneNumber || phoneNumber.trim() === '') {
      Alert.alert('Phone number required', 'Please enter your phone number');
      return;
    }

    // Format phone number to E.164 format using selected country code
    const cleanedNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (!cleanedNumber || cleanedNumber.length < 7) {
      Alert.alert('Invalid phone number', 'Please enter a valid phone number');
      return;
    }

    const formatted = `${selectedCountry.dialCode}${cleanedNumber}`;

    if (!isValidPhoneNumber(formatted)) {
      Alert.alert('Invalid phone number', 'Please enter a valid phone number');
      return;
    }

    setLoading(true);
    try {
      // Step 1: Check if user exists in user_profiles table using verified phone check
      // This function normalizes phone numbers to E.164 format (+919080923457) and checks
      console.log('🔍 Verifying user with phone number:', formatted);

      const verificationResult = await verifyPhoneNumberExists(formatted);

      if (!verificationResult.success || !verificationResult.data) {
        console.warn('⚠️ No account found with this phone number');
        console.warn('⚠️ Verification result:', verificationResult);

        setLoading(false);
        Alert.alert(
          'Account Not Found',
          'No account found with this phone number. Please sign up first.',
          [
            {
              text: 'Go to Signup',
              onPress: () => {
                router.replace('/onboarding/signup');
              },
            },
            {
              text: 'Cancel',
              onPress: () => {
                setLoading(false);
              },
              style: 'cancel',
            },
          ]
        );
        return;
      }

      console.log('✅ User found in database:', {
        userId: verificationResult.data.user_id,
        phoneInDb: verificationResult.phoneNumberInDb,
        name: verificationResult.data.full_name,
      });

      // Step 2: If user exists in user_profiles, now generate OTP
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formatted,
      });

      if (error) {
        let errorMessage = error.message || 'Could not send OTP. Please try again.';

        // Provide more helpful error messages
        if (error.message?.includes('Invalid phone number')) {
          errorMessage = 'Invalid phone number format. Please include country code (e.g., +1 for US, +91 for India)';
        } else if (error.message?.includes('Twilio') || error.message?.includes('SMS')) {
          errorMessage = 'SMS service error. Please check your Twilio configuration in Supabase.';
        }

        Alert.alert('OTP Generation Failed', errorMessage);
        setLoading(false);
        return;
      }

      // Check if we got a successful response
      if (!data) {
        Alert.alert('OTP Generation Failed', 'No response from server. Please check your Supabase configuration.');
        setLoading(false);
        return;
      }

      // Step 3: Success - user exists, proceed to OTP verification for login
      router.push({
        pathname: '/onboarding/phone-verification',
        params: { phone: formatted },
      });
    } catch (err: any) {
      console.error('❌ Login error:', err?.message || String(err));
      Alert.alert('Login error', err?.message ?? String(err) ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  const handleOAuthSignIn = async () => {
    try {
      setLoading(true);

      // Always use the explicit native scheme for the redirect URI.
      // The previous approach called makeRedirectUri({ scheme }) and then
      // checked if the result still started with 'exp://' as a fallback —
      // fragile, because if Expo ever stops using exp:// in development
      // the condition silently breaks and OAuth redirects stop working.
      // Using the `native` option bypasses scheme detection entirely and
      // always returns the exact string we provide.
      const finalRedirectUri = makeRedirectUri({
        native: 'astrodate://auth/callback',
      });

      console.log('🔗 Final Redirect URI:', finalRedirectUri);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: finalRedirectUri,
          skipBrowserRedirect: false,
        }
      });

      if (error) {
        console.error('❌ OAuth error:', error);
        Alert.alert('OAuth error', error.message || 'Could not start OAuth');
        setLoading(false);
        return;
      }

      if (!data || !data.url) {
        console.error('❌ No OAuth URL received');
        Alert.alert('OAuth error', 'Invalid OAuth response from Supabase');
        setLoading(false);
        return;
      }

      console.log('🌐 Opening OAuth URL in browser');

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        finalRedirectUri,
        {
          showInRecents: true,
        }
      );

      console.log('📱 OAuth result:', result.type);

      // Check if the user cancelled
      if (result.type === 'cancel') {
        console.log('❌ User cancelled OAuth');
        setLoading(false);
        return;
      }

      // Check if there's a URL in the result (successful redirect)
      if (result.type === 'success' && result.url) {
        console.log('✅ OAuth success, URL:', result.url);

        // Try to extract tokens from URL and set session
        try {
          const urlObj = new URL(result.url);
          const hashParams = new URLSearchParams(urlObj.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('🔑 Setting session from OAuth callback URL');
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('❌ Session error:', sessionError);
              setLoading(false);
              return;
            }

            if (sessionData?.session?.user) {
              await handleOAuthSuccess(sessionData.session.user, false);
              return;
            }
          }
        } catch (urlError) {
          console.log('⚠️ Could not parse URL, trying session retrieval...');
        }

        // Fallback: Wait for session to be established via deep link handler
        let retries = 0;
        const maxRetries = 10;
        const checkSession = async () => {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('❌ Session error:', sessionError);
            if (retries >= maxRetries) {
              setLoading(false);
              Alert.alert('Authentication Error', 'Could not establish session. Please try again.');
            } else {
              retries++;
              setTimeout(checkSession, 500);
            }
            return;
          }

          if (session?.user) {
            await handleOAuthSuccess(session.user, false);
          } else {
            if (retries < maxRetries) {
              retries++;
              setTimeout(checkSession, 500);
            } else {
              console.log('⚠️ No session found');
              setLoading(false);
              Alert.alert('Authentication Error', 'Session not found. Please try again.');
            }
          }
        };

        setTimeout(checkSession, 500);
      } else {
        // Handle other result types
        console.log('⚠️ Unexpected OAuth result type:', result.type);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('❌ Exception in OAuth:', err);
      Alert.alert('OAuth error', err?.message ?? String(err));
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={['#1A0B2E', '#2D1B4E', '#4A2C5A']}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Upper Purple Area Content */}
            {!isKeyboardVisible && (
              <View style={styles.upperContent}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.upperTextContainer}>
                  <Text style={styles.upperHeading}>Login</Text>
                  <Text style={styles.upperSubtitle}>Welcome back! Your stars are waiting</Text>
                  <Text style={styles.upperSubtitle2}>Sign in and continue your cosmic journey</Text>
                </View>
              </View>
            )}

            {/* White Container at Bottom */}
            <View style={styles.whiteCard}>
              <View style={styles.headerRow}>
                <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.appTitle}>AstroDate</Text>
              </View>

              <Text style={styles.welcome}>Welcome Back</Text>
              <Text style={styles.subtitle}>Login to continue</Text>

              <View style={styles.inputsWrap}>
                <View style={styles.inputRow}>
                  <View style={styles.iconWrap}><MaterialIcons name="phone" size={18} color="#6B5A7A" /></View>
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelect={setSelectedCountry}
                  />
                  <TextInput
                    value={phoneNumber}
                    onChangeText={(text) => {
                      // Only allow digits and limit to 10 digits
                      const digitsOnly = text.replace(/\D/g, '');
                      if (digitsOnly.length <= 10) {
                        setPhoneNumber(digitsOnly);
                      }
                    }}
                    placeholder="Phone number"
                    placeholderTextColor="#9CA3AF"
                    style={styles.input}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    maxLength={10}
                  />
                </View>

                <TouchableOpacity style={styles.signInBtnWrapper} onPress={onGenerateOTP} activeOpacity={0.9} disabled={loading}>
                  <LinearGradient colors={['#1A0B2E', '#2D1B4E', '#4A2C5A']} style={styles.signInBtn}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInLabel}>Generate OTP</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.bottomRow}>
                  <Text style={styles.bottomText}>New user?</Text>
                  <TouchableOpacity onPress={() => router.push('/onboarding/signup')}><Text style={styles.bottomLink}> Sign up</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  keyboardView: { flex: 1 },
  background: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'flex-end' },

  upperContent: {
    paddingTop: 50,
    paddingBottom: 20,
    minHeight: 180,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  upperTextContainer: {
    marginTop: 60,
    paddingLeft: 20,
    paddingRight: 20,
  },
  upperHeading: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  upperSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.9,
    marginBottom: 4,
  },
  upperSubtitle2: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FFFFFF',
    lineHeight: 22,
    opacity: 0.9,
  },

  whiteCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 20,
    elevation: 10,
  },

  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  logo: { width: 56, height: 56, borderRadius: 28, marginTop: -10 },
  appTitle: { color: '#000000', fontSize: 22, fontWeight: '700', marginTop: -10 },

  welcome: { color: '#000000', fontSize: 34, fontWeight: '800', marginTop: 6 },
  subtitle: { color: '#666666', marginTop: 6, marginBottom: 18, fontSize: 15 },

  inputsWrap: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  iconWrap: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  input: { flex: 1, color: '#000000', fontSize: 16 },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rememberRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  checkboxTick: { width: 8, height: 8, backgroundColor: '#fff', borderRadius: 2 },
  rememberText: { color: '#FFFFFF' },

  signInBtnWrapper: { marginTop: 6, marginBottom: 12, width: '100%' },
  signInBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  signInLabel: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 12 },
  divider: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { color: '#666666', marginHorizontal: 8, fontSize: 14 },

  socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, width: '100%', marginTop: 6 },
  socialBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  socialLetter: { fontSize: 16, fontWeight: '700', color: '#000000' },

  bottomRow: { flexDirection: 'row', marginTop: 18, justifyContent: 'center', alignItems: 'center' },
  bottomText: { color: '#666666' },
  bottomLink: { color: '#7C3AED', fontWeight: '700' },
});