type RealtimeChannel = {
  topic: string;
};

type RealtimeClient = {
  getChannels: () => RealtimeChannel[];
  removeChannel: (channel: RealtimeChannel) => unknown;
};

const ownedChannels = new Set<RealtimeChannel>();

export function trackRealtimeChannel<T extends RealtimeChannel | null | undefined>(channel: T): T {
  if (channel) {
    ownedChannels.add(channel);
  }
  return channel;
}

export function releaseRealtimeChannel(client: RealtimeClient, channel: RealtimeChannel | null | undefined) {
  if (!channel) return;
  ownedChannels.delete(channel);
  void client.removeChannel(channel);
}

export function releaseRealtimeChannels(client: RealtimeClient, channels: Array<RealtimeChannel | null | undefined>) {
  channels.forEach((channel) => releaseRealtimeChannel(client, channel));
}

export function releaseRealtimeChannelsByTopicPrefix(client: RealtimeClient, topicPrefix: string) {
  const channels = client.getChannels();
  for (const channel of channels) {
    if (channel.topic.includes(topicPrefix)) {
      releaseRealtimeChannel(client, channel);
    }
  }
}

export function releaseAllOwnedRealtimeChannels(client: RealtimeClient) {
  for (const channel of Array.from(ownedChannels)) {
    releaseRealtimeChannel(client, channel);
  }
}

