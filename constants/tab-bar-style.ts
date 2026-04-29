import { Platform, type ViewStyle } from 'react-native';

const PURPLE_GLOW = '#A855F7';

export const TAB_BAR_BASE_STYLE: ViewStyle = {
  backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#1A0B2E',
  borderTopWidth: 0,
  borderTopColor: 'transparent',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.15)',
  height: Platform.OS === 'ios' ? 64 : 64,
  paddingBottom: Platform.OS === 'ios' ? 10 : 8,
  paddingTop: 8,
  borderRadius: 32,
  marginHorizontal: 20,
  marginBottom: Platform.OS === 'ios' ? 30 : 20,
  position: 'absolute',
  ...Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.4,
      shadowRadius: 35,
      elevation: 0,
    },
    android: {
      elevation: 15,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 15 },
      shadowOpacity: 0.4,
      shadowRadius: 35,
    },
  }),
};

