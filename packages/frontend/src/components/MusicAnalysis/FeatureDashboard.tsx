/**
 * Feature Dashboard
 * Displays statistics, histograms, and key information
 */

import styles from './FeatureDashboard.module.css';

interface KeyInfo {
  key: string;
  mode: string;
  full_name: string;
  correlation: number;
  confidence: number;
  pitch_class_distribution: number[];
}

interface Summary {
  total_notes: number;
  duration: number;
  pitch: {
    mean: number;
    range: number;
    lowest: number;
    highest: number;
  };
  rhythm: {
    note_density: number;
    avg_duration: number;
  };
  dynamics: {
    avg_velocity: number;
    velocity_range: number;
  };
  voices: Array<{
    voice_id: string;
    label: string;
    color: string;
    note_count: number;
    pitch_mean: number;
    pitch_range: number;
    note_density: number;
    avg_velocity: number;
  }>;
}

interface CircleOfFifths {
  fifths_order_weights: number[];
  fifths_labels: string[];
  key_position: number;
  key_name: string;
}

interface Histograms {
  pitch_class: number[];
  pitch_class_labels: string[];
  intervals: number[];
  interval_labels: string[];
}

interface FeatureDashboardProps {
  summary: Summary;
  keyInfo: KeyInfo;
  circleOfFifths: CircleOfFifths;
  histograms?: Histograms;
}

const PITCH_CLASS_COLORS = [
  '#ff4444', '#ff8844', '#ffcc44', '#88ff44', '#44ff44', '#44ff88',
  '#44ffcc', '#44ccff', '#4488ff', '#8844ff', '#cc44ff', '#ff44cc'
];

export function FeatureDashboard({
  summary,
  keyInfo,
  circleOfFifths,
  histograms
}: FeatureDashboardProps) {
  return (
    <div className={styles.container}>
      {/* Key Detection Card */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Detected Key</h3>
        <div className={styles.keyDisplay}>
          <span className={styles.keyName}>{keyInfo.full_name}</span>
          <span className={styles.keyConfidence}>
            {(keyInfo.confidence * 100).toFixed(0)}% confidence
          </span>
        </div>
        <div className={styles.correlationBar}>
          <div
            className={styles.correlationFill}
            style={{ width: `${keyInfo.correlation * 100}%` }}
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Summary</h3>
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{summary.total_notes.toLocaleString()}</span>
            <span className={styles.statLabel}>Total Notes</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{summary.duration.toFixed(1)}s</span>
            <span className={styles.statLabel}>Duration</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{summary.rhythm.note_density.toFixed(1)}</span>
            <span className={styles.statLabel}>Notes/sec</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{summary.pitch.range}</span>
            <span className={styles.statLabel}>Pitch Range</span>
          </div>
        </div>
      </div>

      {/* Chromagram (Pitch Class Distribution) */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Pitch Class Distribution</h3>
        <div className={styles.chromagram}>
          {keyInfo.pitch_class_distribution.map((value, i) => (
            <div key={i} className={styles.chromaBar}>
              <div
                className={styles.chromaFill}
                style={{
                  height: `${value * 100}%`,
                  backgroundColor: PITCH_CLASS_COLORS[i]
                }}
              />
              <span className={styles.chromaLabel}>
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Circle of Fifths */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Circle of Fifths</h3>
        <div className={styles.circleOfFifths}>
          <svg viewBox="-120 -120 240 240" className={styles.circleSvg}>
            {/* Outer circle */}
            <circle cx="0" cy="0" r="100" fill="none" stroke="#333" strokeWidth="2" />

            {/* Key position highlight */}
            <circle
              cx={Math.cos((circleOfFifths.key_position * 30 - 90) * Math.PI / 180) * 100}
              cy={Math.sin((circleOfFifths.key_position * 30 - 90) * Math.PI / 180) * 100}
              r="20"
              fill="rgba(99, 102, 241, 0.3)"
              stroke="rgb(99, 102, 241)"
              strokeWidth="2"
            />

            {/* Pitch class wedges */}
            {circleOfFifths.fifths_order_weights.map((weight, i) => {
              const angle = (i * 30 - 90) * Math.PI / 180;
              const x = Math.cos(angle) * 100;
              const y = Math.sin(angle) * 100;
              const barLength = weight * 60;

              return (
                <g key={i}>
                  {/* Bar from center */}
                  <line
                    x1={Math.cos(angle) * 30}
                    y1={Math.sin(angle) * 30}
                    x2={Math.cos(angle) * (30 + barLength)}
                    y2={Math.sin(angle) * (30 + barLength)}
                    stroke={PITCH_CLASS_COLORS[(i * 7) % 12]}
                    strokeWidth="8"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  {/* Label */}
                  <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#ddd"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {circleOfFifths.fifths_labels[i]}
                  </text>
                </g>
              );
            })}

            {/* Center key name */}
            <text
              x="0"
              y="0"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#fff"
              fontSize="14"
              fontWeight="bold"
            >
              {circleOfFifths.key_name}
            </text>
          </svg>
        </div>
      </div>

      {/* Voice Comparison */}
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Voice Comparison</h3>
        <div className={styles.voiceList}>
          {summary.voices.map(voice => (
            <div key={voice.voice_id} className={styles.voiceRow}>
              <div className={styles.voiceHeader}>
                <span
                  className={styles.voiceColor}
                  style={{ backgroundColor: voice.color }}
                />
                <span className={styles.voiceLabel}>{voice.label}</span>
                <span className={styles.voiceNotes}>{voice.note_count} notes</span>
              </div>
              <div className={styles.voiceBars}>
                <div className={styles.voiceBarGroup}>
                  <span className={styles.voiceBarLabel}>Density</span>
                  <div className={styles.voiceBar}>
                    <div
                      className={styles.voiceBarFill}
                      style={{
                        width: `${Math.min(voice.note_density / 10 * 100, 100)}%`,
                        backgroundColor: voice.color
                      }}
                    />
                  </div>
                </div>
                <div className={styles.voiceBarGroup}>
                  <span className={styles.voiceBarLabel}>Velocity</span>
                  <div className={styles.voiceBar}>
                    <div
                      className={styles.voiceBarFill}
                      style={{
                        width: `${voice.avg_velocity / 127 * 100}%`,
                        backgroundColor: voice.color
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interval Histogram */}
      {histograms && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Interval Distribution</h3>
          <div className={styles.histogram}>
            {histograms.intervals.map((value, i) => (
              <div key={i} className={styles.histBar}>
                <div
                  className={styles.histFill}
                  style={{
                    height: `${value * 100}%`,
                    backgroundColor: i <= 2 ? '#4dff88' : i <= 5 ? '#ffcc44' : '#ff4d4d'
                  }}
                />
                <span className={styles.histLabel}>{histograms.interval_labels[i]}</span>
              </div>
            ))}
          </div>
          <div className={styles.histLegend}>
            <span><span style={{ color: '#4dff88' }}>|</span> Stepwise</span>
            <span><span style={{ color: '#ffcc44' }}>|</span> Small leap</span>
            <span><span style={{ color: '#ff4d4d' }}>|</span> Large leap</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default FeatureDashboard;
