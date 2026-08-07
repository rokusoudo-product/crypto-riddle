---
project: crypto-riddle
doc: scenario_schema.md（シナリオ記述フォーマット）
issue: https://github.com/rokusoudo-product/crypto-riddle/issues/3
related:
  - specs/001-mvp/spec.md（§4〜§8: 3パート構成・カード種別・暗号解読・防衛策）
  - specs/001-mvp/plan.md（§1・§4: YAML→zod検証→JSON パイプライン、§5: データモデル概要）
  - schemas/scenario.schema.json（構造検証の実体）
  - schemas/legal.schema.json
  - scenarios/s0-sample.yaml（サンプルデータ）
  - legal/laws_sample.yaml（サンプル法制度データ）
  - scripts/validate_scenarios.py（検証スクリプト）
status: draft
created: 2026-08-07
---

# crypto-riddle — シナリオ記述フォーマット

1マップ(=1インシデント事件)を、コード直書きではなく**データとして追加できる**ようにするための
YAML スキーマの説明。Issue #3 に対応する。

## 0. 位置づけ（正本は何か）

- **plan.md §1/§4 の決定が正**: 「YAML →（ビルド時）zod 検証 → JSON」がシナリオデータの本番パイプライン。
  **zod スキーマ（`src/core/model/` 、tasks.md T005）が最終的な正本**であり、YAML はオーサリング用の入力形式にすぎない。
- しかし本 Issue に着手した時点で、リポジトリにはまだ TypeScript プロジェクトの足場（tasks.md T001〜T004）が
  存在しない（`package.json` すら未作成）。T005 は T001 に依存するため、今の時点で zod スキーマそのものを
  書くことはできない。
- そのため本 PR では、**`schemas/*.json`（JSON Schema, draft 2020-12）を暫定の構造検証手段**として用意した。
  これは:
  - Issue #3 の受け入れ基準（スキーマの定義・サンプル・バリデーション方針の記載）を先に満たす。
  - T005 着手時の**設計メモ・移行元**として使える（フィールド名・必須項目・enum 値はここでほぼ確定している）。
  - T005 完了後は、JSON Schema を zod スキーマに置き換えるか、`zod-to-json-schema` 等で
    zod から自動生成する形に一本化し、本ファイル群の手動メンテナンスをやめること。
- **YAML の構造そのもの（フィールド名・ネスト）は T005 でも維持する前提**で設計した。zod 移行時に
  シナリオ YAML ファイル自体の書き直しが不要になることを狙っている。

## 1. ディレクトリ構成

```
schemas/
  scenario.schema.json   # 1マップの構造検証(JSON Schema)
  legal.schema.json       # 法制度データの構造検証(JSON Schema)
scenarios/
  s0-sample.yaml           # スキーマ演習用サンプル(本番シナリオではない。§5 参照)
legal/
  laws_sample.yaml         # 法制度データのサンプル
scripts/
  validate_scenarios.py    # 検証スクリプト(Python, pyyaml + jsonschema)
  requirements.txt
```

- `scenarios/*.yaml` のパスは README.md / plan.md の環境構成図で既に固定されているため、それに合わせた
  （Issue 本文が例示していた `data/scenarios/` ではなく `scenarios/` を採用）。
- 法制度データは `legal/*.yaml` として **シナリオとは別ディレクトリ** に分離した（§4）。

## 2. シナリオ YAML の全体構造

`schemas/scenario.schema.json` が構造上の正。ここでは spec.md との対応を中心に説明する。

| フィールド | spec 対応 | 説明 |
|---|---|---|
| `schema_version` | - | このスキーマのバージョン(semver)。現在 `"0.1.0"` 固定 |
| `id` | - | マップID。**ファイル名(拡張子除く)と一致必須**(検証スクリプトがチェック) |
| `title` | §4 | マップタイトル(事件名) |
| `status` | - | `draft`/`reviewed`/`published`/`sample`。省略時 `draft` |
| `map_order` | §9 難易度カーブ | 進行順(任意) |
| `subject_tags` | §9 | 分野タグ。**6種で固定**: `暗号`/`認証`/`Web`/`攻撃手法`/`インシデント対応`/`法制度` |
| `difficulty` | §9 | 1(易)〜5(難) |
| `estimated_minutes` | US-1 | 想定プレイ時間(分)。目安10〜15分 |
| `source` | FR-7 | 出典(§4 参照) |
| `related_terms` | #4 | 用語カードマスタへの緩い参照(§6 参照) |
| `intro` | §4.1 導入 | 背景・被害会社・サポート役の導入台詞 |
| `investigation_points` | §7 探索 | 調査ポイント(3系統) |
| `cards` | §7 探索 | ヒントカード(正解・ダミーを含む) |
| `resolution` | §8 解決 | 暗号解読→攻撃特定→防衛策 |

### 2.1 カード種別（7種で固定）

spec §7 / DESIGN.md に準拠し、次の7種のみを許容する（`schemas/scenario.schema.json` の `$defs.cardType`）:

`証言` / `ログ` / `通信記録` / `外部情報` / `暗号文` / `鍵` / `対策`

- `対策` タイプのカードは解決パート③(防衛策選択)の選択肢そのものとして使う。攻撃特定用のカードと
  防衛策用のカードを別リストに分けず、**`cards` 1本にまとめて `type` で区別する**設計にした
  (spec §7 で「対策カード（解決用）」がカード種別の1つに含まれているため)。
- ダミーカードは `is_dummy: true` で表現する。カードごとの属性であり、種別を問わず付与できる。

### 2.2 調査の3系統

spec §7 の「①ログを見る ②人に聞く ③文献を引く」を `investigation_points[].category` の enum で表現する。

### 2.3 暗号解読（解決パート①）

- `resolution.cipher_stages` は配列だが、**MVP では要素数を必ず1個に固定**（`minItems`/`maxItems` = 1）。
  これは Issue #3 の代表回答「まずは1種ずつ。複数種・複数段の汎用表現は後回し」を反映したもの。
- 複数段（例: 古典暗号で得た文字列を鍵に別処理→ハッシュ照合、等）が必要になったら、
  **配列に要素を増やすだけ**で対応できるよう設計してある(=拡張時にスキーマの形を壊さない)。
  `maxItems: 1` の制約を外すだけで良い想定。
- `method` は enum にしていない。シーザー暗号(`caesar`)から始めるが、`base64`/`xor`/`hash_match` 等の
  追加を見込んで文字列自由記述にした(#3 代表回答「拡張余地を残す」)。

### 2.4 攻撃特定・防衛策の判定方式

- spec §8.2 の決定「MVP は単一解・厳密一致」に合わせ、`attack_identification.required_card_ids` /
  `countermeasure.required_card_ids` は**唯一の正解カードID集合**として持つ。複数の正解ルート、
  部分点、選択式の「不正解の選択肢テキスト」は持たない
  (不正解の見た目は `cards[].is_dummy: true` のカード自体が担う)。
- `attack_identification.required_card_ids` に `is_dummy: true` のカードを含めてはならない。
- `countermeasure.required_card_ids` は `type: 対策` のカードのみを参照できる。

## 3. 出典表記（`source`）

FR-7「IPA 過去問由来素材に出典表記を明示する」に対応するフィールド。`#14`（IPA 過去問の出典表記規則）が
未確定のため、現時点では次の緩い構造にとどめている:

```yaml
source:
  type: ipa_sc_am2   # ipa_sc_am2 | ipa_sc_pm | original | other
  exam_period: "2025年 秋期"
  question_no: "問17"
  note: "自由記述(改変の有無など)"
```

`#14` 確定後、`type` の enum やフィールド構成を見直す可能性がある。破壊的変更になる場合は
`schema_version` を上げること。

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

Issue #4（用語カードマスタ）は本 PR の時点で未着手・未マージのため、具体的なファイル形式に依存しない
**疎結合**にとどめる。シナリオ側 (`related_terms` / `cards[].related_terms`) は用語IDの配列
(`^term-[a-z0-9_-]+$`) を持つだけで、参照先の実在チェックは行わない
（`legal_refs` とは異なり、`scripts/validate_scenarios.py` では検証しない）。
#4 のマスタ形式が確定した時点で、実在チェックを追加するかは #4 側で判断する。

## 7. バリデーション方針

### 7.1 構造検証（JSON Schema, `schemas/*.json`）

- 全プロパティに対して **`additionalProperties: false`**（未定義フィールド・typo を検出するため）。
- 必須項目は各 `$defs` の `required` を参照。主なもの:
  - シナリオ直下: `schema_version`, `id`, `title`, `subject_tags`, `difficulty`, `estimated_minutes`,
    `source`, `intro`, `investigation_points`, `cards`, `resolution`
  - `intro`: `background`, `victim_company`, `character_intros`
  - `card`: `id`, `type`, `source`, `investigation_point_id`, `body`, `is_dummy`
  - `resolution`: `cipher_stages`, `attack_identification`, `countermeasure`,
    `wrong_answer_follow_ups`, `clear_explanation`
- 型・enum・文字列パターン(`pattern`)・配列の `minItems`/`maxItems`/`uniqueItems` で表現できる制約は
  すべて JSON Schema 側に寄せている。

### 7.2 参照整合性（JSON Schema では表現できないもの。`scripts/validate_scenarios.py`）

JSON Schema は「他のフィールドの値を参照して存在確認する」ような相互参照チェックを表現できないため、
以下は Python スクリプトのセマンティックチェックで担保する:

1. ファイル名(拡張子除く)とシナリオ `id` の一致
2. `cards[].id` / `investigation_points[].id` の重複禁止
3. `cards[].investigation_point_id` が実在する `investigation_points[].id` を指しているか
4. 各 `investigation_points` に紐づく `card` が最低1件あるか
5. `attack_identification.required_card_ids` が実在し、`is_dummy: true` を含まないか
6. `countermeasure.required_card_ids` が実在し、`type: 対策` かつ `is_dummy: false` か
7. `resolution.legal_refs` が `legal/*.yaml` 内の `id` として解決できるか
8. （警告のみ）`type: 対策` のダミーカードが1件も無い場合に注意喚起
   （spec §8.3「本質的でない対策を誤答肢に」を満たしているかの目安。エラーにはしない＝
   防衛策の誤答肢を将来的にカード以外の手段で表現する可能性を残すため）

### 7.3 実行方法

```bash
python3 -m venv .venv-validate
.venv-validate/bin/pip install -r scripts/requirements.txt
.venv-validate/bin/python scripts/validate_scenarios.py
```

`scenarios/*.yaml` と `legal/*.yaml` を自動的に走査し、構造検証→参照整合性検証の順に実行する。
エラーが1件でもあれば終了コード1で失敗する。

### 7.4 CI への組み込み

現時点では CI ワークフロー自体が未構築（tasks.md T003 が未着手）。
tasks.md T010「YAML→JSONビルドパイプライン」で本番の zod 検証ジョブを CI に追加する際、
それまでの間の暫定として本スクリプトを CI に載せても良いし、T010 を待って zod 検証に一本化しても良い
（判断は T010 着手時に行う）。

## 8. 既知の未確定事項

- `source` のフィールド構成は `#14`（IPA 過去問の出典表記規則）確定後に見直す可能性がある。
- 暗号を複数段にする場合の `cipher_stages` の `maxItems` 制約解除、および各段の入出力の繋ぎ方
  （前段の平文を次段の鍵にする等）は、複数段化が実際に必要になった時点で設計する（#3 代表回答により後回し）。
- `related_terms` の実在チェックは #4 のマスタ形式確定後に追加を検討する。
