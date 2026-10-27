"""Run with Python 3.10+; no third-party packages required."""
import sys


if __name__ == '__main__':
    try:
        from xmlv3.cli import main
        raise SystemExit(main())
    except (ValueError, OSError) as error:
        print(f'XMLv3: {error}', file=sys.stderr)
        raise SystemExit(2)
