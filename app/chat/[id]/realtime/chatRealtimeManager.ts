import { releaseRealtimeChannels, releaseRealtimeChannelsByTopicPrefix } from '@/lib/realtime-channels';

type RealtimeChannel = {
  topic: string;
};

type RealtimeClient = {
  getChannels: () => RealtimeChannel[];
  removeChannel: (channel: RealtimeChannel) => unknown;
};

export function removeChatChannelsByTopicPrefix(
  client: RealtimeClient,
  topicPrefix: string
) {
  releaseRealtimeChannelsByTopicPrefix(client, topicPrefix);
}

export function cleanupChatChannels(
  client: RealtimeClient,
  channels: RealtimeChannel[]
) {
  releaseRealtimeChannels(client, channels);
}
