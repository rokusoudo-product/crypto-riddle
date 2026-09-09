// Vitest グローバルセットアップ。src/ui/**/*.test.tsx から読み込む jest-dom matcher 拡張。
// core/ の単体テスト（node 環境）には影響しない純粋な import のため setupFiles に登録して共有する。
import '@testing-library/jest-dom/vitest'
