import React, { useEffect, useRef } from 'react';
import type { MoveRecord } from '../shogi/types';

interface KifuHistoryProps {
  history: MoveRecord[];
}

export const KifuHistory: React.FC<KifuHistoryProps> = ({ history }) => {
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history.length]);

  return (
    <div className="kifu-history-card">
      <div className="kifu-header">
        <h3 className="kifu-title">棋譜記録</h3>
        <span className="kifu-count">{history.length}手</span>
      </div>

      <div className="kifu-list-container">
        {history.length === 0 ? (
          <div className="kifu-empty">初手を指してください</div>
        ) : (
          <ol className="kifu-list">
            {history.map((record, index) => {
              const moveNum = index + 1;
              const isLatest = index === history.length - 1;

              return (
                <li
                  key={`kifu-${moveNum}`}
                  className={`kifu-item ${isLatest ? 'kifu-item-latest' : ''}`}
                >
                  <span className="kifu-num">{moveNum}.</span>
                  <span className="kifu-text">{record.kifuText}</span>
                </li>
              );
            })}
            <div ref={listEndRef} />
          </ol>
        )}
      </div>
    </div>
  );
};
