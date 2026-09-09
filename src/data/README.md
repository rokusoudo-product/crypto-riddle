# src/data

ビルド時に `scenarios/*.yaml` / `terms/*.yaml` / `legal/*.yaml` から zod 検証を経て生成される JSON の出力先（plan.md §4）。

- 生成方法: `npm run build:data`（`scripts/build-data.ts`、T010）。`src/core/model/`（T005/T006 の zod スキーマ）で
  検証したうえで `scenarios.json` / `terms.json` / `quiz-misuse.json` / `legal.json` を書き出す。
- ここに置かれる `*.json` はビルド成果物のため **コミット対象外**（`.gitignore` 参照）。正本は YAML 側
  （`scenarios/`・`terms/`・`legal/`）。CI（`.github/workflows/ci.yml` の「シナリオ検証」ジョブ）が
  `npm run build:data` を実行し、壊れた YAML はここで検出されて CI が fail する。
