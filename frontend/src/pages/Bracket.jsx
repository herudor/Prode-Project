import React, { useState, useEffect } from 'react';
import { getMatches, getPredictions } from '../services/api';
import PredictionForm from '../components/PredictionForm';
import FlagIcon from '../components/FlagIcon';
import { teamName } from '../utils/teamNames';

// ─── Layout constants ────────────────────────────────────────────────────────
const ROW_H  = 96;   // px — height of one base row (= 1 R32 match slot per side)
const ROWS   = 8;    // base rows per half (8 R32 matches per side)
const CARD_W = 188;  // px — match card width
const CONN_W = 28;   // px — connector column width
const TOTAL_H = ROW_H * ROWS; // 768px

// Timezone: Argentina UTC-3
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  });
}

function isPlaceholder(name) {
  return !name || name === 'TBD' || name.startsWith('Winner') || name.startsWith('Runner') || name.startsWith('Loser') || name.startsWith('3rd');
}

// ─── Match card ──────────────────────────────────────────────────────────────
function TeamRow({ name, label, score, isWinner, status }) {
  const placeholder = isPlaceholder(name);
  const display = placeholder ? (label || name || 'Por definir') : teamName(name);

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded transition-colors ${isWinner ? 'bg-yellow-500/10' : ''}`}>
      <FlagIcon teamName={placeholder ? null : name} size={13} className="flex-shrink-0" />
      <span className={`text-xs flex-1 truncate leading-tight ${
        placeholder ? 'text-gray-600 italic' :
        isWinner    ? 'text-white font-bold'  : 'text-gray-300'
      }`} style={{ maxWidth: 100 }}>
        {display}
      </span>
      {status !== 'upcoming' && !placeholder && (
        <span className={`text-xs font-bold tabular-nums ml-auto ${isWinner ? 'text-yellow-400' : 'text-gray-500'}`}>
          {score ?? '-'}
        </span>
      )}
    </div>
  );
}

function MatchCard({ match, prediction, onPredict, dim = false }) {
  if (!match) {
    return (
      <div className="flex flex-col justify-center border border-dashed border-gray-800 rounded-lg bg-gray-950/60"
        style={{ width: CARD_W, height: ROW_H - 8, margin: '4px 0' }}>
        <div className="px-2.5 py-1.5 flex items-center gap-1.5 opacity-30">
          <span className="fi fi-" style={{ fontSize: 13 }} />
          <span className="text-xs text-gray-600 italic">Por definir</span>
        </div>
        <div className="border-t border-gray-800/50 mx-2" />
        <div className="px-2.5 py-1.5 flex items-center gap-1.5 opacity-30">
          <span className="fi fi-" style={{ fontSize: 13 }} />
          <span className="text-xs text-gray-600 italic">Por definir</span>
        </div>
      </div>
    );
  }

  const status   = match.status || 'upcoming';
  const homeWins = status === 'finished' && match.homeScore > match.awayScore;
  const awayWins = status === 'finished' && match.awayScore > match.homeScore;
  const isPred   = status === 'upcoming' && new Date(match.date) > new Date();

  const borderColor = status === 'live' ? '#22c55e' : status === 'finished' ? '#4b5563' : '#374151';

  return (
    <div
      className={`flex flex-col justify-center rounded-lg bg-gray-900 transition-all cursor-default ${dim ? 'opacity-60' : ''}`}
      style={{ width: CARD_W, height: ROW_H - 8, margin: '4px 0', border: `1.5px solid ${borderColor}`, overflow: 'hidden' }}
    >
      {/* Date / status line */}
      <div className="flex items-center justify-between px-2.5 pb-0.5">
        <span className="text-[10px] text-gray-600">{formatDate(match.date)}</span>
        {status === 'live' && <span className="text-[10px] font-bold text-green-400 animate-pulse">● VIVO</span>}
        {status === 'finished' && <span className="text-[10px] text-gray-600">Final</span>}
      </div>

      {/* Home */}
      <TeamRow name={match.homeTeam} label={match.homeTeamLabel} score={match.homeScore} isWinner={homeWins} status={status} />
      <div className="border-t border-gray-800/40 mx-2" />
      {/* Away */}
      <TeamRow name={match.awayTeam} label={match.awayTeamLabel} score={match.awayScore} isWinner={awayWins} status={status} />

      {/* Predict button */}
      {isPred && !prediction && (
        <button
          onClick={() => onPredict(match)}
          className="mx-2 mb-1 text-[10px] bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 border border-primary-500/30 rounded py-0.5 transition-colors"
        >
          Predecir
        </button>
      )}
      {isPred && prediction && (
        <div className="px-2.5 flex items-center justify-between">
          <span className="text-[10px] text-gray-600">
            Pred: <span className="text-primary-400">{prediction.homeScore}-{prediction.awayScore}</span>
          </span>
          <button onClick={() => onPredict(match)} className="text-[10px] text-gray-600 hover:text-primary-400">Editar</button>
        </div>
      )}
    </div>
  );
}

// ─── Connector cells ──────────────────────────────────────────────────────────
// pct = always 25% (match centers are at 1/4 and 3/4 of any connector cell height)
const LINE = '2px solid #374151';

// Left-pointing connector (left side of bracket): lines go LEFT from vertical bar
function ConnectorL({ rowStart, rowSpan, col }) {
  return (
    <div style={{ gridRow: `${rowStart} / span ${rowSpan}`, gridColumn: col, position: 'relative' }}>
      <div style={{ position: 'absolute', top: '25%',      left: 0, right: 0, borderTop:    LINE }} />
      <div style={{ position: 'absolute', top: '25%', bottom: '25%', right: 0, borderRight: LINE }} />
      <div style={{ position: 'absolute', bottom: '25%',  left: 0, right: 0, borderBottom: LINE }} />
    </div>
  );
}

// Right-pointing connector (right side of bracket): lines go RIGHT from vertical bar
function ConnectorR({ rowStart, rowSpan, col }) {
  return (
    <div style={{ gridRow: `${rowStart} / span ${rowSpan}`, gridColumn: col, position: 'relative' }}>
      <div style={{ position: 'absolute', top: '25%',      left: 0, right: 0, borderTop:    LINE }} />
      <div style={{ position: 'absolute', top: '25%', bottom: '25%', left: 0, borderLeft:   LINE }} />
      <div style={{ position: 'absolute', bottom: '25%',  left: 0, right: 0, borderBottom: LINE }} />
    </div>
  );
}

// Single horizontal stem: connects the Final to each side's SF
function StemL({ col }) {
  return (
    <div style={{ gridRow: `1 / span ${ROWS}`, gridColumn: col, position: 'relative' }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, borderTop: LINE }} />
    </div>
  );
}
function StemR({ col }) {
  return <StemL col={col} />;
}

// ─── Match cells (positioned in the CSS grid) ────────────────────────────────
function MatchCell({ row, rowSpan = 1, col, match, prediction, onPredict }) {
  return (
    <div style={{ gridRow: `${row} / span ${rowSpan}`, gridColumn: col, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MatchCard match={match} prediction={prediction} onPredict={onPredict} />
    </div>
  );
}

// ─── Main Bracket ─────────────────────────────────────────────────────────────
//
// Grid layout (17 columns, 8 rows):
// Col:  1        2     3     4     5     6     7      8    9     10    11    12    13    14    15    16   17
//     [R32-L]  [CL1] [R16-L][CL2] [QF-L][CL3] [SF-L][CL4][FIN][CR4][SF-R][CR3][QF-R][CR2][R16-R][CR1][R32-R]
//
// L = left half (R32→SF), R = right half (mirrored)
// CLn = left connector, CRn = right connector

const COL = {
  r32L:  1,  cl1: 2,
  r16L:  3,  cl2: 4,
  qfL:   5,  cl3: 6,
  sfL:   7,  cl4: 8,
  fin:   9,  cr4: 10,
  sfR:   11, cr3: 12,
  qfR:   13, cr2: 14,
  r16R:  15, cr1: 16,
  r32R:  17,
};

export default function Bracket() {
  const [knockoutMatches, setKnockoutMatches] = useState({
    r32: [], r16: [], qf: [], sf: [], third: null, final: null
  });
  const [predictions, setPredictions] = useState({});
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [matchRes, predRes] = await Promise.all([getMatches(), getPredictions()]);

      const byPhase = (phase) =>
        matchRes.data.filter(m => m.phase === phase).sort((a, b) => new Date(a.date) - new Date(b.date));

      setKnockoutMatches({
        r32:   byPhase('round_of_32'),
        r16:   byPhase('round_of_16'),
        qf:    byPhase('quarter'),
        sf:    byPhase('semi'),
        third: byPhase('third')[0] || null,
        final: byPhase('final')[0]  || null,
      });

      const predMap = {};
      predRes.data.forEach(p => { if (p.matchId) predMap[p.matchId._id || p.matchId] = p; });
      setPredictions(predMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSaved = (pred) => {
    setPredictions(prev => ({ ...prev, [pred.matchId]: pred }));
    setSelectedMatch(null);
  };

  const { r32, r16, qf, sf, third, final: finalMatch } = knockoutMatches;

  // Helper to get match or null
  const m = (arr, i) => arr[i] || null;
  const pred = (match) => match ? predictions[match._id] : undefined;

  if (loading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" /></div>;
  }

  // Grid column template
  const cols = [
    CARD_W, CONN_W, CARD_W, CONN_W, CARD_W, CONN_W, CARD_W, CONN_W,
    CARD_W,
    CONN_W, CARD_W, CONN_W, CARD_W, CONN_W, CARD_W, CONN_W, CARD_W,
  ].map(w => `${w}px`).join(' ');

  return (
    <div className="max-w-full px-4 py-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">🏆</span>
          <div>
            <h1 className="text-2xl font-bold">Fase Eliminatoria</h1>
            <p className="text-gray-400 text-sm">Horario de Argentina (UTC-3)</p>
          </div>
        </div>

        {/* Phase labels */}
        <div className="overflow-x-auto pb-1" style={{ minWidth: 'max-content' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, width: 'max-content' }}>
            {[
              [COL.r32L,  'Ronda 32'],
              [COL.r16L,  'Octavos'],
              [COL.qfL,   'Cuartos'],
              [COL.sfL,   'Semis'],
              [COL.fin,   'Final'],
              [COL.sfR,   'Semis'],
              [COL.qfR,   'Cuartos'],
              [COL.r16R,  'Octavos'],
              [COL.r32R,  'Ronda 32'],
            ].map(([col, label]) => (
              <div key={col} style={{ gridColumn: col, textAlign: 'center' }}>
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{label}</span>
              </div>
            ))}
          </div>

          {/* Bracket grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: cols,
            gridTemplateRows: `repeat(${ROWS}, ${ROW_H}px)`,
            height: TOTAL_H,
            width: 'max-content',
            marginTop: 8,
          }}>

            {/* ── LEFT SIDE: R32 (8 matches, rows 1-8) ── */}
            {Array.from({ length: ROWS }, (_, i) => (
              <MatchCell key={`r32l-${i}`} row={i+1} col={COL.r32L}
                match={m(r32, i)} prediction={pred(m(r32, i))} onPredict={setSelectedMatch} />
            ))}

            {/* Left R32→R16 connectors (4 pairs of 2 rows) */}
            {[1,3,5,7].map(r => <ConnectorL key={`cl1-${r}`} rowStart={r} rowSpan={2} col={COL.cl1} />)}

            {/* R16 left (4 matches, rows 1,3,5,7 spanning 2 each) */}
            {[0,1,2,3].map(i => (
              <MatchCell key={`r16l-${i}`} row={i*2+1} rowSpan={2} col={COL.r16L}
                match={m(r16, i)} prediction={pred(m(r16, i))} onPredict={setSelectedMatch} />
            ))}

            {/* Left R16→QF connectors (2 pairs of 4 rows) */}
            {[1,5].map(r => <ConnectorL key={`cl2-${r}`} rowStart={r} rowSpan={4} col={COL.cl2} />)}

            {/* QF left (2 matches, rows 1 and 5, spanning 4 each) */}
            {[0,1].map(i => (
              <MatchCell key={`qfl-${i}`} row={i*4+1} rowSpan={4} col={COL.qfL}
                match={m(qf, i)} prediction={pred(m(qf, i))} onPredict={setSelectedMatch} />
            ))}

            {/* Left QF→SF connector (1, all 8 rows) */}
            <ConnectorL rowStart={1} rowSpan={ROWS} col={COL.cl3} />

            {/* SF left (1 match, all 8 rows) */}
            <MatchCell row={1} rowSpan={ROWS} col={COL.sfL}
              match={m(sf, 0)} prediction={pred(m(sf, 0))} onPredict={setSelectedMatch} />

            {/* Left SF→Final stem */}
            <StemL col={COL.cl4} />

            {/* ── CENTER: FINAL ── */}
            <MatchCell row={1} rowSpan={ROWS} col={COL.fin}
              match={finalMatch} prediction={pred(finalMatch)} onPredict={setSelectedMatch} />

            {/* Right Final→SF stem */}
            <StemR col={COL.cr4} />

            {/* ── RIGHT SIDE (mirrored): SF, QF, R16, R32 ── */}

            {/* SF right (1 match, all 8 rows) */}
            <MatchCell row={1} rowSpan={ROWS} col={COL.sfR}
              match={m(sf, 1)} prediction={pred(m(sf, 1))} onPredict={setSelectedMatch} />

            {/* Right SF→QF connector */}
            <ConnectorR rowStart={1} rowSpan={ROWS} col={COL.cr3} />

            {/* QF right (2 matches) */}
            {[0,1].map(i => (
              <MatchCell key={`qfr-${i}`} row={i*4+1} rowSpan={4} col={COL.qfR}
                match={m(qf, 2+i)} prediction={pred(m(qf, 2+i))} onPredict={setSelectedMatch} />
            ))}

            {/* Right QF→R16 connectors */}
            {[1,5].map(r => <ConnectorR key={`cr2-${r}`} rowStart={r} rowSpan={4} col={COL.cr2} />)}

            {/* R16 right (4 matches) */}
            {[0,1,2,3].map(i => (
              <MatchCell key={`r16r-${i}`} row={i*2+1} rowSpan={2} col={COL.r16R}
                match={m(r16, 4+i)} prediction={pred(m(r16, 4+i))} onPredict={setSelectedMatch} />
            ))}

            {/* Right R16→R32 connectors */}
            {[1,3,5,7].map(r => <ConnectorR key={`cr1-${r}`} rowStart={r} rowSpan={2} col={COL.cr1} />)}

            {/* R32 right (8 matches) */}
            {Array.from({ length: ROWS }, (_, i) => (
              <MatchCell key={`r32r-${i}`} row={i+1} col={COL.r32R}
                match={m(r32, ROWS+i)} prediction={pred(m(r32, ROWS+i))} onPredict={setSelectedMatch} />
            ))}
          </div>
        </div>

        {/* 3rd place match */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Tercer Puesto</p>
          <MatchCard match={third} prediction={pred(third)} onPredict={setSelectedMatch} />
        </div>
      </div>

      {selectedMatch && (
        <PredictionForm
          match={selectedMatch}
          existingPrediction={predictions[selectedMatch._id]}
          onSaved={handleSaved}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
