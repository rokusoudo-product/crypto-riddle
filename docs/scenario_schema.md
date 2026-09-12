---
project: crypto-riddle
doc: scenario_schema.md（シナリオ記述フォーマット）
issue: https://github.com/rokusoudo-product/crypto-riddle/issues/3
related:
  - specs/001-mvp/spec.md（§4〜§8: 3パート構成・カード種別・暗号解読・防衛策、§9: 分野タグ）
  - specs/001-mvp/plan.md（§1・§4: YAML→zod検証→JSON パイプライン、§5: データモデル概要）
  - src/core/model/scenario.ts（構造検証の実体。T005 の zod スキーマ）
  - src/core/model/legal.ts
  - src/core/model/validate-collection.ts（複数ファイルにまたがる参照整合性チェック）
  - scenarios/s0-sample.yaml（サンプルデータ）
  - legal/laws_sample.yaml（サンプル法制度データ）
  - scripts/build-data.ts（YAML→JSON ビルドパイプライン。T010）
status: reviewed
created: 2026-08-07
updated: 2026-09-13（#101/PR #105 で zod 実装完了。schema_version 0.7.0 化・全 YAML/fixture の
  schema_version 更新（内容無変更）を含む。#103 のスコープが S1 データ本体の移植のみに変更されたことを
  §2.6 に反映）
---

# crypto-riddle — シナリオ記述フォーマット

1マップ(=1インシデント事件)を、コード直書きではなく**データとして追加できる**ようにするための
YAML スキーマの説明。Issue #3 に対応する。

> **2026-09-10（#44/#45/#46）: 会話モードへの刷新が完了**。解決パート（`resolution`）は、カード配置＋
> `required_card_ids` 方式から、**会話の中で問いに2〜3択で答える「会話モード」**（`resolution.questions[]`）へ
> 刷新済み（`schema_version` は `0.2.0` → `0.3.0`）。zod スキーマ（T030）・判定エンジン（T031）・
> ステートマシン（T032）・会話フレームUI（T033/T034、#45）に加え、**S1/s0 のデータ本執筆と
> 結線・E2E更新（T035/T036、#46）も完了**。S1 の誤答肢は探索カードの内容を具体的に裏付けとして
> 引用する reply へ本執筆し、`explanations` を多段化した。会話モードの仕様の正本は spec §8、
> 画面は DESIGN.md「会話フレーム」節。
>
> **2026-09-12（#100）: S1 会話フロー刷新（台本 v2.2）のスキーマ 0.7.0 仕様を策定**。現行コードの
> `schema_version` は `0.6.0`（探索の動線統合、#52 T046）。**本 Issue は docs 先行（コード変更なし）**で、
> 0.7.0 の仕様確定のみを行う。zod 改訂は後続の **core Issue #101**、UI 実装は **UI Issue #102**、
> S1 データの本移植は **data Issue #103** で行う。仕様の詳細は §2.6。
>
> **2026-09-13（#101/PR #105）: zod 実装完了・`schema_version` を `0.7.0` に更新**。当初の計画（本欄の
> 直前の記述）では「全 YAML/fixture の `schema_version` 更新は #103」としていたが、
> `scenarioSchemaVersionSchema` を `z.literal('0.7.0')` に変更すると既存 `scenarios/*.yaml`（`0.6.0`）が
> `npm run build:data`/テストで即座に落ち、**PR単独で CI がグリーンにならない**ため、
> `scenarios/*.yaml` 全件・`fixtures/*.fixture.ts`（core/ui 双方）の `schema_version` の値のみ
> （内容・構造・台詞は無変更）を #101（PR #105）に前倒しした。**#103 のスコープは S1 データ本体
> （台本 v2.2 への移植）のみ**に変更されている。UI 実装は引き続き **UI Issue #102** の範囲。

## 0. 位置づけ（正本は何か）

- **plan.md §1/§4 の決定が正**: 「YAML →（ビルド時）zod 検証 → JSON」がシナリオデータの本番パイプライン。
  **zod スキーマ（`src/core/model/scenario.ts`、tasks.md T005）が唯一の正本**であり、YAML はオーサリング用の
  入力形式にすぎない。
- **2026-09-09 T005/T010 完了により一本化済み**: 当初（Issue #3 着手時点、TypeScript の足場が無かった頃）は
  `schemas/*.json`（JSON Schema, draft 2020-12）を暫定の構造検証手段として用意していたが、T005 で zod スキーマに
  移行した際に `schemas/*.json` と `scripts/validate_scenarios.py` は削除した（Issue #22/#24 対応 PR）。
  同じ制約定義を zod と JSON Schema に二重に手書きしない状態にするための判断であり、エディタ補完用途にも
  YAML 側の `$schema` 参照コメントは使われていなかったため、`zod-to-json-schema` 等での再生成も採用していない
  （理由は当該 PR 本文を参照）。
- YAML の構造そのもの（フィールド名・ネスト）は zod 移行後も維持しており、既存の `scenarios/*.yaml` は
  書き直し不要で新スキーマ（`src/core/model/scenario.ts`）を通過する。

## 1. ディレクトリ構成

```
src/core/model/
  scenario.ts              # 1マップの構造検証+単一シナリオ内参照整合性(zod, T005)
  legal.ts                 # 法制度データの構造検証(zod, T005)
  validate-collection.ts   # 複数ファイルにまたがる参照整合性チェック(純関数)
scenarios/
  s0-sample.yaml           # スキーマ演習用サンプル(本番シナリオではない。§5 参照)
legal/
  laws_sample.yaml         # 法制度データのサンプル
scripts/
  build-data.ts             # YAML→JSON ビルドパイプライン(Node/TypeScript, T010)
```

- `scenarios/*.yaml` のパスは README.md / plan.md の環境構成図で既に固定されているため、それに合わせた
  （Issue 本文が例示していた `data/scenarios/` ではなく `scenarios/` を採用）。
- 法制度データは `legal/*.yaml` として **シナリオとは別ディレクトリ** に分離した（§4）。

## 2. シナリオ YAML の全体構造

`src/core/model/scenario.ts`（zod, `scenarioSchema`）が構造上の正。ここでは spec.md との対応を中心に説明する。

| フィールド | spec 対応 | 説明 |
|---|---|---|
| `schema_version` | - | このスキーマのバージョン(semver)。現行コードは `"0.7.0"`（S1 会話フロー刷新、#100 で仕様確定・#101/PR #105 で zod 実装・全 YAML/fixture の値反映。詳細は §2.6） |
| `id` | - | マップID。**ファイル名(拡張子除く)と一致必須**(`validate-collection.ts` の `checkScenarioFilenames` がチェック) |
| `title` | §4 | マップタイトル(事件名) |
| `status` | - | `draft`/`reviewed`/`published`/`sample`。省略時 `draft` |
| `map_order` | §9 難易度カーブ | 進行順(任意) |
| `subject_tags` | §9 | 分野タグ。**7種で固定**（Issue #22 決定・2026-09-09）: `暗号`/`認証`/`Web`/`攻撃手法`/`インシデント対応`/`法制度`/`ネットワーク基盤`。値集合の正本は `src/core/model/tags.ts` の `SUBJECT_TAGS` |
| `difficulty` | §9 | 1(易)〜5(難) |
| `estimated_minutes` | US-1 | 想定プレイ時間(分)。目安10〜15分 |
| `references` | FR-7 | 出典表記(§3 参照)。配列・省略可 |
| `related_terms` | #4 | 用語カードマスタへの緩い参照(§6 参照) |
| `intro` | §4.1 導入 | 背景・被害会社・サポート役の導入台詞 |
| `investigation_points` | §7 探索 | 調査ポイント(3系統)。**カードの出所の正**（`scenes` 有無に関わらず維持） |
| `scenes` | §7.1 探索 | **背景シーン表示層（#52・T037 で追加・省略可）**: 背景アセット・複数シーン・ホットスポット。省略時は一覧表示（§2.5） |
| `cards` | §7 探索 | ヒントカード(正解・ダミーを含む) |
| `resolution` | §8 解決 | **会話モード**（#42）: `cipher_stages`（暗号・維持／S1 は0件）＋ `questions[]`（問い列）。旧 `attack_identification`／`countermeasure` は `questions` へ統合（§2.4） |

### 2.1 カード種別（7種で固定）

spec §7 / DESIGN.md に準拠し、次の7種のみを許容する（`src/core/model/scenario.ts` の `cardTypeSchema`）:

`証言` / `ログ` / `通信記録` / `外部情報` / `暗号文` / `鍵` / `対策`

- 攻撃特定用のカードと防衛策用のカードを別リストに分けず、**`cards` 1本にまとめて `type` で区別する**
  設計にした(spec §7 で「対策カード（解決用）」がカード種別の1つに含まれているため)。
- ダミーカードは `is_dummy: true` で表現する。カードごとの属性であり、種別を問わず付与できる。
- **会話モード（#42/T030）移行後**: `対策` タイプのカードを含め、`cards` は探索で集めた**判断材料
  （会話中いつでも無料閲覧できるカードドロワー）**という位置づけになり、解決パートの選択肢そのもの
  ではなくなった。解決パートの選択肢は `resolution.questions[].choices[].text`（自由記述）であり、
  カードを直接答えとして選ばせない（§2.4）。

### 2.2 調査の3系統

spec §7 の「①ログを見る ②人に聞く ③文献を引く」を `investigation_points[].category` の enum で表現する。

### 2.3 暗号解読（解決パート①）

- `resolution.cipher_stages` は配列だが、**MVP では要素数を最大1個に制限**（zod では `.max(1)`）。
  これは Issue #3 の代表回答「まずは1種ずつ。複数種・複数段の汎用表現は後回し」を反映したもの。
  **0個（暗号なし）も許容する**（T015, Issue #5 代表回答: 入門シナリオ S1 は初動対応中心で暗号を含めない）。
  0個の場合、`src/core/scenario/state.ts` の `ENTER_RESOLUTION` は暗号ステージを飛ばし、探索完了から
  直接 `questions[0]`（会話モードの1問目）へ進む。
- 複数段（例: 古典暗号で得た文字列を鍵に別処理→ハッシュ照合、等）が必要になったら、
  **配列に要素を増やすだけ**で対応できるよう設計してある(=拡張時にスキーマの形を壊さない)。
  `.length(1)` の制約を外すだけで良い想定。
- `method` は zod の**判別可能 union（discriminated union）**として実装している
  （`src/core/model/scenario.ts` の `cipherStageSchema`）。T005 時点では `caesar`（シーザー暗号）の
  1 variant のみを定義し、`base64`/`xor`/`hash_match` 等を追加する際は `method` を判別子とする
  variant を1個増やして union の配列に足すだけでよい設計にした（旧 JSON Schema の
  「`method` を enum にせず自由記述で拡張余地を残す」という方針を、zod では型安全な判別可能 union で
  代替している）。

### 2.4 会話モードの問い（`resolution.questions[]`）〔#42・T030 で実装済み〕

解決パートは、旧「カード配置＋`required_card_ids`」から、**会話の中で問いに答える会話モード**へ刷新した（spec §8）。

- `resolution.questions[]` は**問いを出題順に並べた配列**（最低1問。`.min(1)`）。当面は「攻撃の起点 → 初動対応」の
  **2問構成**（spec §8.5）を想定するが、スキーマ上の上限は設けていない。
- 各 `question` の実装済みフィールド構成:

```yaml
resolution:
  cipher_stages: []          # 暗号（維持）。S1 は 0 件
  questions:
    - id: q-entry-point
      subject_tag: 攻撃手法    # この問いの分野（src/core/model/tags.ts の SUBJECT_TAGS）
      speaker: 霧島            # 出題キャラ（必須。src/core/model/common.ts の characterSchema）
      prompt: この攻撃、どこから入られたと見る？   # 問い（キャラの台詞）
      choices:                 # 2〜3個。判断は2択、知識を要する候補は3択（#42）
        - text: 取引先を装ったメールの添付ファイル
          is_correct: true
        - text: 公開サーバーの脆弱性を突かれた
          is_correct: false
          reply: その場合だと、境界の通信記録に外→内の不審なアクセスが残るはずだ。だが痕跡はない。
        - text: USBメモリの持ち込み
          is_correct: false
          reply: その線なら入退室ログか資産管理に痕跡が出る。今回はどちらも異常なしだ。
      explanations:            # 外すたびに深まる段階解説（教育的失敗の統合。任意・多段）
        - 一次情報（ログ）と証言のどちらを裏取りに使えるかを考えてみよう。
      consult_hint: 手元の手掛かり（メールゲートウェイ/EDR/証言）を分野で整理して提示  # 相談時の詳細ヒント（必須）
```

- `speaker` は必須（省略時に `subject_tag` から自動導出する案は T030 で見送り、明示指定に確定した）。
- `is_correct: true` の選択肢は `reply` を省略できる（正解を選んだ際の一言として任意で使える）。
  `is_correct: false` の選択肢は `reply` が必須（誤答フォローの原文になるため）。zod の discriminated union
  （`questionChoiceSchema`、`src/core/model/scenario.ts`）でこの非対称性を型で強制している。
- **判定（spec §8.2 維持）**: **問い単位で単一解・厳密一致**。`choices[].is_correct: true` は**各問いにちょうど1つ**
  （`questionChoicesSchema` の `.refine` で強制。§7.1 参照）。部分点・複数正解ルートは持たない。
  判定関数は `src/core/judge/index.ts` の `judgeQuestionChoice`（T031）。
- **誤答肢**: `is_correct: false` の選択肢に、キャラが理由を添えて返す `reply`（「その場合だと〜」）を持たせる。誤答しても選択肢は残り再挑戦でき、`explanations` を段階的に見せて解説を深める
  （`src/core/scenario/state.ts` の `scenarioReducer`。誤答回数ごとに `explanations[min(誤答回数, len-1)]` を選ぶ。T032）。
- **カードとの関係**: 探索で集めた `cards` は会話中いつでも無料閲覧できる判断材料（カードドロワー）。`is_dummy: true` のカードは引き続き「もっともらしい引っかけ」を担う。会話モードでは**カードを直接答えとして選ばせない**（答えは選択肢テキスト）。
- **相談**: `consult_hint`（または集めたカードからの自動整理）を、マップ単位3回まで提示する（spec §8.4。上限値
  `MAX_CONSULTS=3` は `src/core/scenario/state.ts` の core 定数として持ち、zod スキーマには持たせない）。
- 旧 `attack_identification` / `countermeasure`（`required_card_ids` 方式）は廃止し、この `questions` に統合した（防衛策の問いは最後の `question`。`subject_tag` は法制度/インシデント対応など）。

### 2.5 探索の背景シーン（`scenes[]`）〔#52・T037/T043 実装済／T046 で `goto`/`door`/`prompt` 追加〕

> **実装状況**: `scenes[]`（背景・ホットスポット・collect/danger/noop）は **T037（PR #58）で zod 実装済・schema 0.4.0**。`collect` の `line`/`speaker` は **T043（PR #67）で実装済・schema 0.5.0**。S1 のデータ・台詞は T040/T044（PR #61/#69）で投入済。
> **⚠️ T046 の目標形（#52・T018'''' 再プレイ反映）**: シーン移動のドアと、系統をまたぐ統合ホットスポットのため、アクション種別に **`goto`（シーン移動）** を、`object_type` に **`door`** を、ホットスポットに**省略可能な `prompt`（挨拶台詞）** を追加する。**zod 改訂は T046**（schema 0.5.0 → 0.6.0）。下記 YAML の `goto`/`door`/`prompt` は T046 マージ前の現行コードには無い（既存データは無改訂で有効）。

- `investigation_points`（カードの出所・3系統）は**正のまま維持**。`scenes[]` は**表示層（省略可）**で、省略すると一覧表示にフォールバックする。
- 目標フィールド構成:

```yaml
investigation_points:
  - { id: ip-maillog, category: ログ, ... }   # 従来どおり（カードの出所の正）
  - { id: ip-witness, category: 証言, ... }
scenes:
  - id: scene-office
    title: 執務室
    background: bg-s1-office        # DESIGN.md アセット節の背景アセットID
    hotspots:
      - object_type: pc              # pc | person | book | device
        position: [0.30, 0.42]       # 背景に対する相対座標(0〜1)
        label: 経理担当のPC
        actions:
          # collect は省略可能な line（台詞）と speaker を持てる（#52 Phase 4.7・0.5.0）。
          - { kind: collect, investigation_point_id: ip-maillog, label: メール受信ログを取る,
              speaker: 霧島, line: "霧島「受信ログを追った。問題のメールは取引先を騙る別ドメインからだ。」" }
          - { kind: collect, investigation_point_id: ip-edr,     label: EDRのアラートを確認 }   # line/speaker 省略→既定文＋カード本文
          - { kind: danger,  label: 感染端末の電源を落とす, feedback: "橘「ここで電源を落とすと揮発性メモリの証拠が消えます。」" }
          - { kind: noop,    label: 今は触らない }
      - object_type: person
        position: [0.70, 0.38]
        label: 中野さん
        actions:
          - { kind: collect, investigation_point_id: ip-witness, label: 話を聞く }
      # ドア＝シーン移動（#52 T046・0.6.0）。goto は investigation_point を参照しない。
      - object_type: door             # pc | person | book | device | door
        position: [0.92, 0.5]
        label: サーバ室への扉
        actions:
          - { kind: goto, scene_id: scene-server, label: サーバ室へ移動する }
  - id: scene-server
    title: サーバ室
    background: bg-s1-server
    hotspots:
      # 系統をまたぐ統合ホットスポット＋挨拶 prompt（#52 T046）。人と機器を1つに束ねる。
      - object_type: person
        position: [0.51, 0.43]
        label: サーバ管理者
        prompt: "サーバ管理者「どうしましたか？」"   # 省略可。アクションシート見出しに出す
        actions:
          - { kind: collect, investigation_point_id: ip-itstaff, label: 話を聞く, speaker: 橘 }
          - { kind: collect, investigation_point_id: ip-sandbox, label: PCを確認する, speaker: 霧島 }
          - { kind: noop,    label: 何でもない }
      - object_type: door
        position: [0.08, 0.5]
        label: 執務室への扉
        actions:
          - { kind: goto, scene_id: scene-office, label: 執務室へ戻る }
```

- **アクション種別**: `collect`（`investigation_point_id` を参照してカード獲得。**省略可能な `line`＝台詞・`speaker`＝話者**を持てる＝Phase 4.7/0.5.0）／`danger`（電源を落とす等＝`feedback` の教育的台詞のみ。**ペナルティなし・操作継続可**＝詰み防止、spec §8.4）／`noop`／**`goto`（シーン移動。`scene_id` で移動先を指定＝T046/0.6.0）**。
- **`collect` の `line`/`speaker`（Phase 4.7・省略可）**: 調査結果を会話フレームで台詞提示するための任意フィールド。**省略時は既定の導入文＋カード本文にフォールバック**（既存データは無改訂で有効）。`speaker` 省略時の既定は調査3系統から導出（①ログ→霧島／②人に聞く→橘／③文献→橘。技術文献の CVE 等は `speaker` を明示して霧島に振れる）。会話演出（タイプライター等）は DESIGN.md「会話フレーム」節。
- **`goto`／`door`／`prompt`（T046・0.6.0）**: `goto` はシーン移動アクション（`scene_id` で移動先を指定・`investigation_point` は参照しない）。`object_type: door` はドア用の種別（不可視・□マーカーは共通・`aria-label` は「〜への扉」）。`prompt` はホットスポットの省略可能な挨拶台詞で、アクションシートの見出しに出す（省略時はラベルのみ）。**系統をまたぐ統合**（人＋機器を1ホットスポットに）は複数 `collect` を並べるだけで表現でき、スキーマ追加は不要。
- **1オブジェクトが複数ポイントを束ねられる**（hotspot→point は 1:N。例: 1台のPCにメールログとEDRの2点／サーバ管理者に証言＋PCログ）。
- **整合性チェック（`scenes` があるとき）**: ①各 `investigation_point` が**ちょうど1つの `collect` action** から参照されること。②各 **`goto.scene_id` が `scenes[]` に実在**し、かつ**自シーン以外**を指すこと（`superRefine`）。`scenes` 省略時はチェックしない。
- **背景アセット**は image_agent 自作（16:9・アニメ調で立ち絵と統一。DESIGN.md「探索シーン」「アセット」節）。`background` はアセットIDで参照し、YAML にパスを直書きしない。
- `scenes`/`hotspots`/`object_type`/座標系は **T037（0.4.0）で確定済**。`collect` の `line`/`speaker` は **T043（0.5.0）で確定**。`goto`/`door`/`prompt` は **T046（0.6.0）で確定**。

### 2.6 スキーマ 0.7.0（S1 会話フロー刷新・#100 で仕様確定／#101・PR #105 で zod 実装完了）

> **実装状況（2026-09-13 更新）**: 本節は **spec/plan/docs 先行 Issue #100**（docs のみ・コード変更なし）で
> スキーマ仕様を確定したもの。zod 改訂（`src/core/model/common.ts` / `src/core/model/scenario.ts`）は
> **core Issue #101（PR #105）で実装完了済み**。`scenarioSchemaVersionSchema` は `z.literal('0.7.0')`。
> **当初の計画（策定時点の本欄）からのスコープ変更**: 「全シナリオ YAML/fixture の `schema_version` 移行は
> data Issue #103」としていたが、`z.literal('0.7.0')` 化により既存 `scenarios/*.yaml`（`0.6.0`）のままでは
> `npm run build:data`/テストが即座に落ち PR単独で CI がグリーンにならないため、`scenarios/*.yaml` 全件・
> `fixtures/*.fixture.ts`（core/ui 双方）の `schema_version` の値のみ（内容・構造・台詞は無変更）を
> **#101（PR #105）で先に更新済み**。**#103 のスコープは S1 データ本体（台本 v2.2 への移植）のみ**に変更。
> 会話フレーム3枠・NPC名札・`explanations` 話者表示・表情フォールバックの UI 実装は引き続き
> **UI Issue #102** で行う。

台本 v2.2（2026-09-12 代表確定・S1 会話フロー刷新）に対応するため、以下7点をすべて「省略可の追加」または
「必須→省略可の緩和」として改訂する。**S2/S3/SL は内容無変更のまま有効**（各ファイルの `schema_version` の値は
**#101（PR #105）で書き換え済み**。フィールドの追加・書き直しは不要）。

1. **`characterSchema` を3値に拡張**（`src/core/model/common.ts`）: `z.enum(['霧島', '橘'])` →
   `z.enum(['霧島', '橘', '小鳥遊'])`。小鳥遊の登場自体は #97 で `docs/characters.md` に先行反映済みだが、
   zod 側の enum 拡張は本節で仕様確定し #101（PR #105）で実装済み。
2. **`expressionSchema` の新設**: `z.enum(['neutral', 'serious', 'confident', 'smile', 'thinking'])`
   （`DESIGN.md`「表情差分の定義表」#97 の5種と一致させる）。`dialogueLineSchema`（`src/core/model/common.ts`）に
   **`expression`（省略可）** を追加する。既存データは `expression` 省略のまま有効。表情差分の絵が未生成でも
   データには先に書ける（表示側のフォールバックは `DESIGN.md`「会話フレーム」節§表情フォールバック参照）。
3. **`introSchema.background` を省略可にする**（`src/core/model/scenario.ts`）: ナレーション全廃・完全会話劇化
   （台本v2.2）に伴い、導入の背景説明文（地の文）を省略できるようにする。**フィールド名は変えない**
   （`background` のまま。`scenes[].background`＝背景アセットIDとは別フィールドであり、そちらは対象外＝引き続き必須）。
4. **`collect` アクションに `dialogue`（省略可・1件以上の配列）を追加**: 探索の発見時に多ターンのやり取り
   （短い「問いかけ」＋間）を表現するため。**既存の `line`／`speaker` は後方互換で残す**が、
   **`dialogue` との併用は拒否する**（`scenarioSchema` の `superRefine` で相互排他を検証。単一の `collectHotspotActionSchema`
   内では `.strict()` の対象外の相関チェックのため、フィールド単体の型ではなく `superRefine` 側の責務とする）。
5. **NPC 直接発話（`npc` + `line`）の新設**: `npc`（自由記述の名前文字列。例: `中野`／`経理部長`／`サーバ管理者`）と
   `line` を持つ行型 `npcDialogueLineSchema` を新設し、**`collect.dialogue[]` 限定**で
   `dialogueLineSchema | npcDialogueLineSchema` の union として使う。**`intro.character_intros` /
   `resolution.clear_explanation` / `resolution.questions[].explanations` の型は緩めない**（引き続き
   `dialogueLineSchema`（`character` は3値 enum）のみ・NPC が出ない型のまま）。
6. **`explanations` を union 配列にする**（`questionSchema.explanations`）: `array(string | dialogueLineSchema)`。
   文字列要素＝従来どおり出題者（`questions[].speaker`）が話す動作、`dialogueLineSchema` オブジェクト要素＝話者を
   明示。**S2/S3/SL の既存の文字列配列は移行不要**（そのまま有効）で、S1 だけ話者付きで書ける。
7. **`schema_version` を `0.7.0` に更新**（`scenarioSchemaVersionSchema`。リテラル変更・全 YAML/fixture への
   反映(値のみ)とも #101/PR #105 で実施済み）。

**小鳥遊ガード（探索・解決の描画枠制約）**: 小鳥遊が登場できるのは**①導入（`intro.character_intros`）と
⑦結果（`resolution.clear_explanation`）のみ**。以下には**使用不可**とし、zod の union 構成そのもので
表現できない（＝`characterSchema` の3値には小鳥遊を含むため、型だけでは防げない）箇所は `superRefine` で拒否する:

- 探索の `collect.dialogue[]`（`character`／`npc` いずれの行としても不可。`character: 小鳥遊` を reject。`npc: '小鳥遊'` と名乗らせるすり抜けも reject）
- 探索の `collect.speaker`（後方互換の単発台詞フィールド。`dialogue[]` だけを塞ぐと旧形式経由で小鳥遊が探索に入れてしまうため、同様に reject）
- `resolution.questions[].speaker`（`characterSchema` を直接使うため、値として `小鳥遊` を reject）
- `resolution.questions[].explanations`（話者付きオブジェクト要素の `character` に `小鳥遊` を reject）

理由: 探索・解決の会話フレームは現行どおり**2枠（霧島＝左／橘＝右）のまま**であり、小鳥遊を描画する枠が無い
（`DESIGN.md`「会話フレーム」節）。導入のみ3枠（対策室レイアウト。霧島＝左／橘＝右／小鳥遊＝中央後方やや小さめ）
に拡張する。

**フィールド構成イメージ（zod 実装は #101/PR #105 で実施済み。以下は仕様確認用の非規範的サンプル）**:

```yaml
# 探索: collect の多ターン化（既存 line/speaker と dialogue は併用不可）
- kind: collect
  investigation_point_id: ip-witness-nakano
  label: 中野さんに話を聞く
  dialogue:
    - character: 霧島
      expression: serious
      line: "霧島「中野さん、あのメールを開いた時の状況を教えてください。」"
    - npc: 中野
      line: "中野「取引先からの見積依頼だと思って、普通に開いてしまって……」"
    - character: 橘
      line: "橘「添付ファイルの拡張子は確認しましたか？」"
    - npc: 中野
      line: "中野「いえ、そこまでは……」"

# 解決: explanations の話者付きオブジェクト（S1 のみ想定。S2/S3/SL は既存の文字列のままでよい）
resolution:
  questions:
    - id: q-entry-point
      speaker: 霧島
      # ...(prompt/choices/consult_hint は §2.4 のまま)
      explanations:
        - "一次情報（ログ）と証言のどちらを裏取りに使えるかを考えてみよう。"   # 文字列＝speaker(霧島)が話す
        - character: 橘
          line: "橘「保全の観点から見ても、まず一次情報を疑うのが筋よ。」"    # オブジェクト＝明示話者
```

- `intro.background` を省略した場合、`victim_company`／`character_intros` は引き続き必須（会話劇化しても
  被害企業情報とキャラ導入台詞は要る）。
- `dialogue`／`explanations`／`npc` 発話とも、**S2/S3/SL の既存 YAML は無改訂で有効**（`schema_version` の
  値は #101/PR #105 で更新済み）。

## 3. 出典表記（`references`）

FR-7「IPA 過去問由来素材に出典表記を明示する」に対応するフィールド。フィールド構成の正本は
`docs/citation-policy.md` §5（`#14`, 2026-09-10 制定）とし、本節はその要約に留める。

```yaml
references:
  - exam: SC                # SC | NW（省略可。テーマ参考のみの場合は省略する）
    year_jp: "令和6年度"      # 省略可
    season: "春期"           # 春期 | 秋期。省略可
    division: "午後"         # 省略可
    question: "問2"          # 省略可
    material_kind: 攻撃手口   # 攻撃手口 | 技術要素 | 事例類型 | 用語（必須）
    note: "自由記述"          # 省略可
```

- `material_kind` のみが必須。特定の年度・問題からの引用ではなく**テーマ知識のみを参考にした場合**は
  `exam`/`year_jp`/`season`/`division`/`question` を省略し、根拠のない値を捏造しない（citation-policy §1・T015 代表回答）。
- 参照元が無い完全オリジナルのシナリオには `references` 自体を省略する（citation-policy §3）。
- 改変フラグは持たない（citation-policy §1「過去問と同じような問題は出さない」方針のため発生しない）。
- **T015（2026-09-10）で `source`（単一・必須オブジェクト）から `references`（配列・省略可）へ破壊的変更し、
  `schema_version` を `0.1.0` から `0.2.0` に上げた**（旧形式データはすべて本 PR で移行済み。移行関数は持たない）。

## 4. 法制度データの分離（`legal/*.yaml`）

plan.md §4「法制度データ（条文・報告期限）は別ファイルに分離し参照（改正時に差し替え可能）」に対応。

- 条文番号・報告期限が**改正で変わりうる**ため、シナリオのセリフやカード本文に直接埋め込まない
  (docs/characters.md §9 も同趣旨)。
- シナリオ側は `resolution.legal_refs` に `legal/*.yaml` 内の `id`（`LAW-` prefix）を列挙するだけにする。
- `legal/*.yaml` の各エントリには `last_verified`（最終確認日）を必須にし、改正追従の目安にする。

## 5. サンプルデータについて

- `scenarios/s0-sample.yaml` は、本スキーマがカバーする範囲（3パート・7種カード・暗号1段・法制度参照）を
  一通り演習するための**スキーマ検証用サンプル**。
- **tasks.md T015 で作る本番の S1「標的型メール侵入」とは別物**。T015 の代表回答は
  「プロトの流用はしない・暗号は含めず初動対応中心」であり、本サンプルは暗号を含む点も含めて
  意図的に別内容・別ID（`s0-sample`、S1=`s1-...` と衝突しない命名）にしている。
- 題材はゲートPプロトタイプ（`prototype/gate-p`、パスワードリスト攻撃）のテーマを借用した創作で、
  代表監修前の制作素材としては使わないこと。

## 6. 用語カードマスタとの連携（Issue #4）

シナリオ側 (`related_terms` / `cards[].related_terms`) は用語IDの配列 (`^term-[a-z0-9_-]+$`) を持つ。
`scripts/build-data.ts`（T010）は用語カードマスタ（`terms/*.yaml`）を読み込んだ後、
`src/core/model/validate-collection.ts` の `checkQuizItems` で誤用検出クイズの `term_id` 実在チェックを
行っているが、シナリオ側の `related_terms` の実在チェックは現時点では行っていない（#4 のマスタ整備後の
フォローアップ候補として残す）。

## 7. バリデーション方針

T005/T010（2026-09-09）により、旧 JSON Schema + Python(pyyaml/jsonschema) 方式は廃止し、
**zod（`src/core/model/`） + Node/TypeScript ビルドスクリプト（`scripts/build-data.ts`）に一本化**した。

### 7.1 構造検証・単一シナリオ内の参照整合性（zod, `src/core/model/scenario.ts`）

- 全プロパティに対して **`.strict()`**（未定義フィールド・typo を検出するため。旧 `additionalProperties: false` 相当）。
- 型・enum・文字列パターン・配列の `min`/`length`/一意性制約に加え、以下の**単一シナリオ内で完結する
  参照整合性チェックも `scenarioSchema` の `superRefine` に含めている**（旧 Python スクリプトの
  `validate_scenario_semantics` を移植）:
  1. `cards[].id` / `investigation_points[].id` の重複禁止
  2. `cards[].investigation_point_id` が実在する `investigation_points[].id` を指しているか
  3. 各 `investigation_points` に紐づく `card` が最低1件あるか

  旧4「`attack_identification.required_card_ids` が実在し `is_dummy: true` を含まないか」・
  旧5「`countermeasure.required_card_ids` が実在し `type: 対策` かつ `is_dummy: false` か」は、
  会話モード（#42/T030）で選択肢が自由記述（`questionChoiceSchema`）になったことに伴い不要になり削除した。
  「各 `questions[]` に正解(`is_correct: true`)の選択肢がちょうど1つ」の検証は、`superRefine` ではなく
  `questionChoicesSchema` の `.refine` に実装している（§2.4）。カードの実在チェックが不要になったのは、
  解決パートの選択肢がもはやカードID参照ではないため。

### 7.2 複数ファイルにまたがる参照整合性（`src/core/model/validate-collection.ts`）

ファイル名との突き合わせや別ファイル（`legal/*.yaml`）への参照は、単一シナリオの zod スキーマだけでは
判定できないため、複数ファイルを読み込んだ後に呼び出す純関数として分離している（`scripts/build-data.ts`
から呼び出す）:

1. `checkScenarioFilenames`: ファイル名(拡張子除く)とシナリオ `id` の一致
2. `checkScenarioLegalRefs`: `resolution.legal_refs` が `legal/*.yaml` 内の `id` として解決できるか

旧 `warnScenariosMissingCountermeasureDummy`（警告のみ。`type: 対策` のダミーカードが1件も無い場合の
注意喚起）は、防衛策の選択肢がカード参照ではなく自由記述になった（会話モード、#42/T030）ことに伴い
不要になり削除した（`scripts/build-data.ts` からの呼び出しも削除済み）。

### 7.3 実行方法

```bash
npm run build:data
```

`scenarios/*.yaml` と `legal/*.yaml`・`terms/*.yaml` を自動的に走査し、構造検証→参照整合性検証の順に
実行したうえで `src/data/*.json` を生成する。エラーが1件でもあれば終了コード1で失敗する
（`scripts/build-data.test.ts` に、正常系・壊れたYAML・ファイル名不一致・legal_refs不整合の
Vitest テストがある）。

### 7.4 CI への組み込み

`.github/workflows/ci.yml` の「シナリオ検証」ステップで `npm run build:data` を実行する。
旧暫定 CI（`.github/workflows/validate-data.yml`）は本一本化にあわせて削除した。

## 8. 既知の未確定事項

- ~~`source` のフィールド構成は `#14`（IPA 過去問の出典表記規則）確定後に見直す可能性がある。~~ →
  **解決済み（T015, 2026-09-10）**: `references`（citation-policy §5 準拠）へ移行済み。
- 暗号を複数段にする場合の `cipher_stages` の `.max(1)` 制約解除、および各段の入出力の繋ぎ方
  （前段の平文を次段の鍵にする等）は、複数段化が実際に必要になった時点で設計する（#3 代表回答により後回し）。
- シナリオ側 `related_terms` の実在チェックは #4 のマスタ整備後の追加候補として残る（§6）。
- ~~**会話モード（#42）の細部**: `questions[]` の各フィールド名・`explanations` の段数上限・`consult_hint` を
  明示持ちにするか集めたカードから自動生成するか・`speaker` を必須にするか（`subject_tag` から導出するか）は、
  T030 の zod 改訂時に確定する。~~ →
  **解決済み（#44/T030, 2026-09-10）**: `speaker` は必須、`consult_hint` は明示必須フィールド、
  `explanations` の段数上限は設けず配列の末尾でクランプする実装とした（§2.4 参照）。
- ~~**残タスク**: 会話モードUI（T033、#45）と、S1・s0 の本格移行（T035、#46。#44 では暫定機械移植のみ）。~~ →
  **解決済み（#45/#46, 2026-09-10）**: 会話モードUI（T033/T034）・S1/s0 のデータ本執筆と結線・E2E更新
  （T035/T036）ともに完了し、Phase 4.5（会話モード刷新）が完了した。
