// src/core/scenario/fixtures/sl-consignment-breach.fixture.ts — Issue #76(#6量産4本目・法務新規
// シナリオ)のプレイ用実データ。
//
// `scenarios/sl-consignment-breach.yaml` の内容をそのまま TypeScript の Scenario リテラルとして
// 写したもの。s1-targeted-email-intrusion.fixture.ts / s2-vpn-ransomware.fixture.ts /
// s3-ec-card-leak.fixture.ts と同じ理由(scripts/build-data.ts の runBuild は Node 専用 API に
// 依存しており、src/core/ 配下から import すると tsconfig.app.json のプログラムに Node 専用コードが
// 取り込まれ `npm run typecheck` が壊れる)により、YAML と等価な内容を純粋な TypeScript リテラル
// としてここに複製する。src/ui/store/game-store.ts はこのフィクスチャを `scenarios`(マップ選択の
// 選択可能一覧)に追加する(DEFAULT_SCENARIO は引き続き S1 のまま)。
//
// 内容を変更した場合は `scenarios/sl-consignment-breach.yaml` 側も同期すること
// (このファイルが唯一の正本ではなく、あくまで YAML の写しであることに注意。
// scripts/build-data.test.ts に両者の一致を確認する回帰テストがある)。
//
// **これは代表監修前のドラフト**(Issue #76)。教育内容・法制度(委託先監督義務・報告義務)の
// 正確性は代表レビュー(#81 と同スコープ)を経て確定する。
import type { Scenario } from '../../model/index.ts'

export const slConsignmentBreachFixture: Scenario = {
  schema_version: '0.7.0',
  id: 'sl-consignment-breach',
  title: '委託先クラウドストレージからの個人データ漏えい',
  status: 'draft',
  map_order: 4,
  subject_tags: ['攻撃手法', 'インシデント対応', '法制度'],
  difficulty: 3,
  estimated_minutes: 12,
  references: [
    {
      material_kind: '事例類型',
      note: '個人データの取扱いを委託した外部のクラウド事業者側で、保管領域の共有設定ミスにより個人データが外部から閲覧可能な状態になった、という事例類型をテーマとして参考にしたオリジナル創作。特定の年度・問題・特定の被害事例からの引用ではない。',
    },
    {
      material_kind: '用語',
      note: '個人情報保護法における委託先の監督義務・漏えい等の報告義務という法制度知識を参考にしたオリジナル創作。特定の年度・問題からの引用ではない。',
    },
  ],
  related_terms: ['term-appi-breach-report', 'term-incident-response-process', 'term-log-analysis'],
  intro: {
    background:
      'ある朝、宅配会員サービスを営む「株式会社ひばり生活サービス」に、会員データの管理システム運用を委託しているクラウド事業者から一本の連絡が入った。「保管しているデータの一部に、外部からアクセスされた可能性がある」。詳しく確認すると、会員の氏名・住所等を含むデータが保存されたクラウドストレージの共有設定が、委託先の作業ミスによって外部から閲覧できる状態になっていたことが判明した。「委託しているのだから自社は無関係」で済む話なのか——対策室に招集がかかる。',
    victim_company: {
      name: '株式会社ひばり生活サービス',
      industry: '生活関連サービス業(会員制宅配サービス)',
      description:
        '会員向けの食品・日用品の定期宅配サービスを運営する企業。会員の氏名・住所・購入履歴等の個人データを扱う会員管理システムの運用を、外部のクラウド事業者(委託先)に委託している。',
    },
    character_intros: [
      {
        character: '霧島',
        line: '委託先の設定ミスだとしても、原因の裏取りは必要だ。まずログを確認しよう。',
      },
      {
        character: '橘',
        line: '委託先の話だから終わり、ではありません。監督義務と報告義務、両方の判断が必要です。',
      },
    ],
  },
  investigation_points: [
    {
      id: 'ip-contract-supervision',
      category: '文献を引く',
      label: '委託契約書(監督条項)の確認',
      description: '委託先との契約書に、委託先の監督に関する条項が定められているかを確認する。',
    },
    {
      id: 'ip-appi-guideline',
      category: '文献を引く',
      label: '個人情報保護法ガイドライン(委託先の監督義務)の確認',
      description: '個人データの取扱いを委託した場合の委託元の監督義務について、ガイドラインで確認する。',
    },
    {
      id: 'ip-vendor-initial-report',
      category: 'ログを見る',
      label: '委託先からの一次報告の確認',
      description: '委託先から届いた事故の一次報告の内容を確認する。',
    },
    {
      id: 'ip-vendor-storage-log',
      category: 'ログを見る',
      label: '委託先クラウドストレージのアクセスログ',
      description: '委託先が管理するクラウドストレージへの外部からのアクセス記録を確認する。',
    },
    {
      id: 'ip-vendor-testimony',
      category: '人に聞く',
      label: '委託先担当者への聞き取り',
      description: '委託先の担当者に、設定変更の経緯と管理体制を確認する。',
    },
    {
      id: 'ip-vendor-safety-measures',
      category: '文献を引く',
      label: '委託先の安全管理措置報告の確認',
      description: '委託先が提出した安全管理措置の報告書の内容を確認する。',
    },
  ],
  scenes: [
    {
      id: 'scene-office',
      title: '自社執務室',
      background: 'bg-sl-office',
      hotspots: [
        {
          object_type: 'book',
          position: [0.17, 0.32],
          label: '委託契約書棚',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-contract-supervision',
              label: '委託契約書(監督条項)を確認する',
              line: '委託契約書を確認しました。委託先に対し、安全管理措置の実施状況を定期的に報告させ、必要な指示を行うことができる監督条項が明記されています。',
              speaker: '橘',
            },
            {
              kind: 'collect',
              investigation_point_id: 'ip-appi-guideline',
              label: '個人情報保護法ガイドラインを確認する',
              line: 'ガイドラインを確認しました。個人データの取扱いを委託する場合、委託元は委託先に対して必要かつ適切な監督を行う義務を負い、委託先の監督が不十分であったことに起因する漏えい等は、委託元の義務違反として問題になり得るとされています。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'pc',
          position: [0.56, 0.45],
          label: '委託先の一次報告を受けた端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-vendor-initial-report',
              label: '委託先からの一次報告を確認する',
              line: '委託先からの一次報告メールを確認した。クラウドストレージの共有設定を「限定公開」から誤って「リンクを知っていれば誰でも閲覧可能」に変更しており、外部からアクセスされた形跡があるとのことだった。',
              speaker: '霧島',
            },
            {
              kind: 'danger',
              label: '委託先からの一次報告メールを、事実関係の確認や公表判断を待たずにそのまま社内外へ転送する',
              feedback:
                '橘「事実関係が固まる前に未確認の情報を広めると、後で内容が変わった場合に混乱と説明責任の問題を招きます。まずは委託先に詳細を確認し、社内の情報管理体制に沿って共有してください。」',
            },
            { kind: 'noop', label: '今は触らない' },
          ],
        },
      ],
    },
    {
      id: 'scene-vendor',
      title: '委託先ブース(会議室)',
      background: 'bg-sl-vendor',
      hotspots: [
        {
          object_type: 'device',
          position: [0.19, 0.68],
          label: '委託先のクラウドストレージ管理端末',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-vendor-storage-log',
              label: 'クラウドストレージのアクセスログを確認する',
              line: '委託先のクラウドストレージのアクセスログを確認した。共有設定が変更された直後から、複数の見知らぬ外部IPアドレスから会員データの保管領域へ直接アクセスされた記録が残っている。',
              speaker: '霧島',
            },
          ],
        },
        {
          object_type: 'person',
          position: [0.44, 0.55],
          label: '委託先担当者',
          prompt: '委託先担当者「何かご質問はありますか？」',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-vendor-testimony',
              label: '委託先担当者に話を聞く',
              line: '委託先担当者に聞きました。クラウドストレージの公開範囲の設定を、定期点検の作業中に誤って変更してしまったとのことでした。契約で定められていた定期点検も、人員不足で直近は実施できていなかったそうです。',
              speaker: '橘',
            },
            { kind: 'noop', label: '何でもない' },
          ],
        },
        {
          object_type: 'book',
          position: [0.84, 0.62],
          label: '委託先の安全管理措置報告書',
          actions: [
            {
              kind: 'collect',
              investigation_point_id: 'ip-vendor-safety-measures',
              label: '安全管理措置の報告書を確認する',
              line: '委託先が提出した安全管理措置の報告書を確認した。アクセス権限の設定手順は定められているが、変更後の設定内容を第三者が確認するダブルチェック体制までは整備されていなかった。',
              speaker: '橘',
            },
          ],
        },
        {
          object_type: 'door',
          position: [0.6, 0.5],
          label: '執務室への扉',
          actions: [{ kind: 'goto', scene_id: 'scene-office', label: '執務室へ移動する' }],
        },
      ],
    },
  ],
  cards: [
    {
      id: 'card-contract-supervision-clause',
      type: '外部情報',
      source: '委託契約書',
      investigation_point_id: 'ip-contract-supervision',
      body: '委託契約書には、委託先に対して安全管理措置の実施状況を定期的に報告させ、必要な指示を行うことができる旨の監督条項が明記されている。',
      is_dummy: false,
    },
    {
      id: 'card-contract-liability-clause',
      type: '外部情報',
      source: '委託契約書',
      investigation_point_id: 'ip-contract-supervision',
      body: '契約書には委託先が損害賠償責任を負う旨の条項もあるが、これは契約当事者間の民事上の責任分担を定めたものであり、個人情報保護法上、委託元が委託先を監督する義務そのものの有無を左右するものではない。',
      is_dummy: true,
    },
    {
      id: 'card-appi-guideline-supervision',
      type: '外部情報',
      source: '個人情報保護法ガイドライン',
      investigation_point_id: 'ip-appi-guideline',
      body: '個人情報保護法のガイドラインを確認した。個人データの取扱いを委託する場合、委託元は委託先に対して必要かつ適切な監督を行う義務を負う。委託先の監督が不十分であったことに起因して漏えい等が発生した場合、委託元の義務違反として問題になり得る。',
      is_dummy: false,
    },
    {
      id: 'card-appi-myth-no-responsibility',
      type: '外部情報',
      source: '社内Q&A資料',
      investigation_point_id: 'ip-appi-guideline',
      body: '社内には「業務を外部に委託しているのだから、そこで起きた事故は委託先の責任であり自社は無関係だ」という声も一部にあるが、これは個人情報保護法上、委託元に課される委託先の監督義務を正しく理解していない誤解である。',
      is_dummy: true,
    },
    {
      id: 'card-vendor-report-initial',
      type: 'ログ',
      source: '委託先からの一次報告',
      investigation_point_id: 'ip-vendor-initial-report',
      body: '委託先から一次報告を受けた。クラウドストレージの共有設定を「限定公開」から誤って「リンクを知っていれば誰でも閲覧可能」に変更しており、外部からアクセスされた形跡があるとのことだった。',
      is_dummy: false,
    },
    {
      id: 'card-vendor-report-unrelated',
      type: 'ログ',
      source: '委託先からの一次報告',
      investigation_point_id: 'ip-vendor-initial-report',
      body: '同じ時期、委託先の別サービスでも予定されていた定期メンテナンスが行われていたが、これは今回の共有設定ミスとは無関係のスケジュール済み作業だった。',
      is_dummy: true,
    },
    {
      id: 'card-vendor-storage-access-log',
      type: 'ログ',
      source: '委託先クラウドストレージ',
      investigation_point_id: 'ip-vendor-storage-log',
      body: '委託先のクラウドストレージのアクセスログを確認した。共有設定が変更された直後から、複数の見知らぬ外部IPアドレスから会員データの保管領域へ直接アクセスされた記録が残っている。',
      is_dummy: false,
    },
    {
      id: 'card-vendor-storage-internal-access',
      type: 'ログ',
      source: '委託先クラウドストレージ',
      investigation_point_id: 'ip-vendor-storage-log',
      body: '同時期に委託先の社内担当者による正規のメンテナンスアクセスも記録されているが、アクセス時刻と操作内容から通常業務の範囲内であることを確認済み。',
      is_dummy: true,
    },
    {
      id: 'card-vendor-testimony-main',
      type: '証言',
      source: '委託先担当者',
      investigation_point_id: 'ip-vendor-testimony',
      body: '委託先担当者は「クラウドストレージの公開範囲設定を、定期点検の作業中に誤って変更してしまった。契約で定められていた定期点検も、人員不足で直近は実施できていなかった」と証言した。',
      is_dummy: false,
    },
    {
      id: 'card-vendor-testimony-cert',
      type: '証言',
      source: '委託先担当者',
      investigation_point_id: 'ip-vendor-testimony',
      body: '委託先担当者は「当社はISMS認証を取得しており、セキュリティ体制には自信がある」とも述べたが、認証を取得している事実そのものは、今回具体的な設定ミスが発生したことを否定する根拠にはならない。',
      is_dummy: true,
    },
    {
      id: 'card-vendor-safety-report-main',
      type: '外部情報',
      source: '委託先の安全管理措置報告書',
      investigation_point_id: 'ip-vendor-safety-measures',
      body: '委託先が提出した安全管理措置の報告書を確認した。アクセス権限の設定手順は定められているが、変更後の設定内容を第三者が確認するダブルチェック体制までは整備されていなかった。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-supervision',
      type: '対策',
      source: '委託先の安全管理措置報告書',
      investigation_point_id: 'ip-vendor-safety-measures',
      body: '委託契約の監督条項を見直し、委託先の安全管理措置の実施状況(アクセス権限設定のダブルチェック体制を含む)を定期的に確認する体制を整える。あわせて再委託の有無・再委託先の状況も把握できるようにする。',
      is_dummy: false,
    },
    {
      id: 'card-countermeasure-vendor-swap-only',
      type: '対策',
      source: '委託先の安全管理措置報告書',
      investigation_point_id: 'ip-vendor-safety-measures',
      body: '委託先を別の事業者に変更する。自社側の監督体制そのものは、これまでと特に変更しない。',
      is_dummy: true,
    },
  ],
  resolution: {
    cipher_stages: [],
    questions: [
      {
        id: 'q-cause',
        subject_tag: '攻撃手法',
        speaker: '霧島',
        prompt: '顧客の個人データが漏えいした原因は、どこにあると見る？',
        choices: [
          {
            text: '委託先のクラウドストレージの共有設定が誤って「限定公開」から「リンクを知っていれば誰でも閲覧可能」に変更されており、外部からアクセスされた',
            is_correct: true,
            reply:
              'その通りだ。アクセスログの記録と委託先担当者自身の証言、どちらも共有設定の誤変更という一点で一致している。',
          },
          {
            text: '自社のシステムが直接サイバー攻撃を受け、外部から侵入された',
            is_correct: false,
            reply:
              '自社側のシステムにそのような侵害の痕跡はない。今回問題が起きているのは、委託先が管理するクラウドストレージの側だ。',
          },
          {
            text: '委託先の従業員が個人データを意図的に持ち出した',
            is_correct: false,
            reply:
              '意図的な持ち出しなら、アクセス権限の不正な操作やデータの外部送信といった別の痕跡が残るはずだが、そうした証拠はない。見つかっているのは、共有設定の誤変更という単純なミスだ。',
          },
        ],
        explanations: [
          'まず「誰が・何を・どう変えたか」を裏付ける記録があるかどうかで、原因の候補を絞り込もう。',
          '委託先担当者の証言とアクセスログが指し示す先が一致しているかを確認しよう。悪意ある行為なら別の痕跡が残るはずだ。',
        ],
        consult_hint:
          '委託先クラウドストレージのアクセスログ・委託先担当者の証言・委託先の安全管理措置報告の内容を分野で整理して提示する。',
      },
      {
        id: 'q-report-duty',
        subject_tag: '法制度',
        speaker: '橘',
        prompt: '個人データの漏えいのおそれが確認できました。報告義務は誰に生じると考えますか？',
        choices: [
          {
            text: '個人データを取り扱う委託元である自社にも個人情報保護委員会への報告義務があり、委託先と連携して対応する必要がある',
            is_correct: true,
            reply: 'その理解が正しいです。委託しているからといって、自社が報告義務から外れるわけではありません。',
          },
          {
            text: '事故が起きたのは委託先の管理領域なので、委託先が単独で個人情報保護委員会に報告すればよく、自社に義務はない',
            is_correct: false,
            reply:
              '個人データの取扱いを委託した場合でも、委託元は自社が取り扱う個人データについて報告義務を負います。委託先の問題だからと自社が無関係になるわけではありません。',
          },
          {
            text: '契約書に委託先が全責任を負う旨の特約があるため、自社としては特に対応する必要はない',
            is_correct: false,
            reply:
              '契約上の責任分担と、個人情報保護法上の報告義務は別の話です。特約があっても、委託元としての報告義務の判断そのものを免れることはできません。',
          },
        ],
        explanations: [
          '「事故が起きた場所」と「報告義務を負う主体」は必ずしも一致するとは限らない。委託元・委託先それぞれの役割を整理しよう。',
          '個人情報保護法は、個人データを取り扱う事業者(委託元)に対しても監督義務・報告義務を課している。委託先の管理下で起きた事故であっても、委託元として報告要否を判断する責任は残る。',
        ],
        consult_hint:
          '個人情報保護法ガイドラインが定める委託元の監督義務・報告義務の考え方と、契約上の責任分担は別問題であることを整理して提示する。',
      },
      {
        id: 'q-corrective-action',
        subject_tag: '法制度',
        speaker: '橘',
        prompt: '再発防止に向けて、今後どのような方針を取るべきですか？',
        choices: [
          {
            text: '委託契約の内容を見直し、委託先の安全管理措置の実施状況を定期的に確認する体制を整え、再委託の状況も把握できるようにする',
            is_correct: true,
            reply: 'それが妥当な方針です。監督義務を継続的に果たせる体制に見直しましょう。',
          },
          {
            text: '委託先を別の事業者に変更するだけで、自社側の監督体制は特に見直さない',
            is_correct: false,
            reply:
              '委託先を変えても、自社が委託先を適切に監督する体制がなければ、同じ問題が再び起こり得ます。委託先の選定だけでなく、自社の監督のしくみ自体を見直す必要があります。',
          },
          {
            text: '原因は委託先の設定ミスにあるため、自社の運用は特に変更せず、委託先の対応を見守る',
            is_correct: false,
            reply:
              '監督義務は一度きりの確認では終わりません。委託先の対応を見守るだけでなく、自社としても定期的に確認するしくみを持つことが求められます。',
          },
        ],
        explanations: [
          '「原因が委託先にある」ことと「自社が何もしなくてよい」ことは同じではない。委託元として継続的に果たすべき役割を考えよう。',
          '委託契約の監督条項の見直し、安全管理措置の定期確認、再委託先の把握—これらはいずれも委託元として果たすべき委託先監督義務の一部だ。',
        ],
        consult_hint:
          '委託契約書の監督条項・委託先の安全管理措置報告・委託先監督義務の是正内容(契約見直し・定期確認・再委託管理)を整理して提示する。',
      },
    ],
    clear_explanation: [
      {
        character: '霧島',
        line: '原因は、委託先のクラウドストレージの共有設定が、定期点検の作業中に誤って「誰でも閲覧可能」に変更されていたことだ。外部からのアクセスログと委託先担当者の証言、どちらも設定ミスという一点で一致している。',
      },
      {
        character: '橘',
        line: '個人データの取扱いを委託していても、委託元である自社の報告義務や監督義務がなくなるわけではありません。委託契約の監督条項を見直し、安全管理措置の定期確認と再委託先の把握を続けることが、今後の再発防止につながります。',
      },
    ],
    legal_refs: ['LAW-APPI-CONSIGNMENT-SUPERVISION', 'LAW-APPI-BREACH-REPORT'],
  },
}
