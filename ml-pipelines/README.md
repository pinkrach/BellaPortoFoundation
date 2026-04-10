# ML Pipelines Notebook Runner

The notebooks in this folder are intended to open already executed so a TA can review the code, charts, metrics, and markdown without having to rerun cells manually.

## Current state

- The rubric-audited notebooks in this folder are saved with outputs.
- The site uses the related Python pipeline scripts for live features.

## Re-run and save outputs

From the repository root:

```bash
python3 ml-pipelines/run_and_save_notebooks.py
```

To run only a subset:

```bash
python3 ml-pipelines/run_and_save_notebooks.py --notebook donor-upgrade-potential.ipynb --notebook reintegration-readiness.ipynb
```

This executes the notebooks in place and saves the rendered outputs back into the `.ipynb` files so they are easy to grade.
