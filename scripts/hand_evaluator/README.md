# Poker Hand Evaluator

Ported from [https://github.com/thlorenz/phe](https://github.com/thlorenz/phe)

The Javascript version can be run to test evaluations.

1. From project root, run:

```bash
node ./scripts/hand_evaluator/generate_upload.js
```

This will output a JSON with all the hash tables in batch format that can be uploaded to a deployed contract.
The JSON will be saved in `[PROJECT_ROOT]/data/texasholdemv1-upload.json`

The upload sequence and data is identical for all networks.
