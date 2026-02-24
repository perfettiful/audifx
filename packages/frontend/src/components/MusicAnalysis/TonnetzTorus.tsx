/**
 * 3D Tonnetz Torus Visualization
 * Renders musical pitch classes on a torus surface using Three.js
 * Notes animate as glowing spheres moving across the torus
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './TonnetzTorus.module.css';

interface TonnetzPosition {
  x: number;
  y: number;
  z: number;
  theta: number;
  phi: number;
  pitch_class: number;
  pitch_class_name: string;
}

interface TonnetzNote {
  time: number;
  duration: number;
  pitch: number;
  pitch_class: number;
  pitch_class_name: string;
  velocity: number;
  x: number;
  y: number;
  z: number;
}

interface ChordEvent {
  time: number;
  duration: number;
  pitch_classes: number[];
  chord_type: string;
  root: string | null;
  center_x: number;
  center_y: number;
  center_z: number;
}

interface TonnetzData {
  static_positions: TonnetzPosition[];
  trajectory: TonnetzNote[];
  chord_events: ChordEvent[];
  torus_params: {
    major_radius: number;
    minor_radius: number;
  };
}

interface TonnetzTorusProps {
  data: TonnetzData;
  currentTime: number;
  isPlaying: boolean;
}

const PITCH_CLASS_COLORS = [
  '#ff4444', // C - Red
  '#ff8844', // C# - Orange
  '#ffcc44', // D - Yellow
  '#88ff44', // D# - Lime
  '#44ff44', // E - Green
  '#44ff88', // F - Teal
  '#44ffcc', // F# - Cyan
  '#44ccff', // G - Sky Blue
  '#4488ff', // G# - Blue
  '#8844ff', // A - Purple
  '#cc44ff', // A# - Magenta
  '#ff44cc', // B - Pink
];

export function TonnetzTorus({ data, currentTime, isPlaying }: TonnetzTorusProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // References to animated objects
  const activeNotesRef = useRef<Map<string, THREE.Mesh>>(new Map<string, THREE.Mesh>());
  const pitchClassSpheresRef = useRef<THREE.Mesh[]>([]);
  const chordLinesRef = useRef<THREE.Line[]>([]);

  const [showLabels, setShowLabels] = useState(true);
  const [showChords, setShowChords] = useState(true);

  // Initialize Three.js scene
  useEffect(() => {
    console.log('TonnetzTorus useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasData: !!data,
      dataKeys: data ? Object.keys(data) : []
    });

    if (!containerRef.current || !data) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    console.log('TonnetzTorus initializing with dimensions:', { width, height });

    // Validate data structure
    if (!data.static_positions || !data.torus_params) {
      console.error('TonnetzTorus: Invalid data structure', data);
      return;
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(6, 4, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.autoRotate = !isPlaying;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4488ff, 0.5);
    pointLight2.position.set(-5, -5, -5);
    scene.add(pointLight2);

    // Create torus wireframe
    const major_radius = data.torus_params?.major_radius || 2.0;
    const minor_radius = data.torus_params?.minor_radius || 0.8;
    const torusGeometry = new THREE.TorusGeometry(major_radius, minor_radius, 24, 48);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: 0x333344,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    const torusMesh = new THREE.Mesh(torusGeometry, torusMaterial);
    scene.add(torusMesh);

    // Create pitch class markers (12 spheres on torus surface)
    const spheres: THREE.Mesh[] = [];
    data.static_positions.forEach((pos, i) => {
      const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
      const sphereMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(PITCH_CLASS_COLORS[i]),
        emissive: new THREE.Color(PITCH_CLASS_COLORS[i]),
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(pos.x, pos.z, pos.y); // Swap y/z for better view
      sphere.userData = { pitchClass: i, name: pos.pitch_class_name };
      scene.add(sphere);
      spheres.push(sphere);

      // Add label sprite
      if (showLabels) {
        const sprite = createTextSprite(pos.pitch_class_name, PITCH_CLASS_COLORS[i]);
        sprite.position.set(pos.x * 1.15, pos.z * 1.15 + 0.3, pos.y * 1.15);
        sprite.scale.set(0.5, 0.25, 1);
        scene.add(sprite);
      }
    });
    pitchClassSpheresRef.current = spheres;

    // Handle resize
    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [data, showLabels]);

  // Update auto-rotate based on playing state
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isPlaying;
    }
  }, [isPlaying]);

  // Update active notes based on current time
  useEffect(() => {
    if (!sceneRef.current || !data) return;

    const scene = sceneRef.current;

    // Find notes active at current time
    const activeNotes = data.trajectory.filter(note =>
      currentTime >= note.time && currentTime < note.time + note.duration
    );

    // Remove old active notes that are no longer playing
    activeNotesRef.current.forEach((mesh, key) => {
      const isStillActive = activeNotes.some(n =>
        `${n.time}-${n.pitch}` === key
      );
      if (!isStillActive) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        activeNotesRef.current.delete(key);
      }
    });

    // Add new active notes
    activeNotes.forEach(note => {
      const key = `${note.time}-${note.pitch}`;
      if (!activeNotesRef.current.has(key)) {
        // Create glowing sphere for active note
        const sphereGeometry = new THREE.SphereGeometry(0.25, 16, 16);
        const color = new THREE.Color(PITCH_CLASS_COLORS[note.pitch_class]);
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.9
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(note.x, note.z, note.y);
        scene.add(sphere);
        activeNotesRef.current.set(key, sphere);
      }
    });

    // Update pitch class sphere brightness based on activity
    pitchClassSpheresRef.current.forEach((sphere, i) => {
      const isActive = activeNotes.some(n => n.pitch_class === i);
      const material = sphere.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = isActive ? 0.8 : 0.2;
      sphere.scale.setScalar(isActive ? 1.3 : 1.0);
    });

    // Update chord visualizations
    if (showChords) {
      // Remove old chord lines
      chordLinesRef.current.forEach(line => {
        scene.remove(line);
        line.geometry.dispose();
        (line.material as THREE.Material).dispose();
      });
      chordLinesRef.current = [];

      // Find active chords
      const activeChords = data.chord_events.filter(chord =>
        currentTime >= chord.time && currentTime < chord.time + chord.duration
      );

      // Draw chord triangles/shapes
      activeChords.forEach(chord => {
        if (chord.pitch_classes.length >= 3) {
          const positions = chord.pitch_classes.map(pc => {
            const pos = data.static_positions[pc];
            return new THREE.Vector3(pos.x, pos.z, pos.y);
          });

          // Create lines connecting chord tones
          for (let i = 0; i < positions.length; i++) {
            const start = positions[i];
            const end = positions[(i + 1) % positions.length];

            const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
            const material = new THREE.LineBasicMaterial({
              color: chord.chord_type === 'major' ? 0xffcc00 :
                     chord.chord_type === 'minor' ? 0x00ccff :
                     0xff00ff,
              linewidth: 2,
              transparent: true,
              opacity: 0.8
            });
            const line = new THREE.Line(geometry, material);
            scene.add(line);
            chordLinesRef.current.push(line);
          }
        }
      });
    }

  }, [currentTime, data, showChords]);

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.canvas} />

      <div className={styles.controls}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
          />
          Show Labels
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showChords}
            onChange={(e) => setShowChords(e.target.checked)}
          />
          Show Chords
        </label>
      </div>

      <div className={styles.legend}>
        <h4>Pitch Classes</h4>
        <div className={styles.legendGrid}>
          {PITCH_CLASS_COLORS.map((color, i) => (
            <div key={i} className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: color }} />
              <span className={styles.legendLabel}>
                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][i]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function createTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 128;
  canvas.height = 64;

  context.fillStyle = color;
  context.font = 'bold 36px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 64, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(material);
}

export default TonnetzTorus;
