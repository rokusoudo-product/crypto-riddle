# crypto-riddle — プロジェクト CLAUDE.md

情報処理安全確保支援士（SC）レベルのセキュリティ学習ゲーム（謎解き×防衛アドベンチャー、Web）。

## 開発ルール

- 仕様の正本は `specs/001-mvp/spec.md`（GDD 相当）。登場人物は `docs/characters.md`。
- **UI は `DESIGN.md` に準拠する**（カラー・サイズはトークン経由。直書き禁止）。基準からの逸脱は DESIGN.md に理由付きで追記してから実装する。
- 上位規範は個人グローバルの `DESIGN_STANDARDS.md`（Web は WCAG 2.1 AA 必須・8ptグリッド・型スケール 12〜32）。
- spec-kit フロー（`.claude/skills/speckit-*`）に従い、spec.md／plan.md の各承認ゲートを維持する。
