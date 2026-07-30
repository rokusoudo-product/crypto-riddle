# crypto-riddle — 環境構成図

> plan.md（`specs/001-mvp/plan.md`）§8 の正本。構成が変わる実装をしたら、同じコミットで本図と README を更新する。

## 全体構成（MVP = Web/PWA、0円運用）

```mermaid
flowchart LR
    subgraph Dev["開発"]
        Y["scenarios/*.yaml<br/>(オーサリング)"] -->|zod 検証| B["Vite ビルド<br/>(YAML→JSON)"]
        GH["GitHub<br/>(main)"] --> CI["GitHub Actions<br/>型/lint/test/シナリオ検証/E2E/a11y"]
        CI -->|デプロイ| CF
    end
    subgraph Prod["本番(0円)"]
        CF["Cloudflare Pages<br/>(静的配信+PWA)"]
        WA["Cloudflare Web Analytics"]
    end
    U["プレイヤー<br/>(スマホ/PC ブラウザ)"] -->|HTTPS| CF
    U -.計測.-> WA
    U --- LS[("IndexedDB<br/>(SaveStorage)")]
    subgraph Phase2["フェーズ2(将来)"]
        CAP["Capacitor ラップ"] --> AND["Google Play"]
        CAP --> IOS["App Store"]
    end
    CF -.同一コードベース.-> CAP
```

## 構成の要点

- **サーバーレス**: 静的配信のみ。API・DB サーバーは持たない（セーブは端末の IndexedDB）
- **シナリオはビルド時固定**: YAML → zod 検証 → JSON。クライアントに YAML パーサを載せない。不正シナリオは CI で fail
- **アーキテクチャ原則**: `core/`（純 TypeScript）は `ui/`（React）を import しない（plan.md §2）
- **フェーズ2（将来）**: 同一コードベースを Capacitor でラップし Google Play / App Store へ。着手は代表判断（plan.md §7）
