import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { AudioProvider } from './context/AudioContext';
import { AudioEffectsApp } from './components/AudioEffectsApp';
import { MIDIViewer } from './components/MIDIViewer';
import { MusicAnalysis } from './components/MusicAnalysis';
import { StemMixer } from './components/StemMixer';
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
        <p className={styles.tagline}>Professional audio tools powered by AI</p>
      </header>

      <main className={styles.main}>
        <section className={styles.homeSection}>
          <h2 className={styles.homeTitle}>Choose Your Tool</h2>
          <p className={styles.homeSubtitle}>
            Select a tool below to get started
          </p>

          <div className={styles.toolGrid}>
            {/* Audio Effects Tool */}
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
                <span className={styles.toolFeature}>✨ 7+ Effect Presets</span>
                <span className={styles.toolFeature}>🎚️ Real-time Processing</span>
                <span className={styles.toolFeature}>💾 Export Results</span>
              </div>
              <div className={styles.toolAction}>
                Start Mixing →
              </div>
            </div>

            {/* MIDI Visualizer Tool */}
            <div
              className={styles.toolCard}
              onClick={() => navigate('/visualizer')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/visualizer')}
            >
              <div className={styles.toolIcon}>🎹</div>
              <h3 className={styles.toolTitle}>MIDI Visualizer</h3>
              <p className={styles.toolDescription}>
                AI-powered MIDI transcription with stunning 3D visualization of your music's structure
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>🤖 AI Stem Separation</span>
                <span className={styles.toolFeature}>🎼 MIDI Transcription</span>
                <span className={styles.toolFeature}>🌟 3D Visualization</span>
              </div>
              <div className={styles.toolAction}>
                Visualize Music →
              </div>
            </div>

            {/* Music Analysis Tool */}
            <div
              className={styles.toolCard}
              onClick={() => navigate('/analysis')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/analysis')}
            >
              <div className={styles.toolIcon}>📊</div>
              <h3 className={styles.toolTitle}>Music Analysis</h3>
              <p className={styles.toolDescription}>
                Deep statistical analysis with PCA dimensionality reduction and 3D Tonnetz torus visualization
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>🔬 Key Detection</span>
                <span className={styles.toolFeature}>📈 PCA Analysis</span>
                <span className={styles.toolFeature}>🍩 Tonnetz Torus</span>
              </div>
              <div className={styles.toolAction}>
                Analyze Music →
              </div>
            </div>

            {/* Stem Mixer Tool */}
            <div
              className={styles.toolCard}
              onClick={() => navigate('/remix')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/remix')}
            >
              <div className={styles.toolIcon}>🎚️</div>
              <h3 className={styles.toolTitle}>Stem Mixer</h3>
              <p className={styles.toolDescription}>
                AI separates vocals, drums, bass, and more. Remix them with individual controls and export.
              </p>
              <div className={styles.toolFeatures}>
                <span className={styles.toolFeature}>🎤 Vocal Isolation</span>
                <span className={styles.toolFeature}>🎛️ Per-Stem Mix</span>
                <span className={styles.toolFeature}>💾 Export Remix</span>
              </div>
              <div className={styles.toolAction}>
                Start Remixing →
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>
          Built with Web Audio API, Tone.js & Three.js
          <span className={styles.separator}>•</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className={styles.link}>
            View Source
          </a>
        </p>
      </footer>
    </div>
  );
}

// Wrapper components that pass navigation and URL params to the tools
function AudioEffectsPage() {
  const navigate = useNavigate();
  return <AudioEffectsApp onBackToHome={() => navigate('/')} />;
}

function MIDIViewerPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return <MIDIViewer onBackToHome={() => navigate('/')} initialJobId={jobId} />;
}

function MusicAnalysisPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return <MusicAnalysis onBackToHome={() => navigate('/')} initialJobId={jobId} />;
}

function StemMixerPage() {
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId?: string }>();
  return <StemMixer onBackToHome={() => navigate('/')} initialJobId={jobId} />;
}

// 404 Page
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
            The page you're looking for doesn't exist.
          </p>
          <Link to="/" className={styles.toolAction} style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <AudioProvider>
      <BrowserRouter>
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
      </BrowserRouter>
    </AudioProvider>
  );
}

export default App;
