// Vitest グローバルセットアップ。全テスト環境（node・jsdom）に共通して適用される。
//
// - jest-dom matcher 拡張: src/ui/**/*.test.tsx から使う。
// - fake-indexeddb/auto: T013 で src/ui/store/game-store.ts が SaveStorage(IndexedDB) を
//   起動時 hydrate 等で呼び出すため、jsdom 環境の UI テスト(routes.test.tsx・画面の結線テスト)でも
//   `indexedDB` グローバルが必要になる。node 環境の core テストは元々 indexed-db-storage.test.ts が
//   個別に同じ import を行っており、ここでの追加は冪等で影響しない。
import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
