import React from 'react';
import type { Color, PieceType } from '../shogi/types';
import {
  GOTE_KING_PAIR,
  PIECE_KANJI_PAIR,
  PIECE_SCALE_MAP,
  SINGLE_CHAR_MAP,
  UNPROMOTED_MAP,
} from '../shogi/constants';

interface ShogiPieceProps {
  type: PieceType;
  color: Color;
  isPromoted?: boolean;
  inverted?: boolean; // 180度反転
  size?: number; // px
  className?: string;
  count?: number; // 持ち駒の枚数表示用
  pieceFontMode?: 'two_char' | 'single_char';
}

export const ShogiPiece: React.FC<ShogiPieceProps> = ({
  type,
  color,
  isPromoted = false,
  inverted = false,
  size,
  className = '',
  count,
  pieceFontMode = 'two_char',
}) => {
  // 後手の玉は「王将」、先手の玉は「玉将」
  let kanjiPair = PIECE_KANJI_PAIR[type];
  if (type === 'OU' && color === 1) {
    kanjiPair = GOTE_KING_PAIR;
  }

  // 成駒判定
  const baseType = UNPROMOTED_MAP[type];
  const isCurrentlyPromoted = isPromoted || type !== baseType;

  // 漆の色（生駒は深みのある漆黒、成駒は伝統の艶ある本朱漆）
  const textColor = isCurrentlyPromoted ? '#991b1b' : '#0f0f13';
  const textGlossColor = isCurrentlyPromoted ? '#dc2626' : '#27272a';

  // 駒の伝統サイズ比率（王将が最大、歩兵が小ぶり）
  const scale = PIECE_SCALE_MAP[type] || 0.95;

  const isSingleChar =
    pieceFontMode === 'single_char' || kanjiPair.length === 1;

  let singleCharText = kanjiPair[0];
  if (pieceFontMode === 'single_char') {
    singleCharText = type === 'OU' && color === 1 ? '王' : SINGLE_CHAR_MAP[type];
  }

  // ユニークなID（SVGグラデーション用）
  const pieceId = `${type}-${color}-${isCurrentlyPromoted ? 'p' : 'u'}`;

  return (
    <div
      className={`shogi-piece-container ${className}`}
      style={{
        transform: inverted ? 'rotate(180deg)' : 'none',
        width: size ? `${size}px` : '100%',
        height: size ? `${size * 1.14}px` : '100%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${scale})`,
          transition: 'transform 0.15s ease',
        }}
      >
        <svg
          viewBox="0 0 100 114"
          className="w-full h-full drop-shadow-piece"
          style={{
            filter: 'drop-shadow(0 3px 4px rgba(45, 20, 5, 0.45)) drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2))',
            overflow: 'visible',
          }}
        >
          <defs>
            {/* 本黄楊（ツゲ）の木目グラデーション */}
            <linearGradient id={`tsugeWood-${pieceId}`} x1="15%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#fff9ed" />
              <stop offset="25%" stopColor="#f7e5be" />
              <stop offset="60%" stopColor="#edd4a4" />
              <stop offset="90%" stopColor="#dfbe88" />
              <stop offset="100%" stopColor="#d2ad74" />
            </linearGradient>

            {/* 駒の面取り（外枠ベベル）の光沢 */}
            <linearGradient id={`bevelLight-${pieceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#fae5b6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#996a29" stopOpacity="0.9" />
            </linearGradient>

            {/* 漆の光沢グラデーション */}
            <linearGradient id={`urushiGloss-${pieceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={textGlossColor} />
              <stop offset="100%" stopColor={textColor} />
            </linearGradient>

            {/* 柾目（まさめ）の縦木目パターン */}
            <pattern
              id={`woodGrain-${pieceId}`}
              width="100"
              height="114"
              patternUnits="userSpaceOnUse"
            >
              <line x1="22" y1="0" x2="22" y2="114" stroke="rgba(160, 100, 35, 0.08)" strokeWidth="0.8" />
              <line x1="38" y1="0" x2="38" y2="114" stroke="rgba(140, 85, 25, 0.06)" strokeWidth="0.6" />
              <line x1="50" y1="0" x2="50" y2="114" stroke="rgba(170, 110, 40, 0.09)" strokeWidth="0.9" />
              <line x1="64" y1="0" x2="64" y2="114" stroke="rgba(150, 95, 30, 0.07)" strokeWidth="0.7" />
              <line x1="78" y1="0" x2="78" y2="114" stroke="rgba(160, 100, 35, 0.08)" strokeWidth="0.8" />
            </pattern>
          </defs>

          {/* 1. 外郭ポリゴン（厚み・面取りの木地） */}
          <polygon
            points="50,5 88,22 93,107 7,107 12,22"
            fill={`url(#bevelLight-${pieceId})`}
            stroke="#83571d"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />

          {/* 2. 駒の内側盤面（黄楊の美しい木肌） */}
          <polygon
            points="50,8 85,24 89,103 11,103 15,24"
            fill={`url(#tsugeWood-${pieceId})`}
            stroke="none"
          />

          {/* 3. 柾目（木目）オーバーレイ */}
          <polygon
            points="50,8 85,24 89,103 11,103 15,24"
            fill={`url(#woodGrain-${pieceId})`}
            style={{ mixBlendMode: 'multiply' }}
          />

          {/* 4. 上部と左側の光の反射ハイライト線 */}
          <polyline
            points="15,24 50,8 85,24"
            fill="none"
            stroke="rgba(255, 255, 255, 0.75)"
            strokeWidth="1.0"
            strokeLinecap="round"
          />
          <line
            x1="11"
            y1="103"
            x2="15"
            y2="24"
            stroke="rgba(255, 255, 255, 0.4)"
            strokeWidth="0.8"
          />

          {/* 5. 彫り・盛り上げ漆文字（毛筆書体） */}
          {isSingleChar ? (
            /* 「と」金などの一字駒 */
            <text
              x="50"
              y="68"
              textAnchor="middle"
              dominantBaseline="central"
              fill={`url(#urushiGloss-${pieceId})`}
              fontFamily="'Yuji Boku', 'Klee One', 'Noto Serif JP', 'Yu Mincho', serif"
              fontWeight="900"
              fontSize="44px"
              style={{
                filter: 'drop-shadow(0.5px 0.8px 0.5px rgba(0, 0, 0, 0.45))',
                letterSpacing: '-1px',
              }}
            >
              {singleCharText}
            </text>
          ) : (
            /* 「玉将」「歩兵」「飛車」などの伝統二字駒 */
            <g
              style={{
                fontFamily: "'Yuji Boku', 'Klee One', 'Noto Serif JP', 'Yu Mincho', serif",
                fontWeight: '900',
                filter: 'drop-shadow(0.5px 0.8px 0.4px rgba(0, 0, 0, 0.45))',
              }}
            >
              {/* 上の文字（例: 「玉」「歩」「飛」） */}
              <text
                x="50"
                y="48"
                textAnchor="middle"
                dominantBaseline="central"
                fill={`url(#urushiGloss-${pieceId})`}
                fontSize="27px"
              >
                {kanjiPair[0]}
              </text>

              {/* 下の文字（例: 「将」「兵」「車」） */}
              <text
                x="50"
                y="83"
                textAnchor="middle"
                dominantBaseline="central"
                fill={`url(#urushiGloss-${pieceId})`}
                fontSize="26px"
              >
                {kanjiPair[1]}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* 持ち駒の枚数バッジ */}
      {count !== undefined && count > 1 && (
        <span
          className="piece-count-badge"
          style={{
            position: 'absolute',
            bottom: '-2px',
            right: '-2px',
            backgroundColor: '#78350f',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold',
            borderRadius: '10px',
            padding: '1px 5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
            border: '1px solid #fef3c7',
            zIndex: 10,
            transform: inverted ? 'rotate(180deg)' : 'none',
          }}
        >
          {count}
        </span>
      )}
    </div>
  );
};
