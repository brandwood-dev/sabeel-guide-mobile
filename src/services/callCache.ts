type CallOfferCacheItem = {
  callId: string;
  fromUserId: string;
  fromRole?: string;
  sdp: any;
  metadata?: any;
  createdAt?: number;
};

const cache = new Map<string, CallOfferCacheItem>();

export const putIncomingOffer = (item: CallOfferCacheItem) => {
  if (!item?.callId) return;
  cache.set(String(item.callId), { ...item, createdAt: Date.now() });
};

export const getIncomingOffer = (callId: string): CallOfferCacheItem | null => {
  const item = cache.get(String(callId));
  return item || null;
};

export const popIncomingOffer = (callId: string): CallOfferCacheItem | null => {
  const item = cache.get(String(callId)) || null;
  cache.delete(String(callId));
  return item;
};

export const pruneIncomingOffers = (maxAgeMs = 5 * 60 * 1000) => {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (!value?.createdAt || now - value.createdAt > maxAgeMs) {
      cache.delete(key);
    }
  }
};
