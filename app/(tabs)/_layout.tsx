import { Tabs } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TAB_BAR_BASE_STYLE } from '@/constants/tab-bar-style';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TabBarVisibilityContext } from '@/hooks/use-tab-bar-visibility';
import { BlurView } from 'expo-blur';

const PURPLE_LIGHT = '#8B5CF6';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);


  const tabBarStyle = useMemo(
    () => [TAB_BAR_BASE_STYLE, isTabBarHidden ? styles.hiddenTabBar : null],
    [isTabBarHidden]
  );

  const setHidden = useCallback((hidden: boolean) => {
    setIsTabBarHidden(hidden);
  }, []);

  const visibilityContextValue = useMemo(
    () => ({
      isHidden: isTabBarHidden,
      setHidden,
    }),
    [isTabBarHidden, setHidden]
  );

  return (
    <TabBarVisibilityContext.Provider value={visibilityContextValue}>
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: PURPLE_LIGHT,
          tabBarInactiveTintColor: '#FFFFFF',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle,
          tabBarBackground: () =>
            Platform.OS === 'ios' ? (
              <BlurView
                tint="dark"
                intensity={40}
                style={{ flex: 1, borderRadius: 32, overflow: 'hidden' }}
              />
            ) : (
              <View
                style={{
                  flex: 1,
                  borderRadius: 32,
                  overflow: 'hidden',
                  backgroundColor: '#1A0B2E',
                }}
              />
            ),
          tabBarLabelStyle: {
            display: 'none',
          },
          tabBarItemStyle: {
            paddingTop: 8,
            paddingBottom: 10,
          },
          tabBarIconStyle: {
            marginTop: 0,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Discover',
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <IconSymbol
                  size={28}
                  name="safari.fill"
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="likes"
          options={{
            title: 'Likes',
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <IconSymbol
                  size={28}
                  name="heart.fill"
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <IconSymbol
                  size={28}
                  name="message.fill"
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="insights"
          options={{
            title: 'Insights',
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <IconSymbol
                  size={28}
                  name="sparkles"
                  color={color}
                />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ focused, color }) => (
              <View style={focused ? styles.activeIconContainer : null}>
                <IconSymbol
                  size={28}
                  name="person.fill"
                  color={color}
                />
              </View>
            ),
          }}
        />
      </Tabs>
    </TabBarVisibilityContext.Provider>
  );
}

const styles = StyleSheet.create({
  activeIconContainer: {
    backgroundColor: 'transparent',
    borderRadius: 24,
    padding: 6,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  hiddenTabBar: {
    transform: [{ translateY: 150 }],
    opacity: 0,
    // Remove from layout flow so screens don't have a phantom gap
    // at the bottom where the tab bar used to be
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});