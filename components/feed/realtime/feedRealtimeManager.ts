import { releaseRealtimeChannel, releaseRealtimeChannelsByTopicPrefix } from '@/lib/realtime-channels';

type RealtimeChannel = {
  topic: string;
};

type RealtimeClient = {
  getChannels: () => RealtimeChannel[];
  removeChannel: (channel: RealtimeChannel) => unknown;
};

export function removeFeedChannelsByTopicPrefix(
  client: RealtimeClient,
  topicPrefix: string
) {
  releaseRealtimeChannelsByTopicPrefix(client, topicPrefix);
}

export function cleanupFeedChannel(
  client: RealtimeClient,
  channel: RealtimeChannel | null
) {
  releaseRealtimeChannel(client, channel);
}
