"""WebSocket API for the Calee frontend panel — backward-compatibility shim.

The actual implementation has been moved to the ``ws`` sub-package.
This module re-exports ``async_register_websocket_commands`` so that
existing imports (e.g. from ``__init__.py``) continue to work without
modification.
"""

from .ws import async_register_websocket_commands

__all__ = ["async_register_websocket_commands"]
