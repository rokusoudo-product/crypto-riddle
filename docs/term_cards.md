---
project: crypto-riddle
doc: term_cards.md（用語カードマスタ・誤用検出クイズ設計ドキュメント）
status: draft
created: 2026-08-07
related:
  - specs/001-mvp/spec.md（§7 探索・ヒントカード設計、§9 分野別習熟度）
  - specs/001-mvp/plan.md（§5 データモデル TermCard、§11 実装順序）
  - docs/scenario_schema.md（Issue #3。シナリオ記述フォーマットとの連携方式）
gate: "Issue #4 で作成。正式反映は代表レビュー（PRマージ）で承認"
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
- T005（zod スキーマ, plan.md §4/§11）着手前の暫定として、Issue #3（PR #19）と同様に
  **JSON Schema + Python(pyyaml/jsonschema) の検証スクリプト**を採用した（§7 参照）。

## 2. 用語カードマスタ（TermCard）

`schemas/term_card.schema.json` に準拠する。plan.md §5 の TermCard データモデル
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

spec.md §9 は分野別習熟度を **暗号/認証/Web/攻撃手法/インシデント対応/法制度** の6分野で
固定しており、schemas/scenario.schema.json（#3）の `$defs/subjectTag` もこの6種のみを
許容する。

用語カードマスタでは、NW試験（ネットワークスペシャリスト）と共有される基礎的なネットワーク
用語（TCP/IP、DNS、ファイアウォール等）を扱うため、**拡張タグ「ネットワーク基盤」を7種目として
追加**した。これは以下の理由による。

- IDS/IPS/DDoS等、攻撃手法や法制度と重なる用語は既存6分野でも表現できるが、TCP/IP・DNS等の
  純粋な基礎知識はどの既存分野にも自然に収まらない。
- spec §9 の6分野は「事件解決の分野別習熟度」を表す**ゲームプレイ上の指標**であり、用語カード
  マスタの分野タグは**知識の分類**という別の目的を持つため、値集合が完全一致している必要はないと
  判断した。
- ただし `subject_tags` の値集合を6種から7種に拡張したことで、`schemas/scenario.schema.json`
  の `subjectTag`（6種）とは列挙値が異なる。図鑑UI（T024）で「ネットワーク基盤」タグの用語を
  習熟度画面にどう反映するか（7番目の習熟度トラックを追加するか、既存6分野の付随情報として
  扱うか）は未確定事項として残す（§7）。

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

- シナリオ側（`scenarios/*.yaml`、`schemas/scenario.schema.json`）は、トップレベルの
  `related_terms` およびカード単位の `cards[].related_terms` に、用語ID
  （`^term-[a-z0-9_-]+$`）の配列を持つ（#3 PR #19 で実装済み）。
- **疎結合設計**: #3 側は本マスタの具体的なファイル形式・配置場所に依存しない。参照先の実在
  チェックも #3 の `scripts/validate_scenarios.py` では行わない（#3 が本 Issue より先に着手された
  ため）。
- 本 Issue 側（`scripts/validate_terms.py`）は**マスタ内で閉じた** `related_terms`
  （用語カード同士の関連付け）の実在チェックのみ行い、シナリオ側からの参照が実在するかは
  チェックしない。
- **今後の統合案（未実施・フォローアップ）**: #3・#4 の両方がマージされた後、
  `scripts/validate_scenarios.py` に「シナリオの `related_terms` が `terms/*.yaml` に実在するか」
  のチェックを追加することが可能になる。あわせて `scripts/validate_scenarios.py` と
  `scripts/validate_terms.py` を1本の `scripts/validate_all.py`（またはT005のzodパイプライン）に
  統合することを推奨する。
- 実例: `scenarios/s0-sample.yaml`（#3 PR #19）は `related_terms` として
  `term-password-list-attack` / `term-multi-factor-authentication` / `term-appi-breach-report`
  を参照している。この3語は本 PR の初期セットに含めており、#3・#4 双方がマージされた時点で
  実際に解決できる状態になっている。

## 5. 誤用検出クイズ（MisuseQuizItem）のデータ構造

`schemas/quiz_misuse.schema.json` に準拠する。**実装（出題UI・判定ロジック）は行わない**
（Issue #4 代表回答）。以下はデータ構造の説明と、想定される判定アルゴリズムの概念設計。

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

```
python3 -m venv .venv-validate
.venv-validate/bin/pip install -r scripts/requirements.txt
.venv-validate/bin/python scripts/validate_terms.py
# => OK: 45 件の用語カード、5 件の誤用検出クイズが検証を通過しました。
```

用語カード id の重複、`related_terms` のマスタ内実在確認、クイズの `term_id` /
`confused_with_term_id` の実在確認を行う。

### 7.2 未確定事項・フォローアップ

- **シラバス全体の網羅**: Issue #4 の当初の代表回答は「シラバス全体を先行整備する」だったが、
  無人実装タスクとして着手する際の実施要領では「各分野を代表する10〜20語程度でよい」と
  スコープが調整されていた。両者の間に差があるため、本 PR は**両者の中間として45語の
  代表セット**を用意し、シラバス全体の網羅は**別Issueとしてフォローアップすることを推奨**する
  （判断の詳細は本 PR の説明を参照）。
- **`subjectTag` の値集合の乖離**: §3.1 のとおり、用語カードマスタは7種（ゲーム分野6種+
  ネットワーク基盤）、シナリオスキーマ（#3）は6種のまま。図鑑・習熟度UI設計時に統一するか
  どうかを代表判断とする。
- **`scripts/requirements.txt` の重複**: #3（PR #19）と本 Issue が同一内容のファイルを
  別々に追加しているため、両方がマージされる際にどちらか一方に統合する必要がある。
- **`scripts/validate_scenarios.py` との統合**: §4 のとおり、シナリオ→用語カードの参照整合性
  チェックは両 Issue のマージ後に追加を検討する。
- **法制度データ（`term-appi-breach-report` 等）の内容の正確性**: 出典は記載しているが、
  法改正等による陳腐化がありうるため、`legal/*.yaml`（#3）と同様に代表監修前のドラフトとして
  扱うこと。
