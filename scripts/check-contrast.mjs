#!/usr/bin/env node
/**
 * DESIGN.md のカラートークン（サイバーパンク改訂・#132）の WCAG 2.1 コントラスト検証スクリプト。
 *
 * - 依存追加なし（Node 標準機能のみ）。
 * - WCAG 2.1 の相対輝度・コントラスト比の式をそのまま実装する。
 * - トークン値は下記 TOKENS に直書きする（DESIGN.md のカラートークン表と同じ値を保つこと。
 *   DESIGN.md の値を変更したら、このスクリプトの値も同時に更新して再実行する）。
 *
 * 実行方法: node scripts/check-contrast.mjs
 *   （WSL で nvm を使う場合: source ~/.nvm/nvm.sh && nvm use 24 && node scripts/check-contrast.mjs）
 *
 * 終了コード: 未達ペア（「使用禁止」と明記されていないもの）が1件でもあれば 1、なければ 0。
 */

// ============================================================
// 1. WCAG 2.1 相対輝度・コントラスト比の式
// ============================================================

/** @param {string} hex "#RRGGBB" */
function hexToRgb(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const int = parseInt(m[1], 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

function channelToLinear(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

/** WCAG 2.1 相対輝度 (0=黒 〜 1=白) */
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const R = channelToLinear(r);
  const G = channelToLinear(g);
  const B = channelToLinear(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG 2.1 コントラスト比 (1〜21) */
function contrastRatio(hexA, hexB) {
  const L1 = relativeLuminance(hexA);
  const L2 = relativeLuminance(hexB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** 不透明度 alpha (0-1) の前景色 fg を背景色 bg の上に合成した結果の hex */
function compositeOver(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const r = Math.round(fg.r * alpha + bg.r * (1 - alpha));
  const g = Math.round(fg.g * alpha + bg.g * (1 - alpha));
  const b = Math.round(fg.b * alpha + bg.b * (1 - alpha));
  return (
    '#' +
    [r, g, b]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

// ============================================================
// 2. トークン値（DESIGN.md カラートークン表と同期させること）
// ============================================================

const TOKENS = {
  background: '#0A0C18',
  surface: '#11142A',
  'surface-2': '#1A1F3D',
  'text-primary': '#EAF0FF',
  'text-secondary': '#A6B0D6',
  border: '#6870AD',
  primary: '#4FD8FF', // ネオンブルー（主アクセント）
  success: '#4CFFA8', // ネオングリーン（状態色）
  warning: '#FFC24C',
  error: '#FF5C7A',
  info: '#8FA6FF',
  'hotspot-highlight': '#FF5A4E', // 既存トークン（維持・視認性のため赤系を継続）
  'speaker-frame-white': '#FFFFFF',
  'speaker-frame-neon-blue': '#4FD8FF', // 併記のみ・既定は white
};

const AA_TEXT = 4.5;
const AA_LARGE_TEXT = 3.0;
const AA_NON_TEXT = 3.0;

// ガラス風パネルの最小不透明度（DESIGN.md「半透明パネル」節）
// 値は下の「4.5 半透明パネルの最小不透明度の導出」で自動算出する（手動の当て推量にしない）。
const GLASS_PANEL_BG_TOKEN = 'surface'; // パネル地の色として使うトークン

/**
 * text-primary / text-secondary を、GLASS_PANEL_BG_TOKEN を alpha で純白・純黒それぞれに
 * 合成したパネル色の上に置いたとき、両方とも 4.5:1 を満たす最小の alpha を 0.01 刻みで探索する。
 * 本文4.5:1を満たす最小値+0.01（丸め誤差の安全マージン）をトークン値として採用する。
 */
function deriveMinGlassAlpha() {
  for (let a = 0.5; a <= 1.0; a += 0.01) {
    const alpha = Math.round(a * 100) / 100;
    const onWhite = compositeOver(TOKENS[GLASS_PANEL_BG_TOKEN], alpha, '#FFFFFF');
    const onBlack = compositeOver(TOKENS[GLASS_PANEL_BG_TOKEN], alpha, '#000000');
    const ok =
      contrastRatio(TOKENS['text-primary'], onWhite) >= AA_TEXT &&
      contrastRatio(TOKENS['text-primary'], onBlack) >= AA_TEXT &&
      contrastRatio(TOKENS['text-secondary'], onWhite) >= AA_TEXT &&
      contrastRatio(TOKENS['text-secondary'], onBlack) >= AA_TEXT;
    if (ok) return Math.min(1, Math.round((alpha + 0.01) * 100) / 100);
  }
  return 1.0;
}

const GLASS_PANEL_MIN_ALPHA = deriveMinGlassAlpha();

// ============================================================
// 3. 検証するペア
// ============================================================

/** @type {{label: string, fg: string, bg: string, need: number, note?: string}[]} */
const textPairs = [];
/** @type {{label: string, fg: string, bg: string, need: number, note?: string}[]} */
const nonTextPairs = [];

const backgrounds = ['background', 'surface', 'surface-2'];

// 本文・補助テキスト（4.5:1）
for (const bg of backgrounds) {
  textPairs.push({
    label: `text-primary on ${bg}`,
    fg: TOKENS['text-primary'],
    bg: TOKENS[bg],
    need: AA_TEXT,
  });
  textPairs.push({
    label: `text-secondary on ${bg}`,
    fg: TOKENS['text-secondary'],
    bg: TOKENS[bg],
    need: AA_TEXT,
  });
}

// セマンティックカラーをテキスト・アイコンとして使う場合（解決⑤の選択パネルは surface-2 上に置くため含める）
const semantics = ['primary', 'success', 'warning', 'error', 'info'];
for (const bg of backgrounds) {
  for (const sem of semantics) {
    textPairs.push({
      label: `${sem} as text on ${bg}`,
      fg: TOKENS[sem],
      bg: TOKENS[bg],
      need: AA_TEXT,
    });
    nonTextPairs.push({
      label: `${sem} as icon/graphic on ${bg}`,
      fg: TOKENS[sem],
      bg: TOKENS[bg],
      need: AA_NON_TEXT,
    });
  }
}

// 塗りつぶしボタンの上に載せるラベル文字（--primary-foreground / --xxx-foreground 相当。文字色は background を流用）
for (const sem of semantics) {
  textPairs.push({
    label: `text on filled ${sem} button (--${sem}-foreground = background色)`,
    fg: TOKENS.background,
    bg: TOKENS[sem],
    need: AA_TEXT,
  });
}

// 非テキスト: border, フォーカスリング(primary), ホットスポット枠
for (const bg of backgrounds) {
  nonTextPairs.push({
    label: `border on ${bg}`,
    fg: TOKENS.border,
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
  });
  nonTextPairs.push({
    label: `focus ring (primary) on ${bg}`,
    fg: TOKENS.primary,
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
  });
  nonTextPairs.push({
    label: `hotspot-highlight on ${bg}`,
    fg: TOKENS['hotspot-highlight'],
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
    note: '既存トークン（#71・T045 由来）。視認性のため赤系を維持',
  });
}

// 話者の枠（white・neon-blue案）: 立ち絵カード外周に置くため非テキストとして扱う
for (const bg of backgrounds) {
  nonTextPairs.push({
    label: `speaker-frame-white on ${bg}`,
    fg: TOKENS['speaker-frame-white'],
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
  });
  nonTextPairs.push({
    label: `speaker-frame-neon-blue on ${bg}（併記・非既定）`,
    fg: TOKENS['speaker-frame-neon-blue'],
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
  });
}

// 参考: speaker-frame-black（不採用トークン）。ダーク統一の背景では成立しないことを記録するだけで、
// 合否判定（exitCode）には含めない（forbidden = true。「使用禁止」と明記する対象）。
const forbiddenPairs = [];
for (const bg of backgrounds) {
  forbiddenPairs.push({
    label: `speaker-frame-black on ${bg}`,
    fg: '#000000',
    bg: TOKENS[bg],
    need: AA_NON_TEXT,
    note: '不採用（ダーク統一の背景では成立しない）。SPEAKER_FRAME_COLOR は white|neon-blue のみ使用可',
  });
}

// ============================================================
// 4. 半透明パネルの検証（背景画像に依存しない規則）
//    パネル色を最小不透明度で「純白」「純黒」の上にそれぞれ合成し、
//    両方に対して本文 4.5:1 を満たすことを確認する。
// ============================================================

const panelOnWhite = compositeOver(TOKENS[GLASS_PANEL_BG_TOKEN], GLASS_PANEL_MIN_ALPHA, '#FFFFFF');
const panelOnBlack = compositeOver(TOKENS[GLASS_PANEL_BG_TOKEN], GLASS_PANEL_MIN_ALPHA, '#000000');

const glassPairs = [
  {
    label: `text-primary on glass-panel(${GLASS_PANEL_BG_TOKEN}@${GLASS_PANEL_MIN_ALPHA}) over 純白`,
    fg: TOKENS['text-primary'],
    bg: panelOnWhite,
    need: AA_TEXT,
  },
  {
    label: `text-primary on glass-panel(${GLASS_PANEL_BG_TOKEN}@${GLASS_PANEL_MIN_ALPHA}) over 純黒`,
    fg: TOKENS['text-primary'],
    bg: panelOnBlack,
    need: AA_TEXT,
  },
  {
    label: `text-secondary on glass-panel(${GLASS_PANEL_BG_TOKEN}@${GLASS_PANEL_MIN_ALPHA}) over 純白`,
    fg: TOKENS['text-secondary'],
    bg: panelOnWhite,
    need: AA_TEXT,
  },
  {
    label: `text-secondary on glass-panel(${GLASS_PANEL_BG_TOKEN}@${GLASS_PANEL_MIN_ALPHA}) over 純黒`,
    fg: TOKENS['text-secondary'],
    bg: panelOnBlack,
    need: AA_TEXT,
  },
];

// ============================================================
// 5. 実行・出力
// ============================================================

function evalPairs(pairs) {
  return pairs.map((p) => {
    const ratio = contrastRatio(p.fg, p.bg);
    return { ...p, ratio, pass: ratio >= p.need };
  });
}

const textResults = evalPairs(textPairs);
const nonTextResults = evalPairs(nonTextPairs);
const glassResults = evalPairs(glassPairs);
const forbiddenResults = evalPairs(forbiddenPairs);

function printTable(title, results) {
  console.log(`\n## ${title}\n`);
  console.log('| ペア | 比 | 必要値 | 判定 |');
  console.log('|---|---|---|---|');
  for (const r of results) {
    const ratioStr = r.ratio.toFixed(2);
    const mark = r.pass ? 'OK' : 'NG';
    const note = r.note ? `（${r.note}）` : '';
    console.log(`| ${r.label}${note} | ${ratioStr}:1 | ${r.need}:1 | ${mark} |`);
  }
}

console.log('# DESIGN.md カラートークン コントラスト検証結果');
console.log(`\n生成元: scripts/check-contrast.mjs（再実行: node scripts/check-contrast.mjs）`);
console.log(`\nガラス風パネル合成色: over純白=${panelOnWhite} / over純黒=${panelOnBlack}`);

printTable('本文・補助テキスト・セマンティックカラー（4.5:1）', textResults);
printTable('非テキスト（border・フォーカスリング・ホットスポット・話者枠。3:1）', nonTextResults);
printTable('半透明パネル（本文4.5:1・背景画像非依存の合成検証。最小不透明度は自動導出値）', glassResults);
printTable('参考: 不採用トークン（使用禁止。合否判定には含めない）', forbiddenResults);

const all = [...textResults, ...nonTextResults, ...glassResults];
const failed = all.filter((r) => !r.pass);

console.log(`\n合計 ${all.length} ペア中 ${failed.length} ペアが未達`);
if (failed.length > 0) {
  console.log('\n未達ペア一覧:');
  for (const f of failed) {
    console.log(`- ${f.label}: ${f.ratio.toFixed(2)}:1 (必要 ${f.need}:1)`);
  }
  process.exitCode = 1;
} else {
  console.log('\nすべてのペアが基準を満たしています。');
  process.exitCode = 0;
}
