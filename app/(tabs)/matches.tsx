import { useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable,
  StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';

type MatchItem = {
  id: string;
  created_at: string;
  otherUser: {
    id: string;
    full_name: string;
    college: string;
    avatar_url: string | null;
  };
  lastMessage: string;
  lastMessageTime: string | null;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function MatchesScreen() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    loadMatches();
  }, []);

  useEffect(() => {
    if (!currentUserId || matches.length === 0) return;
    const matchIds = matches.map(m => m.id);
    const channel = supabase
      .channel('matches-screen')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        const msg = payload.new as { match_id: string; content: string; created_at: string };
        if (!matchIds.includes(msg.match_id)) return;
        setMatches(prev => prev.map(m =>
          m.id === msg.match_id
            ? { ...m, lastMessage: msg.content, lastMessageTime: msg.created_at }
            : m
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, matches.length]);

  async function loadMatches() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: rawMatches, error: matchesError } = await supabase
      .from('matches')
      .select('id, created_at, user1_id, user2_id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (matchesError) console.error('[matches] load error:', matchesError.message, matchesError.code);
    if (!rawMatches) { setLoading(false); return; }

    const otherIds = rawMatches.map(m =>
      m.user1_id === user.id ? m.user2_id : m.user1_id
    );

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, college, avatar_url')
      .in('id', otherIds);

    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const enriched = await Promise.all(rawMatches.map(async (m) => {
      const otherId = m.user1_id === user.id ? m.user2_id : m.user1_id;
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('content, created_at')
        .eq('match_id', m.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return {
        id: m.id,
        created_at: m.created_at,
        otherUser: profileMap[otherId] ?? { id: otherId, full_name: 'Unknown', college: '', avatar_url: null },
        lastMessage: lastMsg?.content ?? 'Say hello! 👋',
        lastMessageTime: lastMsg?.created_at ?? null,
      };
    }));

    setMatches(enriched);
    setLoading(false);
  }

  function renderMatch({ item }: { item: MatchItem }) {
    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => router.push(`/chat/${item.id}`)}
      >
        {item.otherUser.avatar_url ? (
          <Image source={{ uri: item.otherUser.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{item.otherUser.full_name?.[0] ?? '?'}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{item.otherUser.full_name}</Text>
          <Text style={styles.college}>{item.otherUser.college}</Text>
          <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
        </View>
        {item.lastMessageTime && (
          <Text style={styles.time}>{timeAgo(item.lastMessageTime)}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Matches</Text>
        <Text style={styles.count}>{matches.length}</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.GOLD} />
        </View>
      ) : matches.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptyHint}>Keep swiping on Discover!</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={m => m.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  titleRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 20, paddingVertical: 16,
  },
  title: {
    fontSize: 28, color: COLORS.GOLD,
    fontFamily: 'CormorantGaramond_700Bold',
  },
  count: {
    fontSize: 14, color: COLORS.MUTED,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyIcon: { fontSize: 48, color: COLORS.GOLD },
  emptyText: { fontSize: 18, color: COLORS.TEXT_WARM, fontFamily: 'CormorantGaramond_600SemiBold' },
  emptyHint: { fontSize: 13, color: COLORS.MUTED },
  list: { paddingHorizontal: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, gap: 14,
  },
  rowPressed: { opacity: 0.75 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  avatarPlaceholder: {
    backgroundColor: '#1A2535', borderWidth: 1,
    borderColor: COLORS.BORDER, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontSize: 22, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 16, color: COLORS.TEXT_WARM, fontWeight: '600' },
  college: { fontSize: 12, color: COLORS.MUTED },
  lastMsg: { fontSize: 13, color: COLORS.MUTED, marginTop: 2 },
  time: { fontSize: 11, color: COLORS.MUTED },
  separator: { height: 1, backgroundColor: COLORS.BORDER, marginLeft: 68 },
});
