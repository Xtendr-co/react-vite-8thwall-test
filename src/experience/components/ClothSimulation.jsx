import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Cloth simulation parameters
const CLOTH_WIDTH = 2
const CLOTH_HEIGHT = 2
const CLOTH_SEGMENTS_X = 25
const CLOTH_SEGMENTS_Y = 25
const DAMPING = 0.99
const STIFFNESS = 0.4
const GRAVITY = -0.0098
const WIND_STRENGTH = 0.003

class VerletVertex {
  constructor(x, y, z, isFixed = false) {
    this.position = new THREE.Vector3(x, y, z)
    this.oldPosition = new THREE.Vector3(x, y, z)
    this.acceleration = new THREE.Vector3(0, 0, 0)
    this.isFixed = isFixed
  }

  update(deltaTime) {
    if (this.isFixed) return

    const velocity = this.position.clone().sub(this.oldPosition)
    velocity.multiplyScalar(DAMPING)
    
    this.oldPosition.copy(this.position)
    this.position.add(velocity).add(this.acceleration.clone().multiplyScalar(deltaTime * deltaTime))
    this.acceleration.set(0, 0, 0)
  }

  addForce(force) {
    this.acceleration.add(force)
  }
}

class VerletConstraint {
  constructor(v1, v2) {
    this.v1 = v1
    this.v2 = v2
    this.restLength = v1.position.distanceTo(v2.position)
  }

  satisfy() {
    const delta = this.v2.position.clone().sub(this.v1.position)
    const distance = delta.length()
    if (distance === 0) return
    
    const difference = (this.restLength - distance) / distance
    const offset = delta.multiplyScalar(difference * STIFFNESS * 0.5)

    if (!this.v1.isFixed) this.v1.position.sub(offset)
    if (!this.v2.isFixed) this.v2.position.add(offset)
  }
}

export default function ClothSimulation({ 
  position = [0, 2, 0], 
  color = "#4080ff",
  showSphere = true,
  windIntensity = 1.0,
  ...props 
}) {
  const meshRef = useRef()
  const sphereRef = useRef()
  const vertices = useRef([])
  const constraints = useRef([])
  const sphere = useRef({ position: new THREE.Vector3(0, 0, 0), radius: 0.25 })
  const frameCount = useRef(0)
  
  // Initialize cloth vertices and constraints
  const { positions, indices } = useMemo(() => {
    vertices.current = []
    constraints.current = []
    
    // Create vertices
    for (let y = 0; y <= CLOTH_SEGMENTS_Y; y++) {
      for (let x = 0; x <= CLOTH_SEGMENTS_X; x++) {
        const posX = (x / CLOTH_SEGMENTS_X - 0.5) * CLOTH_WIDTH
        const posY = 0
        const posZ = (y / CLOTH_SEGMENTS_Y) * CLOTH_HEIGHT
        
        // Fix some top vertices (cloth hanging points)
        const isFixed = y === 0 && x % 5 === 0
        
        vertices.current.push(new VerletVertex(posX, posY, posZ, isFixed))
      }
    }
    
    // Create constraints (springs)
    for (let y = 0; y <= CLOTH_SEGMENTS_Y; y++) {
      for (let x = 0; x <= CLOTH_SEGMENTS_X; x++) {
        const index = y * (CLOTH_SEGMENTS_X + 1) + x
        
        // Horizontal constraints
        if (x < CLOTH_SEGMENTS_X) {
          constraints.current.push(new VerletConstraint(
            vertices.current[index],
            vertices.current[index + 1]
          ))
        }
        
        // Vertical constraints
        if (y < CLOTH_SEGMENTS_Y) {
          constraints.current.push(new VerletConstraint(
            vertices.current[index],
            vertices.current[index + CLOTH_SEGMENTS_X + 1]
          ))
        }
        
        // Diagonal constraints for stability
        if (x < CLOTH_SEGMENTS_X && y < CLOTH_SEGMENTS_Y) {
          constraints.current.push(new VerletConstraint(
            vertices.current[index],
            vertices.current[index + CLOTH_SEGMENTS_X + 2]
          ))
          constraints.current.push(new VerletConstraint(
            vertices.current[index + 1],
            vertices.current[index + CLOTH_SEGMENTS_X + 1]
          ))
        }
        
        // Additional structural constraints for better stability
        if (x < CLOTH_SEGMENTS_X - 1) {
          constraints.current.push(new VerletConstraint(
            vertices.current[index],
            vertices.current[index + 2]
          ))
        }
        
        if (y < CLOTH_SEGMENTS_Y - 1) {
          constraints.current.push(new VerletConstraint(
            vertices.current[index],
            vertices.current[index + (CLOTH_SEGMENTS_X + 1) * 2]
          ))
        }
      }
    }
    
    // Create geometry
    const positions = new Float32Array(vertices.current.length * 3)
    vertices.current.forEach((vertex, i) => {
      positions[i * 3] = vertex.position.x
      positions[i * 3 + 1] = vertex.position.y
      positions[i * 3 + 2] = vertex.position.z
    })
    
    // Create indices for triangular faces
    const indices = []
    for (let y = 0; y < CLOTH_SEGMENTS_Y; y++) {
      for (let x = 0; x < CLOTH_SEGMENTS_X; x++) {
        const a = y * (CLOTH_SEGMENTS_X + 1) + x
        const b = a + 1
        const c = a + CLOTH_SEGMENTS_X + 1
        const d = c + 1
        
        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }
    
    return { positions, indices }
  }, [])
  
  // Animation loop
  useFrame((state, deltaTime) => {
    if (!meshRef.current) return
    
    frameCount.current++
    const time = state.clock.elapsedTime
    
    // Update sphere position (animated obstacle)
    sphere.current.position.set(
      Math.sin(time * 1.8) * 0.6,
      -0.3 + Math.sin(time * 0.7) * 0.4,
      Math.cos(time * 1.2) * 0.4
    )
    
    // Update sphere mesh position if it exists
    if (sphereRef.current && showSphere) {
      sphereRef.current.position.copy(sphere.current.position)
    }
    
    // Apply forces
    vertices.current.forEach((vertex, i) => {
      if (vertex.isFixed) return
      
      // Gravity
      vertex.addForce(new THREE.Vector3(0, GRAVITY, 0))
      
      // Wind (more complex noise-like effect)
      const windTime = time * 0.5
      const windX = (Math.sin(windTime * 2 + vertex.position.x * 3) + 
                    Math.sin(windTime * 3.2 + vertex.position.z * 2)) * WIND_STRENGTH * windIntensity
      const windY = Math.sin(windTime * 1.5 + vertex.position.x * 4 + vertex.position.z * 3) * WIND_STRENGTH * 0.3 * windIntensity
      const windZ = (Math.cos(windTime * 1.8 + vertex.position.x * 2.5) + 
                    Math.cos(windTime * 2.3 + vertex.position.z * 1.8)) * WIND_STRENGTH * 0.7 * windIntensity
      vertex.addForce(new THREE.Vector3(windX, windY, windZ))
      
      // Sphere collision
      if (showSphere) {
        const toSphere = vertex.position.clone().sub(sphere.current.position)
        const distance = toSphere.length()
        if (distance < sphere.current.radius + 0.05) {
          const pushBack = toSphere.normalize().multiplyScalar((sphere.current.radius + 0.05) - distance)
          vertex.position.add(pushBack)
        }
      }
    })
    
    // Update vertices
    vertices.current.forEach(vertex => vertex.update(deltaTime))
    
    // Satisfy constraints (multiple iterations for stability)
    const iterations = 4
    for (let i = 0; i < iterations; i++) {
      constraints.current.forEach(constraint => constraint.satisfy())
    }
    
    // Update geometry positions (only every other frame for performance)
    if (frameCount.current % 1 === 0) {
      const positions = meshRef.current.geometry.attributes.position.array
      vertices.current.forEach((vertex, i) => {
        positions[i * 3] = vertex.position.x
        positions[i * 3 + 1] = vertex.position.y
        positions[i * 3 + 2] = vertex.position.z
      })
      
      meshRef.current.geometry.attributes.position.needsUpdate = true
      meshRef.current.geometry.computeVertexNormals()
    }
  })
  
  return (
    <group position={position} {...props}>
      {/* Cloth mesh */}
      <mesh ref={meshRef} receiveShadow castShadow>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="index"
            count={indices.length}
            array={new Uint32Array(indices)}
            itemSize={1}
          />
        </bufferGeometry>
        <meshPhysicalMaterial
          color={color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
          roughness={0.2}
          metalness={0.0}
          sheen={1.0}
          sheenRoughness={0.4}
          sheenColor="#ffffff"
          transmission={0.1}
          thickness={0.1}
        />
      </mesh>
      
      {/* Animated sphere obstacle */}
      {showSphere && (
        <mesh ref={sphereRef} castShadow>
          <sphereGeometry args={[sphere.current.radius, 16, 16]} />
          <meshStandardMaterial color="#ff6040" metalness={0.3} roughness={0.4} />
        </mesh>
      )}
      
      {/* Fixed points visualization */}
      {vertices.current
        .filter(vertex => vertex.isFixed)
        .map((vertex, index) => (
          <mesh key={index} position={[vertex.position.x, vertex.position.y, vertex.position.z]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
        ))}
    </group>
  )
}
