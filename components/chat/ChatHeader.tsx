import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { type SynastryDetail } from '@/lib/synastry';
import { TypingIndicator } from './TypingIndicator';

interface User {
  name: string;
  avatar: { uri: string };
  isOnline: boolean;
}

interface ChatHeaderProps {
  user: User;
  isOtherUserTyping: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  onBackPress: () => void;
  onMenuPress: () => void;
  synastryDetail?: SynastryDetail | null;
  synastryScore?: number | null;
}

export function ChatHeader({ user, isOtherUserTyping, connectionStatus, onBackPress, onMenuPress, synastryDetail, synastryScore }: ChatHeaderProps) {
  const [synastryExpanded, setSynastryExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress} activeOpacity={0.7}>
        <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <View style={styles.avatarContainer}>
          <Image source={user.avatar} style={styles.headerAvatar} />
          {user.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerName}>{user.name}</Text>
          {isOtherUserTyping ? (
            <TypingIndicator />
          ) : connectionStatus === 'disconnected' ? (
            <Text style={styles.connectionWarning}>⚠️ Reconnecting...</Text>
          ) : user.isOnline ? (
            <Text style={styles.onlineStatus}>Online</Text>
          ) : null}
        </View>
      </View>
      <TouchableOpacity style={styles.moreButton} onPress={onMenuPress} activeOpacity={0.7}>
        <MaterialIcons name="more-vert" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      </View>

      {synastryDetail && (
        <TouchableOpacity onPress={() => setSynastryExpanded(e => !e)}
          style={styles.synastryStrip} activeOpacity={0.75}>
          <Text style={styles.synastryChip}>🌙 {Math.round(synastryDetail.moon_score * 10)}/10</Text>
          <Text style={styles.synastryChip}>♀ {Math.round(synastryDetail.venus_score * 10)}/10</Text>
          <Text style={styles.synastryChip}>♂ {Math.round(synastryDetail.mars_score * 10)}/10</Text>
          <Text style={styles.synastryScore}>✦ {synastryScore != null ? Math.round(synastryScore) : '—'}</Text>
        </TouchableOpacity>
      )}

      {synastryExpanded && synastryDetail && (
        <View style={styles.synastryExpanded}>
          {[
            { emoji: '☀', label: 'Sun',     score: synastryDetail.sun_score },
            { emoji: '🌙', label: 'Moon',   score: synastryDetail.moon_score },
            { emoji: '♀',  label: 'Venus',  score: synastryDetail.venus_score },
            { emoji: '♂',  label: 'Mars',   score: synastryDetail.mars_score },
            { emoji: '☿',  label: 'Mercury',score: synastryDetail.mercury_score },
          ].map(({ emoji, label, score }) => (
            <View key={label} style={styles.synastryRow}>
              <Text style={styles.synastrylabel}>{emoji} {label}</Text>
              <View style={styles.synastryBarTrack}>
                <View style={[styles.synastryBarFill, { width: `${score * 10}%` as any }]} />
              </View>
              <Text style={styles.synastryScoreSmall}>{Math.round(score * 10)}/10</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000', // ensure there's a background if needed, or transparent. Defaulting to nothing specific or inheriting
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#1A0B2E',
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  onlineStatus: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  connectionWarning: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  moreButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  synastryStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 6, gap: 8,
    borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  synastryChip: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  synastryScore: { fontSize: 12, color: '#a78bfa', fontWeight: '600', marginLeft: 'auto' },
  synastryExpanded: {
    paddingHorizontal: 16, paddingBottom: 10, gap: 6,
    backgroundColor: 'rgba(139,92,246,0.06)',
  },
  synastryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  synastrylabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', width: 68 },
  synastryBarTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  synastryBarFill: { height: '100%', borderRadius: 2, backgroundColor: '#8b5cf6' },
  synastryScoreSmall: { fontSize: 11, color: '#a78bfa', width: 36, textAlign: 'right' },
});