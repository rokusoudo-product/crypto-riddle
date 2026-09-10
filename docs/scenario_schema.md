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
updated: 2026-09-10（#44・T030 実装反映）
---

# crypto-riddle — シナリオ記述フォーマット

1マップ(=1インシデント事件)を、コード直書きではなく**データとして追加できる**ようにするための
YAML スキーマの説明。Issue #3 に対応する。

> **2026-09-10（#44）: 会話モードの core 実装が完了**。解決パート（`resolution`）は、カード配置＋
> `required_card_ids` 方式から、**会話の中で問いに2〜3択で答える「会話モード」**（`resolution.questions[]`）へ
> 刷新済み（`schema_version` は `0.2.0` → `0.3.0`）。zod スキーマ（T030）・判定エンジン（T031）・
> ステートマシン（T032）は `src/core/` に実装済み。**残っているのは会話モードUI（T033、#45）とデータの
> 本格移行（T035、#46。S1/s0 は #44 で暫定機械移植のみ済み）**。会話モードの仕様の正本は spec §8、
> 画面は DESIGN.md「会話フレーム」節。

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
| `schema_version` | - | このスキーマのバージョン(semver)。現行コードは `"0.3.0"`（会話モード、#42・T030） |
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
| `investigation_points` | §7 探索 | 調査ポイント(3系統) |
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
- **残タスク**: 会話モードUI（T033、#45）と、S1・s0 の本格移行（T035、#46。#44 では暫定機械移植のみ）。
