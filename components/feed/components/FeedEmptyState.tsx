/**
 * FeedEmptyState
 * Shown when profiles.length === 0 and not loading.
 * Cosmic illustration (pure RN, no lottie dependency), expand-filters CTA,
 * "check back tomorrow" message.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface Props {
  onExpandFilters: () => void;
}

// ─── Twinkling star ──────────────────────────────────────────────────────────

function Star({
  x,
  y,
  size,
  delay,
}: {
  x: number;
  y: number;
  size: number;
  delay: number;
}) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800 + delay * 3,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2,
          duration: 800 + delay * 3,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, delay]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: `${x}%` as any,
        top: `${y}%` as any,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#FFFFFF',
        opacity,
      }}
    />
  );
}

// ─── Orbiting ring ───────────────────────────────────────────────────────────

function OrbitRing({
  radius,
  duration,
  color,
  dotSize,
  delay,
}: {
  radius: number;
  duration: number;
  color: string;
  dotSize: number;
  delay: number;
}) {
  const angle = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(angle, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [angle, duration, delay]);

  const translateX = angle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2 * Math.PI] as any,
  });

  // Use separate x/y animated values driven by angle
  const dotX = angle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [radius, 0, -radius, 0, radius],
  });
  const dotY = angle.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [0, radius, 0, -radius, 0],
  });

  const size = radius * 2;

  return (
    <View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: radius,
        borderWidth: 1,
        borderColor: `${color}30`,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: color,
          transform: [{ translateX: dotX }, { translateY: dotY }],
        }}
      />
    </View>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

// Deterministic star positions so the field is consistent on every render
const STARS = [
  { x: 8,  y: 12, size: 2.5, delay: 0    },
  { x: 18, y: 35, size: 1.5, delay: 300  },
  { x: 75, y: 8,  size: 2,   delay: 600  },
  { x: 88, y: 25, size: 1.5, delay: 150  },
  { x: 92, y: 60, size: 2.5, delay: 900  },
  { x: 5,  y: 72, size: 1.5, delay: 450  },
  { x: 65, y: 88, size: 2,   delay: 750  },
  { x: 30, y: 92, size: 1.5, delay: 200  },
  { x: 50, y: 5,  size: 3,   delay: 1100 },
  { x: 12, y: 52, size: 1,   delay: 850  },
  { x: 82, y: 78, size: 2,   delay: 500  },
  { x: 40, y: 18, size: 1.5, delay: 650  },
];

export default function FeedEmptyState({ onExpandFilters }: Props) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const floatY = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in the whole scene
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Gentle float on the planet
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -10,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 10,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    floatLoop.start();

    // Pulse glow behind planet
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, {
          toValue: 1.15,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => {
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [fadeIn, floatY, pulseScale]);

  return (
    <Animated.View style={[styles.root, { opacity: fadeIn }]}>
      {/* Starfield */}
      {STARS.map((s, i) => (
        <Star key={i} x={s.x} y={s.y} size={s.size} delay={s.delay} />
      ))}

      {/* Illustration area */}
      <View style={styles.illustrationContainer}>
        {/* Outer glow pulse */}
        <Animated.View
          style={[
            styles.glowRing,
            { transform: [{ scale: pulseScale }] },
          ]}
        />

        {/* Orbit rings */}
        <OrbitRing radius={80}  duration={6000}  color="#A855F7" dotSize={6} delay={0}    />
        <OrbitRing radius={110} duration={10000} color="#EC4899" dotSize={5} delay={1200} />
        <OrbitRing radius={140} duration={16000} color="#38BDF8" dotSize={4} delay={600}  />

        {/* Planet */}
        <Animated.View
          style={[styles.planetWrapper, { transform: [{ translateY: floatY }] }]}>
          {/* Planet body */}
          <View style={styles.planet}>
            {/* Highlight */}
            <View style={styles.planetHighlight} />
            {/* Surface band */}
            <View style={styles.planetBand} />
            {/* Question mark — "where are they?" */}
            <Text style={styles.planetEmoji}>✦</Text>
          </View>
          {/* Saturn ring */}
          <View style={styles.saturnRingWrapper}>
            <View style={styles.saturnRing} />
          </View>
        </Animated.View>
      </View>

      {/* Copy */}
      <View style={styles.copyBlock}>
        <Text style={styles.headline}>Your cosmos is quiet</Text>
        <Text style={styles.subtext}>
          No profiles matched your current filters.{'\n'}
          Widen your search to discover more souls.
        </Text>
      </View>

      {/* Primary CTA */}
      <TouchableOpacity
        style={styles.ctaButton}
        onPress={onExpandFilters}
        activeOpacity={0.82}>
        <Text style={styles.ctaIcon}>⚙</Text>
        <Text style={styles.ctaText}>Expand My Filters</Text>
      </TouchableOpacity>

      {/* Secondary nudge */}
      <View style={styles.secondaryNudge}>
        <Text style={styles.nudgeIcon}>🌙</Text>
        <Text style={styles.nudgeText}>
          New cosmic matches arrive daily — check back tomorrow
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 80,
  },

  // ── Illustration ──
  illustrationContainer: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glowRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(168, 85, 247, 0.18)',
  },
  planetWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#5B21B6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 20,
    overflow: 'hidden',
  },
  planetHighlight: {
    position: 'absolute',
    top: 12,
    left: 14,
    width: 28,
    height: 20,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ rotate: '-25deg' }],
  },
  planetBand: {
    position: 'absolute',
    top: '45%',
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  planetEmoji: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  saturnRingWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 30,
  },
  saturnRing: {
    width: 130,
    height: 18,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(168, 85, 247, 0.55)',
    backgroundColor: 'transparent',
    transform: [{ rotateX: '72deg' }],
  },

  // ── Copy ──
  copyBlock: {
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  headline: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 22,
  },

  // ── CTA ──
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#A855F7',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaIcon: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Nudge ──
  secondaryNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  nudgeIcon: {
    fontSize: 16,
  },
  nudgeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
    lineHeight: 18,
  },
});
