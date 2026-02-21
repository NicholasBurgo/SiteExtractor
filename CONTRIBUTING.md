# Contributing to Universal Site Extractor

## Prerequisites

- Python 3.10+
- Node.js 18+
- Git

For Fedora-specific system dependencies (libxml2, lxml, etc.) see the **Fedora Linux Setup** section in the README.

## Dev Setup

Start both servers with the cross-platform launcher:

```bash
python scripts/dev.py
```

- Backend: http://localhost:5051
- Frontend: http://localhost:5173
- Swagger: http://localhost:5051/docs

## Code Standards

**Python** — format and lint before committing:

```bash
ruff format backend/
ruff check backend/
```

**TypeScript** — lint before committing:

```bash
cd frontend && npm run lint
```

## Running Tests

```bash
pytest backend/tests/
```

## Pull Request Process

1. Fork the repository and create a branch off `main`.
2. Keep each PR focused on one concern.
3. Ensure `ruff check` and `pytest` pass before opening the PR.
4. Describe what changed and why in the PR description.
