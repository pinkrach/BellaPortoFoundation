#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
from pathlib import Path

import nbformat
from nbclient import NotebookClient


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Execute the Bella Porto IS455 notebooks in place so outputs are saved for review."
    )
    parser.add_argument(
        "--notebook",
        action="append",
        dest="notebooks",
        help="Optional notebook filename to run. Repeat the flag to run a subset.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=900,
        help="Per-cell timeout in seconds. Defaults to 900.",
    )
    return parser.parse_args()


def resolve_notebooks(root: Path, requested: list[str] | None) -> list[Path]:
    if not requested:
        return sorted(root.glob("*.ipynb"))

    notebooks: list[Path] = []
    for name in requested:
        path = root / name
        if not path.exists():
            raise FileNotFoundError(f"Notebook not found: {path}")
        notebooks.append(path)
    return notebooks


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parent
    shared_root = root.parents[2] / "ml-pipelines"
    python_path_parts = [str(root)]
    if shared_root.exists():
        python_path_parts.append(str(shared_root))
    existing_python_path = os.environ.get("PYTHONPATH", "").strip()
    if existing_python_path:
        python_path_parts.append(existing_python_path)
    os.environ["PYTHONPATH"] = os.pathsep.join(python_path_parts)

    notebooks = resolve_notebooks(root, args.notebooks)
    if not notebooks:
        print("No notebooks found to execute.")
        return

    for path in notebooks:
        print(f"Running {path.name}...", flush=True)
        nb = nbformat.read(path, as_version=4)
        client = NotebookClient(
            nb,
            timeout=args.timeout,
            kernel_name="python3",
            resources={"metadata": {"path": str(root)}},
        )
        client.execute()
        nbformat.write(nb, path)
        print(f"Saved executed outputs to {path.name}", flush=True)

    print(f"Completed {len(notebooks)} notebook(s).", flush=True)


if __name__ == "__main__":
    main()
