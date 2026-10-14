import React, { useEffect, useState, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Target, Shield, Sword, Flame, Crosshair } from 'lucide-react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, Text, ContactShadows, Stars, Sparkles, Trail } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, Scanline, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

// --- 3D Components ---

const AK47Model = ({ muzzle, color = "#1a1a1a", isExtended = false }: { muzzle: boolean, color?: string, isExtended?: boolean }) => (
  <group position={[0, 0.3, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
    {/* Main Receiver: Metallic with wear */}
    <mesh castShadow>
      <boxGeometry args={[0.07, 0.55, 0.14]} />
      <meshPhysicalMaterial color={color} metalness={1} roughness={0.2} clearcoat={0.5} />
    </mesh>
    {/* Barrel & Gas Tube */}
    <mesh position={[0, 0.45, 0.06]} castShadow>
      <cylinderGeometry args={[0.015, 0.015, 0.5, 12]} />
      <meshPhysicalMaterial color="#0a0a0a" metalness={1} roughness={0.1} />
    </mesh>
    <mesh position={[0, 0.35, 0.09]} castShadow>
      <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
      <meshPhysicalMaterial color="#0a0a0a" metalness={1} roughness={0.1} />
    </mesh>
    {/* Magazine: Curved and detailed */}
    <mesh position={[0, 0.12, -0.14]} rotation={[0.5, 0, 0]} castShadow>
      <boxGeometry args={[0.05, isExtended ? 0.45 : 0.3, 0.14]} />
      <meshPhysicalMaterial color="#111" metalness={0.8} roughness={0.4} />
    </mesh>
    {/* Stock: Polished Wood */}
    <mesh position={[0, -0.38, 0.04]} rotation={[-0.15, 0, 0]} castShadow>
      <boxGeometry args={[0.06, 0.38, 0.16]} />
      <meshPhysicalMaterial color="#3d2b1f" roughness={0.7} metalness={0.1} />
    </mesh>
    {/* Handguard: Wood */}
    <mesh position={[0, 0.22, 0.04]} castShadow>
      <boxGeometry args={[0.08, 0.28, 0.14]} />
      <meshPhysicalMaterial color="#3d2b1f" roughness={0.7} metalness={0.1} />
    </mesh>
    {/* Grip */}
    <mesh position={[0, -0.05, -0.1]} rotation={[-0.4, 0, 0]} castShadow>
      <boxGeometry args={[0.05, 0.15, 0.08]} />
      <meshPhysicalMaterial color="#111" roughness={0.8} />
    </mesh>
    
    {/* Muzzle Flash & Dynamic Light */}
    {muzzle && (
      <group position={[0, 0.7, 0.06]}>
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshBasicMaterial color="#ffdd44" transparent opacity={0.9} />
        </mesh>
        <pointLight color="#ffdd44" intensity={20} distance={6} />
        <Sparkles count={20} scale={0.8} size={4} speed={3} color="#ffaa00" />
        <Sparkles count={25} scale={1.5} size={5} speed={0.8} opacity={0.5} color="#dddddd" />
      </group>
    )}
  </group>
);

const MafiaBoss3D = ({ position, rotation, isAttacking }: { position: [number, number, number], rotation: [number, number, number], isAttacking: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const [muzzle, setMuzzle] = useState(false);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime;
      group.current.position.y = position[1] + Math.sin(t * 1.2) * 0.02;
      group.current.rotation.x = -0.08; // Proactive lean
      
      if (isAttacking) {
        group.current.position.z += Math.sin(t * 50) * 0.015;
        group.current.rotation.x += Math.sin(t * 40) * 0.01;
      }
    }
  });

  useEffect(() => {
    if (isAttacking) {
      const interval = setInterval(() => setMuzzle(prev => !prev), 55);
      return () => clearInterval(interval);
    }
    setMuzzle(false);
  }, [isAttacking]);

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Neck */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.15, 16]} />
        <meshPhysicalMaterial color="#d2b48c" roughness={0.5} />
      </mesh>
      
      {/* Torso: Tailored Suit with Shoulders */}
      <group position={[0, 1.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.6, 0.9, 0.35]} />
          <meshPhysicalMaterial color="#050505" roughness={0.2} metalness={0.1} clearcoat={0.3} />
        </mesh>
        {/* Shoulders */}
        <mesh position={[-0.3, 0.4, 0]} rotation={[0, 0, 0.2]}>
          <boxGeometry args={[0.15, 0.1, 0.35]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>
        <mesh position={[0.3, 0.4, 0]} rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.15, 0.1, 0.35]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>
        {/* Lapels */}
        <mesh position={[-0.15, 0.2, 0.18]} rotation={[0, 0, 0.25]}>
          <boxGeometry args={[0.12, 0.5, 0.02]} />
          <meshPhysicalMaterial color="#050505" clearcoat={1} />
        </mesh>
        <mesh position={[0.15, 0.2, 0.18]} rotation={[0, 0, -0.25]}>
          <boxGeometry args={[0.12, 0.5, 0.02]} />
          <meshPhysicalMaterial color="#050505" clearcoat={1} />
        </mesh>
        {/* Shirt Collar */}
        <mesh position={[0, 0.45, 0.15]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.2, 0.1, 0.1]} />
          <meshPhysicalMaterial color="#fff" />
        </mesh>
        {/* Tie */}
        <mesh position={[0, 0.1, 0.19]}>
          <boxGeometry args={[0.06, 0.55, 0.01]} />
          <meshPhysicalMaterial color="#660000" metalness={0.5} roughness={0.1} />
        </mesh>
      </group>
      
      {/* Head: Realistic features */}
      <group position={[0, 1.85, 0]}>
        {/* Skull */}
        <mesh castShadow>
          <sphereGeometry args={[0.23, 32, 32]} />
          <meshPhysicalMaterial color="#d2b48c" roughness={0.4} />
        </mesh>
        {/* Nose */}
        <mesh position={[0, 0, 0.2]}>
          <boxGeometry args={[0.04, 0.08, 0.06]} />
          <meshPhysicalMaterial color="#d2b48c" />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.22, 0, 0]} rotation={[0, 0.3, 0]}>
          <boxGeometry args={[0.03, 0.1, 0.06]} />
          <meshPhysicalMaterial color="#d2b48c" />
        </mesh>
        <mesh position={[0.22, 0, 0]} rotation={[0, -0.3, 0]}>
          <boxGeometry args={[0.03, 0.1, 0.06]} />
          <meshPhysicalMaterial color="#d2b48c" />
        </mesh>
        {/* Eyes: Cold Blue */}
        <mesh position={[-0.08, 0.06, 0.19]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#87ceeb" />
        </mesh>
        <mesh position={[0.08, 0.06, 0.19]}>
          <sphereGeometry args={[0.025, 12, 12]} />
          <meshBasicMaterial color="#87ceeb" />
        </mesh>
        {/* Slick Hair with volume */}
        <mesh position={[0, 0.15, -0.05]} rotation={[-0.2, 0, 0]}>
          <sphereGeometry args={[0.24, 32, 16]} scale={[1, 0.6, 1.1]} />
          <meshPhysicalMaterial color="#0a0a0a" roughness={0.05} metalness={0.3} />
        </mesh>
        {/* Stubble texture */}
        <mesh position={[0, -0.1, 0.1]} scale={[1.05, 0.5, 1.05]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshPhysicalMaterial color="#222" transparent opacity={0.2} />
        </mesh>
      </group>
      
      {/* Arms: Suit Sleeves & Hands */}
      <group position={[-0.4, 1.35, 0]} rotation={[0, 0, 0.1]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshPhysicalMaterial color="#111" roughness={0.1} metalness={0.4} />
        </mesh>
      </group>
      <group position={[0.4, 1.35, 0]} rotation={[Math.PI / 2.2, 0, -0.2]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.1, 0.5, 8, 16]} />
          <meshPhysicalMaterial color="#050505" />
        </mesh>
        {/* Hand holding weapon */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshPhysicalMaterial color="#111" roughness={0.1} metalness={0.4} />
        </mesh>
        <AK47Model muzzle={muzzle} />
      </group>
      
      {/* Legs: Suit Pants & Shoes */}
      <mesh position={[-0.2, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.8, 8, 16]} />
        <meshPhysicalMaterial color="#050505" />
      </mesh>
      <mesh position={[0.2, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.8, 8, 16]} />
        <meshPhysicalMaterial color="#050505" />
      </mesh>
      {/* Polished Shoes */}
      <mesh position={[-0.2, 0.05, 0.12]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.3]} />
        <meshPhysicalMaterial color="#000" roughness={0.02} metalness={0.9} clearcoat={1} />
      </mesh>
      <mesh position={[0.2, 0.05, 0.12]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.3]} />
        <meshPhysicalMaterial color="#000" roughness={0.02} metalness={0.9} clearcoat={1} />
      </mesh>
    </group>
  );
};

const RivalGangster3D = ({ position, rotation, isAttacking }: { position: [number, number, number], rotation: [number, number, number], isAttacking: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const [muzzle, setMuzzle] = useState(false);

  useFrame((state) => {
    if (group.current) {
      const t = state.clock.elapsedTime;
      group.current.position.y = position[1] + Math.sin(t * 2.5) * 0.03;
      group.current.rotation.x = 0.25; // Aggressive lean
      
      if (isAttacking) {
        group.current.position.z += Math.sin(t * 60) * 0.02;
        group.current.rotation.x -= Math.sin(t * 45) * 0.015;
      }
    }
  });

  useEffect(() => {
    if (isAttacking) {
      const interval = setInterval(() => setMuzzle(prev => !prev), 45);
      return () => clearInterval(interval);
    }
    setMuzzle(false);
  }, [isAttacking]);

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* Neck */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.11, 0.15, 16]} />
        <meshPhysicalMaterial color="#c68642" roughness={0.6} />
      </mesh>
      
      {/* Torso: Leather Jacket & Tactical Vest */}
      <group position={[0, 1.1, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.55, 0.9, 0.4]} />
          <meshPhysicalMaterial color="#111" roughness={0.1} metalness={0.5} clearcoat={0.5} />
        </mesh>
        {/* Tactical Vest Panels */}
        <mesh position={[0, 0.1, 0.15]} castShadow>
          <boxGeometry args={[0.45, 0.6, 0.15]} />
          <meshPhysicalMaterial color="#222" roughness={0.9} />
        </mesh>
        {/* Straps */}
        <mesh position={[-0.2, 0.4, 0.1]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.02]} />
          <meshPhysicalMaterial color="#000" />
        </mesh>
        <mesh position={[0.2, 0.4, 0.1]} rotation={[0.5, 0, 0]}>
          <boxGeometry args={[0.08, 0.4, 0.02]} />
          <meshPhysicalMaterial color="#000" />
        </mesh>
      </group>
      
      {/* Head: Masked with Intense Eyes */}
      <group position={[0, 1.85, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshPhysicalMaterial color="#c68642" />
        </mesh>
        {/* Tactical Mask: Detailed shape */}
        <mesh position={[0, -0.08, 0.14]} scale={[1.2, 0.8, 1.1]}>
          <sphereGeometry args={[0.18, 16, 16]} />
          <meshPhysicalMaterial color="#0a0a0a" roughness={0.9} />
        </mesh>
        {/* Intense Glowing Eyes */}
        <mesh position={[-0.07, 0.06, 0.19]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#ff3300" />
          <pointLight color="#ff3300" intensity={2} distance={1} />
        </mesh>
        <mesh position={[0.07, 0.06, 0.19]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshBasicMaterial color="#ff3300" />
          <pointLight color="#ff3300" intensity={2} distance={1} />
        </mesh>
        {/* Undercut Hair */}
        <mesh position={[0, 0.18, 0]} scale={[1, 0.4, 1.05]}>
          <sphereGeometry args={[0.23, 24, 12]} />
          <meshPhysicalMaterial color="#050505" roughness={0.2} />
        </mesh>
      </group>
      
      {/* Arms: Leather Sleeves & Tactical Gloves */}
      <group position={[-0.4, 1.35, 0]} rotation={[0, 0, 0.4]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.1, 0.45, 8, 16]} />
          <meshPhysicalMaterial color="#111" roughness={0.1} metalness={0.4} />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
      </group>
      <group position={[0.4, 1.35, 0]} rotation={[Math.PI / 2.4, 0, -0.4]}>
        <mesh castShadow>
          <capsuleGeometry args={[0.1, 0.45, 8, 16]} />
          <meshPhysicalMaterial color="#111" roughness={0.1} metalness={0.4} />
        </mesh>
        {/* Tactical Glove holding weapon */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshPhysicalMaterial color="#1a1a1a" roughness={0.8} />
        </mesh>
        <AK47Model muzzle={muzzle} color="#050505" isExtended />
      </group>
      
      {/* Legs: Cargo Pants & Boots */}
      <mesh position={[-0.2, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.8, 8, 16]} />
        <meshPhysicalMaterial color="#2d3436" roughness={1} />
      </mesh>
      <mesh position={[0.2, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.8, 8, 16]} />
        <meshPhysicalMaterial color="#2d3436" roughness={1} />
      </mesh>
      {/* Combat Boots */}
      <mesh position={[-0.2, 0.08, 0.15]} castShadow>
        <boxGeometry args={[0.2, 0.18, 0.35]} />
        <meshPhysicalMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
      <mesh position={[0.2, 0.08, 0.15]} castShadow>
        <boxGeometry args={[0.2, 0.18, 0.35]} />
        <meshPhysicalMaterial color="#0a0a0a" roughness={0.9} />
      </mesh>
    </group>
  );
};

const Alleyway = () => {
  return (
    <group>
      {/* Ground: Wet Asphalt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[30, 60]} />
        <meshStandardMaterial color="#050505" roughness={0.05} metalness={0.6} />
      </mesh>
      {/* Left Wall: Brick-like */}
      <mesh position={[-4, 5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 10, 60]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Right Wall */}
      <mesh position={[4, 5, 0]} receiveShadow>
        <boxGeometry args={[0.5, 10, 60]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>
      {/* Neon Signs & Volumetric Lights */}
      <group position={[-3.7, 4, -8]}>
        <mesh>
          <boxGeometry args={[0.1, 3, 1.5]} />
          <meshBasicMaterial color="#ff0055" />
        </mesh>
        <pointLight color="#ff0055" intensity={15} distance={15} />
      </group>
      <group position={[3.7, 6, 4]}>
        <mesh>
          <boxGeometry args={[0.1, 2, 4]} />
          <meshBasicMaterial color="#00d4ff" />
        </mesh>
        <pointLight color="#00d4ff" intensity={15} distance={15} />
      </group>
      {/* Distant Street Light */}
      <pointLight position={[0, 8, -20]} color="#f1c40f" intensity={5} distance={30} />
    </group>
  );
};

const BulletTrail = ({ start, end, active }: { start: [number, number, number], end: [number, number, number], active: boolean }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (mesh.current && active) {
      mesh.current.position.z -= 0.8;
      if (mesh.current.position.z < -15) mesh.current.position.z = 10;
    }
  });

  if (!active) return null;

  return (
    <mesh ref={mesh} position={start}>
      <boxGeometry args={[0.015, 0.015, 0.8]} />
      <meshBasicMaterial color="#fff" transparent opacity={0.6} />
    </mesh>
  );
};

const CinematicCamera = ({ stage }: { stage: number }) => {
  const { camera } = useThree();
  
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (stage === 0) {
      camera.position.lerp(new THREE.Vector3(0, 2.5, 12), 0.04);
    } else if (stage === 1) {
      camera.position.lerp(new THREE.Vector3(3, 1.8, 6), 0.04);
      camera.lookAt(0, 1.5, 0);
    } else if (stage === 2 || stage === 3) {
      // Dynamic handheld shake
      camera.position.x = Math.sin(t * 3) * 0.4 + 2.5;
      camera.position.y = 1.8 + Math.cos(t * 2) * 0.15;
      camera.lookAt(0, 1.6, -3);
    } else if (stage >= 4) {
      // Slow-mo dramatic zoom
      camera.position.lerp(new THREE.Vector3(0, 1.8, 4), 0.015);
      camera.lookAt(0, 1.6, 0);
    }
  });

  return null;
};

// --- Main Component ---

interface CinematicAttackProps {
  onClose: () => void;
  attackerName: string;
  targetName: string;
  isWin?: boolean;
  damagePercent?: number;
}

export const CinematicAttack: React.FC<CinematicAttackProps> = ({ onClose, attackerName, targetName, isWin, damagePercent }) => {
  const [stage, setStage] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    const sequence = [
      { delay: 1500, next: 1 }, // Intro
      { delay: 1000, next: 2 }, // Encounter
      { delay: 3500, next: 3 }, // Gunfight
      { delay: 2000, next: 4 }, // Bullet Time
      { delay: 1000, next: 5 }, // Result
      { delay: 3000, next: 6 }, // Overlay
    ];

    let currentTimer: any;
    
    const runSequence = (index: number) => {
      if (index >= sequence.length) return;
      
      currentTimer = setTimeout(() => {
        const step = sequence[index];
        setStage(step.next);

        if (step.next === 6) {
          setShowOverlay(true);
        }

        runSequence(index + 1);
      }, sequence[index].delay);
    };

    runSequence(0);
    return () => clearTimeout(currentTimer);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-black overflow-hidden flex flex-col font-sans touch-none select-none" dir="rtl">
      {/* Cinematic Overlays */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
        {/* Film Grain */}
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay" />
      </div>

      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={45} />
            <CinematicCamera stage={stage} />
            
            <ambientLight intensity={0.15} />
            <spotLight position={[15, 15, 15]} angle={0.2} penumbra={1} intensity={3} castShadow />
            <pointLight position={[-5, 8, -5]} color="#ff0055" intensity={2} />
            
            <Alleyway />
            
            {/* Atmospheric Smoke/Fog */}
            <Sparkles count={200} scale={[10, 5, 20]} size={6} speed={0.3} opacity={0.15} color="#aaa" />
            
            {/* Rim Lights for Characters */}
            <pointLight position={[2, 2, 3]} intensity={5} color="#00d4ff" distance={5} />
            <pointLight position={[-2, 2, -3]} intensity={5} color="#ff0055" distance={5} />
            
            {/* Mafia Boss (Attacker) */}
            <MafiaBoss3D 
              position={[1.2, 0, 2.5]} 
              rotation={[0, -Math.PI / 5, 0]} 
              isAttacking={stage === 3 || stage === 4} 
            />
            
            {/* Rival Gangster (Enemy) */}
            <RivalGangster3D 
              position={[-1.2, 0, -2.5]} 
              rotation={[0, Math.PI * 0.8, 0]} 
              isAttacking={stage === 3} 
            />

            {/* Bullet Trails & Impacts */}
            <BulletTrail start={[1.6, 1.3, 3]} end={[-1.2, 1.3, -2.5]} active={stage === 3 || stage === 4} />
            <BulletTrail start={[-0.8, 1.3, -2]} end={[1.2, 1.3, 2.5]} active={stage === 3} />

            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
            <Sparkles count={150} scale={15} size={3} speed={0.8} opacity={0.3} color="#fff" />
            
            <Environment preset="night" />
            <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={15} blur={2.5} far={1.5} />

            <EffectComposer>
              <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
              <Vignette offset={0.5} darkness={0.5} />
              <Noise opacity={0.05} />
              <ChromaticAberration offset={new THREE.Vector2(0.001, 0.001)} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Cinematic HUD Overlay */}
      <div className="relative z-50 flex flex-col h-full p-6 pointer-events-none">
        {/* Top Letterbox */}
        <motion.div 
          animate={{ height: stage >= 6 ? '50vh' : '12vh' }}
          className="absolute top-0 left-0 w-full bg-black z-50 transition-all duration-1000" 
        />
        
        {/* Bottom Letterbox */}
        <motion.div 
          animate={{ height: stage >= 6 ? '50vh' : '12vh' }}
          className="absolute bottom-0 left-0 w-full bg-black z-50 transition-all duration-1000" 
        />

        {/* Combatant Info */}
        <div className="mt-[12vh] flex justify-between items-start">
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: stage >= 6 ? 0 : 1 }}
            className="flex flex-col gap-1"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase">المهاجم</span>
            </div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">{attackerName}</h2>
          </motion.div>

          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: stage >= 6 ? 0 : 1 }}
            className="flex flex-col items-end gap-1"
          >
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400 font-black tracking-widest uppercase">الهدف</span>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-white italic tracking-tighter drop-shadow-lg">{targetName}</h2>
          </motion.div>
        </div>

        {/* GTA V Style Overlay Screens */}
        <AnimatePresence>
          {showOverlay && (
            <motion.div 
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            >
              {isWin ? (
                <div className="flex flex-col items-center">
                  <motion.div 
                    initial={{ letterSpacing: '1em', opacity: 0 }}
                    animate={{ letterSpacing: '0.1em', opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-6xl sm:text-8xl font-black text-yellow-500 italic drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]"
                  >
                    MISSION PASSED
                  </motion.div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-black text-white mt-4 tracking-[0.5em] uppercase"
                  >
                    + {damagePercent}% DAMAGE
                  </motion.div>
                </div>
              ) : (
                <motion.div 
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-8xl sm:text-9xl font-black text-red-600 italic drop-shadow-[0_0_50px_rgba(220,38,38,0.8)]"
                >
                  WASTED
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <div className="mt-auto mb-[12vh] relative z-[60] pointer-events-auto">
          <div className="flex flex-col gap-4">
            <button
              onClick={onClose}
              className="w-full group relative overflow-hidden bg-white text-black font-black py-5 rounded-2xl text-xl transition-all active:scale-95 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center justify-center gap-3">
                {stage < 5 ? <Zap className="w-6 h-6 fill-current" /> : <Flame className="w-6 h-6 fill-current" />}
                {stage < 5 ? 'تخطي المشهد' : 'العودة للمقر'}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Global Cinematic Effects */}
      <div className="fixed inset-0 pointer-events-none z-[70]">
        <div className="absolute inset-0 shadow-[inset_0_0_200px_rgba(0,0,0,0.9)]" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      </div>
    </div>
  );
};
