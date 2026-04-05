import io
import os
import shutil
import tempfile
import threading
import time
import uuid
from collections import OrderedDict
from typing import Any, Optional

import torch

from .utils.logger import get_logger

_logger = get_logger(__name__)


def _to_device(obj: Any, device: torch.device) -> Any:
    """Recursively move tensors in obj to *device*."""
    if isinstance(obj, torch.Tensor):
        return obj.to(device)
    if isinstance(obj, dict):
        return {k: _to_device(v, device) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        moved = [_to_device(v, device) for v in obj]
        return type(obj)(moved)
    return obj


class EmbeddingStore:
    """
    Manages SAM embedding states, grouped by session UUID.

    Disk layer  — every uploaded embedding is persisted as a .pt file under
                  ``base_dir/<session_id>/<stem>.pt`` so nothing is ever lost
                  on a cache eviction.

    LRU cache   — the ``hot_cache_size`` most-recently-used states are kept
                  deserialised on CPU RAM.  A predict_inst call that hits the
                  cache avoids 177 MB of disk IO; a miss loads from disk once
                  then re-enters the cache.

    TTL eviction — a daemon thread evicts sessions idle for longer than
                   ``ttl_seconds`` from both cache and disk.
    """

    def __init__(
        self,
        base_dir: Optional[str] = None,
        ttl_seconds: int = 10800,  # 3 hours
        cleanup_interval: int = 300,
        hot_cache_size: int = 20,
    ):
        self._base_dir = base_dir or os.path.join(
            tempfile.gettempdir(), "sam_embeddings"
        )
        self._ttl = ttl_seconds
        self._hot_cache_size = hot_cache_size

        # Disk TTL tracking
        self._activity_lock = threading.Lock()
        self._last_activity: dict[str, float] = {}

        # LRU cache: (session_id, stem) → state (tensors on CPU)
        self._cache_lock = threading.Lock()
        self._hot_cache: OrderedDict[tuple, Any] = OrderedDict()

        os.makedirs(self._base_dir, exist_ok=True)

        t = threading.Thread(
            target=self._cleanup_loop,
            args=(cleanup_interval,),
            daemon=True,
            name="embedding-store-gc",
        )
        t.start()

        _logger.info(
            "EmbeddingStore ready (dir=%s, ttl=%ds, hot_cache_size=%d)",
            self._base_dir,
            ttl_seconds,
            hot_cache_size,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def create_session(self) -> str:
        """Create a new session directory and return its UUID."""
        session_id = str(uuid.uuid4())
        os.makedirs(self._session_dir(session_id), exist_ok=True)
        self._touch(session_id)
        _logger.debug("Created session %s", session_id)
        return session_id

    def save(self, session_id: str, stem: str, data: bytes) -> None:
        """
        Write raw .pt bytes to disk, then deserialise and cache on CPU RAM.
        If RAM is insufficient, the embedding is saved to disk only — no error
        is raised, and the next predict call will simply load it from disk.
        """
        session_dir = self._session_dir(session_id)
        os.makedirs(session_dir, exist_ok=True)
        path = os.path.join(session_dir, f"{stem}.pt")

        with open(path, "wb") as fh:
            fh.write(data)
        self._touch(session_id)
        _logger.debug(
            "Saved embedding session=%s stem=%s (%d bytes)",
            session_id,
            stem,
            len(data),
        )

        # Deserialise from the already-in-memory bytes (no second disk read).
        try:
            state = torch.load(
                io.BytesIO(data), map_location="cpu", weights_only=False
            )
            self._cache_put((session_id, stem), state)
            _logger.debug("Cached embedding session=%s stem=%s", session_id, stem)
        except MemoryError:
            _logger.warning(
                "Not enough RAM to cache embedding session=%s stem=%s — disk-only fallback",
                session_id,
                stem,
            )

    def get(self, session_id: str, stem: str) -> Optional[Any]:
        """
        Return the deserialized state for (session_id, stem), or None if not found.

        Cache hit  → returns immediately from RAM (no disk IO).
        Cache miss → loads from disk, caches the result, then returns.

        Raises MemoryError if a disk-load is needed but RAM is exhausted.
        The caller should catch MemoryError and return HTTP 503.
        """
        key = (session_id, stem)

        # Fast path: cache hit
        with self._cache_lock:
            if key in self._hot_cache:
                self._hot_cache.move_to_end(key)
                self._touch(session_id)
                _logger.debug("Cache hit session=%s stem=%s", session_id, stem)
                return self._hot_cache[key]

        # Slow path: cache miss → load from disk
        path = os.path.join(self._session_dir(session_id), f"{stem}.pt")
        if not os.path.isfile(path):
            return None

        self._touch(session_id)
        _logger.debug("Cache miss — loading from disk session=%s stem=%s", session_id, stem)

        # MemoryError here means the server is critically low on RAM.
        # Let it propagate so the caller can return HTTP 503.
        state = torch.load(path, map_location="cpu", weights_only=False)

        # Re-caching after a disk load: dict insertion is just a pointer
        # assignment, so MemoryError here is extremely unlikely.  Catch it
        # defensively so a bad edge case never crashes the server.
        try:
            self._cache_put(key, state)
        except MemoryError:
            _logger.warning(
                "RAM too low to re-cache after disk load session=%s stem=%s",
                session_id,
                stem,
            )

        return state

    def delete_session(self, session_id: str) -> None:
        """Remove all files and cache entries for a session immediately."""
        # Disk
        session_dir = self._session_dir(session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir, ignore_errors=True)
            _logger.debug("Deleted session dir %s", session_id)

        # Activity tracking
        with self._activity_lock:
            self._last_activity.pop(session_id, None)

        # Cache
        with self._cache_lock:
            stale = [k for k in self._hot_cache if k[0] == session_id]
            for k in stale:
                del self._hot_cache[k]
            if stale:
                _logger.debug("Evicted %d cache entries for session %s", len(stale), session_id)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _session_dir(self, session_id: str) -> str:
        return os.path.join(self._base_dir, session_id)

    def _touch(self, session_id: str) -> None:
        with self._activity_lock:
            self._last_activity[session_id] = time.monotonic()

    def _cache_put(self, key: tuple, state: Any) -> None:
        """Insert *state* into the LRU cache and evict the oldest entry if full."""
        with self._cache_lock:
            # Refresh position if already present
            if key in self._hot_cache:
                self._hot_cache.move_to_end(key)
                self._hot_cache[key] = state
                return
            self._hot_cache[key] = state
            self._hot_cache.move_to_end(key)
            # Evict LRU entries until within limit
            while len(self._hot_cache) > self._hot_cache_size:
                evicted_key, _ = self._hot_cache.popitem(last=False)
                _logger.debug("LRU evicted cache entry %s", evicted_key)

    def _cleanup_loop(self, interval: int) -> None:
        while True:
            time.sleep(interval)
            now = time.monotonic()
            with self._activity_lock:
                expired = [
                    sid
                    for sid, ts in self._last_activity.items()
                    if now - ts > self._ttl
                ]
            for sid in expired:
                _logger.info("Evicting idle session %s", sid)
                self.delete_session(sid)
