// src/core/scenario/fixtures/s0-sample.fixture.ts — チェックポイント②統合テスト用フィクスチャ。
//
// `scenarios/s0-sample.yaml`(docs/scenario_schema.md §5 のスキーマ演習用サンプル)の内容を
// そのまま TypeScript の Scenario リテラルとして写したもの。
//
// 実際に YAML ファイルを読み込む(`scripts/build-data.ts` の runBuild を使う)方法も検討したが、
// `scripts/build-data.ts` は Node 専用 API(node:fs 等)に依存しており、これを src/core/ 配下の
// テストから import すると tsconfig.app.json(ブラウザ向け, "types": ["vite/client"] のみで
// "node" を含まない)のプログラムに Node 専用コードが取り込まれてしまい、`npm run typecheck`
// が `tsc -b` の projects 境界を越えて壊れる(scripts/build-data.ts 側は tsconfig.node.json の
// "types": ["node"] を前提にしているため)。この問題を避けるため、YAML と等価な内容を
// 純粋な TypeScript リテラルとしてここに複製し、src/core/ のテストが Node API に依存しない
// 状態を保つ(plan.md §2 の「core/ は純粋 TypeScript」という設計方針にも合致する)。
//
// 内容を変更した場合は `scenarios/s0-sample.yaml` 側も同期すること(このファイルが唯一の
// 正本ではなく、あくまで YAML の写しであることに注意)。
import type { Scenario } from '../../model/index.ts'

export const s0SampleFixture: Scenario = {
  schema_version: '0.5.0',
  id: 's0-sample',
  title: 'アルファテック社 顧客データ流出事件(スキーマサンプル)',
  status: 'sample',
  subject_tags: ['認証', '攻撃手法', 'インシデント対応', '法制度'],
  difficulty: 2,
  estimated_minutes: 12,
  references: [
    {
      material_kind: '攻撃手口',
      note: 'IPA SC で頻出のパスワードリスト攻撃というテーマ知識を参考にしたオリジナル創作。特定年度・特定問題からの引用ではない。',
    },
  ],
  related_terms: [
    'term-password-list-attack',
    'term-multi-factor-authentication',
    'term-appi-breach-report',
  ],
  intro: {
    background:
      '深夜、蒼海システムズが運用を委託されているECサイト「アルファテック」の管理画面に、通常とは異なる時間帯からの大量アクセスが記録された。翌朝、顧客データの一部が外部に流出した疑いが浮上し、対策室に緊急招集がかかる。',
    victim_company: {
      name: '株式会社アルファテック',
      industry: 'EC(通信販売)',
      description:
        '中堅アパレルEC事業者。会員向けECサイトの運用・保守を蒼海システムズに委託している。',
    },
    character_intros: [
      { character: '霧島', line: '深夜のログに妙な集中アクセスがある。まずは事実を洗おう。' },
      {
        character: '橘',
        line: '顧客データが絡む以上、報告義務の有無も並行して確認します。時間との勝負になりますよ。',
      },
    ],
  },
  investigation_points: [
    {
      id: 'ip-proxy-log',
      category: 'ログを見る',
      label: 'プロキシログ',
      description: 'ECサイトの管理画面へのアクセスを記録したプロキシログを確認する。',
    },
    {
      id: 'ip-auth-log',
      category: 'ログを見る',
      label: '認証ログ',
      description: 'ログイン試行と成功・失敗の記録を確認する。',
    },
    {
      id: 'ip-tmpfile',
      category: 'ログを見る',
      label: 'サーバ一時領域の解析',
      description: '侵入時に作成されたとみられる一時ファイルを解析する。',
    },
    {
      id: 'ip-mail-log',
      category: 'ログを見る',
      label: '社内メール送受信記録',
      description: '関係者のメール送受信履歴を確認する。',
    },
    {
      id: 'ip-witness-tanaka',
      category: '人に聞く',
      label: '経理部 田中への聞き取り',
      description: '管理画面アカウントを保有する経理部担当者に話を聞く。',
    },
    {
      id: 'ip-witness-outsourcer',
      category: '人に聞く',
      label: '委託先SEへの聞き取り',
      description: 'サイト保守を担当する委託先エンジニアに話を聞く。',
    },
    {
      id: 'ip-witness-itdept',
      category: '人に聞く',
      label: '情報システム部への対策相談',
      description: '恒久対策の選択肢について情報システム部に相談する。',
    },
    {
      id: 'ip-reference-news',
      category: '文献を引く',
      label: 'セキュリティ注意喚起情報の確認',
      description: '直近のセキュリティ注意喚起・ニュースを確認する。',
    },
  ],
  cards: [
    {
      id: 'card-proxy-log',
      type: 'ログ',
      source: 'プロキシサーバ',
      investigation_point_id: 'ip-proxy-log',
      body: '深夜2時台、海外IPアドレスから管理画面ログインに対する大量の試行が記録されている。同一IDに対して数百回試行された末、1回だけ成功している。',
      is_dummy: false,
    },
    {
      id: 'card-proxy-log-noise',
      type: 'ログ',
      source: 'プロキシサーバ',
      investigation_point_id: 'ip-proxy-log',
      body: '同時間帯に社内バックアップジョブによる定期アクセスも記録されているが、これは通常運用の範囲内で毎晩発生しているもの。',
      is_dummy: true,
    },
    {
      id: 'card-auth-log',
      type: 'ログ',
      source: '認証基盤',
      investigation_point_id: 'ip-auth-log',
      body: '唯一成功したログインで使われたID・パスワードの組み合わせは、過去に他社サービスから流出したパスワードリストに含まれる文字列と一致した。',
      is_dummy: false,
    },
    {
      id: 'card-cipher-text',
      type: '暗号文',
      source: 'サーバ室に残された一時ファイル',
      investigation_point_id: 'ip-tmpfile',
      body: 'サーバの一時領域に、攻撃者が作業メモとして残したとみられる暗号化文字列が見つかった: "SDVVZRUG OLVW DWWDFN"。単純な換字式暗号のようだ。',
      is_dummy: false,
    },
    {
      id: 'card-key-hint',
      type: '鍵',
      source: 'サーバ室に残されたメモ',
      investigation_point_id: 'ip-tmpfile',
      body: '同じ場所に走り書きのメモがあり、隅に小さく「A→D」とだけ書かれている。アルファベットを一定数だけ先にずらす換字と推測できる。',
      is_dummy: false,
    },
    {
      id: 'card-witness-tanaka',
      type: '証言',
      source: '経理部 田中',
      investigation_point_id: 'ip-witness-tanaka',
      body: '「他のショッピングサイトと同じパスワードを、管理画面でも使い回していたと思います」と証言。パスワード変更の記録はここ半年ない。',
      is_dummy: false,
    },
    {
      id: 'card-witness-outsourcer',
      type: '証言',
      source: '委託先SE',
      investigation_point_id: 'ip-witness-outsourcer',
      body: '「先週、標的型メールらしき添付ファイルを開いてしまったかもしれません」と申告。ただし本人の端末ログにマルウェア実行の痕跡は見つかっていない。',
      is_dummy: true,
    },
    {
      id: 'card-comm-record',
      type: '通信記録',
      source: '社内メールサーバ',
      investigation_point_id: 'ip-mail-log',
      body: '半年前に契約終了した元委託社員のメールアカウントが、契約終了後も社外ネットワークから短時間アクセスされた記録が残っている。',
      is_dummy: true,
    },
    {
      id: 'card-external-info',
      type: '外部情報',
      source: 'セキュリティ注意喚起(業界団体)',
      investigation_point_id: 'ip-reference-news',
      body: '直近、他社サービスから流出したID・パスワードの一覧を使い回して別サービスに不正ログインを試みる被害が全国的に増加しているとの注意喚起。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-mfa',
      type: '対策',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itdept',
      body: '管理画面ログインに多要素認証(MFA)を導入し、あわせてパスワードの使い回し禁止を利用者・委託先双方に周知する。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-firewall',
      type: '対策',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itdept',
      body: 'ネットワーク境界に新たなファイアウォールを追加導入する。',
      is_dummy: true,
    },
  ],
  resolution: {
    cipher_stages: [
      {
        id: 'cs-1',
        method: 'caesar',
        ciphertext: 'SDVVZRUG OLVW DWWDFN',
        key: '3',
        key_hint:
          '残されたメモの「A→D」は、アルファベットを3文字先にずらしていることを示している。',
        plaintext: 'PASSWORD LIST ATTACK',
        card_ref: 'card-cipher-text',
      },
    ],
    // 会話モード(#42/T030)の問い列。旧 attack_identification/countermeasure/
    // wrong_answer_follow_ups(required_card_ids 方式)をここへ統合した(#44)。
    // 本フィクスチャはスキーマ演習用サンプルであり本番シナリオではない(scenario_schema.md §5)。
    questions: [
      {
        id: 'q-attack-method',
        subject_tag: '攻撃手法',
        speaker: '霧島',
        prompt: 'この侵入の手口は何だと見る？',
        choices: [
          { text: 'パスワードリスト攻撃(流出パスワードの使い回し)', is_correct: true },
          {
            text: '標的型メールによるマルウェア感染',
            is_correct: false,
            reply:
              '怪しく見えるログすべてが原因とは限らない。パスワードの使い回しに直結する証拠だけを拾え。',
          },
          {
            text: '元委託社員による内部不正アクセス',
            is_correct: false,
            reply:
              '契約終了後のアクセス自体は気になるが、今回の認証成功の直接証拠にはならない。流出リストとの一致に注目しろ。',
          },
        ],
        explanations: ['一次情報(ログ)と証言のどちらを裏取りに使えるかを考えてみよう。'],
        consult_hint: 'プロキシログ・認証ログ・田中の証言・外部注意喚起を分野で整理して提示する。',
      },
      {
        id: 'q-countermeasure',
        subject_tag: '法制度',
        speaker: '橘',
        prompt: '有効な再発防止策は？',
        choices: [
          {
            text: '多要素認証(MFA)の導入とパスワード使い回し禁止の周知',
            is_correct: true,
            reply: 'それなら流出パスワードのみでの不正ログインを防げます。',
          },
          {
            text: 'ネットワーク境界への新たなファイアウォール追加',
            is_correct: false,
            reply: '境界を固めるだけでは今回の原因は防げません。根本原因に効く対策を選んでください。',
          },
        ],
        explanations: [
          '境界防御を固めても、正規のID・パスワードでログインされる今回のような攻撃は防げません。認証そのものを強くする対策を選びましょう。',
        ],
        consult_hint:
          '対策カードから本質的でない対策(境界防御のみ)と根本原因に効く対策を整理して提示する。',
      },
    ],
    clear_explanation: [
      {
        character: '霧島',
        line: '今回の侵入経路は、他サービスから流出したID・パスワードの使い回しだ。大量ログイン試行の痕跡と、流出リストに一致するパスワードが決め手だった。',
      },
      {
        character: '橘',
        line: '個人データへの影響が疑われる以上、個人情報保護法に基づく報告義務も発生します。速報・確報それぞれの期限を必ず確認してください。',
      },
    ],
    legal_refs: ['LAW-APPI-BREACH-REPORT'],
  },
}
