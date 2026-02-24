import { HashRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { AudioProvider } from './context/AudioContext';
import { AudioEffectsApp } from './components/AudioEffectsApp';
import { MIDIViewer } from './components/MIDIViewer';
import { MusicAnalysis } from './components/MusicAnalysis';
import { StemMixer } from './components/StemMixer';
import { BackendRequired } from './components/BackendRequired';
import styles from './App.module.css';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎵</span>
          <h1 className={styles.logoText}>
            Audi<span className={styles.logoAccent}>FX</span>
          </h1>
        </div>
        <p className={styles.tagline}>Audio effects and AI-powered music tools</p>
      </header>

      <main className={styles.main}>
        <section className={styles.homeSection}>
          <h2 className={styles.homeTitle}>Choose Your Tool</h2>
          <p className={styles.homeSubtitle}>
            Select a tool below to get started
          </p>

          <div className={styles.toolGrid}>
            <div
              className={styles.toolCard}
              onClick={() => navigate('/effects')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/effects')}
            >
              <div className={styles.toolIcon}>🎛️</div>
              <h3 className={styles.toolTitle}>Audio Effects</h3>
              <p className={styles.toolDescription}>
                Transform audio with genre presets like Slowed + Reverb, Nightcore, Lo-fi, 8D Audio, and more
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>7+ Effect Presets</span>
                <span className={styles.toolFeature}>Real-time Processing</span>
                <span className={styles.toolFeature}>Export Results</span>
              </div>
              <div className={styles.toolAction}>
                Start Mixing
              </div>
            </div>

            <div
              className={`${styles.toolCard} ${styles.requiresBackend}`}
              onClick={() => navigate('/visualizer')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/visualizer')}
            >
              <div className={styles.toolIcon}>🎹</div>
              <h3 className={styles.toolTitle}>MIDI Visualizer</h3>
              <p className={styles.toolDescription}>
                AI stem separation and MIDI transcription with 3D visualization
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>AI Stem Separation</span>
                <span className={styles.toolFeature}>MIDI Transcription</span>
                <span className={styles.toolFeature}>3D Visualization</span>
              </div>
              <div className={styles.toolAction}>
                Visualize Music
              </div>
              <span className={styles.backendBadge}>Requires Backend</span>
            </div>

            <div
              className={`${styles.toolCard} ${styles.requiresBackend}`}
              onClick={() => navigate('/analysis')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/analysis')}
            >
              <div className={styles.toolIcon}>📊</div>
              <h3 className={styles.toolTitle}>Music Analysis</h3>
              <p className={styles.toolDescription}>
                Key detection, chord analysis, PCA, and Tonnetz visualization
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>Key Detection</span>
                <span className={styles.toolFeature}>PCA Analysis</span>
                <span className={styles.toolFeature}>Tonnetz Torus</span>
              </div>
              <div className={styles.toolAction}>
                Analyze Music
              </div>
              <span className={styles.backendBadge}>Requires Backend</span>
            </div>

            <div
              className={`${styles.toolCard} ${styles.requiresBackend}`}
              onClick={() => navigate('/remix')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/remix')}
            >
              <div className={styles.toolIcon}>🎚️</div>
              <h3 className={styles.toolTitle}>Stem Mixer</h3>
              <p className={styles.toolDescription}>
                AI separates vocals, drums, bass, and more. Remix with individual controls.
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>Vocal Isolation</span>
                <span className={styles.toolFeature}>Per-Stem Mix</span>
                <span className={styles.toolFeature}>Export Remix</span>
              </div>
              <div className={styles.toolAction}>
                Start Remixing
              </div>
              <span className={styles.backendBadge}>Requires Backend</span>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Built with Web Audio API, Tone.js & Three.js
          <span className={styles.separator}>·</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
            View Source
          </a>
        </p>
      </footer>
    </div>
  );
}

function AudioEffectsPage() {
  const navigate = useNavigate();
  return <AudioEffectsApp onBackToHome={() => navigate('/')} />;
}

function MIDIViewerPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return (
    <BackendRequired featureName="MIDI Visualizer">
      <MIDIViewer onBackToHome={() => navigate('/')} initialJobId={jobId} />
    </BackendRequired>
  );
}

function MusicAnalysisPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return (
    <BackendRequired featureName="Music Analysis">
      <MusicAnalysis onBackToHome={() => navigate('/')} initialJobId={jobId} />
    </BackendRequired>
  );
}

function StemMixerPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return (
    <BackendRequired featureName="Stem Mixer">
      <StemMixer onBackToHome={() => navigate('/')} initialJobId={jobId} />
    </BackendRequired>
  );
}

function NotFoundPage() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎵</span>
          <h1 className={styles.logoText}>
            Audi<span className={styles.logoAccent}>FX</span>
          </h1>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.homeSection}>
          <h2 className={styles.homeTitle}>Page Not Found</h2>
          <p className={styles.homeSubtitle}>
            This page doesn't exist.
          </p>
          <Link to="/" className={styles.toolAction} style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>
            Back to Home
          </Link>
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/effects" element={<AudioEffectsPage />} />
          <Route path="/visualizer" element={<MIDIViewerPage />} />
          <Route path="/visualizer/:jobId" element={<MIDIViewerPage />} />
          <Route path="/analysis" element={<MusicAnalysisPage />} />
          <Route path="/analysis/:jobId" element={<MusicAnalysisPage />} />
          <Route path="/remix" element={<StemMixerPage />} />
          <Route path="/remix/:jobId" element={<StemMixerPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </HashRouter>
    </AudioProvider>
  );
}

export default App;
