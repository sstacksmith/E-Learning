"use client";
import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Sphere, Text } from '@react-three/drei';
import * as THREE from 'three';

// Pojedyncza formuła - UPROSZCZONA wersja bez nakładania
function Formula({ position, color, text }: { 
  position: [number, number, number]; 
  color: string; 
  text: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <Text
        fontSize={0.25}
        color={color}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
      >
        {text}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </Text>
    </group>
  );
}

// Formuły matematyczne i chemiczne zamiast kwadratów
function FloatingFormulas() {
  const groupRef = useRef<THREE.Group>(null);
  
  const formulas = useMemo(() => {
    const items = [];
    const colors = [
      '#00ff88', // Zielony
      '#ff00ff', // Różowy
      '#00d4ff', // Niebieski
      '#ffaa00', // Pomarańczowy
      '#00ffff', // Cyan
      '#ff0088', // Magenta
    ];
    
    // Formuły BEZ indeksów (proste, czytelne)
    const formulaTexts = [
      'E=mc2',      // Einstein
      'a+b=c',      // Geometria
      'H2O',        // Woda
      'CO2',        // Dwutlenek węgla
      'F=ma',       // Newton
      'NaCl',       // Sól
      'DNA',        // DNA
      'ATP',        // ATP
      'O2',         // Tlen
      'NH3',        // Amoniak
      'CH4',        // Metan
      'pH',         // pH
      'RNA',        // RNA
      'Fe',         // Żelazo
      'Au',         // Złoto
      'Ag',         // Srebro
      'Cu',         // Miedź
      'Ca',         // Wapń
      'Na',         // Sód
      'Cl',         // Chlor
    ];
    
    // Tworzenie 20 formuł wokół kuli
    for (let i = 0; i < 20; i++) {
      const radius = 3.5 + Math.random() * 1;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      items.push({
        position: [
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi),
        ] as [number, number, number],
        color: colors[Math.floor(Math.random() * colors.length)],
        text: formulaTexts[i % formulaTexts.length],
      });
    }
    return items;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      {formulas.map((formula, i) => (
        <Formula
          key={i}
          position={formula.position}
          color={formula.color}
          text={formula.text}
        />
      ))}
    </group>
  );
}

// Świecące linie połączeń
function ConnectionLines() {
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const geometry = useMemo(() => {
    const points = [];
    const colors = [];
    
    // Generuj losowe punkty na sferze
    const spherePoints = [];
    for (let i = 0; i < 30; i++) {
      const radius = 2.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      spherePoints.push(new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      ));
    }
    
    // Połącz bliskie punkty
    for (let i = 0; i < spherePoints.length; i++) {
      for (let j = i + 1; j < spherePoints.length; j++) {
        if (spherePoints[i].distanceTo(spherePoints[j]) < 2) {
          points.push(spherePoints[i].x, spherePoints[i].y, spherePoints[i].z);
          points.push(spherePoints[j].x, spherePoints[j].y, spherePoints[j].z);
          
          // Kolor linii - cyan
          colors.push(0, 0.8, 1);
          colors.push(0, 0.8, 1);
        }
      }
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    return geometry;
  }, []);

  return (
    <lineSegments ref={linesRef} geometry={geometry}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.4}
        linewidth={2}
      />
    </lineSegments>
  );
}

// Logo i tekst w środku kuli
function CenterText() {
  const groupRef = useRef<THREE.Group>(null);
  
  // Załaduj teksturę
  const logoTexture = useLoader(THREE.TextureLoader, '/logo-cogito.png');

  useFrame((state) => {
    if (groupRef.current) {
      // Cała grupa zawsze skierowana do kamery
      groupRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Logo Cogito nad tekstem - BEZ TŁA */}
      <mesh position={[0, 0.5, 0]}>
        <planeGeometry args={[1.8, 1.6]} />
        <meshBasicMaterial
          map={logoTexture}
          transparent={true}
          opacity={1}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Tekst "Cogito" */}
      <Text
        position={[0, -0.3, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        letterSpacing={0.05}
      >
        Cogito
        <meshStandardMaterial
          color="#ffffff"
          emissive="#00d4ff"
          emissiveIntensity={2.0}
          toneMapped={false}
        />
      </Text>
    </group>
  );
}

// Główna kula ziemska
function EarthGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Animacja rotacji
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y += 0.002;
    }
  });

  // Shader dla świecącej atmosfery
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(0.0, 0.8, 1.0, 1.0) * intensity;
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
  }, []);

  return (
    <group>
      {/* Główna kula - proceduralna tekstura ziemi */}
      <Sphere ref={meshRef} args={[2, 64, 64]}>
        <meshPhongMaterial
          color="#1a4d8f"
          emissive="#0a2540"
          emissiveIntensity={0.3}
          shininess={30}
          specular="#4488ff"
          transparent
          opacity={0.5}
        >
          {/* Dodaj proceduralne "kontynenty" używając custom shader */}
        </meshPhongMaterial>
      </Sphere>

      {/* Świecąca atmosfera */}
      <Sphere ref={glowRef} args={[2.15, 64, 64]} material={atmosphereMaterial} />

      {/* Dodatkowy glow effect */}
      <Sphere args={[2.3, 32, 32]}>
        <meshBasicMaterial
          color="#00d4ff"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
}

// Particles w tle
function BackgroundParticles() {
  const particlesRef = useRef<THREE.Points>(null);

  const particles = useMemo(() => {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    const colorPalette = [
      [0, 1, 0.5],      // Zielony
      [1, 0, 1],        // Różowy
      [0, 0.8, 1],      // Niebieski
      [1, 0.7, 0],      // Pomarańczowy
    ];
    
    for (let i = 0; i < count; i++) {
      // Pozycje - sfera wokół głównej kuli
      const radius = 4 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // Losowy kolor z palety
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color[0];
      colors[i * 3 + 1] = color[1];
      colors[i * 3 + 2] = color[2];
    }
    
    return { positions, colors };
  }, []);

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
      particlesRef.current.rotation.x += 0.0003;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[particles.positions, 3]}
          count={particles.positions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[particles.colors, 3]}
          count={particles.colors.length / 3}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Główny komponent
function Scene() {
  return (
    <>
      {/* Światła */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4488ff" />
      <pointLight position={[0, 0, 10]} intensity={0.8} color="#00d4ff" />

      {/* Główne elementy */}
      <EarthGlobe />
      <CenterText />
      <ConnectionLines />
      <FloatingFormulas />
      <BackgroundParticles />
    </>
  );
}

export default function RealisticGlobe() {
  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ 
          antialias: true, 
          alpha: true,
          powerPreference: "high-performance"
        }}
      >
        <Scene />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.3}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}

