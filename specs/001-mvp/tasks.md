---
project: crypto-riddle
doc: tasks.md (タスク分解)
feature: 001-mvp
status: active
created: 2026-08-06
updated: 2026-09-09
spec: specs/001-mvp/spec.md
plan: specs/001-mvp/plan.md
issue: https://github.com/rokusoudo-product/crypto-riddle/issues/12
---

# crypto-riddle — MVP タスク分解（tasks.md）

> `plan.md` §11「実装順序」の7ステップを、依存関係と完了条件を持つタスクに分解した文書。
> フェーズ順序はゲーム開発拡張フロー（SPEC_WORKFLOW.md）の
> **バーティカルスライス（Phase 1〜4）→ プロダクション（Phase 5〜6）→ ベータ/調整・公開（Phase 7）** に対応する。
> 本書は**チェックリスト運用**とし、タスクを個別 Issue に切り出さない（#12 代表回答 2026-08-02。
> 例外: Phase 5 の量産マップは #6 の方針どおりフォーマット確定後に個別 Issue 化する）。

## 凡例

- **ID**: `T###`。完了したらチェックを入れ、本ファイルを同じ PR で更新する
- **[P]**: 同一フェーズ内で相互依存がなく並行着手できる
- **【代表】**: 代表が実施するアカウント操作・判断。自動実装（po-agent-daily-issue-check）の対象外
- **依存**: 先行して完了が必要なタスク・Issue
- 各タスクの「完了条件」を満たした時点で完了とする

---

## Phase 1: リポジトリ足場（plan §11-1）

`future` で止まっている #3〜#6 に依存せず着手できる唯一のフェーズ。
CI とテスト基盤が無いままコードを書き始めるのを防ぐため、最優先で完了させる。

- [x] **T001** プロジェクト初期化
  - Vite + React + TypeScript（**strict**）+ Tailwind CSS + shadcn/ui を初期化し、
    `src/core/`（scenario/ judge/ save/ model/）・`src/ui/`・`src/data/` の構成（plan §2）を作る
  - 完了条件: `npm run build` と `npm run dev` が成功しプレースホルダ画面が表示される。
    `tsconfig.json` が strict。ディレクトリ構成が plan §2 と一致する
- [x] **T002** アーキテクチャ制約の機械的担保（依存: T001）
  - ESLint + Prettier を設定し、**`src/core/` からの `src/ui/` および `react` 系モジュールの import を
    lint エラーにする**（`eslint-plugin-import` の `import/no-restricted-paths`（zones で core→ui を禁止）＋
    core 配下への `no-restricted-imports`（react / react-dom / zustand 等 UI 依存を禁止）で担保する。plan §2 の advisor 承認条件①）
  - 完了条件: `src/core/` に `react` または `../ui/` の import を書いた検証用ファイルで lint が fail することを確認し、
    確認後に検証用ファイルを削除している
- [x] **T003** CI パイプライン（依存: T002）
  - GitHub Actions（`.github/workflows/ci.yml`）: 型チェック → ESLint → Vitest →
    シナリオ検証（T010 完成後にジョブ追加）→ Playwright E2E（T017 完成後に追加）→ axe-core（T026 で追加）。
    PR と main push で実行する
  - 完了条件: PR で 型・lint・Vitest の各ジョブが実行され、fail 時にマージがブロックされる
    （ブランチ保護の必須チェック設定は【代表】操作。未設定の間は運用でカバーする）
- [ ] **T004** 【代表】Cloudflare Pages 接続（依存: T003）
  - Cloudflare アカウントでの Pages プロジェクト作成・GitHub 連携・Cloudflare Web Analytics 有効化は
    **代表が実施するアカウント操作**（#12 代表回答 2026-08-02）
  - 完了条件: main への push で本番 URL に自動デプロイされ、プレースホルダ画面が公開されている

**チェックポイント①**: 空アプリが CI を通過して 0 円構成で本番配信される（plan §8 の実証）

---

## Phase 2: core/ 基盤（plan §11-2）

すべて `src/core/` の純 TypeScript。Vitest の単体テストを各タスクの完了条件に含める（plan §1）。

- [x] **T005** zod スキーマ定義（依存: T001。#3 は PR #19 で完了済み・着手条件は成立済み）
  - Scenario / Card / TermCard / SaveData の zod スキーマ（plan §5）。zod が正、YAML は入力形式。
    暗号はまず1種（シーザー）から、拡張余地を持たせる（#3 代表回答。`cipher_stages` を判別可能 union
    にして実装、`src/core/model/scenario.ts`）
  - 既存 `schemas/scenario.schema.json` / `schemas/term_card.schema.json` / `schemas/quiz_misuse.schema.json` /
    `schemas/legal.schema.json`（PR #19/#20 由来の JSON Schema, 手書き）を出発点とし、
    `src/core/model/{scenario,term-card,quiz-misuse,legal,save-data,tags,common}.ts` の zod スキーマへ移し、
    **正本を zod 1つに一本化した**（plan §4「zod が正」に従い、JSON Schema 側は削除。理由は本タスク
    完了 PR の本文を参照）
  - 分野タグ（`subject_tags`）は Issue #22（案2・7種統一）に基づき `src/core/model/tags.ts` の
    `SUBJECT_TAGS` を単一の正本とし、シナリオ・用語カード・SaveData の全てがこれを参照する
  - 完了条件: スキーマの単体テスト（正常系・境界・不正データ reject）が通る。
    **同じ制約定義が zod と JSON Schema に二重に手書きで存在しない**（Issue #24 受け入れ基準）
- [x] **T006** model 型の導出（依存: T005）
  - `z.infer` で `src/core/model/`（`scenario.ts`/`term-card.ts`/`quiz-misuse.ts`/`legal.ts`/`save-data.ts`/
    `tags.ts`/`common.ts`、`index.ts` から re-export）の型を zod スキーマから導出し、手書きの重複型を持たない
  - 完了条件: core 全体がこの型のみを参照して型チェックが通る
- [ ] **T007** [P] シナリオ進行ステートマシン（依存: T006）
  - 導入→探索→解決（暗号→特定→防衛）の明示的ステートマシン（`src/core/scenario/`）
  - 完了条件: パート遷移・カード獲得・誤答フォロー分岐の単体テストが通る
- [ ] **T008** [P] 判定エンジン（依存: T006）
  - 単一解・厳密一致（spec §8.2）＋前段の正規化: NFKC・小文字化・カナ→かな・空白除去（plan §3）を `src/core/judge/` に実装
  - 完了条件: 正規化の各規則と判定のテーブル駆動テストが通る
- [ ] **T009** [P] SaveStorage（依存: T006）
  - `SaveStorage` インターフェース＋IndexedDB（idb）実装。スキーマ `version`＋マイグレーション関数、
    **エクスポート/インポートの core ロジック**（FR-9・自己完結 JSON）を含む（plan §6）
  - 完了条件: 保存/読込/マイグレーション/エクスポート往復の単体テスト（fake-indexeddb）が通る
- [x] **T010** YAML→JSON ビルドパイプライン（依存: T005）
  - `scenarios/*.yaml`（および `terms/*.yaml`・`legal/*.yaml`） → zod 検証 → `src/data/*.json` の
    TypeScript ビルドスクリプト（`scripts/build-data.ts`、`npm run build:data`。plan §4）。
    アプリ本体には YAML パーサを載せず、`js-yaml` は devDependency（スクリプト専用）とした。
    不正シナリオで CI が fail するよう T003 のワークフロー（`.github/workflows/ci.yml`）に
    「シナリオ検証」ステップを追加済み。法制度データは `legal/*.yaml` として別ファイル分離を維持
  - 旧 `scripts/validate_scenarios.py` / `scripts/validate_terms.py`（Issue #3/#4 由来の Python 検証、
    暫定 CI 用）と、それ専用の `scripts/requirements.txt` は削除した（他用途で使われていないことを
    確認済み）。同様に暫定 CI（Issue #23, `.github/workflows/validate-data.yml`）も削除済み
    （#24 提案3「一本化時に削除」を採用）
  - 完了条件: サンプル YAML が JSON 化され、壊した YAML で検証が fail する（`scripts/build-data.test.ts`
    の Vitest で担保）

**チェックポイント②**: UI なしで「シナリオを読み込み→判定→セーブ」が core 単体テストで一周する

---

## Phase 3: UI 骨格（plan §11-3）

- [ ] **T011** ルーティングと8画面の骨格（依存: T001）
  - DESIGN.md の8画面（タイトル/マップ選択/導入/探索/解決/失敗解説/結果/カード図鑑）×4状態のルーティングと
    プレースホルダ実装（`src/ui/`）
  - 完了条件: 全画面に遷移でき、各画面が DESIGN.md のレイアウト方針に沿っている
- [ ] **T012** [P] デザイントークンの反映（依存: T011、関連: **Issue #13**）
  - DESIGN.md のカラートークンを Tailwind theme に定義する。**hex は仮値**のため、#13（WCAG AA コントラスト実測）の
    確定値が出たらトークン側の差し替えのみで反映できる構造にする（直書き禁止）
  - 完了条件: 色の直書きが lint（tailwind 設定外の任意色禁止）または レビューで検出できる状態になっている
- [ ] **T013** [P] 状態管理の接続（依存: T007, T011）
  - Zustand（+ persist は SaveStorage 経由）で core のステートマシンと UI を接続する。ui→core の一方向依存を維持
  - 完了条件: 画面操作でステートマシンが遷移する結線テスト（Vitest + Testing Library）が通る
- [ ] **T014** カード配置インタラクション（依存: T011）
  - dnd-kit で**タップ配置を第一操作**・ドラッグは補助（WCAG 2.5.1/2.5.7、plan §1）のカード組合せ UI
  - 完了条件: タップのみ・キーボードのみの両方でカード配置が完遂できる

---

## Phase 4: S1 縦スライス（plan §11-4）= バーティカルスライス

1マップをアート・UI 込みの完成品質で通しプレイできるようにし、物量とスコープを再確認する工程。

- [ ] **T015** S1 シナリオデータ作成（依存: T010、**Issue #5 の ready 付与**、前提: **Issue #14**（出典表記規則）の確定）
  - S1「標的型メール侵入」完全版 YAML（プロトの流用はしない・暗号は含めず初動対応中心 = #5 代表回答）。
    IPA 過去問由来の素材には #14 の規則で出典を表記（FR-7）
  - 完了条件: S1 が zod 検証を通過し、導入→探索→解決の全データが揃っている
- [ ] **T016** S1 通しプレイの結線（依存: T013, T014, T015）
  - S1 で1マップ通しプレイ（FR-1〜FR-6）。サポート役（霧島/橘）の導入説明・探索誘導・誤答フォロー・クリア解説を含む
  - 完了条件: ブラウザで S1 を最初から最後までプレイでき、XP・分野習熟が保存される
- [ ] **T017** E2E テスト（依存: T016）
  - Playwright で S1 通しプレイの E2E を作成し、T003 のワークフローに追加
  - 完了条件: CI で E2E が安定して通る
- [ ] **T018** 【代表】プレイテストと調整（依存: T017）
  - 代表がプレイし、面白さ・難易度・カード枚数/ダミー比率・プレイ時間を評価。
    仕様変更が出たら **spec.md に書き戻してから**次工程へ（生きたドキュメント運用）
  - 完了条件: 代表が「量産に進む」と判断し、調整結果が spec/balance に反映されている

**チェックポイント③**: 縦スライス承認。これが量産の物差しになる

---

## Phase 5: マップ量産（plan §11-5）= プロダクション

- [ ] **T019** S2 制作（依存: T018、**Issue #6**: フォーマット確定後に個別 Issue を切り出して進める）
- [ ] **T020** S3 制作（依存: T019 と同条件）
- [ ] **T021** 法務関連の新規マップ制作（依存: T019 と同条件。MVP は計4本 = S1+S2+S3+法務、#6 代表回答）
- [ ] **T022** バランス調整（依存: T019〜T021）
  - パラメータの正本は `specs/001-mvp/balance.csv`（ゲーム開発拡張フロー）として整備する
  - 完了条件: 4マップの難易度カーブ（spec §9）が代表レビューで承認される

制作は AI 生成＋代表監修。優先順は S2 → S3 → 法務（#6 代表回答）。

---

## Phase 6: 用語カード・図鑑・セーブ UI（plan §11-6）

- [ ] **T023** 用語カードマスタ（依存: T005。#4 は PR #20 で完了済み・`ready` ラベル付与済み）
  - SC シラバス全体を先行整備・マスタはリポジトリ内（#4 代表回答）。誤用検出クイズは MVP 外
  - **既存成果物**: `terms/terms_core.yaml`（45語、`src/core/model/term-card.ts` の zod 検証を通過済み）・
    `terms/quiz_misuse_sample.yaml`（誤用検出クイズのデータ構造サンプル5問）が PR #20 で既に整備されている。
    45語は「シラバス全体の網羅」ではなく SC/NW共通シラバスの主要分野を代表する初期セット
    （`docs/term_cards.md` §6/§7.2 参照）
  - **残作業**: シラバス全体の網羅（別 Issue としてフォローアップ推奨、`docs/term_cards.md` §7.2）。
    シナリオ側 `related_terms` が用語カードマスタに実在するかの参照整合性チェックの追加
    （`src/core/model/validate-collection.ts` に未実装。誤用検出クイズの `term_id` 実在チェックは
    T010 で実装済み）
  - 完了条件: 用語カードマスタが zod 検証を通り、シナリオから参照できる
- [ ] **T024** [P] カード図鑑画面（依存: T016, T023）
  - 完了条件: 獲得済みカード・用語カードが図鑑で閲覧できる
- [ ] **T025** [P] セーブのエクスポート/インポート UI（依存: T009, T011）
  - FR-9。core ロジック（T009）にファイル入出力の UI を付ける
  - 完了条件: エクスポート→ブラウザデータ消去→インポートでプレイ状況が復元できる

---

## Phase 7: a11y 仕上げ・公開（plan §11-7）= ベータ/調整

- [ ] **T026** axe-core 自動チェック（依存: T016）
  - 全画面で axe-core violation 0 件。T003 のワークフローにジョブ追加
- [ ] **T027** キーボード完遂の手動チェックリスト（依存: T026）
  - 完了条件: マウスなしで S1〜法務マップの全行程を完遂できることをチェックリストで確認済み
- [ ] **T028** PWA 対応（依存: T004, T016）
  - manifest・オフライン動作（全アセット同梱。フェーズ2の Apple 審査対策①の前倒し、plan §7）
- [ ] **T029** 【代表】公開判断（依存: T022, T024, T025, T027, T028）
  - 完了条件: 代表が公開を承認し、本番 URL が README に記載されている

---

## Issue 対応表（#12 受け入れ基準）

| Issue | ラベル | 対応タスク | 備考 |
|---|---|---|---|
| [#3](https://github.com/rokusoudo-product/crypto-riddle/issues/3) シナリオ記述フォーマット（zod/YAML） | closed（完了・PR #19、2026-08-07） | **T005・T006・T010** | 成果物: `schemas/scenario.schema.json`（暫定, T005で削除済み）・`scenarios/s0-sample.yaml`・`legal/laws_sample.yaml`・`scripts/validate_scenarios.py`（T010で削除済み）・`docs/scenario_schema.md` |
| [#4](https://github.com/rokusoudo-product/crypto-riddle/issues/4) 用語カードマスタ＋習得機構 | closed（完了・PR #20、2026-08-07） | **T023**（T024 が後続） | 成果物: `schemas/term_card.schema.json`/`schemas/quiz_misuse.schema.json`（暫定, T005で削除済み）・`terms/terms_core.yaml`（45語）・`terms/quiz_misuse_sample.yaml`・`scripts/validate_terms.py`（T010で削除済み）・`docs/term_cards.md` |
| [#5](https://github.com/rokusoudo-product/crypto-riddle/issues/5) シナリオS1完全版 | future | **T015**（T016〜T018 が後続） | #3 確定が前提。#14 の出典規則も前提 |
| [#6](https://github.com/rokusoudo-product/crypto-riddle/issues/6) S2-S8 バックログ | future | **T019〜T021** | フォーマット確定後に個別 Issue 切り出し。MVP は計4本 |
| [#13](https://github.com/rokusoudo-product/crypto-riddle/issues/13) カラートークン AA 実測 | future | **T012** に合流 | 採用時は T012 の完了条件に AA 実測値の確定を含める |
| [#14](https://github.com/rokusoudo-product/crypto-riddle/issues/14) IPA 過去問の出典表記規則 | future | **T015 の前提** | 採用時は T015 より先に完了させる |
| [#22](https://github.com/rokusoudo-product/crypto-riddle/issues/22) 分野タグ（subject_tags）の値集合統一 | proposal（本 PR マージで closed 予定・`Closes #22`） | **T005**（zod 移行と同時実施） | 案2（7種に統一・`ネットワーク基盤`を正式採用）を採用。決定理由は `specs/001-mvp/spec.md` §9 に記載。値集合の正本は `src/core/model/tags.ts` |

## 依存関係の要約

- **Phase 1（T001〜T004）が全体をブロックする**。ただし #3〜#6 に依存しないため即着手できる
- Phase 2 の入口 **T005 は完了済み**（2026-09-09）。#3 は PR #19 のマージで完了しており、`ready` 待ちの
  状態は解消されている。T005 の完了により T006・T010 も着手可能になり、Phase 2 の実質的なクリティカル
  パスは T007〜T009（未着手）に移った
- Phase 3（T011, T012, T014）は T001 のみに依存し、**Phase 2 と並行で進められる**
- Phase 4 で Phase 2/3 が合流して縦スライス。**T018（代表プレイテスト）が量産の関門**
- 自動実装（po-agent-daily-issue-check）に乗せる場合も、【代表】タスク（T004・T018・T029）は必ず代表操作で行う

## 実装戦略

1. **まず Phase 1 を完了させる**（唯一のブロック解除条件。0円構成の実証まで）
2. Phase 2 は 2026-09-09 の代表承認（Issue #22/#24 対応 PR）により T005・T006・T010 が完了済み。
   残る T007〜T009 に着手する。並行して Phase 3 を進める
3. 縦スライス（Phase 4）を最短で通し、T018 のプレイテストで物差しを作ってから量産（Phase 5〜6）に入る
4. 仕様とのずれが出たら実装より先に spec/plan を更新する（ドキュメントが常に正）
