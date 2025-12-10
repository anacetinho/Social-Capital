import React from 'react';
import '../styles/ConnectionPath.css';

const ConnectionPath = ({ pathData }) => {
  if (!pathData || !pathData.found) {
    return (
      <div className="connection-path-not-found">
        <p>No direct connection found</p>
        {pathData?.suggestedIntermediaries && pathData.suggestedIntermediaries.length > 0 && (
          <div className="suggested-intermediaries">
            <p>Suggested intermediaries who know both people:</p>
            <ul>
              {pathData.suggestedIntermediaries.map((person, idx) => (
                <li key={idx}>{person.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const { path, degrees, strength } = pathData;

  // Determine strength color
  const getStrengthColor = (str) => {
    if (str >= 4) return '#4caf50'; // Green
    if (str >= 3) return '#8bc34a'; // Light green
    if (str >= 2) return '#ffc107'; // Yellow
    return '#ff9800'; // Orange
  };

  const strengthColor = getStrengthColor(strength);

  return (
    <div className="connection-path">
      <div className="path-summary">
        <div className="path-info">
          <span className="degrees-badge">
            {degrees} degree{degrees !== 1 ? 's' : ''}
          </span>
          <span className="strength-badge" style={{ backgroundColor: strengthColor }}>
            Strength: {strength}/5
          </span>
        </div>
      </div>

      <div className="path-visualization">
        {path.map((person, index) => (
          <React.Fragment key={index}>
            <div className="path-node">
              {person.photo_url ? (
                <img
                  src={person.photo_url}
                  alt={person.name}
                  className="path-avatar"
                />
              ) : (
                <div className="path-avatar-placeholder">
                  {person.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="path-node-name">{person.name}</div>
              {person.summary_snippet && (
                <div className="path-node-snippet">{person.summary_snippet}</div>
              )}
            </div>

            {index < path.length - 1 && (
              <div className="path-connector">
                <svg width="30" height="20" viewBox="0 0 30 20">
                  <line
                    x1="0"
                    y1="10"
                    x2="30"
                    y2="10"
                    stroke="#ccc"
                    strokeWidth="2"
                  />
                  <polygon
                    points="25,5 30,10 25,15"
                    fill="#ccc"
                  />
                </svg>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {pathData.intermediaries && pathData.intermediaries.length > 0 && (
        <div className="path-intermediaries">
          <div className="intermediaries-label">Through:</div>
          <div className="intermediaries-list">
            {pathData.intermediaries.map((person, idx) => (
              <span key={idx} className="intermediary-name">
                {person.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionPath;
