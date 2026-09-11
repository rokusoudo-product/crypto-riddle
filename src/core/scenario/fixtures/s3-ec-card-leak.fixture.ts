// src/core/scenario/fixtures/s3-ec-card-leak.fixture.ts — Issue #75(#6量産2本目)のプレイ用実データ。
//
// `scenarios/s3-ec-card-leak.yaml` の内容をそのまま TypeScript の Scenario リテラルとして
// 写したもの。s1-targeted-email-intrusion.fixture.ts / s2-vpn-ransomware.fixture.ts と同じ理由
// (scripts/build-data.ts の runBuild は Node 専用 API に依存しており、src/core/ 配下から import
// すると tsconfig.app.json のプログラムに Node 専用コードが取り込まれ `npm run typecheck` が壊れる)
// により、YAML と等価な内容を純粋な TypeScript リテラルとしてここに複製する。
// src/ui/store/game-store.ts はこのフィクスチャを `scenarios`(マップ選択の選択可能一覧)に
// 追加する(DEFAULT_SCENARIO は引き続き S1 のまま)。
//
// 内容を変更した場合は `scenarios/s3-ec-card-leak.yaml` 側も同期すること
// (このファイルが唯一の正本ではなく、あくまで YAML の写しであることに注意。
// scripts/build-data.test.ts に両者の一致を確認する回帰テストがある)。
//
// **これは代表監修前のドラフト**(Issue #75)。教育内容・決済規格(PCI DSS)・法制度の正確性は
// 代表レビューを経て確定する。
import type { Scenario } from '../../model/index.ts'

export const s3EcCardLeakFixture: Scenario = {
  schema_version: '0.6.0',
  id: 's3-ec-card-leak',
  title: 'ECサイトのカード情報漏洩',
  status: 'draft',
  map_order: 3,
  subject_tags: ['Web', '攻撃手法', 'インシデント対応', '法制度'],
  difficulty: 3,
  estimated_minutes: 15,
  references: [
    {
      material_kind: '攻撃手口',
      note: '決済ページのスクリプトが改ざんされ、入力中のカード情報がブラウザから直接外部のサーバへ送信されるフォームジャッキング(Webスキミング)という攻撃の手口というテーマ知識を参考にしたオリジナル創作。特定の年度・問題・特定の被害事例からの引用ではない。',
    },
    {
      material_kind: '技術要素',
      note: 'クレジットカード情報の非保持化・PCI DSSによるスコープ削減の考え方、WAFが防げる範囲とコンテンツセキュリティポリシー(CSP)・改ざん検知による対策の位置づけというテーマ知識を参考にしたオリジナル創作。特定の年度・問題からの引用ではない。',
    },
  ],
  related_terms: [
    'term-sql-injection',
    'term-cross-site-scripting',
    'term-https',
    'term-digital-forensics',
    'term-incident-response-process',
    'term-log-analysis',
    'term-appi-breach-report',
  ],
  intro: {
    background:
      '深夜、通信販売会社「つきかげ通販」に、複数の顧客から「身に覚えのないカード利用明細が届いた」という問い合わせが立て続けに入った。調べると、いずれも直近で自社ECサイトで買い物をした顧客だった。カード番号は自社のデータベースには一切保存していないはずなのに、なぜカード情報が漏れたのか——対策室に緊急招集がかかる。',
    victim_company: {
      name: '株式会社つきかげ通販',
      industry: '通信販売業(EC事業)',
      description:
        '日用品・生活雑貨を扱う通信販売会社。自社ECサイトで注文から決済までを完結させており、カード番号を自社サーバに保存しない「非保持化」の運用を掲げているが、サイトの一部機能(お知らせ機能等)で使うプラグインの更新管理は開発委託先に任せきりになっていた。',
    },
    character_intros: [
      {
        character: '霧島',
        line: 'カード番号を自社で持っていないなら、漏れた場所は別にあるはずだ。まず決済ページそのものを疑おう。',
      },
      {
        character: '橘',
        line: 'カード会社への連絡と、報告義務の判断も並行して進めます。まずは事実確認からです。',
      },
    ],
  },
  investigation_points: [
    {
      id: 'ip-db-audit',
      category: 'ログを見る',
      label: '決済関連データベースの監査',
      description: '決済関連データベースにカード情報が保存されていたかどうかを確認する。',
    },
    {
      id: 'ip-waf-log',
      category: 'ログを見る',
      label: 'WAFのログ',
      description: '決済ページに対するWAF(Web Application Firewall)の検知・遮断記録を確認する。',
    },
    {
      id: 'ip-access-log',
      category: 'ログを見る',
      label: 'Webサーバのアクセスログ',
      description: 'Webサーバへの外部からの不審なアクセス記録を確認する。',
    },
    {
      id: 'ip-checkout-tamper',
      category: 'ログを見る',
      label: '決済ページの改ざん検知',
      description: '決済ページのスクリプトファイルが改ざんされていないかを確認する。',
    },
    {
      id: 'ip-witness-ec-staff',
      category: '人に聞く',
      label: 'EC運営担当者への聞き取り',
      description: 'EC運営担当者にサイト運用の実態を確認する。',
    },
    {
      id: 'ip-witness-dev-vendor',
      category: '人に聞く',
      label: '開発委託先への聞き取り',
      description: '開発委託先にプラグインの管理・更新状況を確認する。',
    },
    {
      id: 'ip-witness-manager',
      category: '人に聞く',
      label: '管理部門長への聞き取り',
      description: '管理部門長に被害状況と今後の対応方針についての考えを聞く。',
    },
    {
      id: 'ip-reference-pcidss',
      category: '文献を引く',
      label: 'PCI DSS・非保持化に関する資料の確認',
      description: 'クレジットカード情報の非保持化・PCI DSSに関する基本的な考え方を確認する。',
    },
    {
      id: 'ip-reference-advisory',
      category: '文献を引く',
      label: 'フォームジャッキングに関する注意喚起の確認',
      description: 'フォームジャッキング(Webスキミング)に関する注意喚起を確認する。',
    },
  ],
  scenes: [
    {
      id: 'scene-office',
      title: '執務室',
      background: 'bg-s3-office',
      hotspots: [
        {
          object_type: 'pc',
          position: [0.4, 0.65],
          label: 'EC運営担当者の端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-db-audit',
              label: 'カード情報の保存状況を確認する',
              line: '決済まわりのデータベースを確認した。注文番号や配送先は記録されているが、カード番号や有効期限はどの列にも保存されていない。非保持化の運用は徹底されていたようだ。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-waf-log',
              label: 'WAFのログを確認する',
              line: 'WAFのログを確認した。決済ページ宛てにSQLインジェクションを試みたと見られるリクエストが複数記録されているが、いずれもブロックされている。ただしWAFは、ブラウザから外部への通信までは監視していない。',
              speaker: '霧島',
            },
            {
              kind: 'danger',
              label: '改ざんに気づいた決済ページのファイルを、証拠を残さずすぐに元へ書き戻す',
              feedback:
                '橘「証拠を残さずに書き戻してしまうと、いつ・どのようにスクリプトが追加され、どこへデータが送られていたのかという手がかりが失われます。まず該当ページを一時停止し、改ざんされたファイルと通信先を保全してから対応してください。」',
            },
            { kind: 'noop', label: '今は触らない' },
          ],
        },
        {
          object_type: 'person',
          position: [0.2, 0.4],
          label: 'EC運営担当者',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-ec-staff',
              label: 'EC運営担当者に話を聞く',
              line: 'EC運営担当者に聞きました。最近サイトの見た目や決済画面に自分たちで手を加えた覚えはなく、CMSやプラグインのバージョン管理は開発委託先に任せきりだったそうです。',
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
              line: '管理部門長に伺いました。すでに複数の顧客から不正利用の申告が入っており、風評への影響を心配して、原因がはっきりするまで公表を控えたいという声も出ているそうです。',
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
              investigation_point_id: 'ip-reference-pcidss',
              label: 'PCI DSS・非保持化に関する資料を確認する',
              line: 'PCI DSSに関する資料を確認しました。PCI DSSは法律ではなく、国際カードブランドが定める業界基準です。カード番号を自社で保持しない「非保持化」はこの基準の対象範囲を狭める有効な対策ですが、決済ページ自体が改ざんされる攻撃までは防げません。',
              speaker: '橘',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-reference-advisory',
              label: 'フォームジャッキングに関する注意喚起を確認する',
              line: '注意喚起を確認した。決済ページのスクリプトを改ざんし、入力中のカード情報を確定前にブラウザから外部のサーバへ直接送信させる、フォームジャッキング(Webスキミング)と呼ばれる手口が全国的に報告されている。今回の型に近い。',
              speaker: '霧島',
            },
          ],
        },
        {
          object_type: 'door',
          position: [0.95, 0.5],
          label: 'システム運用ルームへの扉',
          actions: [{ kind: 'goto', scene_id: 'scene-ops-room', label: 'システム運用ルームへ移動する' }],
        },
      ],
    },
    {
      id: 'scene-ops-room',
      title: 'システム運用ルーム',
      background: 'bg-s3-ops-room',
      hotspots: [
        {
          object_type: 'device',
          position: [0.18, 0.45],
          label: '運用監視端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-access-log',
              label: 'Webサーバのアクセスログを確認する',
              line: 'Webサーバのアクセスログを確認した。深夜、お知らせ機能で使っている更新の遅れたプラグインの管理画面宛てに、公表済みの脆弱性を突く典型的なリクエストパターンが記録されている。',
              speaker: '霧島',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-checkout-tamper',
              label: '決済ページの改ざん検知ログを確認する',
              line: '決済ページのファイルを、正規のバックアップと比較した。スクリプトの末尾に見慣れないコードが追加されており、入力されたカード番号・有効期限・セキュリティコードを、フォーム送信前に外部の見知らぬドメインへ直接送っていた。',
              speaker: '霧島',
            },
          ],
        },
        {
          object_type: 'person',
          position: [0.51, 0.43],
          label: '開発委託先の担当者',
          prompt: '開発委託先「何かお困りですか？」',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-witness-dev-vendor',
              label: '開発委託先に話を聞く',
              line: '開発委託先に聞きました。数か月前、お知らせ機能で使っているプラグインに深刻な脆弱性が公表され、更新を案内していたが、他の連携機能への影響確認に時間がかかり、適用が後回しになっていたそうです。',
              speaker: '橘',
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
      id: 'card-waf-sqli-attempt',
      type: 'ログ',
      source: 'WAF',
      investigation_point_id: 'ip-waf-log',
      body: '深夜、決済ページ宛てにSQLインジェクションを試みたと見られる不審なリクエストが複数記録されているが、いずれもWAFによってブロックされており、データベースへの到達は確認されていない。',
      is_dummy: true,
    },
    {
      id: 'card-waf-no-egress',
      type: 'ログ',
      source: 'WAF',
      investigation_point_id: 'ip-waf-log',
      body: 'WAFは既知の攻撃パターン(SQLインジェクション等)を検知して遮断する仕組みであり、正規のスクリプトを装ってブラウザから外部へ送信される通信までは監視・遮断の対象にしていない。',
      is_dummy: false,
    },
    {
      id: 'card-access-plugin-exploit',
      type: 'ログ',
      source: 'Webサーバ',
      investigation_point_id: 'ip-access-log',
      body: '深夜、お知らせ機能で使っている更新の遅れたプラグインの管理画面宛てに、公表済みの脆弱性を突く典型的なリクエストパターンが記録されている。ファイル書き込みを伴う操作が成功した形跡がある。',
      is_dummy: false,
    },
    {
      id: 'card-access-noise',
      type: 'ログ',
      source: 'Webサーバ',
      investigation_point_id: 'ip-access-log',
      body: '同じ週、検索エンジンのクローラーによるアクセスが普段より増加しているが、正規のクローラーのものと確認済みで今回の被害とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-checkout-tamper-script',
      type: 'ログ',
      source: '決済ページ',
      investigation_point_id: 'ip-checkout-tamper',
      body: '決済ページのスクリプトファイルを正規のバックアップと比較したところ、末尾に見慣れないコードが追加されていた。追加されたコードは、入力されたカード番号・有効期限・セキュリティコードを、フォームの送信を待たずに外部の見知らぬドメインへ直接送信していた。',
      is_dummy: false,
    },
    {
      id: 'card-checkout-tamper-marketing',
      type: 'ログ',
      source: '決済ページ',
      investigation_point_id: 'ip-checkout-tamper',
      body: '同じ時期、マーケティング部門が依頼したアクセス解析タグの追加も確認されたが、正規の依頼であることが確認されており、今回の不審なコードとは別物。',
      is_dummy: true,
    },
    {
      id: 'card-db-nonstorage',
      type: 'ログ',
      source: '決済関連データベース',
      investigation_point_id: 'ip-db-audit',
      body: '注文データベースを確認した。注文番号・商品情報・配送先は記録されているが、カード番号や有効期限、セキュリティコードはどの列にも保存されていない。カード情報は決済代行事業者側でのみ扱う「非保持化」の運用が徹底されている。',
      is_dummy: false,
    },
    {
      id: 'card-db-old-sqli-report',
      type: 'ログ',
      source: '過去のセキュリティ診断報告書',
      investigation_point_id: 'ip-db-audit',
      body: '数か月前のセキュリティ診断で、会員検索機能に軽微なSQLインジェクションの脆弱性が指摘されていた記録が見つかったが、修正済みであり、かつそもそもカード情報を保存していないデータベースであるため、今回の漏えいの原因ではない。',
      is_dummy: true,
    },
    {
      id: 'card-witness-ec-staff',
      type: '証言',
      source: 'EC運営担当者',
      investigation_point_id: 'ip-witness-ec-staff',
      body: 'EC運営担当者は「最近サイトの見た目や決済画面に自分たちで手を加えた覚えはない。CMSやプラグインのバージョン管理は開発委託先に任せきりになっていた」と証言した。',
      is_dummy: false,
    },
    {
      id: 'card-witness-ec-staff-noise',
      type: '証言',
      source: 'EC運営担当者',
      investigation_point_id: 'ip-witness-ec-staff',
      body: '同担当者は「おすすめ商品を表示する機能を先月リニューアルしたばかりだった」とも話したが、これは決済ページとは別の機能であり、今回の被害とは無関係。',
      is_dummy: true,
    },
    {
      id: 'card-witness-dev-vendor',
      type: '証言',
      source: '開発委託先',
      investigation_point_id: 'ip-witness-dev-vendor',
      body: '開発委託先は「数か月前、お知らせ機能で使っているプラグインに深刻な脆弱性が公表され、更新を案内していたが、他の連携機能への影響確認に時間がかかり、適用が後回しになっていた」と証言した。',
      is_dummy: false,
    },
    {
      id: 'card-witness-dev-vendor-other',
      type: '証言',
      source: '開発委託先',
      investigation_point_id: 'ip-witness-dev-vendor',
      body: '開発委託先は他の複数の顧客サイトでも同じプラグインを保守しているが、それらのサイトでは期限内に更新作業が完了していると説明した。他社の対応状況そのものは、今回の被害原因を直接裏付ける証拠にはならない。',
      is_dummy: true,
    },
    {
      id: 'card-countermeasure-contain-and-patch',
      type: '対策',
      source: '開発委託先',
      investigation_point_id: 'ip-witness-dev-vendor',
      body: '決済ページの公開を一時停止するかカード決済の受付を止め、改ざんされたファイルと外部への通信先を保全する。並行して脆弱性のあるプラグインを修正し、コンテンツセキュリティポリシー(CSP)でスクリプトの読み込み先を制限し、ファイルの改ざん検知の仕組みを強化する。',
      is_dummy: false,
    },
    {
      id: 'card-witness-manager',
      type: '証言',
      source: '管理部門長',
      investigation_point_id: 'ip-witness-manager',
      body: '管理部門長は「すでに複数の顧客から不正利用の申告が入っている。原因がはっきりするまでは、風評への影響を考えて公表を控えたい」と述べた。',
      is_dummy: true,
    },
    {
      id: 'card-countermeasure-silence',
      type: '対策',
      source: '管理部門長',
      investigation_point_id: 'ip-witness-manager',
      body: '評判への影響を避けるため、原因が確定するまで公表や関係者への連絡は控える。',
      is_dummy: true,
    },
    {
      id: 'card-reference-pcidss',
      type: '外部情報',
      source: 'PCI DSS・非保持化に関する資料',
      investigation_point_id: 'ip-reference-pcidss',
      body: 'PCI DSS(Payment Card Industry Data Security Standard)は、国際カードブランドが定める業界基準であり法律ではない。カード番号を自社で保存しない「非保持化」の運用は、この基準の対象範囲を狭め、データベース漏えい時の被害を抑える有効な対策だが、決済ページ自体が改ざんされ、入力中の情報を直接盗み取る攻撃までは防げない。',
      is_dummy: false,
    },
    {
      id: 'card-reference-advisory',
      type: '外部情報',
      source: 'セキュリティ注意喚起(業界団体)',
      investigation_point_id: 'ip-reference-advisory',
      body: '決済ページのスクリプトを改ざんし、入力中のカード情報をフォーム送信前にブラウザから外部のサーバへ直接送信させる、フォームジャッキング(Webスキミング)と呼ばれる手口が全国的に報告されている。対策として、脆弱性の早期修正に加え、コンテンツセキュリティポリシー(CSP)による通信先の制限や、ファイルの改ざん検知が有効とされる。WAFだけでは防ぎきれない。',
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
        prompt: 'カード情報は自社のデータベースに保存していなかった。それなのになぜ漏れたと見る？',
        choices: [
          {
            text: '決済ページのスクリプトが改ざんされ、入力中のカード情報が確定前にブラウザから外部のサーバへ直接送信されていた(フォームジャッキング)',
            is_correct: true,
            reply:
              'その通りだ。改ざん検知で見つかった追加コード、その送信先の外部ドメイン、フォーム送信前に送られていたという挙動—すべてが一致している。',
          },
          {
            text: 'SQLインジェクションでデータベースから直接カード番号が抜き取られた',
            is_correct: false,
            reply:
              'WAFのログにはSQLインジェクションを試みた形跡が残っているが、いずれもブロックされている。しかもデータベースを確認した限り、そもそもカード番号は保存されていない。抜き取りようがない。',
          },
          {
            text: '内部の従業員が顧客の決済情報を不正に持ち出した',
            is_correct: false,
            reply:
              '内部の持ち出しなら管理画面や決済システムへの不審な操作記録が残るはずだが、そうした痕跡は見当たらない。不審な痕跡は決済ページのファイルそのものの改ざんに集中している。',
          },
        ],
        explanations: [
          '「カードを保存していない」という前提を疑う前に、どこで情報が抜き取られたかを先に確定させよう。データベースを疑う根拠と、決済ページそのものを疑う根拠、どちらがより直接的か比べてみよう。',
          '非保持化(カード番号を自社で保存しない運用)は、データベースが破られたときの被害を防ぐための対策だ。データベースに何も無いのにカード情報が漏れたのなら、漏れた場所はデータベースの外—つまり顧客が入力した瞬間、ブラウザ側にあると考えるのが筋だ。',
        ],
        consult_hint:
          '決済ページの改ざん検知で見つかった不審なスクリプト・その送信先・WAFのSQLインジェクション試行がブロック済みだった事実・データベースにカード番号が保存されていなかった監査結果を分野で整理して提示する。',
      },
      {
        id: 'q-immediate-response',
        subject_tag: 'Web',
        speaker: '霧島',
        prompt: '決済ページの改ざんが確認できました。技術的にまず取るべき対応は？',
        choices: [
          {
            text: '決済ページを一時停止するかカード決済の受付を止め、改ざんされたファイルと通信先を保全した上で、脆弱性のあるプラグインを修正してから正規のファイルに戻す',
            is_correct: true,
            reply: 'それが正しい流れだ。証拠を保全しつつ攻撃の経路を断てば、被害の全容も後から検証できる。',
          },
          {
            text: '気づかれないよう不正なスクリプトだけをそっと削除し、サイトの運営は普段どおり続ける',
            is_correct: false,
            reply:
              'スクリプトを消してしまうと、いつ・どこへ送信されていたかという証拠が消える。しかも侵入口になったプラグインの脆弱性が残ったままでは、同じ手口でまた改ざんされかねない。',
          },
          {
            text: '影響は限定的とみて、次回の定期システム更新のタイミングでまとめて修正する',
            is_correct: false,
            reply:
              'このスクリプトが動いている限り、今も入力中のカード情報が外部へ送られ続けているおそれがある。悠長に構えている時間はない。まず決済ページを止め、送信を断ち切ることが最優先だ。',
          },
        ],
        explanations: [
          '電源を落とす・ファイルを消す・様子を見るといった対応で、それぞれ何が失われ、何が止まらないままなのかを整理しよう。',
          '証拠保全と被害の拡大防止は両立できる。決済の受付を止めて送信を断ち切りつつ、改ざんされたファイルと通信先はそのまま保全し、原因(脆弱なプラグイン)を修正してから正規の状態に戻す—この順番が鉄則だ。',
        ],
        consult_hint: '改ざんされたファイル・通信先の保全の必要性と、脆弱性が残ったまま放置するリスクを整理して提示する。',
      },
      {
        id: 'q-response-policy',
        subject_tag: '法制度',
        speaker: '橘',
        prompt: 'クレジットカード情報の漏えいが濃厚な状況です。今後の対応方針は？',
        choices: [
          {
            text: 'カード会社・決済代行事業者へ速やかに連絡するとともに、個人データの漏えいのおそれがある以上、個人情報保護委員会への報告要否を速やかに判断し、必要な範囲で本人への通知も行う',
            is_correct: true,
            reply:
              'その判断が妥当です。カード会社側での不正利用の監視にもつながりますし、報告義務の判断も後回しにはできません。',
          },
          {
            text: '自社のデータベースにはカード番号を保存していなかったのだから、個人情報保護委員会への報告は不要と判断する',
            is_correct: false,
            reply:
              '保存していたかどうかではなく、決済ページという自社の管理下にある場所が原因で個人データの漏えいのおそれが生じたかどうかで判断します。非保持化は報告義務を免れる理由にはなりません。',
          },
          {
            text: '評判への影響を避けるため、原因が確定するまで公表や関係者への連絡は控える',
            is_correct: false,
            reply:
              '顧客が気づかないまま不正利用が続けば被害が拡大します。個人データの漏えいのおそれが大きい場合の報告・通知は、内部調査の完了を待たずに検討すべき対応です。',
          },
        ],
        explanations: [
          '「保存していなかった」ことと「報告義務が発生するかどうか」は別の話だ。個人データの漏えいのおそれが、どこで、どの程度生じたかを整理しよう。',
          '個人情報保護委員会への報告(速報・確報の二段階)は、カード情報を自社で保存していたかどうかとは関係なく、決済ページという自社の管理下で個人データの漏えいのおそれが生じた以上、必要になり得る法律上の対応です。カード会社への連絡と合わせて速やかに進めましょう。',
        ],
        consult_hint:
          '非保持化と個人情報保護委員会への報告義務は別問題であること、カード会社への連絡の必要性、公表を控えることのリスクを整理して提示する。',
      },
    ],
    clear_explanation: [
      {
        character: '霧島',
        line: '漏れた原因は、更新が遅れていたプラグインの脆弱性を突かれ、決済ページのスクリプトが改ざんされたことだ。入力されたカード情報は、確定前にブラウザから外部のサーバへ直接送られていた—フォームジャッキングだ。カード番号を自社に保存していなかったことは、データベースが破られた場合の被害を防ぐ対策であって、決済ページそのものへの攻撃までは防げない。',
      },
      {
        character: '橘',
        line: 'WAFはSQLインジェクションのような既知の攻撃パターンは防げても、正規のスクリプトを装った通信までは見抜けません。コンテンツセキュリティポリシー(CSP)で読み込み先を制限し、ファイルの改ざん検知を組み合わせることが必要でした。カード会社への連絡と、個人情報保護委員会への報告要否の判断も、公表を控えるのではなく速やかに進めてください。',
      },
    ],
    legal_refs: ['LAW-APPI-BREACH-REPORT'],
  },
}
