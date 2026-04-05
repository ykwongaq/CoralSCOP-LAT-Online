import os
import shutil
import tempfile
import threading
import time
import uuid
from typing import Optional

from .utils.logger import get_logger

_logger = get_logger(__name__)


class EmbeddingStore:
    """
    Manages temporary .pt embedding files on disk, grouped by session UUID.

    Each session gets its own subdirectory under ``base_dir/``.  A daemon
    background thread evicts sessions that have been idle for longer than
    ``ttl_seconds`` (default 3 hours).  Sessions are also touched on every
    ``save`` and ``get_path`` call, so active use resets the clock.
    """

    def __init__(
        self,
        base_dir: Optional[str] = None,
        ttl_seconds: int = 10800,  # 3 hours
        cleanup_interval: int = 300,
    ):
        self._base_dir = base_dir or os.path.join(
            tempfile.gettempdir(), "sam_embeddings"
        )
        self._ttl = ttl_seconds
        self._lock = threading.Lock()
        self._last_activity: dict[str, float] = {}

        os.makedirs(self._base_dir, exist_ok=True)

        t = threading.Thread(
            target=self._cleanup_loop,
            args=(cleanup_interval,),
            daemon=True,
            name="embedding-store-gc",
        )
        t.start()

        _logger.info(
            "EmbeddingStore ready (dir=%s, ttl=%ds, cleanup_interval=%ds)",
            self._base_dir,
            ttl_seconds,
            cleanup_interval,
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
        """Write *data* (raw .pt bytes) as ``<session_id>/<stem>.pt``."""
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

    def get_path(self, session_id: str, stem: str) -> Optional[str]:
        """
        Return the filesystem path for a stored embedding, or *None* if the
        file does not exist (unknown session or stem not yet uploaded).
        """
        path = os.path.join(self._session_dir(session_id), f"{stem}.pt")
        if os.path.isfile(path):
            self._touch(session_id)
            return path
        return None

    def delete_session(self, session_id: str) -> None:
        """Remove all files for a session immediately."""
        session_dir = self._session_dir(session_id)
        if os.path.exists(session_dir):
            shutil.rmtree(session_dir, ignore_errors=True)
            _logger.debug("Deleted session %s", session_id)
        with self._lock:
            self._last_activity.pop(session_id, None)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _session_dir(self, session_id: str) -> str:
        return os.path.join(self._base_dir, session_id)

    def _touch(self, session_id: str) -> None:
        with self._lock:
            self._last_activity[session_id] = time.monotonic()

    def _cleanup_loop(self, interval: int) -> None:
        while True:
            time.sleep(interval)
            now = time.monotonic()
            with self._lock:
                expired = [
                    sid
                    for sid, ts in self._last_activity.items()
                    if now - ts > self._ttl
                ]
            for sid in expired:
                _logger.info("Evicting idle session %s", sid)
                self.delete_session(sid)
