import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Advanced cloth simulation parameters
const CLOTH_WIDTH = 2.5
const CLOTH_HEIGHT = 2.5
const CLOTH_SEGMENTS_X = 30
const CLOTH_SEGMENTS_Y = 30
const DAMPING = 0.995
const STIFFNESS = 0.5
const GRAVITY = -0.0098
const WIND_STRENGTH = 0.004
const TEAR_THRESHOLD = 0.8 // Distance threshold for tearing

class AdvancedVerletVertex {
  constructor(x, y, z, isFixed = false) {
    this.position = new THREE.Vector3(x, y, z)
    this.oldPosition = new THREE.Vector3(x, y, z)
    this.acceleration = new THREE.Vector3(0, 0, 0)
    this.isFixed = isFixed
    this.mass = 1.0
    this.pinned = isFixed
  }

  update(deltaTime) {
    if (this.isFixed || this.pinned) return

    const velocity = this.position.clone().sub(this.oldPosition)
    velocity.multiplyScalar(DAMPING)
    
    this.oldPosition.copy(this.position)
    this.position.add(velocity).add(this.acceleration.clone().multiplyScalar(deltaTime * deltaTime))
    this.acceleration.set(0, 0, 0)
  }

  addForce(force) {
    if (!this.isFixed && !this.pinned) {
      this.acceleration.add(force.clone().divideScalar(this.mass))
    }
  }

  pin() {
    this.pinned = true
  }

  unpin() {
    this.pinned = false
  }
}

class AdvancedVerletConstraint {
  constructor(v1, v2, stiffness = STIFFNESS) {
    this.v1 = v1
    this.v2 = v2
    this.restLength = v1.position.distanceTo(v2.position)
    this.stiffness = stiffness
    this.active = true
  }

  satisfy() {
    if (!this.active) return

    const delta = this.v2.position.clone().sub(this.v1.position)
    const distance = delta.length()
    
    // Check for tearing
    if (distance > this.restLength * TEAR_THRESHOLD && this.restLength > 0.1) {
      this.active = false
      return
    }
    
    if (distance === 0) return
    
    const difference = (this.restLength - distance) / distance
    const offset = delta.multiplyScalar(difference * this.stiffness * 0.5)

    const totalMass = this.v1.mass + this.v2.mass
    const m1 = this.v2.mass / totalMass
    const m2 = this.v1.mass / totalMass

    if (!this.v1.isFixed && !this.v1.pinned) {
      this.v1.position.sub(offset.clone().multiplyScalar(m1))
    }
    if (!this.v2.isFixed && !this.v2.pinned) {
      this.v2.position.add(offset.clone().multiplyScalar(m2))
    }
  }

  tear() {
    this.active = false
  }
}

export default function AdvancedClothSimulation({ 
  position = [0, 2, 0], 
  color = "#4080ff",
  showSphere = true,
  windIntensity = 1.0,
  enableTearing = false,
  ...props 
}) {
  const meshRef = useRef()
  const sphereRef = useRef()
  const vertices = useRef([])
  const constraints = useRef([])
  const sphere = useRef({ 
    position: new THREE.Vector3(0, 0, 0), 
    radius: 0.3,
    lastPosition: new THREE.Vector3(0, 0, 0)
  })
  const frameCount = useRef(0)
  const mouse = useRef({ x: 0, y: 0, isDown: false })
  
  // Initialize advanced cloth vertices and constraints
  const { positions, indices } = useMemo(() => {
    vertices.current = []
    constraints.current = []
    
    // Create vertices with varying mass
    for (let y = 0; y <= CLOTH_SEGMENTS_Y; y++) {
      for (let x = 0; x <= CLOTH_SEGMENTS_X; x++) {
        const posX = (x / CLOTH_SEGMENTS_X - 0.5) * CLOTH_WIDTH
        const posY = 0
        const posZ = (y / CLOTH_SEGMENTS_Y) * CLOTH_HEIGHT
        
        // Fix corner vertices and some edge vertices
        const isFixed = (y === 0) && (x === 0 || x === CLOTH_SEGMENTS_X || x % 6 === 0)
        
        const vertex = new AdvancedVerletVertex(posX, posY, posZ, isFixed)
        
        // Vary mass slightly for more realistic movement
        vertex.mass = 0.8 + Math.random() * 0.4
        
        vertices.current.push(vertex)
      }
    }
    
    // Create constraints with different stiffness
    for (let y = 0; y <= CLOTH_SEGMENTS_Y; y++) {
      for (let x = 0; x <= CLOTH_SEGMENTS_X; x++) {
        const index = y * (CLOTH_SEGMENTS_X + 1) + x
        
        // Structural constraints (strong)
        if (x < CLOTH_SEGMENTS_X) {
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index],
            vertices.current[index + 1],
            STIFFNESS
          ))
        }
        
        if (y < CLOTH_SEGMENTS_Y) {
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index],
            vertices.current[index + CLOTH_SEGMENTS_X + 1],
            STIFFNESS
          ))
        }
        
        // Shear constraints (medium strength)
        if (x < CLOTH_SEGMENTS_X && y < CLOTH_SEGMENTS_Y) {
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index],
            vertices.current[index + CLOTH_SEGMENTS_X + 2],
            STIFFNESS * 0.8
          ))
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index + 1],
            vertices.current[index + CLOTH_SEGMENTS_X + 1],
            STIFFNESS * 0.8
          ))
        }
        
        // Bend constraints (weaker for flexibility)
        if (x < CLOTH_SEGMENTS_X - 1) {
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index],
            vertices.current[index + 2],
            STIFFNESS * 0.3
          ))
        }
        
        if (y < CLOTH_SEGMENTS_Y - 1) {
          constraints.current.push(new AdvancedVerletConstraint(
            vertices.current[index],
            vertices.current[index + (CLOTH_SEGMENTS_X + 1) * 2],
            STIFFNESS * 0.3
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
  
  // Mouse interaction
  useEffect(() => {
    const handleMouseMove = (event) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1
    }
    
    const handleMouseDown = () => {
      mouse.current.isDown = true
    }
    
    const handleMouseUp = () => {
      mouse.current.isDown = false
    }
    
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])
  
  // Advanced animation loop
  useFrame((state, deltaTime) => {
    if (!meshRef.current) return
    
    frameCount.current++
    const time = state.clock.elapsedTime
    
    // Update sphere position with more complex motion
    sphere.current.lastPosition.copy(sphere.current.position)
    sphere.current.position.set(
      Math.sin(time * 1.2) * 0.8 + Math.cos(time * 0.7) * 0.3,
      -0.2 + Math.sin(time * 0.8) * 0.5 + Math.cos(time * 1.5) * 0.2,
      Math.cos(time * 0.9) * 0.6 + Math.sin(time * 1.8) * 0.2
    )
    
    // Update sphere mesh position
    if (sphereRef.current && showSphere) {
      sphereRef.current.position.copy(sphere.current.position)
    }
    
    // Apply forces
    vertices.current.forEach((vertex, i) => {
      if (vertex.isFixed || vertex.pinned) return
      
      // Gravity
      vertex.addForce(new THREE.Vector3(0, GRAVITY, 0))
      
      // Enhanced wind simulation
      const windTime = time * 0.3
      const noiseX = Math.sin(windTime * 2.1 + vertex.position.x * 4) * 
                     Math.cos(windTime * 1.7 + vertex.position.z * 3)
      const noiseY = Math.sin(windTime * 1.3 + vertex.position.y * 5) * 
                     Math.cos(windTime * 2.4 + vertex.position.x * 2)
      const noiseZ = Math.cos(windTime * 1.8 + vertex.position.z * 2.5) * 
                     Math.sin(windTime * 3.1 + vertex.position.y * 1.5)
      
      const windForce = new THREE.Vector3(
        noiseX * WIND_STRENGTH * windIntensity,
        noiseY * WIND_STRENGTH * windIntensity * 0.3,
        noiseZ * WIND_STRENGTH * windIntensity * 0.8
      )
      vertex.addForce(windForce)
      
      // Sphere collision with velocity-based response
      if (showSphere) {
        const toSphere = vertex.position.clone().sub(sphere.current.position)
        const distance = toSphere.length()
        const minDistance = sphere.current.radius + 0.08
        
        if (distance < minDistance && distance > 0) {
          // Position correction
          const correction = toSphere.normalize().multiplyScalar(minDistance - distance)
          vertex.position.add(correction)
          
          // Velocity damping for bounce effect
          const velocity = vertex.position.clone().sub(vertex.oldPosition)
          const normal = toSphere.normalize()
          const velocityAlongNormal = velocity.dot(normal)
          
          if (velocityAlongNormal < 0) {
            const bounce = normal.multiplyScalar(velocityAlongNormal * -1.5)
            vertex.oldPosition.sub(bounce)
          }
        }
      }
      
      // Simple self-collision (performance expensive, so simplified)
      if (frameCount.current % 3 === 0) {
        for (let j = i + 10; j < vertices.current.length; j += 15) {
          const other = vertices.current[j]
          const distance = vertex.position.distanceTo(other.position)
          if (distance < 0.1 && distance > 0) {
            const separation = vertex.position.clone().sub(other.position)
            separation.normalize().multiplyScalar((0.1 - distance) * 0.5)
            vertex.position.add(separation)
            other.position.sub(separation)
          }
        }
      }
    })
    
    // Update vertices
    vertices.current.forEach(vertex => vertex.update(deltaTime))
    
    // Satisfy constraints with relaxation
    const iterations = 5
    for (let i = 0; i < iterations; i++) {
      constraints.current.forEach(constraint => {
        if (constraint.active) {
          constraint.satisfy()
        }
      })
    }
    
    // Tear constraints if enabled
    if (enableTearing && frameCount.current % 60 === 0) {
      constraints.current.forEach(constraint => {
        if (!constraint.active) return
        
        const distance = constraint.v1.position.distanceTo(constraint.v2.position)
        if (distance > constraint.restLength * 2.5) {
          constraint.tear()
        }
      })
    }
    
    // Update geometry positions
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
      {/* Advanced cloth mesh */}
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
          opacity={0.9}
          roughness={0.1}
          metalness={0.0}
          sheen={1.2}
          sheenRoughness={0.3}
          sheenColor="#ffffff"
          transmission={0.15}
          thickness={0.2}
          clearcoat={0.3}
          clearcoatRoughness={0.1}
        />
      </mesh>
      
      {/* Enhanced sphere obstacle */}
      {showSphere && (
        <mesh ref={sphereRef} castShadow>
          <sphereGeometry args={[sphere.current.radius, 20, 20]} />
          <meshPhysicalMaterial 
            color="#ff6040" 
            metalness={0.6} 
            roughness={0.2}
            clearcoat={1.0}
            clearcoatRoughness={0.1}
          />
        </mesh>
      )}
      
      {/* Fixed points visualization */}
      {vertices.current
        .filter(vertex => vertex.isFixed)
        .map((vertex, index) => (
          <mesh key={index} position={[vertex.position.x, vertex.position.y, vertex.position.z]}>
            <sphereGeometry args={[0.025, 8, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}
    </group>
  )
}
