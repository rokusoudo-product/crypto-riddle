---
project: crypto-riddle
doc: design-contrast.md（DESIGN.md カラートークン コントラスト検証結果）
status: draft
created: 2026-09-14
related:
  - DESIGN.md（カラートークン・半透明パネル節）
  - scripts/check-contrast.mjs
issue: https://github.com/rokusoudo-product/crypto-riddle/issues/132
  - https://github.com/rokusoudo-product/crypto-riddle/issues/13
gate: "#132・#13（カラートークン AA 検証。#13 を #132 に含めて完了させる）で作成。正式反映は代表レビュー（PRマージ）で承認。"
---

# DESIGN.md カラートークン コントラスト検証結果

`DESIGN.md`「カラートークン」節のサイバーパンク改訂（2026-09-14・#132）に伴い、全トークンペアの WCAG 2.1 AA コントラストを検証した結果。#13（カラートークンの AA 検証）の受け入れ基準を、本 Issue（#132）に含めて満たす。

## 検証方法

- 検証スクリプト: `scripts/check-contrast.mjs`（依存追加なし・Node 標準機能のみ）。
- 実装: WCAG 2.1 の相対輝度・コントラスト比の式をそのまま実装（`sRGB` → 線形化 → 相対輝度 → `(L1+0.05)/(L2+0.05)`）。
- 基準: 本文・補助テキスト・セマンティックカラーをテキスト/塗りボタンとして使う場合は **4.5:1**、アイコン・図形・非テキスト（border・フォーカスリング・ホットスポット枠・話者枠）は **3:1**。
- **半透明（ガラス風）パネルの検証**: 実際の背景画像ごとに実測すると画像差し替えのたびに再検証が必要になるため、**パネル色を最小不透明度で「純白」「純黒」の上にそれぞれ合成し、両方に対して本文 4.5:1 を満たすか**で判定する（背景画像に依存しない規則。`DESIGN.md`「半透明（ガラス風）パネル」節）。最小不透明度（0.81）は、この規則を満たす最小値をスクリプトが 0.01 刻みの探索で自動算出したもの（手当てずっぽうではない）。
- **再実行手順**: `source ~/.nvm/nvm.sh && nvm use 24 && node scripts/check-contrast.mjs`（Windows からは WSL 経由で同コマンド）。トークン値を変更したら `scripts/check-contrast.mjs` の `TOKENS` 定数も同時に更新して再実行すること（`DESIGN.md` の値と `TOKENS` は常に同期させる）。

## 検証結果（2026-09-14 実行）

合計 60 ペア中 **0 ペアが未達**（すべて基準を満たす）。加えて、不採用トークン `speaker-frame-black` の3ペアを「使用禁止」の参考記録として別掲する（合否判定には含めない）。

ガラス風パネル合成色: over純白=`#3e4152` / over純黒=`#0e1022`（`surface` #11142A を不透明度0.81で合成）。

### 本文・補助テキスト・セマンティックカラー（4.5:1）

| ペア | 比 | 必要値 | 判定 |
|---|---|---|---|
| text-primary on background | 17.06:1 | 4.5:1 | OK |
| text-secondary on background | 9.09:1 | 4.5:1 | OK |
| text-primary on surface | 15.90:1 | 4.5:1 | OK |
| text-secondary on surface | 8.47:1 | 4.5:1 | OK |
| text-primary on surface-2 | 14.08:1 | 4.5:1 | OK |
| text-secondary on surface-2 | 7.50:1 | 4.5:1 | OK |
| primary as text on background | 11.68:1 | 4.5:1 | OK |
| success as text on background | 15.00:1 | 4.5:1 | OK |
| warning as text on background | 12.12:1 | 4.5:1 | OK |
| error as text on background | 6.55:1 | 4.5:1 | OK |
| info as text on background | 8.41:1 | 4.5:1 | OK |
| primary as text on surface | 10.89:1 | 4.5:1 | OK |
| success as text on surface | 13.98:1 | 4.5:1 | OK |
| warning as text on surface | 11.30:1 | 4.5:1 | OK |
| error as text on surface | 6.10:1 | 4.5:1 | OK |
| info as text on surface | 7.83:1 | 4.5:1 | OK |
| primary as text on surface-2 | 9.64:1 | 4.5:1 | OK |
| success as text on surface-2 | 12.37:1 | 4.5:1 | OK |
| warning as text on surface-2 | 10.00:1 | 4.5:1 | OK |
| error as text on surface-2 | 5.40:1 | 4.5:1 | OK |
| info as text on surface-2 | 6.94:1 | 4.5:1 | OK |
| text on filled primary button (`--primary-foreground` = background色) | 11.68:1 | 4.5:1 | OK |
| text on filled success button (`--success-foreground` = background色) | 15.00:1 | 4.5:1 | OK |
| text on filled warning button (`--warning-foreground` = background色) | 12.12:1 | 4.5:1 | OK |
| text on filled error button (`--error-foreground` = background色) | 6.55:1 | 4.5:1 | OK |
| text on filled info button (`--info-foreground` = background色) | 8.41:1 | 4.5:1 | OK |

### 非テキスト（border・フォーカスリング・ホットスポット・話者枠。3:1）

| ペア | 比 | 必要値 | 判定 |
|---|---|---|---|
| primary as icon/graphic on background | 11.68:1 | 3:1 | OK |
| success as icon/graphic on background | 15.00:1 | 3:1 | OK |
| warning as icon/graphic on background | 12.12:1 | 3:1 | OK |
| error as icon/graphic on background | 6.55:1 | 3:1 | OK |
| info as icon/graphic on background | 8.41:1 | 3:1 | OK |
| primary as icon/graphic on surface | 10.89:1 | 3:1 | OK |
| success as icon/graphic on surface | 13.98:1 | 3:1 | OK |
| warning as icon/graphic on surface | 11.30:1 | 3:1 | OK |
| error as icon/graphic on surface | 6.10:1 | 3:1 | OK |
| info as icon/graphic on surface | 7.83:1 | 3:1 | OK |
| primary as icon/graphic on surface-2 | 9.64:1 | 3:1 | OK |
| success as icon/graphic on surface-2 | 12.37:1 | 3:1 | OK |
| warning as icon/graphic on surface-2 | 10.00:1 | 3:1 | OK |
| error as icon/graphic on surface-2 | 5.40:1 | 3:1 | OK |
| info as icon/graphic on surface-2 | 6.94:1 | 3:1 | OK |
| border on background | 4.18:1 | 3:1 | OK |
| focus ring (primary) on background | 11.68:1 | 3:1 | OK |
| hotspot-highlight on background（既存トークン・#71/T045 由来。維持） | 6.33:1 | 3:1 | OK |
| border on surface | 3.90:1 | 3:1 | OK |
| focus ring (primary) on surface | 10.89:1 | 3:1 | OK |
| hotspot-highlight on surface（既存トークン・#71/T045 由来。維持） | 5.90:1 | 3:1 | OK |
| border on surface-2 | 3.45:1 | 3:1 | OK |
| focus ring (primary) on surface-2 | 9.64:1 | 3:1 | OK |
| hotspot-highlight on surface-2（既存トークン・#71/T045 由来。維持） | 5.22:1 | 3:1 | OK |
| speaker-frame-white on background | 19.47:1 | 3:1 | OK |
| speaker-frame-neon-blue on background（併記・非既定） | 11.68:1 | 3:1 | OK |
| speaker-frame-white on surface | 18.15:1 | 3:1 | OK |
| speaker-frame-neon-blue on surface（併記・非既定） | 10.89:1 | 3:1 | OK |
| speaker-frame-white on surface-2 | 16.06:1 | 3:1 | OK |
| speaker-frame-neon-blue on surface-2（併記・非既定） | 9.64:1 | 3:1 | OK |

### 半透明パネル（本文4.5:1・背景画像非依存の合成検証。最小不透明度は自動導出値）

| ペア | 比 | 必要値 | 判定 |
|---|---|---|---|
| text-primary on glass-panel(surface@0.81) over 純白 | 8.84:1 | 4.5:1 | OK |
| text-primary on glass-panel(surface@0.81) over 純黒 | 16.49:1 | 4.5:1 | OK |
| text-secondary on glass-panel(surface@0.81) over 純白 | 4.71:1 | 4.5:1 | OK |
| text-secondary on glass-panel(surface@0.81) over 純黒 | 8.78:1 | 4.5:1 | OK |

### 参考: 不採用トークン（使用禁止。合否判定には含めない）

| ペア | 比 | 必要値 | 判定 |
|---|---|---|---|
| speaker-frame-black on background | 1.08:1 | 3:1 | NG（使用禁止） |
| speaker-frame-black on surface | 1.16:1 | 3:1 | NG（使用禁止） |
| speaker-frame-black on surface-2 | 1.31:1 | 3:1 | NG（使用禁止） |

`speaker-frame-black` はダーク統一の背景では成立しないため、`SPEAKER_FRAME_COLOR` の切替候補から外し `white | neon-blue` の2値のみ使用可とする（`DESIGN.md`「話者の枠」参照）。

## 未達ペアと対処

**本検証では未達ペアはゼロ件**（初回のトークン案では `border` の3ペアと `text-secondary on glass-panel over 純白` の1ペアが未達だったため、`border` を `#3A3F66`→`#6870AD` へ、ガラス風パネルの最小不透明度を手動想定の0.72から自動算出の0.81へそれぞれ調整して確定値とした）。

## 旧→新トークン対応（#13 受け入れ基準）

| トークン | 旧値（ゴールド1色・#7時代） | 新値（サイバーパンク・#132） | 変更理由 |
|---|---|---|---|
| primary | #D3AC57（ダーク）/ #A9762B（ライト） | #4FD8FF | 2026-09-14 代表決定でトーンをサイバーパンクへ全面変更。ゴールド1色の前提が置き換わったため色相ごと変更 |
| background | #15120D（ダーク）/ #F3ECE0（ライト） | #0A0C18 | 暖色系の暗色→ダークブルー系。ライト文脈は廃止（単一ダーク文脈へ統一） |
| surface | #221D16 / #FBF6EE | #11142A | 同上 |
| surface-2 | #2C2619 / #EAE0D0 | #1A1F3D | 同上（パープル寄りにわずかに明度を上げる） |
| text-primary | #ECE5D7 / #2A2521 | #EAF0FF | 暖色の生成り→ブルー寄りの白 |
| text-secondary | #A79E8D / #6E655A | #A6B0D6 | 同上 |
| border | #3A3226 / #D8CDBB | #6870AD | ダークブルー基調の上で3:1を満たす明度まで上げた |
| success | #4FA06B / #2F7A4C | #4CFFA8 | 状態色として彩度の高いネオングリーンへ変更 |
| warning | #C98A3C / #9C6A22 | #FFC24C | サイバーパンク基調の高彩度配色へ変更 |
| error | #D25A4E / #B23F35 | #FF5C7A | 同上 |
| info | #5A8FBF / #3E6E99 | #8FA6FF | primary と区別できる青紫寄りの配色へ変更 |
| hotspot-highlight | oklch(0.749 0.202 22.86)（ダーク） | 変更なし（維持） | 視認性のための赤系指定は代表指定のため継続 |
| speaker-frame-white | oklch(1 0 0) | 変更なし（維持） | 白の話者枠は2026-09-14 決定を継続 |
| speaker-frame-black | oklch(0 0 0) | 使用禁止に変更 | ダーク統一の背景で成立しないため（本書「参考」節） |
