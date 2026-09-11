// src/core/scenario/fixtures/s1-targeted-email-intrusion.fixture.ts — T015/T016 のプレイ用実データ。
//
// `scenarios/s1-targeted-email-intrusion.yaml`(Issue #5 の本番シナリオ第1弾)の内容を
// そのまま TypeScript の Scenario リテラルとして写したもの。
//
// s0-sample.fixture.ts と同じ理由(コメント参照。要約: scripts/build-data.ts の runBuild は
// Node 専用 API に依存しており、src/core/ 配下から import すると tsconfig.app.json のプログラムに
// Node 専用コードが取り込まれ `npm run typecheck` が壊れる)により、YAML と等価な内容を
// 純粋な TypeScript リテラルとしてここに複製する。src/ui/store/game-store.ts はこのフィクスチャを
// プレイ用データの既定値として使う(T013 の s0-sample から T015 で S1 に差し替えた)。
//
// 内容を変更した場合は `scenarios/s1-targeted-email-intrusion.yaml` 側も同期すること
// (このファイルが唯一の正本ではなく、あくまで YAML の写しであることに注意。
// scripts/build-data.test.ts に両者の一致を確認する回帰テストがある)。
import type { Scenario } from '../../model/index.ts'

export const s1TargetedEmailIntrusionFixture: Scenario = {
  schema_version: '0.6.0',
  id: 's1-targeted-email-intrusion',
  title: '標的型メールからの侵入',
  status: 'reviewed',
  map_order: 1,
  subject_tags: ['攻撃手法', 'インシデント対応', '法制度', 'ネットワーク基盤'],
  difficulty: 1,
  estimated_minutes: 12,
  references: [
    {
      material_kind: '攻撃手口',
      note: '標的型メール攻撃(マクロ付き文書によるマルウェア感染とC2通信)というテーマ知識を参考にしたオリジナル創作。特定の年度・問題からの引用ではない。',
    },
    {
      material_kind: '技術要素',
      note: 'インシデント初動対応における証拠保全の順序(揮発性の高い情報から保全する原則)というテーマ知識を参考にしたオリジナル創作。特定の年度・問題からの引用ではない。',
    },
  ],
  related_terms: [
    'term-targeted-email-attack',
    'term-edr',
    'term-digital-forensics',
    'term-incident-response-process',
    'term-log-analysis',
    'term-appi-breach-report',
  ],
  intro: {
    background:
      '月末、経理部の中野が取引先を装った「請求書送付のご連絡」というメールを受け取り、添付のマクロ付きExcelファイルを開いた。その場では何も起きたように見えなかったが、1週間後、社内の端末から外部の見慣れないIPアドレスへ、深夜帯に一定間隔で通信が続いている痕跡がプロキシログに記録されているのが見つかり、対策室に緊急招集がかかる。',
    victim_company: {
      name: '株式会社浜通商事',
      industry: '産業資材卸売業',
      description:
        '取引先への請求書・発注書のやり取りが多い中堅の産業資材商社。経理部では日常的にメール添付のPDF・Excelファイルを開く業務フローが定着しており、添付ファイルの多さがかえって警戒心を鈍らせていた。',
    },
    character_intros: [
      {
        character: '霧島',
        line: '一定間隔の通信か。ビーコンの可能性が高い。まず感染の実態を洗おう。証拠を消すなよ。',
      },
      {
        character: '橘',
        line: '報告義務の判断はこれからです。まずは事実確認と、被害範囲の特定を急ぎましょう。',
      },
    ],
  },
  investigation_points: [
    {
      id: 'ip-proxy-log',
      category: 'ログを見る',
      label: 'プロキシログ',
      description: '社内端末から外部への通信記録を確認する。',
    },
    {
      id: 'ip-edr-alert',
      category: 'ログを見る',
      label: 'EDRアラート',
      description: '経理部端末で検知されたマクロ実行・不審プロセスの記録を確認する。',
    },
    {
      id: 'ip-sandbox-analysis',
      category: 'ログを見る',
      label: 'サンドボックスでの検体解析',
      description: '回収した添付ファイルを隔離環境(サンドボックス)で実行し、挙動を確認する。',
    },
    {
      id: 'ip-mail-log',
      category: 'ログを見る',
      label: 'メールサーバのログ',
      description: '問題のメールの送信元・添付ファイルの記録を確認する。',
    },
    {
      id: 'ip-witness-nakano',
      category: '人に聞く',
      label: '経理部 中野への聞き取り',
      description: 'メールを開いた経緯を本人に確認する。',
    },
    {
      id: 'ip-witness-itstaff',
      category: '人に聞く',
      label: '情シス担当への聞き取り',
      description: '発覚直後にとった対応と、今後の対策の選択肢を確認する。',
    },
    {
      id: 'ip-witness-manager',
      category: '人に聞く',
      label: '経理部長への聞き取り',
      description: '部署内の状況とメール確認の運用について聞く。',
    },
    {
      id: 'ip-reference-advisory',
      category: '文献を引く',
      label: 'セキュリティ注意喚起情報の確認',
      description: '直近の標的型メール攻撃に関する注意喚起を確認する。',
    },
    {
      id: 'ip-reference-guideline',
      category: '文献を引く',
      label: 'インシデント対応ガイドラインの確認',
      description: 'マルウェア感染時の初動対応の手順を確認する。',
    },
  ],
  scenes: [
    {
      id: 'scene-office',
      title: '執務室',
      background: 'bg-s1-office',
      hotspots: [
        {
          object_type: 'pc',
          position: [0.4, 0.68],
          label: '経理部 中野の端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-edr-alert',
              label: 'EDRアラートを確認する',
              line: '中野の端末でExcelのマクロ実行に続いて、見慣れないPowerShellプロセスが起動した記録がある。侵入の起点はここだろう。',
              speaker: '霧島',
            },
            {
              kind: 'danger',
              label: '感染端末の電源を落とす',
              feedback:
                '橘「ここで電源を落とすと、動作中のプロセスや通信先の情報が乗った揮発性メモリの証拠が消えてしまいます。まずネットワークから論理的に隔離し、メモリ→ディスクの順で保全してください。」',
            },
            { kind: 'noop', label: '今は触らない' },
          ],
        },
        {
          object_type: 'person',
          position: [0.47, 0.42],
          label: '中野',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-nakano',
              label: '中野に話を聞く',
              line: '中野さんに話を聞きました。月末で請求書処理が立て込み、深く確認せずに開いてしまったと。マクロ有効化の警告が出たことにも、深く気を留めなかったそうです。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'person',
          position: [0.87, 0.6],
          label: '経理部長',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-manager',
              label: '経理部長に話を聞く',
              line: '経理部長に伺いました。今月は取引先の請求サイクルが集中する時期で、多少雑な件名のメールでも本物だと思い込みやすい状況だったと。マクロ実行に関する社内規程の周知も、徹底されていなかったようです。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'book',
          position: [0.6, 0.16],
          label: '資料棚',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-reference-advisory',
              label: 'セキュリティ注意喚起情報を確認する',
              line: '業界団体の注意喚起を確認した。取引先を装った請求書メールにマクロ付きファイルを添付し、開封後にC2サーバへ接続させる手口が、直近全国で報告されている。今回の型と一致する。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-reference-guideline',
              label: 'インシデント対応ガイドラインを確認する',
              line: 'インシデント対応ガイドラインを確認しました。感染が疑われる端末は、まずネットワークから論理的に隔離し、電源は落とさないこと。揮発性メモリに乗った証拠を失わないためです。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'door',
          position: [0.95, 0.5],
          label: 'サーバ室への扉',
          actions: [{ kind: 'goto', scene_id: 'scene-server', label: 'サーバ室へ移動する' }],
        },
      ],
    },
    {
      id: 'scene-server',
      title: 'サーバ室',
      background: 'bg-s1-server',
      hotspots: [
        {
          object_type: 'device',
          position: [0.18, 0.45],
          label: 'プロキシサーバ',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-proxy-log',
              label: 'プロキシログを確認する',
              line: '深夜帯、中野のPCから見覚えのない海外IPアドレスへ、約30分間隔で通信が続いている。典型的なビーコン通信のパターンだ。',
              speaker: '霧島',
            },
          ],
        },
        {
          object_type: 'device',
          position: [0.82, 0.45],
          label: 'メールサーバ',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-mail-log',
              label: 'メールサーバのログを確認する',
              line: '問題のメールを確認した。取引先名を騙った件名で、送信元は正規ドメインによく似た別ドメインだ。手口としては典型的だが、手が込んでいる。',
              speaker: '霧島',
            },
          ],
        },
        {
          object_type: 'person',
          position: [0.51, 0.43],
          label: 'サーバ管理者',
          prompt: 'サーバ管理者「どうしましたか？」',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-itstaff',
              label: '話を聞く',
              line: '情シス担当に聞きました。発覚直後、反射的に経理部PCの電源ケーブルに手をかけたものの、判断がつかず抜くのをためらい、対策室の到着を待ったそうです。',
              speaker: '橘',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-sandbox-analysis',
              label: 'PCを確認する',
              line: '回収した添付ファイルをサンドボックスで動かした。マクロが外部URLから追加のプログラムを取得し、プロキシログと同じ宛先へビーコン通信している。IoCとして他端末の調査にも使える。',
              speaker: '霧島',
            },
            { kind: 'noop', label: '何でもない' },
          ],
        },
        {
          object_type: 'door',
          position: [0.5, 0.9],
          label: '執務室への扉',
          actions: [{ kind: 'goto', scene_id: 'scene-office', label: '執務室へ移動する' }],
        },
      ],
    },
  ],
  cards: [
    {
      id: 'card-proxy-c2',
      type: 'ログ',
      source: 'プロキシサーバ',
      investigation_point_id: 'ip-proxy-log',
      body: '深夜帯、経理部 中野のPCから、聞き覚えのない海外IPアドレスへ約30分間隔で短い通信が繰り返し送信されている。典型的なビーコン通信のパターンに一致する。',
      is_dummy: false,
    },
    {
      id: 'card-proxy-noise',
      type: 'ログ',
      source: 'プロキシサーバ',
      investigation_point_id: 'ip-proxy-log',
      body: '同じ時間帯に契約中のクラウドバックアップサービスへの定期アップロードも記録されているが、宛先は正規の契約先ドメインであることを確認済み。',
      is_dummy: true,
    },
    {
      id: 'card-edr-macro',
      type: 'ログ',
      source: 'EDR(端末検知・対応)',
      investigation_point_id: 'ip-edr-alert',
      body: '中野のPCで、Excelファイルからのマクロ実行に続いて、見慣れないPowerShellプロセスが起動した記録をEDRが検知していた。',
      is_dummy: false,
    },
    {
      id: 'card-edr-noise',
      type: 'ログ',
      source: 'EDR(端末検知・対応)',
      investigation_point_id: 'ip-edr-alert',
      body: '同じ端末でウイルス対策ソフトの定義ファイル更新エラーも記録されているが、これは半年前から続く既知の警告で今回の件とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-sandbox-ioc',
      type: 'ログ',
      source: 'サンドボックス解析結果',
      investigation_point_id: 'ip-sandbox-analysis',
      body: '回収した添付ファイルを隔離環境(サンドボックス)で実行したところ、マクロが外部URLから追加のプログラムを取得し、プロキシログで確認されたものと同じ宛先へビーコン通信を行うことを確認した。この宛先はIoC(痕跡情報)として他端末の調査にも使える。',
      is_dummy: false,
    },
    {
      id: 'card-mail-phish',
      type: '通信記録',
      source: '社内メールサーバ',
      investigation_point_id: 'ip-mail-log',
      body: '問題のメールは実在する取引先名を騙り、件名は「請求書送付のご連絡」。添付はマクロ付きのExcelファイルで、送信元アドレスは正規の取引先ドメインとよく似た別ドメインだった。',
      is_dummy: false,
    },
    {
      id: 'card-mail-noise',
      type: '通信記録',
      source: '社内メールサーバ',
      investigation_point_id: 'ip-mail-log',
      body: '同時期に社内向け一斉連絡メールの誤送信が1件あったが、宛先設定ミスによる社内限りの事故であり本件とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-witness-nakano',
      type: '証言',
      source: '経理部 中野',
      investigation_point_id: 'ip-witness-nakano',
      body: '「月末で請求書処理が立て込んでいて、深く確認せずに開いてしまいました」と中野は証言。ファイルを開いた際にマクロ有効化の警告が出たが、「よくあることだと思い」有効にしたという。',
      is_dummy: false,
    },
    {
      id: 'card-witness-nakano-others',
      type: '証言',
      source: '経理部 中野',
      investigation_point_id: 'ip-witness-nakano',
      body: '「同僚にも似た件名のメールが届いていたが、他の人は不審に思って開かなかったと聞いた」と中野は話す。他の従業員の対応そのものは、今回の感染原因を裏付ける直接の証拠にはならない。',
      is_dummy: true,
    },
    {
      id: 'card-witness-itstaff-shutdown',
      type: '証言',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itstaff',
      body: '発覚直後、情シス担当は反射的に経理部PCの電源ケーブルに手をかけたが、判断がつかず抜くのをためらい、対策室の到着を待ったという。「このまま電源を落としてしまってよいものか」と迷いを口にしていた。',
      is_dummy: true,
    },
    {
      id: 'card-witness-manager',
      type: '証言',
      source: '経理部長',
      investigation_point_id: 'ip-witness-manager',
      body: '経理部長は「今月は取引先の請求サイクルが集中する時期で、多少雑な件名のメールでも本物だと思い込みやすい状況だった」と説明。添付ファイルのマクロ実行に関する社内規程の周知は徹底されていなかったという。',
      is_dummy: true,
    },
    {
      id: 'card-reference-advisory',
      type: '外部情報',
      source: 'セキュリティ注意喚起(業界団体)',
      investigation_point_id: 'ip-reference-advisory',
      body: '直近、取引先を装った請求書メールにマクロ付きファイルを添付し、開封後にC2サーバへ接続させる標的型メール攻撃の手口が全国的に報告されている、との注意喚起が出ている。',
      is_dummy: false,
    },
    {
      id: 'card-reference-guideline',
      type: '外部情報',
      source: 'インシデント対応ガイドライン',
      investigation_point_id: 'ip-reference-guideline',
      body: 'マルウェア感染が疑われる端末への初動は、ネットワークからの論理的な隔離(LANケーブル抜線・Wi-Fi無効化)を優先し、電源は切らないこととされている。電源を落とすと、プロセスや通信先の情報が乗った揮発性メモリの証拠が失われるため。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-isolate',
      type: '対策',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itstaff',
      body: '感染が疑われる端末をネットワークから論理的に隔離する(LANケーブル抜線・Wi-Fi無効化)。電源は落とさず、揮発性メモリとディスクの証拠を保全した後にIoCを抽出し、被害範囲を特定する。あわせて添付ファイルのマクロ自動実行を組織的に無効化し、標的型メールへの注意喚起を周知する。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-shutdown',
      type: '対策',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itstaff',
      body: '感染が疑われる端末の電源を直ちに落とし、被害の拡大を止める。',
      is_dummy: true,
    },
  ],
  resolution: {
    cipher_stages: [],
    // 会話モード(#42/T030)の問い列(spec §8.5「攻撃の起点 → 初動対応」の2問構成)。誤答肢の reply は
    // いずれも探索で集めたカードの内容を具体的に裏付けとして引用し、プレイヤーがカードドロワーで
    // 検証できる形にしている(#46/T035 本執筆)。
    questions: [
      {
        id: 'q-entry-point',
        subject_tag: '攻撃手法',
        speaker: '霧島',
        prompt: 'この侵入、どこから入られたと見る？',
        choices: [
          {
            text: '取引先を装った請求書メールの添付ファイル(マクロ悪用によるマルウェア感染)',
            is_correct: true,
            reply:
              'その通りだ。フィッシングメールの実在、マクロ実行の記録、C2通信の痕跡がすべて一直線に噛み合っている。',
          },
          {
            text: '公開サーバーの脆弱性を突かれた侵入',
            is_correct: false,
            reply:
              'その場合は境界の通信記録に外から内への不審なアクセスが残るはずだ。だがプロキシログにあるのは、中野のPCから外部へ一定間隔で送られるビーコン通信だけで、外からの侵入を示す痕跡はない。',
          },
          {
            text: 'ウイルス対策ソフトの定義ファイル更新エラーに乗じた侵入',
            is_correct: false,
            reply:
              'そのエラーは半年前から続く既知の警告で、時期が合わない。EDRが実際に捉えた不審な流れは、Excelのマクロ実行に続いてPowerShellが起動したところから始まっている。侵入口はそこだ。',
          },
        ],
        explanations: [
          '「怪しく見える」ことと「今回の侵入を裏付ける証拠であること」は違う。侵入口・実行痕跡・通信の証拠・当事者の証言が噛み合っているかを確かめよう。',
          '怪しい事象が「いつ」「何と同時に」起きたかを時系列で並べてみよう。半年前から続く警告と今回の侵入は別の話だ。マクロの実行→不審なプロセスの起動→外部への定期通信という一本の線で繋がる証拠がどれかを、カードから探せ。',
        ],
        consult_hint:
          'フィッシングメールの実在・マクロ実行の記録・C2通信の痕跡・中野の証言を分野で整理して提示する。',
      },
      {
        id: 'q-initial-response',
        subject_tag: 'インシデント対応',
        speaker: '橘',
        prompt: '感染が疑われる端末への初動対応は？',
        choices: [
          {
            text: 'ネットワークから論理的に隔離し(LANケーブル抜線・Wi-Fi無効化)、電源は落とさず揮発性メモリとディスクの証拠を保全する',
            is_correct: true,
            reply: 'それが正しい初動です。IoCを抽出して被害範囲の特定を進めましょう。',
          },
          {
            text: '感染が疑われる端末の電源を直ちに落とし、被害の拡大を止める',
            is_correct: false,
            reply:
              '電源を切れば、事件の証拠になり得る揮発性メモリの情報が失われます。まずネットワークから論理的に隔離し、メモリ→ディスクの順で証拠を保全してからでなければ、後の説明責任が果たせません。',
          },
        ],
        explanations: [
          '揮発性メモリには、動作中のプロセスや通信先の情報など、電源を切ると失われる証拠が乗っています。何が消えるかをまず考えましょう。',
          '証拠保全の原則は「揮発性の高い情報から」です。まずネットワークから論理的に隔離し、そのうえでメモリ→ディスクの順に保全する、という手順そのものが、後の報告・説明責任の裏付けになります。電源は落とさないでください。',
        ],
        consult_hint:
          'インシデント対応ガイドラインの原則(揮発性の高い情報から保全する)と、電源を落とすリスクを整理して提示する。',
      },
    ],
    clear_explanation: [
      {
        character: '霧島',
        line: '侵入口は取引先を装った請求書メールだ。マクロ付きファイルの実行でマルウェアが仕込まれ、C2への定期通信が確立した。感染端末はまず論理的に隔離し、電源を落とさずに揮発性メモリを保全する—これが鉄則だ。',
      },
      {
        character: '橘',
        line: '経理部長の証言にもあった通り、社内規程の周知不足も一因です。今回は個人情報の漏えいが確認されたわけではありませんが、取引先の請求データを扱う部署である以上、影響範囲の確認と、個人情報保護法に基づく報告要否の判断を怠らないでください。',
      },
    ],
    legal_refs: ['LAW-APPI-BREACH-REPORT'],
  },
}
