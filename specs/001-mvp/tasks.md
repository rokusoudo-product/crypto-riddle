---
project: crypto-riddle
doc: tasks.md (タスク分解)
feature: 001-mvp
status: active
created: 2026-08-06
updated: 2026-09-10 (#57: T040/T041 完了)
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
- [x] **T007** [P] シナリオ進行ステートマシン（依存: T006）
  - 導入→探索→解決（暗号→特定→防衛）の明示的ステートマシン（`src/core/scenario/`）
  - 完了条件: パート遷移・カード獲得・誤答フォロー分岐の単体テストが通る
  - **完了（2026-09-10）**: 外部ライブラリを使わない reducer 形式のステートマシン
    （`src/core/scenario/state.ts` の `scenarioReducer`）として実装。状態はプレーンな
    JSON 互換オブジェクト（`ScenarioProgressState`）。誤答時は `follow_up` パートに遷移して
    `wrong_answer_follow_ups` の該当行を保持し、`RESUME_FROM_FOLLOW_UP` で誤答した
    ステージに戻る（「初動をやり直す」）設計にした。解決パートへの遷移条件は「全
    investigation_points を調査済み」とした（`canEnterResolution`）。判定は T008 の
    judge を利用する
- [x] **T008** [P] 判定エンジン（依存: T006）
  - 単一解・厳密一致（spec §8.2）＋前段の正規化: NFKC・小文字化・カナ→かな・空白除去（plan §3）を `src/core/judge/` に実装
  - 完了条件: 正規化の各規則と判定のテーブル駆動テストが通る
  - **完了（2026-09-10）**: `normalizeAnswer`（NFKC→小文字化→カタカナ→ひらがな→前後空白除去+
    連続空白1個への圧縮の順で適用）、`judgeTextAnswer`/`judgeCardSelection`（厳密一致）、
    `judgeCipherStage`（判別可能 union に対応）を実装。シーザー暗号の復号ヘルパ
    （`caesarDecode`/`parseCaesarShift`）も判定に必要な範囲で `src/core/judge/cipher.ts` に実装
- [x] **T009** [P] SaveStorage（依存: T006）
  - `SaveStorage` インターフェース＋IndexedDB（idb）実装。スキーマ `version`＋マイグレーション関数、
    **エクスポート/インポートの core ロジック**（FR-9・自己完結 JSON）を含む（plan §6）
  - 完了条件: 保存/読込/マイグレーション/エクスポート往復の単体テスト（fake-indexeddb）が通る
  - **完了（2026-09-10）**: `SaveStorage` インターフェース（`storage.ts`）＋`idb` による
    `IndexedDbSaveStorage`（`indexed-db-storage.ts`、固定キー1レコード）。マイグレーションは
    `MIGRATIONS`（version→変換関数）のチェーンを `migrateSaveData` が順に適用する枠組みを
    用意（現行 `SAVE_DATA_SCHEMA_VERSION=1` のみのため中身は空）。エクスポート/インポートは
    `export-import.ts` に実装（zod 検証込みの自己完結 JSON 往復）
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

- **達成（2026-09-10）**: `src/core/checkpoint2.integration.test.ts` で
  `scenarios/s0-sample.yaml` 由来のフィクスチャ（`src/core/scenario/fixtures/s0-sample.fixture.ts`。
  実データの zod 検証も同テストで確認）を使い、導入→探索（カード獲得）→解決（暗号解読→攻撃特定→
  防衛策の判定、誤答フォロー分岐と復帰を含む）→クリア→セーブ→読込復元までを UI なしで一周させた

---

## Phase 3: UI 骨格（plan §11-3）

- [x] **T011** ルーティングと8画面の骨格（依存: T001）
  - DESIGN.md の8画面（タイトル/マップ選択/導入/探索/解決/失敗解説/結果/カード図鑑）×4状態のルーティングと
    プレースホルダ実装（`src/ui/`）
  - 完了条件: 全画面に遷移でき、各画面が DESIGN.md のレイアウト方針に沿っている
- [ ] **T012** [P] デザイントークンの反映（依存: T011、関連: **Issue #13**）
  - DESIGN.md のカラートークンを Tailwind theme に定義する。**hex は仮値**のため、#13（WCAG AA コントラスト実測）の
    確定値が出たらトークン側の差し替えのみで反映できる構造にする（直書き禁止）
  - 完了条件: 色の直書きが lint（tailwind 設定外の任意色禁止）または レビューで検出できる状態になっている
- [x] **T013** [P] 状態管理の接続（依存: T007, T011）
  - Zustand（+ persist は SaveStorage 経由）で core のステートマシンと UI を接続する。ui→core の一方向依存を維持
  - 完了条件: 画面操作でステートマシンが遷移する結線テスト（Vitest + Testing Library）が通る
  - **完了（2026-09-10）**: `src/ui/store/game-store.ts`(zustand)が `src/core/scenario/state.ts` の
    `scenarioReducer` をラップして dispatch する形で接続。永続化は zustand/persist ではなく T009 の
    `SaveStorage`(IndexedDB)経由とし、探索でのカード獲得等の重要進行時とクリア時に保存、起動時
    (タイトル画面)に読込む(`src/ui/store/save-integration.ts`)。プレイ用データは
    `src/core/scenario/fixtures/s0-sample.fixture.ts` を既定値として使用(`src/data/*.json` は
    ビルド成果物で .gitignore 対象・CI も Test の後に build:data する順序のため、テスト時点で
    存在を前提にできない設計上の理由。詳細は game-store.ts のコメント)。結線テストは
    `src/ui/screens/play-flow.test.tsx` でタイトル→マップ選択→導入→探索→解決(暗号→攻撃特定→
    防衛)→結果までの正解ルートと、誤答時の follow_up 遷移・RESUME_FROM_FOLLOW_UP 復帰を確認
- [x] **T014** カード配置インタラクション（依存: T011）〔**⚠️ superseded by #42 / Phase 4.5**〕
  - **2026-09-10 廃止決定（#42・T018 プレイテスト）**: 解決パートは会話モード（選択肢方式）へ刷新され、カード配置ボード（dnd-kit）と `judgeCardSelection` は廃止する。本タスクの成果物は Phase 4.5（T031/T033）で置き換える。以下は履歴として残す。
  - dnd-kit で**タップ配置を第一操作**・ドラッグは補助（WCAG 2.5.1/2.5.7、plan §1）のカード組合せ UI
  - 完了条件: タップのみ・キーボードのみの両方でカード配置が完遂できる
  - **完了（2026-09-10）**: `src/ui/components/card-placement-board.tsx`(`src/ui/hooks/use-card-placement.ts`
    が状態管理)で実装。タップ(カード選択→スロットタップで配置)が第一操作、dnd-kit(PointerSensor)の
    ドラッグは補助。キーボード完遂は素の `<button>` の Tab/Enter/Space に一本化(dnd-kit の
    KeyboardSensor は同じ要素の Space/Enter を「つかむ」操作に奪ってしまいタップ選択と衝突するため
    不使用。詳細はコンポーネント冒頭のコメント)。正誤・種別は色だけでなくアイコン(lucide-react を
    Issue #30 確定までの暫定プレースホルダとして使用)+テキストで表現。タップのみ・キーボードのみの
    両完遂を `src/ui/components/card-placement-board.test.tsx` で確認(ドラッグ経路は jsdom
    での再現が難しいため対象外。PR の手動確認項目を参照)

---

## Phase 4: S1 縦スライス（plan §11-4）= バーティカルスライス

1マップをアート・UI 込みの完成品質で通しプレイできるようにし、物量とスコープを再確認する工程。

- [x] **T015** S1 シナリオデータ作成（依存: T010、**Issue #5 の ready 付与**、前提: **Issue #14**（出典表記規則）の確定）
  - S1「標的型メール侵入」完全版 YAML（プロトの流用はしない・暗号は含めず初動対応中心 = #5 代表回答）。
    IPA 過去問由来の素材には #14 の規則で出典を表記（FR-7）
  - 完了条件: S1 が zod 検証を通過し、導入→探索→解決の全データが揃っている
  - **完了（2026-09-10）**: `scenarios/s1-targeted-email-intrusion.yaml`（被害企業「株式会社浜通商事」、
    調査ポイント9・カード15を新規創作。ゲートPの「アルファテック社」は流用せず）。#14 確定に合わせ、
    `source`（単一・必須）を `references`（配列・省略可、`docs/citation-policy.md` §5 準拠）へ破壊的変更し
    `schema_version` を `0.2.0` に更新（`src/core/model/scenario.ts`。s0-sample も追随）。入門編のため
    暗号を含めない代表回答に対応し `resolution.cipher_stages` の制約を `.length(1)` から `.max(1)`
    （0件許容）へ緩和、`src/core/scenario/state.ts` の `ENTER_RESOLUTION` は0件時に cipher ステージを
    飛ばす。教育的失敗の分岐（「電源を直ちに落とす」対策カード→揮発性メモリの証拠消失を橘が解説→
    やり直しで正しい初動=論理的隔離へ誘導）を countermeasure の誤答フォローとして実装
- [x] **T016** S1 通しプレイの結線（依存: T013, T014, T015）
  - S1 で1マップ通しプレイ（FR-1〜FR-6）。サポート役（霧島/橘）の導入説明・探索誘導・誤答フォロー・クリア解説を含む
  - 完了条件: ブラウザで S1 を最初から最後までプレイでき、XP・分野習熟が保存される
  - **完了（2026-09-10）**: `src/ui/store/game-store.ts` の既定シナリオを s0-sample から S1 に差し替え、
    マップ選択画面（`map-select-screen.tsx`）は新設した `scenarios`（選択可能なシナリオ一覧）から一覧
    表示するよう変更（S2〜S3 追加時に配列が増える設計）。FR-6 の未結線（クリアしても xp:0・
    subject_mastery:{} のまま）を `src/ui/store/save-integration.ts` の `applyClearToSaveData` に
    XP（`CLEAR_XP_REWARD=100`固定）・分野習熟（クリアしたシナリオの `subject_tags` それぞれに
    `MASTERY_POINTS_PER_TAG=1`）の加算を実装して解消（加算値は spec/plan に定義が無い最小の妥当値。
    本調整は T022 の範囲）。結果画面に獲得XP・累計XP・出典表記（FR-7）を表示。結線テストは
    `src/ui/screens/s1-play-flow.test.tsx`（Vitest + Testing Library）で正解ルートと教育的失敗の
    分岐の両方を確認
- [x] **T017** E2E テスト（依存: T016）
  - Playwright で S1 通しプレイの E2E を作成し、T003 のワークフローに追加
  - 完了条件: CI で E2E が安定して通る
  - **完了（2026-09-10）**: `playwright.config.ts`（chromium のみ、`vite preview` を webServer に使用）・
    `e2e/s1-playthrough.spec.ts`（正解ルートと教育的失敗の分岐の2ケース、タップ=クリック操作のみ）を
    追加し、`.github/workflows/ci.yml` に独立ジョブ `e2e` を追加（`playwright install --with-deps
    chromium` → `npm run test:e2e`。ローカル(WSL非対話)では `--with-deps` の sudo プロンプトを避け
    `npx playwright install chromium` のみで実行）
- [ ] **T018** 【代表】プレイテストと調整（依存: T017）
  - 代表がプレイし、面白さ・難易度・カード枚数/ダミー比率・プレイ時間を評価。
    仕様変更が出たら **spec.md に書き戻してから**次工程へ（生きたドキュメント運用）
  - 完了条件: 代表が「量産に進む」と判断し、調整結果が spec/balance に反映されている

**チェックポイント③**: 縦スライス承認。これが量産の物差しになる

- **達成（2026-09-10・#42）**: T018 プレイテストの結果、解決パートを**会話モード**へ刷新する方針が代表決定。縦スライスとしては承認されたが、量産の物差し（解決パートのUI・データ形式）が変わるため、量産前に **Phase 4.5** を挟む。

---

## Phase 4.5: 解決パートの会話モード刷新（#42）= 縦スライスの作り直し

> T018 プレイテスト（2026-09-10）の代表フィードバックによる設計変更。詳細は spec §8（会話モード）・DESIGN.md「会話フレーム」・plan §5。
> 本フェーズの各タスクは **#42 の PR（本ドキュメント改訂）が代表マージされた後**、実装 Issue に分解して起票する（`ready` は代表付与 → Sonnet 実装。委譲時「**スキーマ差分は commit 前に報告して停止**」を条件化）。
> 確定仕様（#42・2026-09-10 代表決定）: 選択肢は問いごと2〜3択／問い単位で単一解・厳密一致／誤答は「その場合だと〜」で再挑戦し外すたび解説が深まる（教育的失敗を統合＝⑥失敗解説画面は廃止）／相談はマップ単位3回／手持ちカードは会話中いつでも無料閲覧／誤答1回・相談1回ごとに獲得XPを減算（下限あり）。

- [x] **T030** 解決スキーマの会話モード化（依存: T006）
  - `src/core/model/scenario.ts` の `resolution` を「`cipher_stages`（維持）＋ `questions[]`」へ改訂。各 `question` = 問い文・`subject_tag`・`choices[]`（2〜3個。各 `text`／`is_correct`／誤答時 `reply`）・段階解説（外すたび深まる）・相談用詳細ヒント。旧 `attack_identification`／`countermeasure`（`required_card_ids`）は questions へ統合して削除。**`schema_version` 0.2.0 → 0.3.0**
  - 完了条件: 新スキーマの zod 単体テスト（正常系・境界・不正 reject）。問いに正解の選択肢がちょうど1つ、の制約を含む
  - **完了（2026-09-10, #44）**: `questionChoiceSchema`（`is_correct` を判別子とする discriminated
    union、誤答は `reply` 必須・正解は任意）・`questionChoicesSchema`（2〜3個、正解ちょうど1つを refine
    で強制）・`questionSchema`（`speaker` 必須、`consult_hint` 必須、`explanations` は任意配列）を実装。
    旧 `attackIdentificationSchema`/`countermeasureSchema`/`followUpTriggerSchema`/`followUpSchema`/
    `FollowUp` 型と、その専用検証だった `superRefine` の旧4/5、`hasNoDummyCountermeasure`・
    `warnScenariosMissingCountermeasureDummy`（対策ダミー有無の警告。呼び出し元 `scripts/build-data.ts`
    含め削除）は撤去
- [x] **T031** 選択肢判定エンジン（依存: T030）
  - `src/core/judge/` に選択肢判定（問い単位で単一解・厳密一致）を追加し、`judgeCardSelection` を廃止（暗号判定・正規化は維持）
  - 完了条件: 判定のテーブル駆動テストが通り、旧 `judgeCardSelection` の参照が消えている
  - **完了（2026-09-10, #44）**: `judgeQuestionChoice(question, choiceIndex)` を実装（範囲外
    `choiceIndex` は例外）。`judgeCardSelection` は削除
- [x] **T032** ステートマシン改訂（依存: T030, T031）
  - `src/core/scenario/state.ts` を「（暗号→）問い列を順に出題→全問正答でクリア」に改訂。誤答は選択肢を残したまま `reply`＋深まる解説を返す。相談カウンタ（マップ3回）を状態に持つ
  - 完了条件: 出題順・誤答再挑戦・相談上限・クリアの単体テストが通る
  - **完了（2026-09-10, #44）**: `ScenarioPart` から `follow_up` を、状態から `pendingFollowUp`/
    `resumeStage` を撤去（誤答しても選択肢の残る会話モードでは独立画面へ遷移しないため）。代わりに
    `questionIndex`・`wrongAttemptsByQuestionId`（explanations の深さ制御）・`consultsUsed`
    （`MAX_CONSULTS=3`、core 定数）・`lastAnswerFeedback`（`{correct, reply, explanation}`、core内部の
    表示用一時状態。zod スキーマには持たせない）を追加。暗号誤答は cipher ステージに留まり
    `lastAnswerFeedback` のみ更新（reply/explanation は無し、自由記述回答のため）。
    XP減算そのものは #45（T034）の範囲
- [x] **T033** 会話フレーム＋会話モードUI（依存: T011, T032。dnd-kit 削除）
  - DESIGN.md「会話フレーム」（下部会話ウィンドウ・中央左右立ち絵・非発話側グレーアウト＋名札）を共通コンポーネント化。解決画面に選択肢ボタン（各48px・キーボード完遂）・相談ボタン（残数表示）・手持ちカードドロワー（無料閲覧）を載せる。`card-placement-board.tsx` と `@dnd-kit/*` 依存を削除
  - 完了条件: キーボードのみで回答・相談・カード閲覧・クリアまで完遂できる結線テストが通る
  - **完了（2026-09-10, #45）**: `src/ui/components/conversation-frame.tsx`（霧島＝左・橘＝右固定、非発話側は
    `grayscale`+`opacity-60`、両側に常時名札を表示し色以外でも発話者を判別可能にした, WCAG 1.4.1）・
    `src/ui/components/card-drawer.tsx`（`<details>`ではなく制御された`aria-expanded`ボタン、無料閲覧と
    相談=コスト消費の違いをラベルで明示）を新設し、`resolve-screen.tsx` に配線した。誤答時は会話文
    (`line`=問い文)を保持したまま`aria-live="polite"`でreply+段階解説を表示（`role="alert"`にはしない）。
    `card-placement-board.tsx`/`use-card-placement.ts`（テスト含む）と `@dnd-kit/core`・`@dnd-kit/utilities`
    依存を削除。⑥失敗解説画面(`fail-screen.tsx`)・`/resolve/fail`ルートも削除（誤答時は解決パート内に
    留まるため不要）。`src/ui/screens/s1-play-flow.test.tsx`にキーボード(Tab/Enter)のみで
    誤答→相談→カードドロワー閲覧→正答→次の問い→正答→クリアまで完遂する結線テストを追加し、
    完了条件を満たした。`src/ui/screens/play-flow.test.tsx`（s0-sample・暗号ステージ）も会話モードへ
    書き直した。Playwright e2e(`e2e/s1-playthrough.spec.ts`)は元々`test.describe.skip`のままで
    #46(T036)の範囲。
- [x] **T034** XP減算・試行記録（依存: T032, T009）
  - 誤答1回・相談1回ごとに獲得XPを減算（下限あり）。SaveData に解答試行・相談回数を記録し結果画面に反映。⑥失敗解説画面を廃止し会話内解説へ統合
  - 完了条件: 減算ロジックと下限、SaveData 反映の単体テストが通る
  - **完了（2026-09-10, #45）**: `src/ui/store/save-integration.ts` に `computeClearXpReward(progress)` を
    追加（`WRONG_ANSWER_XP_PENALTY=10`／`CONSULT_XP_PENALTY=15`／下限0。単価は spec/plan に定義が無い
    ため最小の妥当値。誤答は選択肢に残った reply のみだが相談は`consult_hint`を丸ごと得られるため
    相談の方を重くした。本調整は引き続き T022 の範囲）。`applyClearToSaveData` はこの値をXPに加算し、
    `SaveData.scenario_progress` に `wrong_answer_count`／`consult_count`／`no_hint_clear`
    （既存の未使用フィールドを稼働）を記録する（`core/model/save-data.ts` へ optional フィールドを
    追加。既存 strict object への追加のみのため `SAVE_DATA_SCHEMA_VERSION` は据え置き＝後方互換）。
    結果画面(`result-screen.tsx`)に誤答・相談回数と、それを反映した獲得XPを表示。最後の問いの
    正解replyは正解と同時に`/result`へ遷移するため解決画面では表示されず、`progress.lastAnswerFeedback`
    を結果画面側で参照して表示するようにした。単体テストは `save-integration.test.ts`
    （`computeClearXpReward`・`applyClearToSaveData`の新フィールド）、結線テストは
    `s1-play-flow.test.tsx` に追加。
- [x] **T035** S1・s0 を会話モードへ移植（依存: T030。関連: T015）
  - `scenarios/s1-targeted-email-intrusion.yaml` を questions 形式へ書き換え（起点→初動の2問。教育的失敗＝電源断おとりを誤答 `reply`＋深まる解説へ移植）。`scenarios/s0-sample.yaml` も追随。データは本2本のみを同時移行（移行関数は持たない）
  - 完了条件: 両 YAML が新スキーマの zod 検証を通過し、`npm run build:data` が成功する
  - **完了（2026-09-10, #46）**: #45 時点で `questions[]` 形式への機械移植は済んでいたが、事実確認の結果、
    誤答肢 `reply` が「その場合だと〜」の汎用テンプレ文（旧 `wrong_answer_follow_ups` の使い回し）に
    留まっており、「読み物として成立する品質」（本執筆）の水準には未達だったため、本 Issue で書き直した。
    S1 q-entry-point は、誤答肢ごとに探索で集めた具体的なカード（EDR誤検知の時系列＝`card-edr-noise`/
    `card-edr-macro`、プロキシログの通信方向＝`card-proxy-c2`）を裏付けに引用する reply へ書き換え、
    選択肢「社内一斉連絡メールの誤送信」（"侵入経路"の問いに対する漏えい系の的外れな選択肢だった）を
    「公開サーバーの脆弱性を突かれた侵入」（scenario_schema.md §2.4 の記述例に沿う、境界ログで反証できる
    仮説）に差し替えた。`explanations` を1→2段に拡張（時系列で証拠を辿る視点を追加）。q-initial-response
    （電源断の教育的失敗）にも `explanations`（1→2段）を追加し、誤答を繰り返した場合に保全順序・
    説明責任への言及まで深まるようにした。s0-sample は位置づけ通りスキーマ演習用サンプルのまま内容は
    維持しつつ、q-countermeasure に `explanations` を1件追加して構成をS1と揃えた。両 YAML・対応する
    fixture（`s1-targeted-email-intrusion.fixture.ts`/`s0-sample.fixture.ts`）を同期し、
    `npm run build:data` の成功と `scripts/build-data.test.ts` の一致回帰テストを確認済み。
- [x] **T036** 結線・E2E の更新（依存: T033, T034, T035。関連: T016, T017）
  - `src/ui/screens/s1-play-flow.test.tsx`・`e2e/s1-playthrough.spec.ts` を会話モードへ更新（正解ルート＋誤答で深まる解説＋相談）。旧カード配置テスト（`card-placement-board.test.tsx` 等）を削除
  - 完了条件: Vitest・Playwright E2E が CI で安定して通る
  - **完了（2026-09-10, #46）**: Vitest側（`s1-play-flow.test.tsx`・`play-flow.test.tsx`）と旧カード配置
    テスト（`card-placement-board.test.tsx`等）の削除は #45 で先行実施済み。本 Issue では T035 の文言変更
    （choices[1] の内容差し替え）に合わせて `s1-play-flow.test.tsx` の誤答選択の期待値を更新した。
    `e2e/s1-playthrough.spec.ts`（Playwright, 旧 `test.describe.skip`）を会話モードUI向けに全面書き直し
    （(a) 正解ルート＝起点→初動→クリア→結果・獲得XP+100表示、(b) 教育的失敗ルート＝初動で「電源を
    直ちに落とす」を選ぶ→橘の揮発性メモリ解説が表示され選択肢は残ったまま→正解「論理的隔離」を選び
    再挑戦→クリア→誤答1回ぶんXP減算（+90）を確認）の2ケースとし、`describe.skip` を解除。
    タップ=クリック操作のみで実装。ローカル（WSL非対話）で `npx playwright install chromium`
    （`--with-deps` は不使用）→ `npm run test:e2e` を実行し、2件とも成功を確認した。

**チェックポイント③'**: 会話モードで S1 を通しプレイでき、代表が量産可と再確認する

- **達成（2026-09-10・#42）**: 会話モードで S1 を通しプレイ可能に。代表の再プレイで「良くなった」と確認。ただし探索パートの改善（背景シーン化・#52）を量産前に挟むため、次は **Phase 4.6**。

---

## Phase 4.6: 探索の背景シーン化（#52）= 探索パートの刷新

> T018 プレイテスト（2026-09-10）代表フィードバック。探索④を「背景シーン＋クリック可能オブジェクト（PC=ログ／人物=証言／書籍=文献）」方式へ。詳細は spec §7.1・DESIGN.md「探索シーン」節・plan §5（`scenes`）。
> 本フェーズの各タスクは **#52 の PR（本ドキュメント改訂）が代表マージされた後**、実装 Issue に分解して起票する（`ready` は代表付与 → Sonnet 実装。委譲条件「**スキーマ差分は commit 前に報告して停止**」を維持）。
> 確定仕様（#52・2026-09-10 代表決定）: 背景＋ホットスポット／PCで危険操作も出す（電源後もPC操作可・XP減算なし＝spec §8.4）／場所ごと複数背景（S1=2シーン）／背景は image_agent 自作（16:9・アニメ調で立ち絵と統一・検索画像は流用しない）／モバイル縦はレターボックス＋横パン／背景に依存しない一覧フォールバック（キーボード完遂）。

- [x] **T037** 探索スキーマ拡張（依存: T006）
  - `src/core/model/scenario.ts` に**省略可能な `scenes[]`**（背景アセットID・複数シーン・`hotspots[]`〔種別 PC/人物/書籍/機器・相対座標・ラベル・`actions[]`〕・`actions[]` は `collect`〔`investigation_point_id` 参照〕/`danger`/`noop`）を追加。`investigation_points` は維持。**schema_version 0.3.0 → 0.4.0**。整合性チェック=各 investigation_point がちょうど1つの collect action から参照される（`scenes` 省略時はチェックしない＝一覧フォールバック）
  - 完了条件: zod 単体テスト（正常系・境界・不正 reject・省略時フォールバック）が通る
  - **完了（2026-09-10, #55）**: `docs/scenario_schema.md` §2.5 の目標形どおりに実装。`sceneSchema`/
    `sceneHotspotSchema`/`hotspotActionSchema`（`collect`/`danger`/`noop` の discriminated union）を追加し、
    `scenarioObjectSchema` に省略可能な `scenes` を追加。`superRefine` に scenes 整合性チェック
    （collect の `investigation_point_id` 実在確認＋各 investigation_point がちょうど1回参照されることの
    確認。`scenes` 省略時はスキップ）を追加。既存 `scenarios/*.yaml`・対応 fixture・関連テストの
    `schema_version` を 0.3.0→0.4.0 に一括更新（`scenes` データ自体はまだ追加していない。本番データ投入は
    #57/T040 の範囲）。
- [x] **T038** 探索UI（背景シーン＋ホットスポット）（依存: T011, T037, T033）
  - 背景シーン＋シーンタブ＋ホットスポット（実 `<button>` 48px+・ラベル・フォーカス可視）＋PC操作アクションシート（ログ取得／電源を落とす〔教育的FBのみ・減算なし・操作継続可〕／今は触らない）＋**一覧フォールバック**（キーボード完遂）。人物の証言は**会話フレーム**で表示（#50 の探索④部分を統合）。16:9 をモバイル縦でレターボックス＋横パン
  - 完了条件: 背景・一覧の両方で、キーボードのみで全ポイント調査→解決へ進める結線テストが通る
  - **完了（2026-09-10, #56）**: `src/ui/components/explore/scene-explorer.tsx`（新規）で
    `SceneExplorer` を実装し、`scenario.scenes` がある場合に `src/ui/screens/explore-screen.tsx`
    へ組み込んだ。シーンタブ（矢印キー対応のroving tabindex）・ホットスポット（実`<button>`・
    48px以上・アイコン+可視ラベル・フォーカス可視）・複数actionのアクションシート（固定順）・
    danger の教育的フィードバック（dispatchしない=ペナルティ無し・操作継続可）・単一collect
    actionの即実行・人物ホットスポットの証言を会話フレーム(`conversation-frame.tsx`)で表示
    （話者=橘固定、話者フィールドはcoreスキーマに無いためUI都合の割り当て。DESIGN.md「探索
    シーン」節に追記）を実装。「調査ポイント一覧」は scenes の有無に関わらず常に併設し、
    どちらも既存の `dispatch({type:'INVESTIGATE'})` に接続するのみで **core のシナリオ進行
    ステートマシン(`src/core/scenario/state.ts`)・zodスキーマ(`scenario.ts`)は無改修**。
    背景画像は T039 未着手のためトークン色のプレースホルダ(単色地+シーン名)で表示。実データ
    `scenarios/*.yaml` への `scenes` 投入は行わず(#57/T040 の範囲)、テスト専用フィクスチャ
    (`src/ui/screens/explore-scene.fixture.ts`)で `src/ui/screens/explore-screen.test.tsx`
    の結線テスト（背景・一覧の両経路でキーボードのみ全ポイント調査→解決へ進める、danger の
    教育的FB・詰み防止、人物証言の会話フレーム表示、4状態）を追加した。
- [ ] **T039** S1 探索背景の生成（依存: #52 PR マージ、IMAGE_WORKFLOW）
  - S1 の2背景（執務室／サーバ室＝`bg-s1-office`/`bg-s1-server`）を IMAGE_WORKFLOW の承認ゲート（アセット定義＋プロンプト提示→代表承認→image_agent 生成）で用意。16:9・アニメ調で立ち絵と統一。生成物パス・プロンプトを DESIGN.md アセット節に追記
  - 完了条件: 2背景が確定し DESIGN.md に記録、`assets/` に配置
- [x] **T040** S1・s0 に scenes データを追加（依存: T037）
  - `scenarios/s1-targeted-email-intrusion.yaml`（執務室／サーバ室の2シーン・PC/人物/書籍のホットスポット・既存 `investigation_points` への collect 参照・PCの danger アクション）と `scenarios/s0-sample.yaml`（サンプルとして最小のシーン）＋各 fixture を追加
  - 完了条件: 両 YAML が 0.4.0 検証を通過し `npm run build:data` 成功
  - **完了（2026-09-10, #57）**: `scenarios/s1-targeted-email-intrusion.yaml` に執務室(`scene-office`)／
    サーバ室(`scene-server`)の2シーンを追加。既存 `investigation_points`(9件)は変更せず、
    経理部端末のEDRアラート・中野/経理部長への聞き取り・文献2件を執務室(PC/人物2/書籍)へ、
    プロキシログ・メールサーバログ・サンドボックス解析・情シス担当への聞き取りをサーバ室
    (機器2/PC/人物)へ振り分け、各 investigation_point をちょうど1つの collect action から
    参照する(superRefine 整合性チェック)。経理部PCのホットスポットに `danger`(感染端末の
    電源を落とす。feedbackのみ・ペナルティ無し・操作継続可)を1つ追加し、既存カード
    (card-reference-guideline等)の「電源を落とすと揮発性メモリの証拠が消える」という学びと
    整合させた。`src/core/scenario/fixtures/s1-targeted-email-intrusion.fixture.ts` をYAMLと
    完全一致するよう更新(`scripts/build-data.test.ts` の一致テストで確認)。`scenarios/s0-sample.yaml`
    は意図的に scenes を追加せず(一覧フォールバックの検証ケースとして維持)。
- [x] **T041** 結線・E2E 更新（依存: T038, T040）
  - 探索の結線テスト（背景／一覧の両経路・PC操作・危険操作の教育的FB・詰み防止）と Playwright e2e を更新
  - 完了条件: Vitest・Playwright E2E が CI で安定して通る
  - **完了（2026-09-10, #57）**: `src/ui/screens/s1-play-flow.test.tsx` と `e2e/s1-playthrough.spec.ts`
    に、S1 の実データ scenes を背景シーンのホットスポットのみで探索するテストを追加
    (執務室→サーバ室の全9ホットスポット・PCのdanger操作は教育的FBのみでシートが閉じず
    電源断後も操作継続可、collect後は「調査済み」化・一覧側と状態共有・「解決へ進む」活性化まで
    確認)。既存の一覧側のみを使う通しプレイ(会話モード)テストは無改修のまま回帰通過。
    s0-sample(scenesなし)の一覧フォールバック回帰は既存の `play-flow.test.tsx` が確認済み。
    あわせて `src/ui/components/explore/scene-explorer.tsx` を小修正し、T039で生成済みの
    背景アセット(`assets/backgrounds/bg-s1-*.png`)を実際に`<img>`で表示するようにした
    (`BACKGROUND_SRC`に実データが無いIDはT038時点のプレースホルダ表示に引き続きフォールバック
    するため、テスト専用フィクスチャ(`bg-test-*`)は無改修で回帰通過)。

**チェックポイント③''**: 背景シーンで S1 探索→解決を通しプレイでき、代表が量産可と確認する

---

## Phase 5: マップ量産（plan §11-5）= プロダクション

> **⚠️ 量産ゲート（#42・#52）**: Phase 5 は **Phase 4.5（会話モード）と Phase 4.6（探索の背景シーン化）が main にマージされるまで着手しない**。旧フォーマットで書いたシナリオ（`required_card_ids`／背景なし）は全て書き直しになるため、量産は会話モード schema 0.3.0＋探索 scenes 0.4.0 の確定後に開始する。各量産マップには**背景2〜3枚（IMAGE_WORKFLOW）**を各制作 Issue に含める。

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
| [#5](https://github.com/rokusoudo-product/crypto-riddle/issues/5) シナリオS1完全版 | closed（完了・PR #40、2026-09-10） | **T015・T016・T017**（T018 で会話モード刷新を決定） | 成果物: `scenarios/s1-targeted-email-intrusion.yaml`・S1 縦スライス。解決パートは #42（Phase 4.5・T035）で会話モードへ移植 |
| [#6](https://github.com/rokusoudo-product/crypto-riddle/issues/6) S2-S8 バックログ | future | **T019〜T021** | フォーマット確定後に個別 Issue 切り出し。MVP は計4本 |
| [#13](https://github.com/rokusoudo-product/crypto-riddle/issues/13) カラートークン AA 実測 | future | **T012** に合流 | 採用時は T012 の完了条件に AA 実測値の確定を含める |
| [#14](https://github.com/rokusoudo-product/crypto-riddle/issues/14) IPA 過去問の出典表記規則 | future | **T015 の前提** | 採用時は T015 より先に完了させる |
| [#22](https://github.com/rokusoudo-product/crypto-riddle/issues/22) 分野タグ（subject_tags）の値集合統一 | proposal（本 PR マージで closed 予定・`Closes #22`） | **T005**（zod 移行と同時実施） | 案2（7種に統一・`ネットワーク基盤`を正式採用）を採用。決定理由は `specs/001-mvp/spec.md` §9 に記載。値集合の正本は `src/core/model/tags.ts` |
| [#42](https://github.com/rokusoudo-product/crypto-riddle/issues/42) 解決パートを会話モードに刷新 | closed（ドキュメント改訂 PR マージ済み） | **T014 を supersede**・**Phase 4.5（T030〜T036）** | T018 プレイテスト由来。spec §8＝会話モード。実装は #44（T030〜T032, core）・#45（T033/T034, UI）で完了済み。#46（T035/T036, データ本執筆・結線）も実装完了（本PR、代表マージ待ち）でPhase 4.5が完了する |
| [#44](https://github.com/rokusoudo-product/crypto-riddle/issues/44) 会話モード core 実装 | closed（完了） | **T030・T031・T032** | zod スキーマ・判定エンジン・ステートマシンを会話モードへ改訂。S1/s0 は暫定機械移植のみ（本格移行は #46）。UI(resolve/result/fail-screen等)は型エラー解消の最小限に留めた（#45） |
| [#45](https://github.com/rokusoudo-product/crypto-riddle/issues/45) 会話フレーム＋会話モードUI＋XP減算 | closed（完了・PR #48） | **T033・T034** | 会話フレーム/カードドロワー新設・dnd-kit 削除・⑥失敗解説廃止・XP減算 |
| [#46](https://github.com/rokusoudo-product/crypto-riddle/issues/46) 会話モード データ本執筆・結線・E2E | closed（完了・PR #49） | **T035・T036** | S1 誤答肢 reply 本執筆・explanations 多段化・e2e 会話モード化。**Phase 4.5 完了** |
| [#52](https://github.com/rokusoudo-product/crypto-riddle/issues/52) 探索を背景シーン＋クリック可能オブジェクトにする | future（本ドキュメント改訂 PR。マージ後に実装 Issue へ分解） | **Phase 4.6（T037〜T041）** | T018 プレイテスト由来。spec §7.1＝探索背景シーン化。背景は image_agent 自作（IMAGE_WORKFLOW）。#50 の探索④部分を統合 |
| [#41](https://github.com/rokusoudo-product/crypto-riddle/issues/41) タイトル CTA が実セーブ状態と未接続 | bug（`ready`・優先度 Phase 7） | 別途（Phase 7 の a11y/仕上げ候補） | T018 由来。回答済み（つづきから=中断再開／出し分け実装／Phase7）。会話モードとは独立 |
| [#50](https://github.com/rokusoudo-product/crypto-riddle/issues/50) 会話フレームを③導入・④探索にも適用 | フォロー（探索④分は #52 に統合。残=③導入） | 別途 | 会話モード刷新の残作業 |
| [#51](https://github.com/rokusoudo-product/crypto-riddle/issues/51) 暗号ステージ誤答のXP減算の要否 | フォロー（spec §8.4 で決定→反映） | T022 と連動 | 現行 S1 は暗号なしで実害なし |
| [#53](https://github.com/rokusoudo-product/crypto-riddle/issues/53) 選択肢を南京錠でロック | future（MVP外） | 別途 | ヒント未収集で選択肢ロック。#52 と関連 |

## 依存関係の要約

- **Phase 1（T001〜T004）が全体をブロックする**。ただし #3〜#6 に依存しないため即着手できる
- Phase 2 の入口 **T005 は完了済み**（2026-09-09）。#3 は PR #19 のマージで完了しており、`ready` 待ちの
  状態は解消されている。T005 の完了により T006・T010 も着手可能になり、**T007〜T009 も完了した
  （2026-09-10）ことで Phase 2 が完了し、チェックポイント②を達成した**
- Phase 3（T011, T012, T014）は T001 のみに依存し、**Phase 2 と並行で進められる**
- Phase 4 で Phase 2/3 が合流して縦スライス。T018（代表プレイテスト）で**会話モードへの刷新（#42）＋探索の背景シーン化（#52）が決定**したため、**Phase 4.5（会話モード・完了）→ Phase 4.6（探索背景シーン化）を挟んでから量産（Phase 5）に入る**。Phase 5 は Phase 4.5＋4.6 の main マージが関門
- 自動実装（po-agent-daily-issue-check）に乗せる場合も、【代表】タスク（T004・T018・T029）は必ず代表操作で行う

## 実装戦略

1. **まず Phase 1 を完了させる**（唯一のブロック解除条件。0円構成の実証まで）
2. Phase 2 は 2026-09-09 の代表承認（Issue #22/#24 対応 PR）により T005・T006・T010 が完了済み。
   T007〜T009 も 2026-09-10 に完了し、チェックポイント②を達成した。並行して Phase 3 を進める
3. 縦スライス（Phase 4）を最短で通し、T018 のプレイテストで物差しを作ってから量産（Phase 5〜6）に入る
4. 仕様とのずれが出たら実装より先に spec/plan を更新する（ドキュメントが常に正）
