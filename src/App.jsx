import React, { useEffect, useRef, useState } from 'react';

/* =========================================================================
   細胞分裂シミュレーター（中学校理科準拠）
   - 体細胞分裂 / 減数分裂 の学習・比較・クイズ
   - 染色体は模式的に4本（長い2本・短い2本）で表現
   - 父由来：青 / 母由来：オレンジ
   - 描画はSVG + CSSのみ（外部画像なし）
   ========================================================================= */

/* ---------------- 染色体の定義 ---------------- */
// LB=長い・父(青)  LO=長い・母(橙)  SB=短い・父(青)  SO=短い・母(橙)
const CHR = {
  LB: { size: 'long', origin: 'f' },
  LO: { size: 'long', origin: 'm' },
  SB: { size: 'short', origin: 'f' },
  SO: { size: 'short', origin: 'm' },
};
const CHR_IDS = ['LB', 'LO', 'SB', 'SO'];
// 各染色体は複製で a,b の2つになる → 合計8トークン
const TOKENS = [];
CHR_IDS.forEach((c) => ['a', 'b'].forEach((cp) => TOKENS.push(`${c}-${cp}`)));

const COLOR = {
  f: { fill: '#3b82f6', stroke: '#1d4ed8' }, // 父：青
  m: { fill: '#f59e0b', stroke: '#b45309' }, // 母：オレンジ
};

/* ---------------- 段階の説明文 ---------------- */
const REPLICATE_DESC =
  '分裂の準備として染色体が複製されます。染色体数は変わりませんが、染色体の本数（見た目）は2倍になります。';

const MITOSIS_STAGES = [
  { t: '分裂前', d: '核の中に染色体があります。' },
  { t: '染色体が複製される', d: REPLICATE_DESC },
  { t: '前期', d: '染色体が見えやすくなります。' },
  { t: '中期', d: '染色体が細胞の中央に並びます。' },
  { t: '後期', d: '染色体が2つに分かれて両極へ移動します。' },
  { t: '終期', d: '新しい核ができます。' },
  { t: '細胞質分裂', d: '細胞が2つに分かれます。' },
  { t: '分裂完了', d: '元の細胞と同じ染色体数をもつ細胞が2個できました。' },
];

const MEIOSIS_STAGES = [
  { t: '分裂前', d: '生殖細胞をつくるための分裂です。' },
  { t: '染色体が複製される', d: REPLICATE_DESC },
  { t: '第一分裂 前期', d: '相同な染色体が並びます。' },
  { t: '第一分裂 中期', d: '染色体が中央に並びます。' },
  { t: '第一分裂 後期', d: '染色体が両極へ移動します。' },
  { t: '第一分裂 完了', d: '染色体数が半分になった細胞が2個できました。' },
  { t: '第二分裂 中期', d: '再び染色体が中央に並びます。' },
  { t: '第二分裂 後期', d: '染色体が分かれて移動します。' },
  { t: '第二分裂 完了', d: '染色体数が半分の生殖細胞が4個できました。' },
];

/* ---------------- レイアウト計算 ---------------- */
function setPair(tokens, chr, ax, ay, bx, by, hiddenB = false) {
  tokens[`${chr}-a`] = { x: ax, y: ay };
  tokens[`${chr}-b`] = { x: bx, y: by, hidden: hiddenB };
}

// 1細胞内に4本を配置する（長い2本は上・短い2本は下で、4本がはっきり見えるように）
function cluster(cx, cy, spread = 1) {
  return {
    LB: [cx - 30 * spread, cy - 36],
    LO: [cx + 30 * spread, cy - 36],
    SB: [cx - 28 * spread, cy + 40],
    SO: [cx + 30 * spread, cy + 40],
  };
}

function mitosisLayout(s) {
  const meta = MITOSIS_STAGES[s];
  const L = {
    viewW: 460,
    viewH: 470,
    cells: [],
    nuclei: [],
    tokens: {},
    plate: null,
    count: 4,
    t: meta.t,
    d: meta.d,
  };

  if (s === 0) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.nuclei = [{ cx: 230, cy: 235, rx: 98, ry: 104 }];
    const c = cluster(230, 235, 1);
    CHR_IDS.forEach((id) => setPair(L.tokens, id, c[id][0], c[id][1], c[id][0], c[id][1], true));
  } else if (s === 1) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.nuclei = [{ cx: 230, cy: 235, rx: 98, ry: 104 }];
    const c = cluster(230, 235, 1);
    CHR_IDS.forEach((id) => setPair(L.tokens, id, c[id][0] - 6, c[id][1], c[id][0] + 6, c[id][1]));
  } else if (s === 2) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    const c = cluster(230, 235, 1.6);
    CHR_IDS.forEach((id) => setPair(L.tokens, id, c[id][0] - 7, c[id][1], c[id][0] + 7, c[id][1]));
  } else if (s === 3) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.plate = { x: 230, y1: 120, y2: 350 };
    const ys = { LB: 150, LO: 200, SB: 262, SO: 318 };
    CHR_IDS.forEach((id) => setPair(L.tokens, id, 230 - 8, ys[id], 230 + 8, ys[id]));
  } else if (s === 4) {
    L.cells = [{ cx: 230, cy: 235, rx: 186, ry: 158 }];
    const ys = { LB: 155, LO: 205, SB: 262, SO: 312 };
    CHR_IDS.forEach((id) => setPair(L.tokens, id, 120, ys[id], 345, ys[id]));
  } else {
    // 終期・細胞質分裂・完了：2細胞、各細胞は4本（各染色体1コピーずつ）
    const sep = s === 5 ? [135, 330, 112] : s === 6 ? [120, 345, 102] : [118, 350, 100];
    const [lx, rx, r] = sep;
    L.cells = [
      { cx: lx, cy: 235, rx: r, ry: 152 },
      { cx: rx, cy: 235, rx: r, ry: 152 },
    ];
    L.nuclei = [
      { cx: lx, cy: 235, rx: r * 0.64, ry: 88 },
      { cx: rx, cy: 235, rx: r * 0.64, ry: 88 },
    ];
    const cL = cluster(lx, 235, 0.95);
    const cR = cluster(rx, 235, 0.95);
    CHR_IDS.forEach((id) => {
      L.tokens[`${id}-a`] = { x: cL[id][0], y: cL[id][1] };
      L.tokens[`${id}-b`] = { x: cR[id][0], y: cR[id][1] };
    });
  }
  return L;
}

function meiosisLayout(s) {
  const meta = MEIOSIS_STAGES[s];
  const L = {
    viewW: 460,
    viewH: 470,
    cells: [],
    nuclei: [],
    tokens: {},
    plate: null,
    count: 4,
    t: meta.t,
    d: meta.d,
  };

  if (s === 0) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.nuclei = [{ cx: 230, cy: 235, rx: 98, ry: 104 }];
    const c = cluster(230, 235, 1);
    CHR_IDS.forEach((id) => setPair(L.tokens, id, c[id][0], c[id][1], c[id][0], c[id][1], true));
  } else if (s === 1) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.nuclei = [{ cx: 230, cy: 235, rx: 98, ry: 104 }];
    const c = cluster(230, 235, 1);
    CHR_IDS.forEach((id) => setPair(L.tokens, id, c[id][0] - 6, c[id][1], c[id][0] + 6, c[id][1]));
  } else if (s === 2) {
    // 相同な染色体が並ぶ（長い組・短い組）
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    setPair(L.tokens, 'LB', 175 - 6, 162, 175 + 6, 162);
    setPair(L.tokens, 'LO', 285 - 6, 162, 285 + 6, 162);
    setPair(L.tokens, 'SO', 175 - 6, 305, 175 + 6, 305);
    setPair(L.tokens, 'SB', 285 - 6, 305, 285 + 6, 305);
  } else if (s === 3) {
    L.cells = [{ cx: 230, cy: 235, rx: 150, ry: 165 }];
    L.plate = { x: 230, y1: 115, y2: 355 };
    setPair(L.tokens, 'LB', 193 - 5, 165, 193 + 5, 165);
    setPair(L.tokens, 'LO', 267 - 5, 165, 267 + 5, 165);
    setPair(L.tokens, 'SO', 193 - 5, 305, 193 + 5, 305);
    setPair(L.tokens, 'SB', 267 - 5, 305, 267 + 5, 305);
  } else if (s === 4) {
    // 相同染色体が両極へ（複製されたまま移動）
    L.cells = [{ cx: 230, cy: 235, rx: 186, ry: 158 }];
    setPair(L.tokens, 'LB', 120 - 5, 170, 120 + 5, 170);
    setPair(L.tokens, 'SO', 120 - 5, 300, 120 + 5, 300);
    setPair(L.tokens, 'LO', 345 - 5, 170, 345 + 5, 170);
    setPair(L.tokens, 'SB', 345 - 5, 300, 345 + 5, 300);
  } else if (s === 5) {
    // 第一分裂完了：2細胞、各2本（複製されたまま）
    L.count = 2;
    L.cells = [
      { cx: 135, cy: 235, rx: 112, ry: 155 },
      { cx: 330, cy: 235, rx: 112, ry: 155 },
    ];
    L.nuclei = [
      { cx: 135, cy: 235, rx: 74, ry: 92 },
      { cx: 330, cy: 235, rx: 74, ry: 92 },
    ];
    setPair(L.tokens, 'LB', 135 - 5, 180, 135 + 5, 180);
    setPair(L.tokens, 'SO', 135 - 5, 290, 135 + 5, 290);
    setPair(L.tokens, 'LO', 330 - 5, 180, 330 + 5, 180);
    setPair(L.tokens, 'SB', 330 - 5, 290, 330 + 5, 290);
  } else if (s === 6) {
    // 第二分裂中期：各細胞で中央に並ぶ
    L.count = 2;
    L.cells = [
      { cx: 135, cy: 235, rx: 112, ry: 155 },
      { cx: 330, cy: 235, rx: 112, ry: 155 },
    ];
    L.plate = [
      { x: 135, y1: 140, y2: 330 },
      { x: 330, y1: 140, y2: 330 },
    ];
    setPair(L.tokens, 'LB', 135 - 7, 180, 135 + 7, 180);
    setPair(L.tokens, 'SO', 135 - 7, 290, 135 + 7, 290);
    setPair(L.tokens, 'LO', 330 - 7, 180, 330 + 7, 180);
    setPair(L.tokens, 'SB', 330 - 7, 290, 330 + 7, 290);
  } else if (s === 7) {
    // 第二分裂後期：コピーが左右に分かれる
    L.count = 2;
    L.viewW = 620;
    L.cells = [
      { cx: 155, cy: 235, rx: 150, ry: 155 },
      { cx: 465, cy: 235, rx: 150, ry: 155 },
    ];
    setPair(L.tokens, 'LB', 110, 180, 200, 180);
    setPair(L.tokens, 'SO', 110, 295, 200, 295);
    setPair(L.tokens, 'LO', 420, 180, 510, 180);
    setPair(L.tokens, 'SB', 420, 295, 510, 295);
  } else {
    // 第二分裂完了：4細胞、各2本
    L.count = 2;
    L.viewW = 620;
    const cxs = [90, 235, 385, 530];
    L.cells = cxs.map((cx) => ({ cx, cy: 235, rx: 78, ry: 150 }));
    L.nuclei = cxs.map((cx) => ({ cx, cy: 235, rx: 52, ry: 92 }));
    L.tokens['LB-a'] = { x: 90, y: 195 };
    L.tokens['SO-a'] = { x: 90, y: 287 };
    L.tokens['LB-b'] = { x: 235, y: 195 };
    L.tokens['SO-b'] = { x: 235, y: 287 };
    L.tokens['LO-a'] = { x: 385, y: 195 };
    L.tokens['SB-a'] = { x: 385, y: 287 };
    L.tokens['LO-b'] = { x: 530, y: 195 };
    L.tokens['SB-b'] = { x: 530, y: 287 };
  }
  return L;
}

// 染色体が複製された状態（見た目の本数が2倍）になっている段階
const REPLICATED_MITOSIS = [1, 2, 3, 4, 5];
const REPLICATED_MEIOSIS = [1, 2, 3, 4, 5, 6, 7];

function getLayout(mode, stage) {
  const L = mode === 'meiosis' ? meiosisLayout(stage) : mitosisLayout(stage);
  // 染色体数（L.count）に加えて「染色体の本数（見た目）」を計算する
  const replicated = (mode === 'meiosis' ? REPLICATED_MEIOSIS : REPLICATED_MITOSIS).includes(stage);
  L.replicated = replicated;
  L.visible = replicated ? L.count * 2 : L.count;
  return L;
}

/* ---------------- SVG 描画 ---------------- */
function Chromosome({ id, pos, dim }) {
  const [chr] = id.split('-');
  const meta = CHR[chr];
  const long = meta.size === 'long';
  const col = COLOR[meta.origin];
  const h = long ? 56 : 34;
  return (
    <g
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        transition: 'transform 850ms cubic-bezier(.45,.05,.35,1), opacity 500ms ease',
        opacity: pos.hidden ? 0 : dim ? 0.6 : 1,
      }}
    >
      <rect
        x={-6.5}
        y={-h / 2}
        width={13}
        height={h}
        rx={6.5}
        fill={col.fill}
        stroke={col.stroke}
        strokeWidth={2}
      />
      {/* くびれ（染色体の中央のしるし） */}
      <rect x={-6.5} y={-2} width={13} height={4} fill={col.stroke} opacity={0.55} />
    </g>
  );
}

function CellCanvas({ mode, stage, zoom, height = 430 }) {
  const L = getLayout(mode, stage);
  const dim = L.nuclei.length > 0;
  const plates = !L.plate ? [] : Array.isArray(L.plate) ? L.plate : [L.plate];

  const single = L.cells.length === 1;
  const viewBox = zoom
    ? single
      ? `70 100 ${L.viewW - 140} 280`
      : `0 100 ${L.viewW} 280`
    : `0 0 ${L.viewW} ${L.viewH}`;

  return (
    <svg
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height, display: 'block' }}
    >
      {/* 細胞膜 */}
      {L.cells.map((c, i) => (
        <ellipse
          key={`cell-${i}`}
          cx={c.cx}
          cy={c.cy}
          rx={c.rx}
          ry={c.ry}
          fill="rgba(134, 239, 172, 0.22)"
          stroke="#4ade80"
          strokeWidth={3}
          style={{ transition: 'all 700ms ease' }}
        />
      ))}
      {/* 核 */}
      {L.nuclei.map((n, i) => (
        <ellipse
          key={`nuc-${i}`}
          cx={n.cx}
          cy={n.cy}
          rx={n.rx}
          ry={n.ry}
          fill="rgba(252, 231, 243, 0.85)"
          stroke="#f9a8d4"
          strokeWidth={2.5}
          style={{ transition: 'all 700ms ease' }}
        />
      ))}
      {/* 中央の並び目印 */}
      {plates.map((p, i) => (
        <line
          key={`plate-${i}`}
          x1={p.x}
          y1={p.y1}
          x2={p.x}
          y2={p.y2}
          stroke="#cbd5e1"
          strokeWidth={2}
          strokeDasharray="7 7"
        />
      ))}
      {/* 染色体 */}
      {TOKENS.map((id) => {
        const pos = L.tokens[id];
        if (!pos) return null;
        return <Chromosome key={id} id={id} pos={pos} dim={dim} />;
      })}
    </svg>
  );
}

/* ---------------- 小さなUI部品 ---------------- */
function Btn({ children, onClick, active, disabled, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
    primary: 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  };
  const base = active
    ? 'ring-2 ring-emerald-400 bg-emerald-500 text-white border-emerald-500'
    : tones[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl border font-bold text-sm sm:text-base transition select-none disabled:opacity-40 disabled:cursor-not-allowed ${base} ${className}`}
    >
      {children}
    </button>
  );
}

function CountBadge({ count, visible, replicated, compact = false, note = false }) {
  const big = compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl';
  return (
    <div className="rounded-2xl bg-white/90 border border-emerald-200 px-3 sm:px-4 py-2 shadow-sm">
      {!compact && (
        <div className="text-[10px] sm:text-xs text-slate-400 text-right leading-tight">
          1つの細胞あたり
        </div>
      )}
      {/* 上段：染色体数 */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] sm:text-xs text-slate-500 leading-tight">染色体数</span>
        <span className={`${big} font-black text-emerald-600 leading-tight`}>
          {count}
          <span className="text-sm sm:text-base font-bold">本</span>
        </span>
      </div>
      <div className="my-1 border-t border-dashed border-emerald-100" />
      {/* 下段：染色体の本数（見た目） */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] sm:text-xs text-slate-500 leading-tight">
          染色体の本数
          <br className="hidden sm:block" />
          （見た目）
        </span>
        <span className={`${big} font-black text-sky-500 leading-tight`}>
          {visible}
          <span className="text-sm sm:text-base font-bold">{replicated ? '本分' : '本'}</span>
        </span>
      </div>
      {note && (
        <p className="mt-1.5 pt-1.5 border-t border-slate-100 text-[9px] sm:text-[10px] text-slate-400 leading-snug max-w-[15rem]">
          ※「染色体の本数（見た目）」は、複製された染色体もそれぞれ数えた場合の本数です。
        </p>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600">
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3.5 h-3.5 rounded bg-[#3b82f6] border border-[#1d4ed8]" />
        父由来：青
      </span>
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3.5 h-3.5 rounded bg-[#f59e0b] border border-[#b45309]" />
        母由来：オレンジ
      </span>
      <span className="text-slate-400">｜ 長い染色体2本・短い染色体2本</span>
    </div>
  );
}

/* ---------------- 共通の再生コントロール ---------------- */
function useStagePlayer(maxIndex, interval = 1500) {
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(() => {
      setStage((s) => {
        if (s >= maxIndex) {
          setPlaying(false);
          return s;
        }
        return s + 1;
      });
    }, interval);
    return () => clearInterval(timer.current);
  }, [playing, maxIndex, interval]);

  // maxが縮んだとき（モード切替）にクランプ
  useEffect(() => {
    setStage((s) => Math.min(s, maxIndex));
  }, [maxIndex]);

  return { stage, setStage, playing, setPlaying };
}

function Controls({ player, maxIndex }) {
  const { stage, setStage, playing, setPlaying } = player;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {!playing ? (
          <Btn tone="primary" onClick={() => setPlaying(true)} disabled={stage >= maxIndex}>
            ▶ 再生
          </Btn>
        ) : (
          <Btn tone="primary" onClick={() => setPlaying(false)}>
            ■ 停止
          </Btn>
        )}
        <Btn onClick={() => setStage((s) => Math.max(0, s - 1))} disabled={stage <= 0}>
          ← 前へ
        </Btn>
        <Btn onClick={() => setStage((s) => Math.min(maxIndex, s + 1))} disabled={stage >= maxIndex}>
          次へ →
        </Btn>
        <Btn
          onClick={() => {
            setPlaying(false);
            setStage(0);
          }}
        >
          ⟲ リセット
        </Btn>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 whitespace-nowrap">段階</span>
        <input
          type="range"
          min={0}
          max={maxIndex}
          value={stage}
          onChange={(e) => {
            setPlaying(false);
            setStage(Number(e.target.value));
          }}
          className="w-full accent-emerald-500"
        />
        <span className="text-xs font-bold text-slate-600 whitespace-nowrap">
          {stage + 1}/{maxIndex + 1}
        </span>
      </div>
    </div>
  );
}

/* ---------------- 学習モード ---------------- */
function LearnMode({ showDesc, zoom }) {
  const [type, setType] = useState('mitosis');
  const stages = type === 'meiosis' ? MEIOSIS_STAGES : MITOSIS_STAGES;
  const maxIndex = stages.length - 1;
  const player = useStagePlayer(maxIndex);
  const { stage } = player;
  const L = getLayout(type, stage);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Btn
            active={type === 'mitosis'}
            onClick={() => {
              setType('mitosis');
              player.setStage(0);
              player.setPlaying(false);
            }}
          >
            体細胞分裂
          </Btn>
          <Btn
            active={type === 'meiosis'}
            onClick={() => {
              setType('meiosis');
              player.setStage(0);
              player.setPlaying(false);
            }}
          >
            減数分裂
          </Btn>
        </div>
        <CountBadge count={L.count} visible={L.visible} replicated={L.replicated} note />
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-emerald-50 border border-emerald-100 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-1 px-1">
          <span className="inline-flex items-center gap-2 text-emerald-700 font-black text-base sm:text-lg">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500 text-white text-sm">
              {stage + 1}
            </span>
            {L.t}
          </span>
        </div>
        <CellCanvas mode={type} stage={stage} zoom={zoom} />
        {showDesc && (
          <div className="mt-2 rounded-2xl bg-white/80 border border-slate-200 px-4 py-3 text-slate-700 text-sm sm:text-base font-medium">
            {L.d}
          </div>
        )}
      </div>

      <Controls player={player} maxIndex={maxIndex} />
    </div>
  );
}

/* ---------------- 比較モード ---------------- */
const COMPARE_ROWS = [
  { label: '分裂回数', mit: '1回', mei: '2回' },
  { label: 'できる細胞数', mit: '2個', mei: '4個' },
  { label: '染色体数', mit: '変わらない', mei: '半分になる' },
  { label: '役割', mit: '成長・修復', mei: '生殖細胞をつくる' },
];

function CompareMode({ showDesc, zoom }) {
  // 9段階で再生（体細胞は7でクランプ）
  const maxIndex = 8;
  const player = useStagePlayer(maxIndex);
  const { stage } = player;
  const mitStage = Math.min(stage, MITOSIS_STAGES.length - 1);
  const meiStage = Math.min(stage, MEIOSIS_STAGES.length - 1);
  const mitL = getLayout('mitosis', mitStage);
  const meiL = getLayout('meiosis', meiStage);

  const Panel = ({ title, mode, st, L, accent }) => (
    <div className="flex-1 min-w-0 rounded-3xl bg-gradient-to-b from-sky-50 to-emerald-50 border border-emerald-100 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className={`font-black text-sm sm:text-base ${accent}`}>{title}</span>
        <CountBadge count={L.count} visible={L.visible} replicated={L.replicated} compact />
      </div>
      <div className="text-xs sm:text-sm font-bold text-slate-600 mb-1 px-1 truncate">
        {st + 1}. {L.t}
      </div>
      <CellCanvas mode={mode} stage={st} zoom={zoom} height={300} />
      {showDesc && (
        <div className="mt-2 rounded-xl bg-white/80 border border-slate-200 px-3 py-2 text-slate-700 text-xs sm:text-sm font-medium min-h-[3rem]">
          {L.d}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Panel title="体細胞分裂" mode="mitosis" st={mitStage} L={mitL} accent="text-emerald-700" />
        <Panel title="減数分裂" mode="meiosis" st={meiStage} L={meiL} accent="text-orange-600" />
      </div>

      <p className="text-[10px] sm:text-xs text-slate-400 leading-snug">
        ※「染色体の本数（見た目）」は、複製された染色体もそれぞれ数えた場合の本数です。
      </p>

      <Controls player={player} maxIndex={maxIndex} />

      {/* 比較表 */}
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-sm sm:text-base">
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="py-2 px-3 text-left font-bold w-1/4">比較項目</th>
              <th className="py-2 px-3 text-left font-bold text-emerald-700">体細胞分裂</th>
              <th className="py-2 px-3 text-left font-bold text-orange-600">減数分裂</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((r) => (
              <tr key={r.label} className="border-t border-slate-100">
                <td className="py-2 px-3 font-bold text-slate-500 bg-slate-50">{r.label}</td>
                <td className="py-2 px-3 text-slate-700 font-medium">{r.mit}</td>
                <td className="py-2 px-3 text-slate-700 font-medium">{r.mei}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------- クイズモード ---------------- */
const QUIZ_BANK = [
  {
    q: '体細胞分裂では、1個の細胞が分裂すると何個の細胞ができますか？',
    choices: ['1個', '2個', '4個', '8個'],
    answer: 1,
    fig: { mode: 'mitosis', stage: 7 },
    exp: '体細胞分裂は1回の分裂で、2個の細胞ができます。',
  },
  {
    q: '減数分裂では、最終的に何個の細胞ができますか？',
    choices: ['2個', '3個', '4個', '6個'],
    answer: 2,
    fig: { mode: 'meiosis', stage: 8 },
    exp: '減数分裂は2回の分裂を行い、4個の生殖細胞ができます。',
  },
  {
    q: 'この細胞（減数分裂でできた生殖細胞）1個あたりの染色体数は？ ※元の細胞は4本',
    choices: ['1本', '2本', '4本', '8本'],
    answer: 1,
    fig: { mode: 'meiosis', stage: 8 },
    exp: '減数分裂では染色体数が半分になります。元が4本なので2本です。',
  },
  {
    q: '体細胞分裂でできた細胞の染色体数は、元の細胞と比べてどうなりますか？',
    choices: ['半分になる', '変わらない', '2倍になる', 'なくなる'],
    answer: 1,
    fig: { mode: 'mitosis', stage: 7 },
    exp: '体細胞分裂では、元の細胞と同じ染色体数をもつ細胞ができます。',
  },
  {
    q: '減数分裂でできる細胞の染色体数は、元の細胞と比べてどうなりますか？',
    choices: ['変わらない', '半分になる', '2倍になる', '3倍になる'],
    answer: 1,
    fig: { mode: 'meiosis', stage: 8 },
    exp: '減数分裂では、染色体数が半分の生殖細胞ができます。',
  },
  {
    q: '染色体が複製されるのはいつですか？',
    choices: ['分裂が始まる前', '中期', '後期', '分裂が終わったあと'],
    answer: 0,
    fig: { mode: 'mitosis', stage: 1 },
    exp: '分裂の前に、あらかじめ染色体が複製されます。',
  },
  {
    q: '中央に染色体が並んでいます。このあと染色体はどうなりますか？',
    choices: [
      '消えてなくなる',
      '2つに分かれて両極へ移動する',
      'さらに複製される',
      '1か所に集まる',
    ],
    answer: 1,
    fig: { mode: 'mitosis', stage: 3 },
    exp: '中期のあとは後期。染色体が分かれて細胞の両極へ移動します。',
  },
  {
    q: '減数分裂は何回分裂しますか？',
    choices: ['1回', '2回', '3回', '4回'],
    answer: 1,
    fig: { mode: 'meiosis', stage: 5 },
    exp: '減数分裂は連続して2回分裂します。',
  },
];

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizMode({ zoom }) {
  const [order, setOrder] = useState(() => shuffle(QUIZ_BANK.map((_, i) => i)));
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const q = QUIZ_BANK[order[idx]];
  const done = answeredCount >= QUIZ_BANK.length && picked !== null && idx === QUIZ_BANK.length - 1;

  function pick(i) {
    if (picked !== null) return;
    setPicked(i);
    setAnsweredCount((c) => c + 1);
    if (i === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (idx < QUIZ_BANK.length - 1) {
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  function restart() {
    setOrder(shuffle(QUIZ_BANK.map((_, i) => i)));
    setIdx(0);
    setPicked(null);
    setScore(0);
    setAnsweredCount(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-slate-500">
          第 {idx + 1} 問 / {QUIZ_BANK.length} 問
        </span>
        <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-sm font-bold text-emerald-700">
          得点 {score} / {QUIZ_BANK.length}
        </span>
      </div>

      <div className="rounded-3xl bg-gradient-to-b from-sky-50 to-emerald-50 border border-emerald-100 p-3 sm:p-4">
        <CellCanvas mode={q.fig.mode} stage={q.fig.stage} zoom={zoom} height={240} />
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-slate-800 font-bold text-base sm:text-lg">
        Q. {q.q}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {q.choices.map((c, i) => {
          const isAnswer = i === q.answer;
          const isPicked = i === picked;
          let cls = 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700';
          if (picked !== null) {
            if (isAnswer) cls = 'bg-emerald-50 border-emerald-400 text-emerald-700';
            else if (isPicked) cls = 'bg-rose-50 border-rose-300 text-rose-600';
            else cls = 'bg-white border-slate-200 text-slate-400';
          }
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={picked !== null}
              className={`text-left px-4 py-3 rounded-xl border font-bold text-sm sm:text-base transition ${cls}`}
            >
              {['ア', 'イ', 'ウ', 'エ'][i]}．{c}
              {picked !== null && isAnswer && ' ✓'}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div
          className={`rounded-2xl px-4 py-3 font-medium text-sm sm:text-base border ${
            picked === q.answer
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <div className="font-black mb-0.5">
            {picked === q.answer ? '正解！' : '不正解…'}
          </div>
          {q.exp}
        </div>
      )}

      <div className="flex gap-2">
        {picked !== null && idx < QUIZ_BANK.length - 1 && (
          <Btn tone="primary" onClick={next}>
            次の問題 →
          </Btn>
        )}
        {picked !== null && idx === QUIZ_BANK.length - 1 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-black text-slate-700">
              終了！ {QUIZ_BANK.length}問中 {score}問 正解
            </span>
            <Btn tone="primary" onClick={restart}>
              ⟲ もう一度
            </Btn>
          </div>
        )}
        {picked === null && <span className="text-sm text-slate-400 py-2">答えを選んでください</span>}
      </div>
    </div>
  );
}

/* ---------------- ルート ---------------- */
export default function App() {
  const [tab, setTab] = useState('learn'); // learn | compare | quiz
  const [showDesc, setShowDesc] = useState(true);
  const [zoom, setZoom] = useState(false);

  return (
    <div className="min-h-full bg-gradient-to-b from-emerald-50 via-sky-50 to-white">
      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 sm:py-6">
        {/* ヘッダー */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
          <h1 className="text-xl sm:text-3xl font-black text-emerald-700 flex items-center gap-2">
            <span aria-hidden>🧫</span> 細胞分裂シミュレーター
          </h1>
          <Legend />
        </header>

        {/* モード切替 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Btn active={tab === 'learn'} onClick={() => setTab('learn')}>
            学習モード
          </Btn>
          <Btn active={tab === 'compare'} onClick={() => setTab('compare')}>
            比較モード
          </Btn>
          <Btn active={tab === 'quiz'} onClick={() => setTab('quiz')}>
            クイズモード
          </Btn>

          <div className="grow" />

          {tab !== 'quiz' && (
            <Btn tone="soft" active={showDesc} onClick={() => setShowDesc((v) => !v)}>
              説明 {showDesc ? 'ON' : 'OFF'}
            </Btn>
          )}
          <Btn tone="soft" active={zoom} onClick={() => setZoom((v) => !v)}>
            {zoom ? '拡大中' : '拡大モード'}
          </Btn>
        </div>

        {/* 注記 */}
        <p className="text-xs text-slate-500 mb-3 bg-white/70 inline-block rounded-lg px-3 py-1 border border-slate-200">
          ※ 説明のため染色体を4本で表しています。
        </p>

        {/* 本体 */}
        <main className="bg-white/70 backdrop-blur rounded-3xl shadow-sm border border-slate-100 p-3 sm:p-5">
          {tab === 'learn' && <LearnMode showDesc={showDesc} zoom={zoom} />}
          {tab === 'compare' && <CompareMode showDesc={showDesc} zoom={zoom} />}
          {tab === 'quiz' && <QuizMode zoom={zoom} />}
        </main>

        <footer className="text-center text-xs text-slate-400 mt-5">
          中学校理科 細胞分裂シミュレーター
        </footer>
      </div>
    </div>
  );
}
