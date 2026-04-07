# Contributing to Calee

Contributions are welcome. This guide covers the development setup, coding standards, and pull request process.

## Prerequisites

- Python 3.12+
- Node.js 20+ (for frontend)
- A Home Assistant development environment (or devcontainer)

## Development setup

```bash
# Clone the repository
git clone https://github.com/icn-brendon/calee.git
cd calee

# Install Python dev dependencies
pip install -r requirements_dev.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

## Running tests

```bash
# Run the test suite
pytest tests/ -v

# Lint Python code
ruff check custom_components/ tests/

# Type check
mypy custom_components/calee/

# Build frontend
cd frontend && npm run build
```

## Project structure

```
custom_components/calee/    Python integration code
  api.py                    Business logic coordinator
  store.py                  JSON storage backend
  db/                       Database backends (MariaDB, PostgreSQL)
  websocket_api.py          WebSocket commands
  permissions.py            Role-based access control
  models.py                 Data models (dataclasses)
  config_flow.py            Setup and options UI
  importer.py               CSV/ICS import logic
  recurrence.py             Recurring event/task logic

frontend/src/               TypeScript panel (LitElement)
  panel/                    Main panel component
  views/                    Calendar/task/shopping views
  dialogs/                  Modal dialogs
  cards/                    Sidebar cards
  store/                    TypeScript types and store

tests/                      pytest test suite
docs/                       Documentation
```

## Coding standards

### Python
- Follow PEP 8. Use `ruff` for linting.
- Use type hints on all function signatures.
- Docstrings on public methods and classes.
- Mutations go through `api.py` -- never write directly to the store from other modules.

### TypeScript
- Use LitElement for all components.
- Register custom elements with `@customElement()`.
- Use `@property()` for public properties and `@state()` for internal state.
- Dispatch custom events for communication between components.

## Pull request process

1. Fork the repository and create a feature branch from `main`.
2. Make your changes with clear, focused commits.
3. Ensure all CI checks pass:
   - HACS validation
   - hassfest
   - Lint (ruff)
   - Tests (pytest)
4. Open a pull request against `main`.
5. Describe what changed and why in the PR description.
6. Wait for review. Address feedback promptly.

## Reporting issues

Use [GitHub Issues](https://github.com/icn-brendon/calee/issues) to report bugs or request features. Include:

- Calee version
- Home Assistant version
- Storage backend in use
- Steps to reproduce
- Expected vs. actual behaviour
- Relevant log entries (with sensitive data redacted)

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 license.
