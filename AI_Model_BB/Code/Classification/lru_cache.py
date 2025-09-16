"""
LRU Cache implementation for the crash classification system.
Used to store preprocessed videos to avoid reprocessing the same video.
"""

class LRUCache:
    """Simple LRU caching implementation."""
    
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.cache = {}
        self.usage_order = []
    
    def get(self, key):
        """Get item from cache and update usage order."""
        if key in self.cache:
            # Update usage order (move to end = most recently used)
            self.usage_order.remove(key)
            self.usage_order.append(key)
            return self.cache[key]
        return None
    
    def put(self, key, value):
        """Add item to cache, evicting least recently used if at capacity."""
        if key in self.cache:
            # Update existing item
            self.cache[key] = value
            # Update usage order
            self.usage_order.remove(key)
            self.usage_order.append(key)
        else:
            # Check if we need to evict the least recently used item
            if len(self.cache) >= self.capacity and self.usage_order:
                # Remove least recently used
                lru_key = self.usage_order.pop(0)
                del self.cache[lru_key]
            
            # Add new item
            self.cache[key] = value
            self.usage_order.append(key)