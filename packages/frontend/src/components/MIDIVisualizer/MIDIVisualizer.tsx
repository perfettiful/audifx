/**
 * 3D MIDI Visualizer Component
 * Renders MIDI notes from timeline.json in 3D space using Three.js
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './MIDIVisualizer.module.css';

interface MIDINote {
  time: number;
  duration: number;
  pitch: number;
  velocity: number;
}

interface Voice {
  id: string;
  label: string;
  color: string;
  notes: MIDINote[];
}

interface Section {
  t0: number;
  t1: number;
  name: string;
}

interface Timeline {
  mix: {
    url: string;
    duration: number;
  };
  voices: Voice[];
  sections: Section[];
  metadata?: {
    job_id: string;
    total_voices: number;
    total_notes: number;
  };
}

interface MIDIVisualizerProps {
  timeline: Timeline;
  currentTime?: number;
  className?: string;
}

export function MIDIVisualizer({ timeline, currentTime = 0, className }: MIDIVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const noteMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map<string, THREE.Mesh>());
  const timeMarkerRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [cameraMode, setCameraMode] = useState<'orbit' | 'follow'>('orbit');
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.Fog(0x0a0a0f, 50, 200);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 30, 50);
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
    controls.minDistance = 10;
    controls.maxDistance = 150;
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // Add grid
    const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
    gridHelper.position.y = -5;
    scene.add(gridHelper);

    // Add time axis
    createTimeAxis(scene, timeline.mix.duration);

    // Add pitch axis
    createPitchAxis(scene);

    // Create time marker
    const markerGeometry = new THREE.PlaneGeometry(0.5, 100);
    const markerMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.rotation.y = Math.PI / 2;
    marker.position.y = 20;
    scene.add(marker);
    timeMarkerRef.current = marker;

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
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Create note visualizations
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;

    // Clear existing notes
    noteMeshesRef.current.forEach(mesh => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    noteMeshesRef.current.clear();

    // Create notes for each voice
    timeline.voices.forEach(voice => {
      // Skip if voice filter is active and this isn't the selected voice
      if (selectedVoice && voice.id !== selectedVoice) return;

      const color = new THREE.Color(voice.color);

      voice.notes.forEach((note, index) => {
        const noteId = `${voice.id}-${index}`;

        // Note dimensions
        const width = Math.max(0.1, note.duration * 2); // Time dimension
        const height = 0.8; // Thickness
        const depth = 0.8; // Pitch dimension

        // Position
        const x = note.time * 2; // Time axis
        const y = (note.pitch - 60) * 0.5; // Pitch axis (centered around middle C)
        const z = getVoiceZPosition(voice.id); // Voice separation

        // Create note mesh
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.2,
          shininess: 30,
          transparent: true,
          opacity: 0.85
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.userData = { voice: voice.id, note };

        scene.add(mesh);
        noteMeshesRef.current.set(noteId, mesh);
      });
    });

    // Add voice labels
    timeline.voices.forEach(voice => {
      if (selectedVoice && voice.id !== selectedVoice) return;
      addVoiceLabel(scene, voice);
    });

    // Add section markers
    timeline.sections.forEach(section => {
      addSectionMarker(scene, section);
    });

  }, [timeline, selectedVoice]);

  // Update time marker position
  useEffect(() => {
    if (timeMarkerRef.current) {
      const x = currentTime * 2;
      timeMarkerRef.current.position.x = x;

      // Follow camera mode
      if (cameraMode === 'follow' && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.x = x + 30;
        controlsRef.current.target.set(x, 0, 0);
      }
    }

    // Highlight active notes
    noteMeshesRef.current.forEach((mesh, _id) => {
      const note = mesh.userData.note as MIDINote;
      const isActive = currentTime >= note.time && currentTime <= note.time + note.duration;

      const material = mesh.material as THREE.MeshPhongMaterial;
      material.emissiveIntensity = isActive ? 0.6 : 0.2;
      material.opacity = isActive ? 1.0 : 0.85;
    });

  }, [currentTime, cameraMode]);

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div ref={containerRef} className={styles.canvas} />

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.controlGroup}>
          <label className={styles.label}>Camera:</label>
          <button
            className={`${styles.button} ${cameraMode === 'orbit' ? styles.active : ''}`}
            onClick={() => setCameraMode('orbit')}
          >
            Orbit
          </button>
          <button
            className={`${styles.button} ${cameraMode === 'follow' ? styles.active : ''}`}
            onClick={() => setCameraMode('follow')}
          >
            Follow
          </button>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.label}>Voice:</label>
          <button
            className={`${styles.button} ${!selectedVoice ? styles.active : ''}`}
            onClick={() => setSelectedVoice(null)}
          >
            All
          </button>
          {timeline.voices.map(voice => (
            <button
              key={voice.id}
              className={`${styles.button} ${selectedVoice === voice.id ? styles.active : ''}`}
              style={{ borderColor: voice.color }}
              onClick={() => setSelectedVoice(voice.id)}
            >
              {voice.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Duration:</span>
          <span className={styles.statValue}>{timeline.mix.duration.toFixed(1)}s</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Voices:</span>
          <span className={styles.statValue}>{timeline.voices.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Notes:</span>
          <span className={styles.statValue}>{timeline.metadata?.total_notes || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions

function getVoiceZPosition(voiceId: string): number {
  const positions: Record<string, number> = {
    vocals: 10,
    bass: 0,
    drums: -10,
    other: 5,
    keys: 5,
    guitar: 3,
    synth: 7
  };
  return positions[voiceId] || 0;
}

function createTimeAxis(scene: THREE.Scene, duration: number) {
  const material = new THREE.LineBasicMaterial({ color: 0x666666 });
  const points = [
    new THREE.Vector3(0, -10, 0),
    new THREE.Vector3(duration * 2, -10, 0)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function createPitchAxis(scene: THREE.Scene) {
  const material = new THREE.LineBasicMaterial({ color: 0x666666 });
  const points = [
    new THREE.Vector3(0, -20, 0),
    new THREE.Vector3(0, 20, 0)
  ];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, material);
  scene.add(line);
}

function addVoiceLabel(scene: THREE.Scene, voice: Voice) {
  // Create a sprite for the voice label
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = voice.color;
  context.font = 'bold 32px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(voice.label, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);

  sprite.position.set(-10, (voice.notes[0]?.pitch - 60) * 0.5 || 0, getVoiceZPosition(voice.id));
  sprite.scale.set(8, 2, 1);

  scene.add(sprite);
}

function addSectionMarker(scene: THREE.Scene, section: Section) {
  const geometry = new THREE.PlaneGeometry(0.2, 50);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
  });

  const marker = new THREE.Mesh(geometry, material);
  marker.position.set(section.t0 * 2, 10, 0);
  marker.rotation.y = Math.PI / 2;

  scene.add(marker);

  // Add label
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 64;

  context.fillStyle = '#00ff00';
  context.font = '24px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(section.name, 128, 32);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(spriteMaterial);

  sprite.position.set(section.t0 * 2, 30, 0);
  sprite.scale.set(10, 2.5, 1);

  scene.add(sprite);
}
