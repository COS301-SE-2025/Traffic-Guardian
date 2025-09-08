"""
Caching utilities for the TrafficGuardian AI classification system.
"""


class LRUCache:
    """Simple LRU Cache implementation for video processing optimization."""
    
    def __init__(self, capacity: int):
        self.cache = {}
        self.capacity = capacity
        self.order = []
        
    def get(self, key):
        if key not in self.cache:
            return None
        # Move to end for LRU tracking
        self.order.remove(key)
        self.order.append(key)
        return self.cache[key]
        
    def put(self, key, value):
        if key in self.cache:
            self.order.remove(key)
        elif len(self.cache) >= self.capacity:
            # Remove least recently used item
            lru_key = self.order.pop(0)
            del self.cache[lru_key]
        self.cache[key] = value
        self.order.append(key)
