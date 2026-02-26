import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { StarData } from '../../types';

interface StarNodeProps {
  data: StarData;
  isSelected: boolean;
  isVoyageTarget?: boolean; // New prop for voyage highlight
  onClick: (data: StarData) => void;
  onHover: (data: StarData | null) => void;
}

// Global Textures (Singleton)
let cachedGlowTexture: THREE.CanvasTexture | null = null;
let cachedCrossTexture: THREE.CanvasTexture | null = null;

// INCREASED RESOLUTION: 64 -> 512 for smoother gradient when close
const getGlowTexture = () => {
  if (cachedGlowTexture) return cachedGlowTexture;
  const canvas = document.createElement('canvas');
  canvas.width = 512; 
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    const cx = 256;
    const cy = 256;
    const radius = 256;
    
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
    // Updated to Indigo (UI Match) to remove greenish tint
    gradient.addColorStop(0.15, 'rgba(165, 180, 252, 0.9)'); // Indigo-300
    gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.4)');  // Indigo-500
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); 
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
  }
  cachedGlowTexture = new THREE.CanvasTexture(canvas);
  return cachedGlowTexture;
};

// Cross/Diamond Texture - High Res
const getCrossTexture = () => {
    if (cachedCrossTexture) return cachedCrossTexture;
    const canvas = document.createElement('canvas');
    canvas.width = 512; 
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const cx = 256; 
        const cy = 256;
        const w = 180; 
        const t = 20;  

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
        grad.addColorStop(0.4, 'rgba(129, 140, 248, 0.6)'); // Indigo-400
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); 

        ctx.fillStyle = grad;
        
        // Shape 1
        ctx.beginPath();
        ctx.moveTo(cx - w, cy);
        ctx.quadraticCurveTo(cx, cy - t, cx, cy - t);
        ctx.lineTo(cx, cy + t);
        ctx.quadraticCurveTo(cx, cy + t, cx - w, cy);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + w, cy);
        ctx.quadraticCurveTo(cx, cy - t, cx, cy - t);
        ctx.lineTo(cx, cy + t);
        ctx.quadraticCurveTo(cx, cy + t, cx + w, cy);
        ctx.fill();
        
        // Shape 2
        ctx.beginPath();
        ctx.moveTo(cx, cy - w);
        ctx.quadraticCurveTo(cx - t, cy, cx - t, cy);
        ctx.lineTo(cx + t, cy);
        ctx.quadraticCurveTo(cx + t, cy, cx, cy - w);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, cy + w);
        ctx.quadraticCurveTo(cx - t, cy, cx - t, cy);
        ctx.lineTo(cx + t, cy);
        ctx.quadraticCurveTo(cx + t, cy, cx, cy + w);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(cx, cy, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 1)';
        ctx.fill();
    }
    cachedCrossTexture = new THREE.CanvasTexture(canvas);
    return cachedCrossTexture;
};

export const StarNode: React.FC<StarNodeProps> = ({ data, isSelected, isVoyageTarget, onClick, onHover }) => {
  const meshRef = useRef<THREE.Group>(null);
  const crossRef = useRef<THREE.Sprite>(null);
  const scaleRef = useRef(0.01); 
  const isActive = isSelected || isVoyageTarget;
  // Reduced scale target
  const targetScale = isActive ? 1.2 : 1.0; 
  
  // Twinkle Logic
  const nextTwinkleTime = useRef(Math.random() * 10); 
  const isTwinkling = useRef(false);
  const twinkleProgress = useRef(0);
  
  const glowTexture = useMemo(() => getGlowTexture(), []);
  const crossTexture = useMemo(() => getCrossTexture(), []);
  const randomPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useEffect(() => {
    scaleRef.current = 0.01; 
  }, []);

  useFrame((state, delta) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      
      meshRef.current.position.y = data.position.y + Math.sin(t + randomPhase) * 0.09; 
      meshRef.current.rotation.z = Math.sin(t * 0.5 + randomPhase) * 0.1;

      // Twinkle Logic
      let twinkleScale = 0;
      if (!isActive) {
          if (!isTwinkling.current) {
              nextTwinkleTime.current -= delta;
              if (nextTwinkleTime.current <= 0) {
                  isTwinkling.current = true;
                  twinkleProgress.current = 0;
                  nextTwinkleTime.current = 5 + Math.random() * 10;
              }
          } else {
              twinkleProgress.current += delta * 5; 
              if (twinkleProgress.current >= Math.PI) {
                  isTwinkling.current = false;
                  twinkleScale = 0;
              } else {
                  twinkleScale = Math.sin(twinkleProgress.current) * 0.8; 
              }
          }
      }

      const speed = 5;
      scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, targetScale, delta * speed);
      
      // Pulse effect: If active, pulse significantly. If not, just twinkle.
      const pulse = isActive ? Math.sin(t * 4) * 0.3 : 0;
      const finalScale = scaleRef.current + pulse + twinkleScale;
      
      meshRef.current.scale.set(finalScale, finalScale, finalScale);
      
      // Cross Flare Animation Logic
      if (crossRef.current) {
         crossRef.current.material.rotation = t * 0.05 + randomPhase;
         
         const baseOpacity = isActive ? 0.8 : 0.3;
         const pulseOpacity = isActive ? Math.sin(t * 4) * 0.2 : 0;
         
         crossRef.current.material.opacity = baseOpacity + pulseOpacity;
         
         // Scale Logic for Cross
         const crossTargetScale = isActive ? 1.3 : 1.0;
         crossRef.current.scale.set(crossTargetScale, crossTargetScale, 1);
      }
    }
  });

  // Updated Colors to Indigo (UI Match)
  const glowColor = isActive ? "#818cf8" : "#ffffff"; // Indigo-400
  const glowOpacity = isActive ? 1.0 : 0.5; 
  const glowScale = isActive ? 1.8 : 2.0; 

  return (
    <group 
      ref={meshRef} 
      position={[data.position.x, data.position.y, data.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick(data);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onHover(data);
      }}
      onPointerOut={(e) => {
        document.body.style.cursor = 'default';
        onHover(null);
      }}
    >
      {/* 0. SOLID BRIGHT CORE (TINY) */}
      <mesh>
        <sphereGeometry args={[isActive ? 0.05 : 0.03, 32, 32]} /> 
        <meshBasicMaterial 
            color="#e0e7ff" 
            toneMapped={false} 
        />
      </mesh>

      {/* 0.5. INNER BODY (NEW: Fills the hollow gap) */}
      <mesh>
         {/* Changed color to near-white (#f8fafc) as requested */}
         <sphereGeometry args={[isActive ? 0.11 : 0.06, 32, 32]} />
         <meshBasicMaterial 
            color="#f8fafc" 
            transparent
            opacity={0.9}
         />
      </mesh>

      {/* 1. Distorted Corona (GAS) */}
      <mesh>
        <sphereGeometry args={[isActive ? 0.15 : 0.08, 64, 64]} /> 
        <MeshDistortMaterial 
          color={isActive ? "#6366f1" : "#818cf8"} 
          emissive={isActive ? "#4f46e5" : "#4338ca"} 
          emissiveIntensity={isActive ? 3.0 : 0.5} 
          distort={0.4} 
          speed={3} 
          roughness={0.0}
          transparent
          opacity={isActive ? 0.6 : 0.4} // Increased opacity for volume
          depthWrite={false} 
        />
      </mesh>

      {/* 2. Glow Sprite */}
      <sprite scale={[glowScale, glowScale, 1]}>
        <spriteMaterial 
          map={glowTexture} 
          transparent={true} 
          opacity={glowOpacity} 
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color={glowColor} 
        />
      </sprite>
      
      {/* 3. Cross Flare Sprite */}
      <sprite ref={crossRef}>
        <spriteMaterial 
          map={crossTexture}
          transparent={true}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          color="#e0e7ff" // Indigo-50
        />
      </sprite>
    </group>
  );
};