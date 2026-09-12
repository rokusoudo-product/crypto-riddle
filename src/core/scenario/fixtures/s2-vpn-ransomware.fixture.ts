// src/core/scenario/fixtures/s2-vpn-ransomware.fixture.ts — Issue #74(#6量産1本目)のプレイ用実データ。
//
// `scenarios/s2-vpn-ransomware.yaml` の内容をそのまま TypeScript の Scenario リテラルとして
// 写したもの。s1-targeted-email-intrusion.fixture.ts と同じ理由(scripts/build-data.ts の
// runBuild は Node 専用 API に依存しており、src/core/ 配下から import すると
// tsconfig.app.json のプログラムに Node 専用コードが取り込まれ `npm run typecheck` が壊れる)
// により、YAML と等価な内容を純粋な TypeScript リテラルとしてここに複製する。
// src/ui/store/game-store.ts はこのフィクスチャを `scenarios`(マップ選択の選択可能一覧)に
// 追加する(DEFAULT_SCENARIO は引き続き S1 のまま)。
//
// 内容を変更した場合は `scenarios/s2-vpn-ransomware.yaml` 側も同期すること
// (このファイルが唯一の正本ではなく、あくまで YAML の写しであることに注意。
// scripts/build-data.test.ts に両者の一致を確認する回帰テストがある)。
//
// **これは代表監修前のドラフト**(Issue #74)。教育内容・法制度の正確性は代表レビューを経て
// 確定する。
import type { Scenario } from '../../model/index.ts'

export const s2VpnRansomwareFixture: Scenario = {
  schema_version: '0.7.0',
  id: 's2-vpn-ransomware',
  title: 'VPN装置の脆弱性放置とランサムウェア感染',
  status: 'draft',
  map_order: 2,
  subject_tags: ['攻撃手法', '認証', 'インシデント対応', '法制度', 'ネットワーク基盤'],
  difficulty: 2,
  estimated_minutes: 15,
  references: [
    {
      material_kind: '攻撃手口',
      note: '境界に設置されたVPN装置の既知の脆弱性を放置したことによる不正アクセスから、窃取した認証情報を使ったPass-the-Hashによるラテラルムーブメントを経てランサムウェアに感染するという攻撃の流れというテーマ知識を参考にしたオリジナル創作。特定の年度・問題・特定の脆弱性(CVE)・特定の製品からの引用ではない。',
    },
    {
      material_kind: '技術要素',
      note: '資産管理台帳の不備によるパッチ適用漏れ、およびバックアップの3-2-1運用(複数世代・オフサイト・オフラインでの保管)というテーマ知識を参考にしたオリジナル創作。特定の年度・問題からの引用ではない。',
    },
  ],
  related_terms: [
    'term-vpn',
    'term-ransomware',
    'term-privilege-escalation',
    'term-incident-response-process',
    'term-digital-forensics',
    'term-log-analysis',
    'term-bcp',
    'term-appi-breach-report',
  ],
  intro: {
    background:
      'ある朝、精密機械部品メーカーの生産管理システムが一斉に使用不能になった。共有フォルダのファイルには見慣れない拡張子が付き、画面には身代金を要求するメッセージが表示されている。数か月前から更新の通知が滞っていた境界のVPN装置が、実は侵入の入口だったことが、対策室の到着後まもなく明らかになる。',
    victim_company: {
      name: '株式会社みなと精工',
      industry: '精密機械部品製造業',
      description:
        '自動車部品向けの精密加工部品を製造する中堅メーカー。取引先や在宅勤務者からの遠隔接続に境界のVPN装置を使っており、情報システム部門は少人数で運用を委託先に頼る部分も多く、機器の資産管理台帳の整備が後回しになっていた。',
    },
    character_intros: [
      {
        character: '霧島',
        line: '複数のサーバへ立て続けにログインした形跡がある。ラテラルムーブメントだ。まず侵入経路と被害範囲を洗おう。',
      },
      {
        character: '橘',
        line: 'バックアップも巻き込まれているようですね。身代金の話が出る前に、事実確認と報告要否の判断を急ぎましょう。',
      },
    ],
  },
  investigation_points: [
    {
      id: 'ip-vpn-log',
      category: 'ログを見る',
      label: 'VPN装置のアクセスログ',
      description: '境界に設置されたVPN装置への外部からの接続記録を確認する。',
    },
    {
      id: 'ip-auth-log',
      category: 'ログを見る',
      label: '認証サーバのログ',
      description: '社内サーバ群への認証・ログイン記録を確認する。',
    },
    {
      id: 'ip-fileserver-log',
      category: 'ログを見る',
      label: 'ファイルサーバの暗号化状況',
      description: '共有フォルダの暗号化被害の記録を確認する。',
    },
    {
      id: 'ip-backup-log',
      category: 'ログを見る',
      label: 'バックアップサーバの状態',
      description: 'バックアップサーバの接続状態と被害の記録を確認する。',
    },
    {
      id: 'ip-witness-itstaff',
      category: '人に聞く',
      label: '情シス担当への聞き取り',
      description: 'VPN装置の資産管理・更新運用の実態を本人に確認する。',
    },
    {
      id: 'ip-witness-manager',
      category: '人に聞く',
      label: '管理部門長への聞き取り',
      description: '業務への影響と今後の対応方針についての考えを聞く。',
    },
    {
      id: 'ip-witness-vendor',
      category: '人に聞く',
      label: 'VPN保守業者への聞き取り',
      description: 'VPN装置の設置・更新案内の経緯を委託先に確認する。',
    },
    {
      id: 'ip-reference-advisory',
      category: '文献を引く',
      label: '脆弱性対応・資産管理に関する注意喚起の確認',
      description: '境界機器の脆弱性放置に関する注意喚起を確認する。',
    },
    {
      id: 'ip-reference-guideline',
      category: '文献を引く',
      label: 'バックアップ運用ガイドラインの確認',
      description: 'バックアップの世代管理・保管方法に関する基本原則を確認する。',
    },
  ],
  scenes: [
    {
      id: 'scene-office',
      title: '執務室',
      background: 'bg-s2-office',
      hotspots: [
        {
          object_type: 'pc',
          position: [0.4, 0.65],
          label: '情シス管理端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-auth-log',
              label: '認証サーバのログを確認する',
              line: '深夜、経理システムの管理者アカウントを使って、数分の間に複数のサーバへ次々とログインした記録がある。パスワードそのものではなく認証情報のハッシュ値を使い回す、Pass-the-Hashによるラテラルムーブメントの典型的な挙動だ。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-fileserver-log',
              label: 'ファイルサーバの暗号化状況を確認する',
              line: 'ファイルサーバの共有フォルダを見た。数千件のファイルが短時間で見慣れない拡張子に置き換わっている。フォルダ直下には身代金を要求するメッセージファイルも置かれていた。ランサムウェアによる一括暗号化だ。',
              speaker: '霧島',
            },
            {
              kind: 'danger',
              label: '暗号化されたファイルサーバを再起動する',
              feedback:
                '橘「ここでサーバを再起動すると、感染直後のプロセスや接続先の情報が乗ったメモリ上の証拠が消えてしまいます。まずネットワークから論理的に切り離し、フォレンジック調査の前に電源操作はしないでください。」',
            },
            { kind: 'noop', label: '今は触らない' },
          ],
        },
        {
          object_type: 'person',
          position: [0.2, 0.4],
          label: '情シス担当',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-itstaff',
              label: '情シス担当に話を聞く',
              line: '情シス担当に聞きました。VPN装置は数年前に保守業者へ設置してもらったきりで、資産管理台帳には登録されておらず、ファームウェア更新の通知が来ていたことにも気づいていなかったそうです。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'person',
          position: [0.78, 0.55],
          label: '管理部門長',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-manager',
              label: '管理部門長に話を聞く',
              line: '管理部門長に伺いました。すでに一部の生産ラインの稼働に影響が出ており、一刻も早い復旧のためなら身代金の支払いも検討すべきではないか、との声が社内で出ているそうです。',
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
              label: '脆弱性対応・資産管理に関する注意喚起を確認する',
              line: '注意喚起を確認した。境界に設置されたVPN装置等の深刻な脆弱性が放置されると、そこを起点に社内ネットワークへ侵入され、認証情報の窃取や他端末への横展開に悪用される事例が全国的に報告されている。資産管理台帳で機器を把握し、深刻度の高い脆弱性から優先して更新するのが基本とされている。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-reference-guideline',
              label: 'バックアップ運用ガイドラインを確認する',
              line: 'バックアップ運用ガイドラインを確認しました。バックアップは複数世代を保持し、本番環境とは別の媒体・別の場所に、ネットワークから切り離した状態でも保管すること(3-2-1ルール)。常時オンライン接続のバックアップは、侵入時に本体ごと暗号化される危険があるためです。',
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
      background: 'bg-s2-server',
      hotspots: [
        {
          object_type: 'person',
          position: [0.51, 0.43],
          label: '保守業者',
          prompt: '保守業者「点検に伺いました。何かありましたか？」',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-vpn-log',
              label: 'VPN装置のログを確認する',
              line: 'VPN装置のログを確認した。深夜、海外のIPアドレスから、有効な社員アカウントを使った接続が記録されている。フィッシングの形跡はなく、パッチが未適用のまま放置されていた脆弱性を突かれて認証を突破された可能性が高い。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-vendor',
              label: '保守業者に話を聞く',
              line: '保守業者に聞きました。半年ほど前、VPN装置のファームウェアに重大な脆弱性が見つかったとして更新を案内するメールを送ったが、その後の返信も更新作業の依頼もなく、そのままになっていたそうです。',
              speaker: '橘',
            },
            { kind: 'noop', label: '何でもない' },
          ],
        },
        {
          object_type: 'device',
          position: [0.18, 0.45],
          label: 'バックアップサーバ',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-backup-log',
              label: 'バックアップサーバの状態を確認する',
              line: 'バックアップサーバを確認した。本番ネットワークに常時オンラインで接続されており、同じ管理者アカウントでアクセスできる状態だった。直近の世代のバックアップも、横展開の過程で他のファイルと同様に暗号化されており、そのままでは復旧に使えない。',
              speaker: '霧島',
            },
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
      id: 'card-vpn-breach',
      type: 'ログ',
      source: 'VPN装置',
      investigation_point_id: 'ip-vpn-log',
      body: '深夜、海外のIPアドレスから、有効な社員アカウントを使ったVPN接続が記録されている。同時刻に本人からの正規利用の申告はなく、認証情報が何らかの方法で窃取された可能性が高い。',
      is_dummy: false,
    },
    {
      id: 'card-vpn-noise',
      type: 'ログ',
      source: 'VPN装置',
      investigation_point_id: 'ip-vpn-log',
      body: '同時間帯に別の社員が海外出張先から正規にVPN接続した記録もあるが、事前に届け出のあった出張予定と一致しており、今回の侵入とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-auth-pth',
      type: 'ログ',
      source: '認証サーバ',
      investigation_point_id: 'ip-auth-log',
      body: '数分の間に、同一の管理者アカウントの認証情報(ハッシュ)を使って、複数のサーバへ次々とログインした記録がある。パスワードそのものを再入力した形跡はなく、Pass-the-Hashによるラテラルムーブメントの典型的なパターンに一致する。',
      is_dummy: false,
    },
    {
      id: 'card-auth-noise',
      type: 'ログ',
      source: '認証サーバ',
      investigation_point_id: 'ip-auth-log',
      body: '同時期に定例のパスワード一斉変更作業のログも残っているが、事前に周知されていた通常運用であり今回の侵入とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-fileserver-ransom',
      type: 'ログ',
      source: 'ファイルサーバ',
      investigation_point_id: 'ip-fileserver-log',
      body: 'ファイルサーバの共有フォルダ内、数千件のファイルが短時間で見慣れない拡張子に置き換わっている。フォルダ直下には身代金を要求するメッセージファイルが設置されており、暗号化はランサムウェアによるものと断定できる。',
      is_dummy: false,
    },
    {
      id: 'card-fileserver-noise',
      type: 'ログ',
      source: 'ファイルサーバ',
      investigation_point_id: 'ip-fileserver-log',
      body: '同じサーバで先月実施された定期データ移行作業のログも残っているが、正常に完了しており今回の被害とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-backup-online',
      type: 'ログ',
      source: 'バックアップサーバ',
      investigation_point_id: 'ip-backup-log',
      body: 'バックアップサーバは本番ネットワークに常時オンラインで接続されており、同じ管理者アカウントでアクセスできる状態だった。直近の世代のバックアップも、横展開の過程で他のファイルと同様に暗号化されている。',
      is_dummy: false,
    },
    {
      id: 'card-backup-offline-old',
      type: 'ログ',
      source: 'バックアップサーバ',
      investigation_point_id: 'ip-backup-log',
      body: '半年以上前に取得した古い世代のバックアップメディアが、ネットワークから切り離した状態で倉庫に保管されていたことが確認された。ただし世代が古く、そのまま復旧に使うと直近半年分の業務データが失われる。',
      is_dummy: false,
    },
    {
      id: 'card-witness-itstaff',
      type: '証言',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itstaff',
      body: '情シス担当は「VPN装置は数年前に保守業者に設置してもらったきりで、資産管理台帳には登録されておらず、ファームウェア更新の通知が来ていたことにも気づいていなかった」と証言した。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-isolate',
      type: '対策',
      source: '情報システム部',
      investigation_point_id: 'ip-witness-itstaff',
      body: '感染が疑われる端末・サーバをネットワークから論理的に隔離する(スイッチポート無効化等)。電源は落とさず、メモリとディスクの証拠を保全した上でIoCを抽出し、被害範囲を特定する。あわせて資産管理台帳を整備し、深刻度の高い脆弱性から優先してVPN装置等のファームウェアを更新する。',
      is_dummy: false,
    },
    {
      id: 'card-witness-manager',
      type: '証言',
      source: '管理部門長',
      investigation_point_id: 'ip-witness-manager',
      body: '管理部門長は「一部の生産ラインの稼働にすでに影響が出ている。一刻も早い復旧のためなら、身代金の支払いも選択肢として検討すべきではないか」と述べた。',
      is_dummy: true,
    },
    {
      id: 'card-countermeasure-payransom',
      type: '対策',
      source: '管理部門長',
      investigation_point_id: 'ip-witness-manager',
      body: '早期の業務再開を最優先し、要求どおり身代金を支払って復号キーを入手する。',
      is_dummy: true,
    },
    {
      id: 'card-witness-vendor',
      type: '証言',
      source: 'VPN保守業者',
      investigation_point_id: 'ip-witness-vendor',
      body: '保守業者は「半年ほど前、VPN装置のファームウェアに重大な脆弱性が見つかったとして更新を案内するメールを送ったが、その後の返信も更新作業の依頼もなく、そのままになっていた」と証言した。',
      is_dummy: false,
    },
    {
      id: 'card-witness-vendor-other',
      type: '証言',
      source: 'VPN保守業者',
      investigation_point_id: 'ip-witness-vendor',
      body: '保守業者は他の複数の顧客先でも同型のVPN装置を保守しているが、それらの顧客では期限内に更新作業が完了していると説明した。他社の対応状況そのものは、今回の被害原因を直接裏付ける証拠にはならない。',
      is_dummy: true,
    },
    {
      id: 'card-reference-advisory',
      type: '外部情報',
      source: 'セキュリティ注意喚起(業界団体)',
      investigation_point_id: 'ip-reference-advisory',
      body: '境界に設置されたVPN装置等の深刻な脆弱性が放置されると、そこを起点に社内ネットワークへ侵入され、認証情報の窃取や他端末への横展開に悪用される事例が全国的に報告されている、との注意喚起が出ている。資産管理台帳で機器を把握し、深刻度の高い脆弱性から優先して更新することが基本とされている。',
      is_dummy: false,
    },
    {
      id: 'card-reference-guideline',
      type: '外部情報',
      source: 'バックアップ運用ガイドライン',
      investigation_point_id: 'ip-reference-guideline',
      body: 'バックアップは複数世代を保持し、本番環境とは別の媒体・別の場所に、ネットワークから切り離した状態でも保管することとされている(3-2-1ルール)。常時オンライン接続のバックアップは、侵入時に本体ごと暗号化される危険があるため。',
      is_dummy: false,
    },
  ],
  resolution: {
    cipher_stages: [],
    questions: [
      {
        id: 'q-entry-point',
        subject_tag: '攻撃手法',
        speaker: '霧島',
        prompt: '今回の侵入、どこから入られたと見る？',
        choices: [
          {
            text: '境界に設置されたVPN装置の、更新されていなかった深刻な脆弱性を突かれた不正アクセス',
            is_correct: true,
            reply:
              'その通りだ。VPN装置のログに残る不審な接続、保守業者への更新案内が放置されていた証言、資産管理台帳に機器そのものが載っていなかった実態がすべて一直線に噛み合っている。',
          },
          {
            text: '経理部宛の標的型メールによるマルウェア感染',
            is_correct: false,
            reply:
              'その場合はメールサーバのログに不審な着信が残るはずだ。だが確認できたのはVPN装置への外部からの接続記録だけで、メール経由の侵入を示す痕跡はない。',
          },
          {
            text: '内部の従業員による不正な持ち出し',
            is_correct: false,
            reply:
              '内部犯行なら社内端末からの操作記録が残るはずだが、認証ログはすべて外部の海外IPアドレスからのVPN接続に基づいている。内部からの操作を示す証跡はない。',
          },
        ],
        explanations: [
          '「怪しく見える」ことと「今回の侵入経路を裏付ける証拠であること」は違う。境界の機器・認証ログ・関係者の証言が、時系列でどう繋がるかを確かめよう。',
          '侵入の起点は、境界に接する機器から探すのが定石だ。VPN装置のアクセスログと、その機器の管理状況についての証言、両方が同じ結論を指しているかをカードで確かめよう。',
        ],
        consult_hint:
          'VPN装置への不審な接続記録・保守業者からの更新案内が放置されていた証言・資産管理台帳の不備を分野で整理して提示する。',
      },
      {
        id: 'q-initial-response',
        subject_tag: 'インシデント対応',
        speaker: '橘',
        prompt: 'ランサムウェアによる暗号化が確認された状況で、感染したサーバへの初動対応は？',
        choices: [
          {
            text: 'サーバをネットワークから論理的に切り離し、電源は落とさずメモリ・ディスクの証拠を保全した上で被害範囲を特定する',
            is_correct: true,
            reply:
              'それが正しい初動です。ラテラルムーブメントの痕跡を辿って、被害範囲の特定を進めましょう。',
          },
          {
            text: '直ちにサーバを再起動して復旧を試みる',
            is_correct: false,
            reply:
              '再起動すれば、感染直後のプロセスや接続先の情報が乗ったメモリ上の証拠が失われます。原因の特定も被害範囲の確認もできなくなり、マルウェアが再び動き出すおそれもあります。まずネットワークからの切り離しを優先してください。',
          },
        ],
        explanations: [
          '電源を落とす・再起動するといった操作で真っ先に失われるものは何か、考えてみましょう。',
          '証拠保全の原則は「揮発性の高い情報から」です。まずネットワークから論理的に切り離し、そのうえでメモリ→ディスクの順に保全する—この手順そのものが、後の被害範囲特定と報告の裏付けになります。',
        ],
        consult_hint:
          '揮発性の高い証拠から保全する原則と、再起動によって失われる情報を整理して提示する。',
      },
      {
        id: 'q-response-policy',
        subject_tag: '法制度',
        speaker: '橘',
        prompt: 'バックアップも暗号化され、復旧の目処が立たない状況です。今後の対応方針は？',
        choices: [
          {
            text: '身代金は支払わず、警察・専門家と連携しながら復旧を進め、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断する',
            is_correct: true,
            reply:
              'その判断が妥当です。支払いに応じても復号される保証はありませんし、報告義務の判断を後回しにはできません。',
          },
          {
            text: '早期の業務再開を優先し、要求どおり身代金を支払って復号キーを入手する',
            is_correct: false,
            reply:
              '支払っても復号される保証はなく、支払いが攻撃者への資金供与となって再び標的にされるおそれもあります。個人データの漏えいのおそれがある以上、報告義務の判断も別途必要です。',
          },
          {
            text: '業務への影響を避けるため、社内対応のみで済ませ外部への報告は行わない',
            is_correct: false,
            reply:
              '個人データの漏えいのおそれが大きい場合、個人情報保護委員会への報告(速報・確報の二段階)は法律上の義務です。報告を怠れば、インシデント対応とは別の法的リスクを負うことになります。',
          },
        ],
        explanations: [
          '「早く元に戻したい」という気持ちと、「取るべき手続き」は別に考えよう。支払いのリスクと、法律上の義務、それぞれを分けて整理してみよう。',
          '身代金の支払いは犯罪組織への資金供与になりかねず、復号の保証もありません。加えて、個人データの漏えいのおそれがある場合の報告義務(速報・確報)は、業務都合とは無関係に生じる法律上の義務です。',
        ],
        consult_hint:
          '身代金支払いのリスク(復号の保証がない・資金供与になる)と、個人情報保護委員会への報告義務(速報・確報)を整理して提示する。',
      },
    ],
    clear_explanation: [
      {
        character: '霧島',
        line: '侵入口は、更新が放置されていたVPN装置の脆弱性だ。窃取した認証情報でPass-the-Hashによる横展開を許し、ファイルサーバとバックアップサーバの双方がランサムウェアに暗号化された。感染機器はまず論理的に隔離し、電源を落とさず証拠を保全する—これが鉄則だ。',
      },
      {
        character: '橘',
        line: '資産管理台帳が整備されていれば、更新の放置にはもっと早く気づけたはずです。バックアップも、常時オンラインで繋ぎっぱなしにせず、複数世代・オフラインでの保管(3-2-1ルール)を徹底しておくべきでした。身代金は支払わず、個人情報保護委員会への報告要否の判断も忘れないでください。',
      },
    ],
    legal_refs: ['LAW-APPI-BREACH-REPORT'],
  },
}
