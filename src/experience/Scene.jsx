import React, { useState } from 'react'
import Lights from './Lights'
import Ground from './components/Ground'
import WobbleDonut from './components/WobbleDonut'
import SimpleIcosahedron from './components/SimpleIcosahedron'
import Character from './components/Character'
import Rock from './components/Rock'
import ClothSimulation from './components/ClothSimulation'
import AdvancedClothSimulation from './components/AdvancedClothSimulation'
import { Environment } from '@react-three/drei'

export default function Scene({ clothSettings, resetKey }) {
  const ClothComponent = clothSettings.clothType === "advanced"
    ? AdvancedClothSimulation
    : ClothSimulation

  return (
    <>
      {/* <color attach="background" args={['red']} /> */}
      <Environment preset="city" background={false} />

      <Lights />
      {/* <Character
        position={[1, 0, 0.5]}
        scale={[2, 2, 2]}
        rotation={[0, -Math.PI / 2, 0]}
      />
      <Rock position={[-1.1, 0, 0.5]} scale={[6, 10, 6]} />
      <WobbleDonut castShadow position={[-1.5, 4, -1.5]} />
      <SimpleIcosahedron castShadow position={[2, 0, -1.5]} args={[1, 0]} /> */}

      {/* Dynamic cloth component based on type */}
      <ClothComponent
        key={resetKey}
        position={[0, 3, 0]}
        windIntensity={clothSettings.windIntensity}
        showSphere={clothSettings.showSphere}
        color={clothSettings.color}
        enableTearing={clothSettings.enableTearing}
      />

      <Ground />
    </>
  )
}
