import { COUNTRIES, CountryCodePicker, type Country } from '@/components/country-code-picker';
import { supabase } from '@/lib/supabase';
import { isValidPhoneNumber } from '@/utils/phone-utils';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Complete the OAuth session in the browser
WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
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
    // Check if user already existed (for signup, only new users allowed)
    const userCreatedAt = new Date(user.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);
    
    // If user was created more than 2 minutes ago, they already existed
    if (isSignup && minutesSinceCreation > 2) {
      setLoading(false);
      // Sign out the user since they shouldn't be logged in
      await supabase.auth.signOut();
      Alert.alert(
        'Account Already Exists',
        'An account with this Google email already exists. Please use the login page instead.',
        [
          {
            text: 'Go to Login',
            onPress: () => {
              router.replace('/onboarding/login');
            },
          },
        ]
      );
      return;
    }
    
    console.log('✅ Signup successful, navigating to basic details');
    setLoading(false);
    // New signup users start with basic details
    router.replace('/onboarding/basic-details');
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
      // Step 1: Check if user already exists in auth.users table via RPC function
      // This checks the auth.users table (not just user_profiles)
      const { data: authUserData, error: authUserError } = await supabase.rpc('check_auth_user_exists', {
        input_phone: formatted,
      });

      console.log('🔍 Checking auth.users for phone:', formatted, {
        data: authUserData,
        error: authUserError,
      });

      // If RPC function exists and returns a user, they already have an account
      if (authUserData && authUserData.length > 0) {
        console.warn('⚠️ User already exists in auth.users with this phone number');
        setLoading(false);
        Alert.alert(
          'Account Already Exists',
          'An account with this phone number already exists. Please use the login page instead.',
          [
            {
              text: 'Go to Login',
              onPress: () => {
                router.replace('/onboarding/login');
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

      // If RPC function doesn't exist (error code 42883), fall back to user_profiles check
      if (authUserError && authUserError.code === '42883') {
        console.warn('⚠️ RPC function check_auth_user_exists not found, falling back to user_profiles check');
        
        // Step 2: Check user_profiles table as a fallback
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_id, phone_number')
          .eq('phone_number', formatted);

        // If profile exists with this phone number, user already has an account
        if (profileData && profileData.length > 0) {
          console.warn('⚠️ User already exists with this phone number in user_profiles');
          setLoading(false);
          Alert.alert(
            'Account Already Exists',
            'An account with this phone number already exists. Please use the login page instead.',
            [
              {
                text: 'Go to Login',
                onPress: () => {
                  router.replace('/onboarding/login');
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
      }

      // Step 3: If no existing user found, now generate OTP for new user
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
      
      // Step 3: Success - new user, navigate to OTP verification page with signup flag
      router.push({
        pathname: '/onboarding/otp-verify',
        params: { phone: formatted, isSignup: 'true' },
      });
    } catch (err: any) {
      console.error('❌ OTP generation error:', err?.message || String(err));
      Alert.alert('OTP generation error', err?.message ?? String(err) ?? 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={[]}>
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
                  <Text style={styles.upperHeading}>Sign Up</Text>
                  <Text style={styles.upperSubtitle}>Love is written in the stars. Let's decode yours</Text>
                  <Text style={styles.upperSubtitle2}>Sign up and Swipe with the universe on your side</Text>
                </View>
              </View>
            )}

            {/* White Container at Bottom */}
            <View style={styles.whiteCard}>
            <View style={styles.headerRow}>
              <Image source={require('../../assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
              <Text style={styles.appTitle}>AstroDate</Text>
            </View>

            <Text style={styles.welcome}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to continue</Text>

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
                <LinearGradient colors={[ '#1A0B2E', '#2D1B4E', '#4A2C5A' ]} style={styles.signInBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.signInLabel}>Generate OTP</Text>}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.bottomRow}>
                <Text style={styles.bottomText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.push('/onboarding/login')}><Text style={styles.bottomLink}> Login</Text></TouchableOpacity>
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
  logo: { width: 56, height: 56, borderRadius: 28, marginTop:-10 },
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


