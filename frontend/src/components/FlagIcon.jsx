import { getTeamFlag } from '../utils/teamFlags';

// Renders a country flag using the flag-icons CSS library.
// size: font-size in px that controls flag dimensions (width = ~1.33 × fontSize)
export default function FlagIcon({ teamName, size = 16, className = '' }) {
  const code = getTeamFlag(teamName);
  if (!code) {
    return (
      <span
        className={className}
        style={{ display: 'inline-block', width: Math.round(size * 1.33), height: size, fontSize: size, lineHeight: `${size}px`, textAlign: 'center' }}
      >
        🏳️
      </span>
    );
  }
  return (
    <span
      className={`fi fi-${code} ${className}`}
      style={{ fontSize: size, borderRadius: 2 }}
    />
  );
}
