import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import * as THREE from 'three';
import { StarData } from '../../types';
import { StarNode } from './StarNode';
import { ConnectionLines } from './ConnectionLines';

interface UniverseProps {
  stars: StarData[];
  anchorStar: StarData | null;
  viewingStar: StarData | null;
  onStarSelect: (star: StarData) => void;
  isVoyageMode: boolean;
  showVoyageHud: boolean; 
}

// Helper to create a circle texture for points to avoid square artifacts
const getCircleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64; // Increased for slightly better quality
  canvas.height = 64;
  const context = canvas.getContext('2d');
  if (context) {
    context.beginPath();
    context.arc(32, 32, 28, 0, 2 * Math.PI);
    context.fillStyle = '#ffffff';
    context.fill();
  }
  return new THREE.CanvasTexture(canvas);
};

// --- CUSTOM STARFIELD ---
const StarField = () => {
  const points = useRef<THREE.Points>(null);
  const circleMap = useMemo(() => getCircleTexture(), []);
  
  const geometry = useMemo(() => {
    const count = 2000; 
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 300 + Math.random() * 700; 
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((state, delta) => {
    if (points.current) {
        points.current.rotation.y += delta * 0.005; 
    }
  });

  return (
    <points ref={points} geometry={geometry}>
      <pointsMaterial 
        size={4.0} 
        color="#818cf8" // Indigo-400 (Matches UI)
        map={circleMap} 
        alphaMap={circleMap} 
        transparent 
        opacity={0.8} 
        sizeAttenuation={true} 
        depthWrite={false}
      />
    </points>
  );
};

// --- CUSTOM DUST ---
const CosmicDust = () => {
   const count = 200;
   const mesh = useRef<THREE.InstancedMesh>(null);
   const dummy = useMemo(() => new THREE.Object3D(), []);
   
   const particles = useMemo(() => {
     const temp = [];
     for(let i=0; i<count; i++) {
       const x = (Math.random() - 0.5) * 100;
       const y = (Math.random() - 0.5) * 60;
       const z = (Math.random() - 0.5) * 100;
       temp.push({ x, y, z, speed: Math.random() * 0.2 + 0.05 });
     }
     return temp;
   }, []);

   useFrame((state, delta) => {
     if (!mesh.current) return;
     const time = state.clock.getElapsedTime();
     particles.forEach((p, i) => {
       dummy.position.set(
         p.x + Math.sin(time * p.speed + i) * 2,
         p.y + Math.cos(time * p.speed + i) * 2,
         p.z
       );
       const scale = 0.5 + Math.sin(time * 2 + i) * 0.3;
       dummy.scale.set(scale, scale, scale);
       dummy.updateMatrix();
       // @ts-ignore
       mesh.current.setMatrixAt(i, dummy.matrix);
     });
     mesh.current.instanceMatrix.needsUpdate = true;
   });

   return (
     <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
       <dodecahedronGeometry args={[0.05, 0]} />
       <meshBasicMaterial color="#a5b4fc" transparent opacity={0.3} /> {/* Indigo-300 */}
     </instancedMesh>
   );
};

// --- VOYAGE CONTROLLER ---
interface VoyageControllerProps {
  isEnabled: boolean;
  stars: StarData[];
  controlsRef: React.RefObject<any>;
  isInteracting: boolean;
  isVoyageMode: boolean; 
}

const VoyageController: React.FC<VoyageControllerProps> = ({ isEnabled, stars, controlsRef, isInteracting, isVoyageMode }) => {
  const { camera } = useThree();
  const currentDir = useRef(new THREE.Vector3(0, 0, -1)); 
  const BASE_SPEED = 0.5;

  useFrame((state, delta) => {
    if (!isEnabled || !controlsRef.current) return;

    const controls = controlsRef.current;
    
    if (isInteracting || stars.length === 0) {
        const camDir = new THREE.Vector3();
        camera.getWorldDirection(camDir);
        currentDir.current.copy(camDir);
        return; 
    }

    const speedMultiplier = isVoyageMode ? 1.0 : 0.02;
    const steerSpeed = isVoyageMode ? 1.0 : 0.01;
    const noiseAmount = isVoyageMode ? 0.3 : 0.05;
    const targetLerpFactor = isVoyageMode ? 1.5 : 0.1;

    const cameraPos = camera.position.clone();

    // 1. Calculate Attractor
    let attractor = new THREE.Vector3(0, 0, 0); 
    let totalWeight = 0;
    const searchLimit = isVoyageMode ? 100 : 10; 
    const searchRadius = isVoyageMode ? 80 : 40; 

    let count = 0;
    for (const star of stars) {
      if (count++ > searchLimit) break; 
      
      const starPos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
      const dist = cameraPos.distanceTo(starPos);
      
      const toStar = starPos.clone().sub(cameraPos).normalize();
      const dot = currentDir.current.dot(toStar);
      
      if (dot > 0.2 && dist < searchRadius) { 
         const weight = 1 / (dist + 0.1);
         attractor.add(starPos.multiplyScalar(weight));
         totalWeight += weight;
      }
    }

    // VOID AVOIDANCE
    if (totalWeight < 0.1) {
        let nearestDist = Infinity;
        let nearestStarPos = new THREE.Vector3(0, 0, 0);
        const checkCount = Math.min(stars.length, 50);
        for(let i=0; i<checkCount; i++) {
             const s = stars[i];
             const sPos = new THREE.Vector3(s.position.x, s.position.y, s.position.z);
             const d = cameraPos.distanceTo(sPos);
             if (d < nearestDist) {
                 nearestDist = d;
                 nearestStarPos = sPos;
             }
        }
        const fallbackTarget = nearestDist < 100 ? nearestStarPos : new THREE.Vector3(0, 0, 0);
        const weight = 5.0; 
        attractor.add(fallbackTarget.multiplyScalar(weight));
        totalWeight += weight;
    }

    if (totalWeight > 0) {
      attractor.divideScalar(totalWeight);
    } else {
      attractor.set(0,0,0);
    }

    const targetDir = (totalWeight > 0 && attractor.distanceTo(cameraPos) > 0.1)
        ? attractor.clone().sub(cameraPos).normalize()
        : currentDir.current.clone(); 
    
    // Safety check for NaN
    if (isNaN(targetDir.x)) targetDir.copy(currentDir.current); 
    
    const time = state.clock.getElapsedTime();
    targetDir.x += Math.sin(time * 0.2) * noiseAmount;
    targetDir.y += Math.cos(time * 0.15) * noiseAmount;
    targetDir.normalize();

    currentDir.current.lerp(targetDir, steerSpeed * delta).normalize();

    const currentSpeed = BASE_SPEED * speedMultiplier;
    const moveStep = currentDir.current.clone().multiplyScalar(currentSpeed * delta);
    camera.position.add(moveStep);

    // Safety Clamp to prevent flying into void
    if (camera.position.length() > 500) {
        camera.position.setLength(500);
    }

    const targetDist = controls.target.distanceTo(camera.position);
    const idealTargetPos = camera.position.clone().add(currentDir.current.clone().multiplyScalar(Math.max(10, targetDist)));

    controls.target.lerp(idealTargetPos, targetLerpFactor * delta);
    controls.update();
  });

  return null;
};

// --- CAMERA MANAGER ---
const CameraManager: React.FC<{ targetStar: StarData | null; isLocked: boolean; controlsRef: React.RefObject<any> }> = ({ targetStar, isLocked, controlsRef }) => {
  const { camera } = useThree();
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (isLocked && targetStar) {
      const starPos = new THREE.Vector3(targetStar.position.x, targetStar.position.y, targetStar.position.z);
      const OFFSET_Y = 12.0; 
      const DISTANCE = 45.0; 

      const targetDestination = starPos.clone().add(new THREE.Vector3(0, OFFSET_Y, 0));
      const cameraDestination = starPos.clone().add(new THREE.Vector3(0, OFFSET_Y, DISTANCE));

      const lerpSpeed = 3.0 * delta;

      camera.position.lerp(cameraDestination, lerpSpeed);
      lookAtTarget.current.lerp(targetDestination, lerpSpeed);
      camera.lookAt(lookAtTarget.current);

      if (controlsRef.current) {
         controlsRef.current.target.copy(lookAtTarget.current);
      }
    } 
  });

  return null;
};

// --- 3D BEAM COMPONENT ---
// Draws a 3D line from the Star to a point fixed relative to the camera
const VoyageBeam: React.FC<{ activeStar: StarData | null; isEnabled: boolean }> = ({ activeStar, isEnabled }) => {
  const lineRef = useRef<THREE.Line>(null);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(6); 
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame(() => {
    if (!isEnabled || !activeStar || !lineRef.current) {
        if (lineRef.current) lineRef.current.visible = false;
        return;
    }
    
    lineRef.current.visible = true;

    // Start: Star Position
    const startPos = new THREE.Vector3(activeStar.position.x, activeStar.position.y, activeStar.position.z);

    // End: HUD Position (Relative to Camera)
    const endPosLocal = new THREE.Vector3(0, 0, -10); 
    const endPosWorld = endPosLocal.applyMatrix4(camera.matrixWorld);

    const positions = lineRef.current.geometry.attributes.position.array as Float32Array;
    positions[0] = startPos.x; positions[1] = startPos.y; positions[2] = startPos.z;
    positions[3] = endPosWorld.x; positions[4] = endPosWorld.y; positions[5] = endPosWorld.z;
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <line ref={lineRef} geometry={geometry}>
        {/* Semi-transparent line as requested (opacity 0.2), Color Updated to Indigo-500 */}
        <lineBasicMaterial color="#6366f1" transparent opacity={0.2} linewidth={1} depthTest={false} />
    </line>
  );
}

// --- CINEMATIC LOGIC (NO VISUALS) ---
// ONLY handles logic for picking the star. Visuals are rendered outside Canvas.
const VoyageCinematicLogic: React.FC<{ 
    stars: StarData[], 
    isEnabled: boolean,
    onActiveChange: (star: StarData | null) => void 
}> = ({ stars, isEnabled, onActiveChange }) => {
    const { camera } = useThree();
    const activeStarRef = useRef<StarData | null>(null);
    const lastSwitchTime = useRef(0);
    const SWITCH_INTERVAL = 7.0; 

    useFrame((state) => {
        if (!isEnabled) {
            if (activeStarRef.current) {
                activeStarRef.current = null;
                onActiveChange(null);
            }
            return;
        }

        const time = state.clock.getElapsedTime();

        if (time - lastSwitchTime.current > SWITCH_INTERVAL || !activeStarRef.current) {
            let bestStar: StarData | null = null;
            let closestDist = Infinity;
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);

            for (const star of stars) {
                const pos = new THREE.Vector3(star.position.x, star.position.y, star.position.z);
                const distToCam = pos.distanceTo(camera.position);
                
                if (distToCam > 80 || distToCam < 5) continue;

                const toStar = pos.clone().sub(camera.position).normalize();
                const angle = cameraDir.angleTo(toStar);

                const randomFactor = Math.random() * 0.2; 
                const score = angle + (distToCam * 0.005) + randomFactor;

                if (score < closestDist && angle < 0.6) { 
                    closestDist = score;
                    bestStar = star;
                }
            }

            if (bestStar && bestStar.id !== activeStarRef.current?.id) {
                activeStarRef.current = bestStar;
                onActiveChange(bestStar);
                lastSwitchTime.current = time;
            }
        }
    });

    return null; // Logic only, no render
};

export const Universe: React.FC<UniverseProps> = ({ stars, anchorStar, viewingStar, onStarSelect, isVoyageMode, showVoyageHud }) => {
  const [hoveredStar, setHoveredStar] = React.useState<StarData | null>(null);
  const [activeVoyageStar, setActiveVoyageStar] = useState<StarData | null>(null); 
  const controlsRef = useRef<any>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  
  const isLocked = !!viewingStar;
  const isOrbitEnabled = !isLocked; 
  const isVoyageEnabled = !isLocked;

  return (
    <>
        <div 
        className="absolute inset-0 z-0"
        style={{
            background: 'radial-gradient(circle at center, #050515 0%, #000000 90%)'
        }}
        >
        <Canvas>
            <PerspectiveCamera makeDefault position={[0, 2, 45]} fov={60} />
            
            {/* Lights */}
            {/* @ts-ignore */}
            <ambientLight intensity={0.2} />
            {/* @ts-ignore */}
            <pointLight position={[-50, 20, -50]} intensity={0.8} color="#0c4a6e" distance={100} />
            {/* @ts-ignore */}
            <pointLight position={[50, -20, 50]} intensity={0.8} color="#0c4a6e" distance={100} />

            <StarField />
            <CosmicDust />

            {/* Scene Objects */}
            {stars.map((star) => (
            <StarNode 
                key={star.id} 
                data={star} 
                isSelected={viewingStar?.id === star.id} 
                isVoyageTarget={activeVoyageStar?.id === star.id} 
                onClick={onStarSelect}
                onHover={setHoveredStar}
            />
            ))}

            <ConnectionLines selectedStar={anchorStar} allStars={stars} />

            {/* Voyage Logic Inside Canvas */}
            {isVoyageMode && !viewingStar && (
                <>
                    <VoyageCinematicLogic 
                        stars={stars} 
                        isEnabled={showVoyageHud} 
                        onActiveChange={setActiveVoyageStar} 
                    />
                    <VoyageBeam activeStar={activeVoyageStar} isEnabled={showVoyageHud} />
                </>
            )}

            <VoyageController 
            isEnabled={isVoyageEnabled} 
            stars={stars}
            controlsRef={controlsRef} 
            isInteracting={isInteracting}
            isVoyageMode={isVoyageMode}
            />

            <OrbitControls 
            ref={controlsRef}
            enabled={isOrbitEnabled}
            enableDamping={true}
            dampingFactor={0.05}
            rotateSpeed={0.5} 
            zoomSpeed={0.5}
            maxDistance={200} 
            minDistance={1}
            autoRotate={false} 
            onStart={() => setIsInteracting(true)}
            onEnd={() => setIsInteracting(false)}
            />

            <CameraManager targetStar={viewingStar} isLocked={isLocked} controlsRef={controlsRef} />
        </Canvas>

        {/* --- 2D OVERLAYS (OUTSIDE CANVAS FOR PERFECT FIXATION) --- */}

        {/* 1. Voyage HUD (CENTERED) - Updated Styling to Indigo/Violet */}
        {isVoyageMode && !viewingStar && showVoyageHud && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl flex flex-col items-center justify-center pointer-events-none z-10 px-6">
                <AnimatePresence mode='wait'>
                    {activeVoyageStar && (
                        <motion.div 
                            key={activeVoyageStar.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            // Indigo/Violet theme
                            className="flex flex-col items-center text-center bg-black/20 backdrop-blur-[2px] p-6 rounded-2xl shadow-[0_0_40px_rgba(99,102,241,0.1)]"
                        >
                            <div className="text-[10px] font-mono text-indigo-300 mb-3 uppercase tracking-[0.3em] bg-indigo-950/50 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                                {activeVoyageStar.topic || 'SIGNAL DETECTED'}
                            </div>
                            <h1 className="text-xl md:text-3xl font-bold text-white/95 leading-tight drop-shadow-[0_0_25px_rgba(99,102,241,0.5)] mb-3 font-mono">
                                {activeVoyageStar.content}
                            </h1>
                            {activeVoyageStar.answer && (
                                <p className="text-xs md:text-sm text-indigo-100/80 font-light leading-relaxed line-clamp-3">
                                    {activeVoyageStar.answer}
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )}

        {/* 2. Hover Tooltip (Screen Fixed) */}
        {!isVoyageMode && (
            <div className="absolute top-[35%] left-0 w-full pointer-events-none flex justify-center z-20 px-6">
            <div 
                className={`transition-all duration-500 ease-out transform ${
                hoveredStar 
                    ? 'opacity-100 translate-y-0 scale-100' 
                    : 'opacity-0 -translate-y-4 scale-95'
                }`}
            >
                {hoveredStar && (
                <div className="flex flex-col items-center text-center">
                    <div className="text-sm font-mono text-indigo-400 tracking-[0.2em] uppercase mb-2 shadow-black drop-shadow-md bg-black/50 backdrop-blur-sm px-2 rounded">
                    {hoveredStar.topic || 'Signal Detected'}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] max-w-3xl leading-tight">
                    {hoveredStar.content}
                    </h2>
                </div>
                )}
            </div>
            </div>
        )}
        </div>
    </>
  );
};