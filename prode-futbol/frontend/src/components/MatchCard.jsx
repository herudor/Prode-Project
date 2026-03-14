import React from 'react';

const PHASE_LABELS = {
  group: 'Fase de Grupos',
  round_of_16: 'Octavos de Final',
  quarter: 'Cuartos de Final',
  semi: 'Semifinal',
  third: 'Tercer Puesto',
  final: 'Final'
};

const STATUS_COLORS = {
  upcoming: 'text-blue-400 bg-blue-400/10',
  live: 'text-green-400 bg-green-400/10 animate-pulse',
  finished: 'text-gray-400 bg-gray-400/10'
};

const STATUS_LABELS = {
  upcoming: 'Próximo',
  live: 'En vivo',
  finished: 'Finalizado'
};

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-AR', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit'
  });
}

function PointsBadge({ points }) {
  if (points === null || points === undefined) return null;
  const colors = {
    3: 'bg-green-500/20 text-green-400 border-green-500/30',
    2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    1: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    0: 'bg-red-500/20 text-red-400 border-red-500/30'
  };
  const labels = { 3: '3 pts - Exacto', 2: '2 pts - Diferencia', 1: '1 pt - Ganador', 0: '0 pts' };
  return (
    <span className={`text-xs border rounded-full px-2 py-0.5 ${colors[points] || ''}`}>
      {labels[points] || `${points} pts`}
    </span>
  );
}

export default function MatchCard({ match, prediction, onPredict }) {
  const isPredictable = match.status === 'upcoming' && new Date(match.date) > new Date();

  return (
    <div className="card hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">{PHASE_LABELS[match.phase] || match.phase}</span>
          {match.group && <span className="text-xs text-gray-600">· {match.group}</span>}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[match.status]}`}>
          {STATUS_LABELS[match.status]}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-4">
        {/* Home team */}
        <div className="flex-1 text-center">
          {match.homeFlag
            ? <img src={match.homeFlag} alt={match.homeTeam} className="w-12 h-12 object-contain mx-auto mb-1" />
            : <div className="w-12 h-12 bg-gray-800 rounded-full mx-auto mb-1 flex items-center justify-center text-xl">🏳️</div>
          }
          <p className="font-semibold text-sm">{match.homeTeam}</p>
        </div>

        {/* Score / VS */}
        <div className="text-center min-w-[80px]">
          {match.status !== 'upcoming'
            ? (
              <div className="text-2xl font-bold">
                <span className="text-white">{match.homeScore ?? '-'}</span>
                <span className="text-gray-600 mx-1">:</span>
                <span className="text-white">{match.awayScore ?? '-'}</span>
              </div>
            )
            : (
              <div>
                <p className="text-gray-500 text-lg font-bold">VS</p>
                <p className="text-xs text-gray-600 mt-1">{formatDate(match.date)}</p>
              </div>
            )
          }
          {match.status === 'upcoming' && (
            <p className="text-xs text-gray-600 mt-1">{formatDate(match.date)}</p>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-center">
          {match.awayFlag
            ? <img src={match.awayFlag} alt={match.awayTeam} className="w-12 h-12 object-contain mx-auto mb-1" />
            : <div className="w-12 h-12 bg-gray-800 rounded-full mx-auto mb-1 flex items-center justify-center text-xl">🏳️</div>
          }
          <p className="font-semibold text-sm">{match.awayTeam}</p>
        </div>
      </div>

      {/* Prediction section */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {prediction ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Tu predicción:</span>
              <span className="font-bold text-primary-500">
                {prediction.homeScore} - {prediction.awayScore}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <PointsBadge points={prediction.points} />
              {isPredictable && (
                <button onClick={() => onPredict(match)} className="text-xs text-gray-400 hover:text-primary-500 transition-colors">
                  Editar
                </button>
              )}
            </div>
          </div>
        ) : (
          isPredictable ? (
            <button
              onClick={() => onPredict(match)}
              className="w-full btn-primary text-sm py-2"
            >
              Predecir resultado
            </button>
          ) : (
            <p className="text-center text-xs text-gray-600">Sin predicción</p>
          )
        )}
      </div>
    </div>
  );
}
