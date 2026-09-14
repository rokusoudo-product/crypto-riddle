// src/ui/lib/explore-background-assets.ts — 探索シーンの背景アセットID→importの対応表(#124で
// scene-explorer.tsxから切り出し)。
//
// resolve-screen.tsx(#119/#124: 「解決へ進む」を押した時点の探索シーンの背景をそのまま使う)も
// scene-explorer.tsxと同じ対応表を参照する必要があるため、UIコンポーネント(scene-explorer.tsx)
// から独立したlibモジュールに切り出した。BACKGROUND_SRCという名前自体は変えず、値の中身も
// 従来どおり(scene-explorer.tsxのコメント参照)。
//
// 立ち絵と同じくrepoルートの assets/(src/ 外)に置かれているため `@/*` エイリアスは使えず、
// 相対パスで import する。
//
// 【量産時の注意・#88】新しいマップの背景PNGを assets/backgrounds/ に追加したら、
// 必ずこのタイミングで import 文＋このマップにもエントリを追加すること。
// PNG追加だけでは自動配線されず、bg-s2系・bg-s3系のように「PNGは存在するのに
// ここへの登録漏れでプレースホルダ表示のまま」という既発生の不具合(#88)を繰り返す。
//
// 【縦の背景(#119/#124)】`${id}-portrait`キーで登録する(例: 'bg-s1-office-portrait')。
// 現時点(#124時点)ではどの縦背景もまだ生成されていない(#121/#122以降で追加予定)ため
// 未登録=空。追加時は `src/ui/lib/background-box.ts` の `hasPortraitAsset`/`resolveBackgroundSrc`
// が自動的に拾う(このマップへの追加以外の配線変更は不要)。
import type { BackgroundSrcMap } from '@/ui/lib/background-box'

import bgS1Office from '../../../assets/backgrounds/bg-s1-office.png'
import bgS1Server from '../../../assets/backgrounds/bg-s1-server.png'
import bgS2Office from '../../../assets/backgrounds/bg-s2-office.png'
import bgS2Server from '../../../assets/backgrounds/bg-s2-server.png'
import bgS3Office from '../../../assets/backgrounds/bg-s3-office.png'
import bgS3OpsRoom from '../../../assets/backgrounds/bg-s3-ops-room.png'
import bgSlOffice from '../../../assets/backgrounds/bg-sl-office.png'
import bgSlVendor from '../../../assets/backgrounds/bg-sl-vendor.png'

export const EXPLORE_BACKGROUND_SRC: BackgroundSrcMap = {
  'bg-s1-office': bgS1Office,
  'bg-s1-server': bgS1Server,
  'bg-s2-office': bgS2Office,
  'bg-s2-server': bgS2Server,
  'bg-s3-office': bgS3Office,
  'bg-s3-ops-room': bgS3OpsRoom,
  'bg-sl-office': bgSlOffice,
  'bg-sl-vendor': bgSlVendor,
}
