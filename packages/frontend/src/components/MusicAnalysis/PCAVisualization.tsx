/**
 * 3D PCA Visualization
 * Shows voices as points in PCA space and animated trajectory over time
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import styles from './PCAVisualization.module.css';

interface VoiceCoordinate {
  voice_id: string;
  x: number;
  y: number;
  z: number;
}

interface TrajectoryPoint {
  time: number;
  x: number;
  y: number;
  z: number;
}

interface PCAData {
  voices: {
    coordinates: VoiceCoordinate[];
    explained_variance: number[];
    top_features: Array<{
      component: string;
      features: Array<{ name: string; loading: number }>;
    }>;
  };
  trajectory: {
    trajectory: TrajectoryPoint[];
    explained_variance: number[];
  };
}

interface PCAVisualizationProps {
  data: PCAData;
  currentTime: number;
  voiceColors: Record<string, string>;
  voiceLabels: Record<string, string>;
}

export function PCAVisualization({
  data,
  currentTime,
  voiceColors,
  voiceLabels
}: PCAVisualizationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const trajectoryLineRef = useRef<THREE.Line | null>(null);
  const currentPointRef = useRef<THREE.Mesh | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [showTrajectory, setShowTrajectory] = useState(true);
  const [showVoices, setShowVoices] = useState(true);

  useEffect(() => {
    console.log('PCAVisualization useEffect triggered', {
      hasContainer: !!containerRef.current,
      hasData: !!data,
      hasVoices: !!data?.voices,
      hasTrajectory: !!data?.trajectory
    });

    if (!containerRef.current || !data) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    console.log('PCAVisualization initializing with dimensions:', { width, height });

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(4, 3, 4);
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
    controlsRef.current = controls;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Add axes
    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Add axis labels
    const variance = data.voices.explained_variance || [0, 0, 0];
    addAxisLabel(scene, 'PC1 (' + (variance[0] * 100).toFixed(0) + '%)', 3.2, 0, 0, '#ff4444');
    addAxisLabel(scene, 'PC2 (' + (variance[1] * 100).toFixed(0) + '%)', 0, 3.2, 0, '#44ff44');
    addAxisLabel(scene, 'PC3 (' + (variance[2] * 100).toFixed(0) + '%)', 0, 0, 3.2, '#4444ff');

    // Add grid
    const gridHelper = new THREE.GridHelper(6, 12, 0x444444, 0x222222);
    gridHelper.position.y = -2;
    scene.add(gridHelper);

    // Add voice points
    if (showVoices && data.voices.coordinates) {
      data.voices.coordinates.forEach(coord => {
        const color = voiceColors[coord.voice_id] || '#ffffff';
        const sphereGeometry = new THREE.SphereGeometry(0.15, 16, 16);
        const sphereMaterial = new THREE.MeshPhongMaterial({
          color: new THREE.Color(color),
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.4
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(coord.x, coord.y, coord.z);
        scene.add(sphere);

        // Add label
        const label = voiceLabels[coord.voice_id] || coord.voice_id;
        const sprite = createTextSprite(label, color);
        sprite.position.set(coord.x, coord.y + 0.3, coord.z);
        sprite.scale.set(0.6, 0.3, 1);
        scene.add(sprite);
      });
    }

    // Add trajectory line
    if (showTrajectory && data.trajectory.trajectory && data.trajectory.trajectory.length > 0) {
      const points = data.trajectory.trajectory.map(p =>
        new THREE.Vector3(p.x, p.y, p.z)
      );

      // Create gradient line
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const colors = new Float32Array(points.length * 3);
      points.forEach((_, i) => {
        const t = i / points.length;
        // Gradient from blue to purple to pink
        colors[i * 3] = 0.3 + t * 0.7;     // R
        colors[i * 3 + 1] = 0.3 - t * 0.2; // G
        colors[i * 3 + 2] = 1.0;           // B
      });
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const lineMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        linewidth: 2,
        transparent: true,
        opacity: 0.7
      });
      const line = new THREE.Line(geometry, lineMaterial);
      scene.add(line);
      trajectoryLineRef.current = line;

      // Add current position marker
      const markerGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const markerMaterial = new THREE.MeshPhongMaterial({
        color: 0xff00ff,
        emissive: 0xff00ff,
        emissiveIntensity: 0.8
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      scene.add(marker);
      currentPointRef.current = marker;
    }

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
  }, [data, showTrajectory, showVoices, voiceColors, voiceLabels]);

  // Update current position marker
  useEffect(() => {
    if (!currentPointRef.current || !data.trajectory.trajectory) return;

    const trajectory = data.trajectory.trajectory;
    if (trajectory.length === 0) return;

    // Find closest point to current time
    let closestIdx = 0;
    let closestDist = Infinity;
    trajectory.forEach((point, i) => {
      const dist = Math.abs(point.time - currentTime);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    const point = trajectory[closestIdx];
    currentPointRef.current.position.set(point.x, point.y, point.z);
  }, [currentTime, data]);

  return (
    <div className={styles.container}>
      <div ref={containerRef} className={styles.canvas} />

      <div className={styles.controls}>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showVoices}
            onChange={(e) => setShowVoices(e.target.checked)}
          />
          Show Voices
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={showTrajectory}
            onChange={(e) => setShowTrajectory(e.target.checked)}
          />
          Show Trajectory
        </label>
      </div>

      {/* Top features panel */}
      {data.voices.top_features && data.voices.top_features.length > 0 && (
        <div className={styles.features}>
          <h4>Top Contributing Features</h4>
          {data.voices.top_features.slice(0, 2).map(pc => (
            <div key={pc.component} className={styles.pcFeatures}>
              <span className={styles.pcLabel}>{pc.component}:</span>
              <span className={styles.featureList}>
                {pc.features.slice(0, 3).map(f => f.name.replace('_', ' ')).join(', ')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Variance explained */}
      {data.voices.explained_variance && (
        <div className={styles.variance}>
          <span>Total Variance Explained: </span>
          <strong>
            {(data.voices.explained_variance.reduce((a, b) => a + b, 0) * 100).toFixed(1)}%
          </strong>
        </div>
      )}
    </div>
  );
}

function createTextSprite(text: string, color: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;
  canvas.width = 256;
  canvas.height = 128;

  context.fillStyle = color;
  context.font = 'bold 32px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  return new THREE.Sprite(material);
}

function addAxisLabel(scene: THREE.Scene, text: string, x: number, y: number, z: number, color: string) {
  const sprite = createTextSprite(text, color);
  sprite.position.set(x, y, z);
  sprite.scale.set(1, 0.5, 1);
  scene.add(sprite);
}

export default PCAVisualization;
