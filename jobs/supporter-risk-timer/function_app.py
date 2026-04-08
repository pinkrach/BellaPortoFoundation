from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from pathlib import Path

import azure.functions as func

app = func.FunctionApp()


@app.schedule(
    schedule="0 0 2 * * *",
    arg_name="timer",
    run_on_startup=False,
    use_monitor=True,
)
def nightly_supporter_risk_scoring(timer: func.TimerRequest) -> None:
    logger = logging.getLogger("supporter-risk-timer")
    repo_root = Path(__file__).resolve().parents[2]
    script_path = repo_root / "ml-pipelines" / "supporter_risk_scoring.py"

    if not script_path.exists():
        raise FileNotFoundError(f"Scoring script not found: {script_path}")

    model_dir = os.getenv(
        "RISK_MODEL_ARTIFACT_DIR",
        str(repo_root / "ml-pipelines" / "model_artifacts"),
    )
    command = [
        sys.executable,
        str(script_path),
        "--model-dir",
        model_dir,
    ]

    logger.info("Starting nightly supporter risk scoring.")
    logger.info("Schedule status: %s", json.dumps(timer.schedule_status, default=str))
    result = subprocess.run(
        command,
        cwd=str(repo_root),
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        logger.error("Scoring failed. stdout=%s stderr=%s", result.stdout, result.stderr)
        raise RuntimeError("Supporter risk scoring failed.")

    logger.info("Scoring completed successfully. stdout=%s", result.stdout.strip())
