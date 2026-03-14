import React from 'react';
import { useAuth } from '../context/AuthContext';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardTable({ data, loading }) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-3">📊</p>
        <p>No hay datos de ranking todavía.</p>
        <p className="text-sm mt-1">Los puntos se calculan cuando los partidos finalizan.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
            <th className="pb-3 pr-4 w-12">#</th>
            <th className="pb-3 pr-4">Jugador</th>
            <th className="pb-3 pr-4 text-center">Predicciones</th>
            <th className="pb-3 pr-4 text-center">Exactos</th>
            <th className="pb-3 text-center font-bold text-gray-400">Puntos</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {data.map((entry) => {
            const isMe = entry.userId?.toString() === user?.id;
            return (
              <tr
                key={entry.userId}
                className={`transition-colors ${isMe ? 'bg-primary-500/10' : 'hover:bg-gray-900'}`}
              >
                <td className="py-3 pr-4">
                  <span className="font-bold text-lg">
                    {MEDAL[entry.position] || <span className="text-gray-500">{entry.position}</span>}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <p className={`font-medium ${isMe ? 'text-primary-400' : 'text-white'}`}>
                    {entry.name}
                    {isMe && <span className="text-xs ml-2 text-primary-500/70">(tú)</span>}
                  </p>
                </td>
                <td className="py-3 pr-4 text-center text-gray-400">
                  {entry.totalPredictions}
                </td>
                <td className="py-3 pr-4 text-center text-green-400">
                  {entry.exactResults}
                </td>
                <td className="py-3 text-center">
                  <span className={`text-xl font-bold ${isMe ? 'text-primary-400' : 'text-white'}`}>
                    {entry.totalPoints}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
