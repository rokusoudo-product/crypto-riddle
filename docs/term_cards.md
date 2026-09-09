---
project: crypto-riddle
doc: term_cards.md（用語カードマスタ・誤用検出クイズ設計ドキュメント）
status: draft
created: 2026-08-07
related:
  - specs/001-mvp/spec.md（§7 探索・ヒントカード設計、§9 分野別習熟度）
  - specs/001-mvp/plan.md（§5 データモデル TermCard、§11 実装順序）
  - docs/scenario_schema.md（Issue #3。シナリオ記述フォーマットとの連携方式）
  - src/core/model/term-card.ts（T005 の zod スキーマ。旧 schemas/term_card.schema.json は削除済み）
gate: "Issue #4 で作成。正式反映は代表レビュー（PRマージ）で承認"
updated: 2026-09-09
---

# crypto-riddle — 用語カードマスタ・誤用検出クイズ設計ドキュメント（Issue #4）

> 本書は用語カード収集メカニクス（opus5 シナリオ企画 2026-07-25 §2.4）を支える
> 用語カードマスタと、誤用検出クイズのデータ構造の正本。実装（UI・図鑑・出題ロジック）は
> 本書のスコープ外。plan.md §11-6（T023/T024）で実装する。

## 1. 位置づけ・スコープ

- Issue #4 の代表回答（2026-07-25）に基づき、次の3点を本 Issue のスコープとする。
  1. 用語カードマスタのスキーマ・初期セット（SC/NW共通シラバスから代表的な用語を選定）
  2. シナリオ記述フォーマット（#3）からの参照方式の文書化
  3. 誤用検出クイズの**データ構造のみ**の設計（出題UI・判定ロジックの実装は MVP スコープ外）
- 誤用検出クイズは代表回答により **MVP には入れない**（リリース後追加候補）。一方で受け入れ基準の
  「誤用検出クイズの出題・判定のデータ構造が定義されている」は本 Issue のスコープ内であり、
  スキーマ定義とサンプルデータの提供までを行う（動く機能は作らない）。
- 2026-09-09（T005/T010）: 当初 Issue #3（PR #19）と同様に JSON Schema + Python(pyyaml/jsonschema) の
  検証スクリプトを暫定採用していたが、T005 で zod スキーマ（`src/core/model/term-card.ts` /
  `src/core/model/quiz-misuse.ts`）に一本化し、`schemas/term_card.schema.json` /
  `schemas/quiz_misuse.schema.json` と `scripts/validate_terms.py` は削除した（§7 参照）。

## 2. 用語カードマスタ（TermCard）

`src/core/model/term-card.ts`（zod, `termCardSchema`）に準拠する。plan.md §5 の TermCard データモデル
（id / 用語 / 読み / 定義 / 分野タグ / 関連用語 / 出典）に対応する。

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | `^term-[a-z0-9_-]+$`。schemas/scenario.schema.json（#3）の `$defs/termId` と同一パターン |
| `term` | ○ | 用語の正式名称 |
| `reading` | ○ | 読み（ひらがな/カタカナ） |
| `aliases` | - | 別名・略称（例: XSS、SSO）。図鑑検索やシナリオ本文とのゆらぎ吸収に使う想定 |
| `definition` | ○ | 定義（100〜400字目安） |
| `subject_tags` | ○ | 分野タグ（§3 参照）。1つ以上 |
| `syllabus` | ○ | IPAシラバス分類との対応（§3 参照） |
| `related_terms` | - | 関連用語（マスタ内の他 `term-*` id への参照。マスタ内で実在チェックする） |
| `source` | ○ | 出典（§2.1 参照） |
| `status` | - | `draft` / `reviewed` / `published`。省略時 `draft` |

### 2.1 出典（source）

シナリオの `source`（#3）と役割は同じだが、用語カードは特定の過去問由来ではなく一般的な
シラバス知識・標準文書由来が中心のため、`type` を用語カード向けに調整した。

- `ipa_syllabus`: IPA公開シラバス項目に基づく一般知識（初期セットの大半がこれ）
- `ipa_exam`: 特定の過去問由来（`exam_period` / `question_no` 必須）
- `standard`: RFC・JIS・法令等の標準文書（`reference` 推奨）
- `general_knowledge`: 業界一般に定着した教科書的知識（特定出典なし）
- `other`: その他（`note` 必須）

## 3. 分野タグ・IPAシラバスとの整合（Issue #4 受け入れ基準）

### 3.1 ゲーム内分野タグ（`subject_tags`）

**2026-09-09 Issue #22 決定（案2採用）**: spec.md §9 の分野別習熟度とシナリオ・用語カード双方の
`subject_tags` は **暗号/認証/Web/攻撃手法/インシデント対応/法制度/ネットワーク基盤 の7種に統一**した。
値集合の単一の正本は `src/core/model/tags.ts` の `SUBJECT_TAGS` であり、シナリオ
（`src/core/model/scenario.ts`）・用語カード（本ファイルが説明する `term-card.ts`）・SaveData の
分野習熟（`src/core/model/save-data.ts`）のすべてがこの1箇所を import する。

- 経緯: 当初 spec.md §9 とシナリオ側は6分野で固定されていたが、用語カードマスタは NW試験
  （ネットワークスペシャリスト）と共有される基礎的なネットワーク用語（TCP/IP、DNS、ファイアウォール等）
  を扱うために独自に「ネットワーク基盤」を7種目として追加しており、両者の値集合が分裂していた
  （本節はその分裂を最初に記録した節であり、Issue #22 として起票・解決された）。
- 採用理由（Issue #22 案2）: 代表の NW 試験対策（spec §2）という目的に整合すること、
  `terms/terms_core.yaml` の既存45語（うち9語が「ネットワーク基盤」を使用）の書き換えが不要なこと。
- 図鑑UI（T024）での分野習熟度表示は7分野トラックとして扱う想定（実装時に確定）。難易度カーブ
  （spec §9 の S1-2/S3-6/S7-8）はタグ数と独立のため、7種化による影響はない。

### 3.2 IPAシラバス分類（`syllabus`）

Issue #4 の受け入れ基準「用語の分野タグがNW/SCの学習分類と整合している」に対応するため、
`syllabus.domain`（大分類）・`syllabus.field`（中分類）を、IPA試験共通の
**共通キャリア・スキルフレームワーク（CCSF）** に準拠する分類で持たせた。

- `domain`: テクノロジ系 / マネジメント系 / ストラテジ系
- `field`: 基礎理論・ネットワーク・セキュリティ・データベース・サービスマネジメント・
  企業と法務 等（詳細は `schemas/term_card.schema.json` の enum を参照）
- `exam_relevance`: `SC` / `NW`（両方指定可）。代表の NW 試験学習（2026-11、study_agent 連携）
  との連動のため、各用語がどちらの試験の出題範囲に関連するかを明示する。

reading vault（`C:\Users\moets\Dropbox\obsidian\vault`）の `Exams/` 分類は本 Issue の
作業範囲外（到達できないディレクトリ）のため直接参照していない。`syllabus.field` は IPA が
公開する一般的なシラバス大分類・中分類の名称に準拠しており、reading vault 側が同じ IPA
シラバス由来の分類を使っていれば自然に整合するはずだが、実際の突き合わせは代表レビュー時に
確認することを推奨する。

## 4. シナリオ記述フォーマット（#3）との連携方式

- シナリオ側（`scenarios/*.yaml`、`src/core/model/scenario.ts`）は、トップレベルの
  `related_terms` およびカード単位の `cards[].related_terms` に、用語ID
  （`^term-[a-z0-9_-]+$`）の配列を持つ（#3 PR #19 で実装済み）。
- **疎結合設計は維持**: シナリオ側は本マスタの具体的なファイル形式・配置場所に依存しない。
  `scripts/build-data.ts`（T010）は用語カードマスタを読み込み済みだが、シナリオの `related_terms`
  が用語カードマスタに実在するかのチェックはまだ追加していない（誤用検出クイズの `term_id` /
  `confused_with_term_id` は `checkQuizItems` でチェック済み。§7.2 参照）。
- **統合済み（2026-09-09, T005/T010）**: #3・#4 双方の検証は
  `scripts/validate_scenarios.py` と `scripts/validate_terms.py` という2本の Python スクリプトに
  分かれていたが、`scripts/build-data.ts`（Node/TypeScript）1本に統合した。両スクリプトおよび
  `schemas/*.json` は削除済み。「シナリオの `related_terms` が `terms/*.yaml` に実在するか」の
  チェックはこの統合後も未追加であり、引き続きフォローアップ候補として残る。
- 実例: `scenarios/s0-sample.yaml`（#3 PR #19）は `related_terms` として
  `term-password-list-attack` / `term-multi-factor-authentication` / `term-appi-breach-report`
  を参照している。この3語は本ファイルが説明する用語カードマスタの初期セットに含まれており、
  `npm run build:data` で実際に解決できる状態になっている。

## 5. 誤用検出クイズ（MisuseQuizItem）のデータ構造

`src/core/model/quiz-misuse.ts`（zod, `misuseQuizItemSchema`）に準拠する。
**実装（出題UI・判定ロジック）は行わない**（Issue #4 代表回答）。以下はデータ構造の説明と、
想定される判定アルゴリズムの概念設計。

### 5.1 フィールド概要

| フィールド | 必須 | 内容 |
|---|---|---|
| `id` | ○ | `^quiz-misuse-[a-z0-9_-]+$` |
| `term_id` | ○ | 設問が扱う用語カードのID |
| `context_text` | ○ | プレイヤーに提示する会話・証言テキスト |
| `speaker` | - | 発言者（`docs/characters.md` の表記推奨） |
| `is_misuse` | ○ | 正解（true=誤用を含む、false=正しい用法） |
| `misuse_type` | is_misuseがtrueなら○ | 誤用の種類（§5.2） |
| `confused_with_term_id` | misuse_typeがterm_confusionなら○ | 混同された相手の用語ID |
| `correct_statement` | ○ | 正しい用法・訂正文 |
| `explanation` | ○ | 正誤の理由の解説（クリア後解説と同様の位置づけ） |
| `difficulty` | - | 1〜5（spec §9 と同尺度） |
| `source_scenario` | - | 着想元シナリオの緩い参照（自由記述、実在チェックなし） |

### 5.2 誤用の種類（`misuse_type`）

- `definition_confusion`: 用語の定義そのものの取り違え（例: ハッシュ関数を「復号できる暗号化」と説明する）
- `term_confusion`: 類似・混同しやすい別用語との取り違え（例: IDSの説明としてIPSの機能を述べる）
- `scope_error`: 適用範囲・条件の誤り（例: 要件を満たさないのに用語の適用対象だと誤認する）
- `factual_error`: 数値・仕様等の付随情報の誤り（例: AESの鍵長をDESの鍵長と取り違える）

### 5.3 想定される判定アルゴリズム（概念設計・未実装）

1. **一次判定**: プレイヤーは `context_text` を読み、「正用」か「誤用」かを選ぶ（二択）。
   正解は `is_misuse` と一致するかどうかで判定する。
2. **二次判定（ボーナス、任意）**: `is_misuse=true` かつ `misuse_type=term_confusion` の場合、
   プレイヤーに「どの用語と混同しているか」を候補（例: `term_id` の `related_terms`、または
   同じ `subject_tags` を持つ用語の一覧）から選ばせ、`confused_with_term_id` と一致するかを
   追加で判定する設計が考えられる。
3. 正誤にかかわらず `explanation` を表示し、`correct_statement` で正しい用法を提示する
   （spec §5 のサポート役「クリア後に知識の要点を解説」と同じ思想）。

上記は将来実装時の出発点として記すもので、確定仕様ではない（実装着手時に UI 設計とあわせて見直す）。

## 6. 初期セット概要（45語）

シラバス全体の網羅ではなく、SC/NW共通シラバスの主要分野を代表する用語を選定した
（`terms/terms_core.yaml`）。

| 分野タグ | 語数 | 代表例 |
|---|---|---|
| 暗号 | 8 | シーザー暗号、共通鍵暗号方式、公開鍵暗号方式、AES、RSA |
| 認証 | 6 | 多要素認証、OTP、生体認証、SSO、OAuth |
| Web | 6 | SQLインジェクション、XSS、CSRF、HTTPS |
| 攻撃手法 | 8 | パスワードリスト攻撃、フィッシング、ランサムウェア、DDoS攻撃 |
| インシデント対応 | 6 | CSIRT、デジタルフォレンジック、EDR、事業継続計画 |
| 法制度 | 5 | 個人情報保護法の漏えい報告義務、不正アクセス禁止法、マイナンバー法 |
| ネットワーク基盤 | 6 | TCP/IP、ファイアウォール、IDS/IPS、VPN、DNS |

誤用検出クイズのサンプルは `terms/quiz_misuse_sample.yaml`（5問。データ構造演習用であり
本番出題データではない）。

## 7. バリデーション方法・未確定事項

### 7.1 実行方法

```bash
npm run build:data
# => OK: シナリオ1件・用語カード45件・誤用検出クイズ5件・法制度データ2件を src/data/ に生成しました。
```

2026-09-09（T005/T010）に `scripts/validate_terms.py`（Python + jsonschema）から
`scripts/build-data.ts`（Node/TypeScript + zod）に一本化した。用語カード id の重複、
`related_terms` のマスタ内実在確認、クイズの `term_id` / `confused_with_term_id` の実在確認は
`src/core/model/validate-collection.ts` の `collectTerms` / `checkTermReferences` / `checkQuizItems`
が担う。

### 7.2 未確定事項・フォローアップ

- **シラバス全体の網羅**: Issue #4 の当初の代表回答は「シラバス全体を先行整備する」だったが、
  無人実装タスクとして着手する際の実施要領では「各分野を代表する10〜20語程度でよい」と
  スコープが調整されていた。両者の間に差があるため、本 PR は**両者の中間として45語の
  代表セット**を用意し、シラバス全体の網羅は**別Issueとしてフォローアップすることを推奨**する
  （判断の詳細は本 PR の説明を参照）。
- **`subject_tags` の値集合の乖離は解消済み（2026-09-09, Issue #22 決定）**: §3.1 のとおり、
  用語カードマスタ・シナリオ・SaveData の分野習熟のすべてが `src/core/model/tags.ts` の
  `SUBJECT_TAGS`（7種）を単一の正本として参照する状態になった。図鑑・習熟度UIでの7分野トラック
  表示の具体的な見せ方は T024 実装時に確定する。
- **旧 `scripts/requirements.txt` の重複**: 解消済み。#3（PR #19）・#4（PR #20）がそれぞれ追加していた
  Python 検証スクリプトと `requirements.txt` は、T010 での zod 一本化にあわせて両方削除した。
- **`scripts/validate_scenarios.py` との統合**: 解消済み。`scripts/build-data.ts` 1本に統合し、
  シナリオ・用語カード・誤用検出クイズ・法制度データを一括で検証・JSON化する。ただし §4 のとおり
  「シナリオの `related_terms` が `terms/*.yaml` に実在するか」のチェックは未追加のまま残っている。
- **法制度データ（`term-appi-breach-report` 等）の内容の正確性**: 出典は記載しているが、
  法改正等による陳腐化がありうるため、`legal/*.yaml`（#3）と同様に代表監修前のドラフトとして
  扱うこと。
