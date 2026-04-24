import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';

type Message = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type OtherUser = {
  id: string;
  full_name: string;
  college: string;
  avatar_url: string | null;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen() {
  const { id: matchId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChat();

    const channel = supabase
      .channel(`chat-${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `match_id=eq.${matchId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  async function loadChat() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    const { data: match } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .single();

    if (match) {
      const otherId = match.user1_id === user.id ? match.user2_id : match.user1_id;
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, college, avatar_url')
        .eq('id', otherId)
        .single();
      setOtherUser(profile);
    }

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    setMessages(msgs || []);
    setLoading(false);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input.trim();
    setInput('');
    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: currentUserId,
      content: text,
    });
    setSending(false);
  }

  function renderMessage({ item }: { item: Message }) {
    const isMe = item.sender_id === currentUserId;
    return (
      <View style={[styles.bubbleRow, isMe && styles.bubbleRowMe]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {formatTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </Pressable>
        {otherUser?.avatar_url ? (
          <Image source={{ uri: otherUser.avatar_url }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}>
            <Text style={styles.headerAvatarInitial}>{otherUser?.full_name?.[0] ?? '?'}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{otherUser?.full_name ?? '...'}</Text>
          <Text style={styles.headerCollege}>{otherUser?.college}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.GOLD} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  You matched! Send a message to start the conversation.
                </Text>
              </View>
            }
          />
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.MUTED}
            value={input}
            onChangeText={setInput}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            multiline
          />
          <Pressable
            style={[styles.sendBtn, !input.trim() && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.NAVY },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.BORDER,
    gap: 12,
  },
  backBtn: { padding: 4 },
  backBtnText: { fontSize: 24, color: COLORS.GOLD },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: {
    backgroundColor: '#1A2535', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.BORDER,
  },
  headerAvatarInitial: { fontSize: 16, color: COLORS.GOLD, fontFamily: 'CormorantGaramond_700Bold' },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, color: COLORS.TEXT_WARM, fontWeight: '600' },
  headerCollege: { fontSize: 12, color: COLORS.MUTED },
  messageList: { padding: 16, gap: 8 },
  bubbleRow: { flexDirection: 'row', marginBottom: 8 },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '75%', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: COLORS.SURFACE,
    borderWidth: 1, borderColor: COLORS.BORDER,
  },
  bubbleMe: {
    backgroundColor: COLORS.GOLD, borderColor: COLORS.GOLD,
    borderBottomRightRadius: 4,
  },
  bubbleThem: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, color: COLORS.TEXT_WARM, lineHeight: 20 },
  bubbleTextMe: { color: COLORS.NAVY },
  bubbleTime: { fontSize: 10, color: COLORS.MUTED, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(6,10,17,0.5)' },
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyChatText: { color: COLORS.MUTED, textAlign: 'center', fontSize: 14, lineHeight: 20 },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.BORDER,
    gap: 10,
  },
  input: {
    flex: 1, backgroundColor: COLORS.SURFACE,
    borderWidth: 1, borderColor: COLORS.BORDER,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.TEXT_WARM, maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.GOLD,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.BORDER },
  sendBtnText: { fontSize: 18, color: COLORS.NAVY, fontWeight: '700' },
});
