import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'

import EightWallBridge from './EighthWallBridge'
import ErrorBoundary from '../components/ErrorBoundary'
import ClothControls from './components/ClothControls'

import Scene from './Scene'

function App() {
  const [clothSettings, setClothSettings] = useState({
    windIntensity: 1.0,
    showSphere: true,
    color: "#4080ff",
    clothType: "basic",
    enableTearing: false
  })
  const [resetKey, setResetKey] = useState(0)

  const handleWindChange = (value) => {
    setClothSettings(prev => ({ ...prev, windIntensity: value }))
  }

  const handleSphereToggle = (value) => {
    setClothSettings(prev => ({ ...prev, showSphere: value }))
  }

  const handleColorChange = (value) => {
    setClothSettings(prev => ({ ...prev, color: value }))
  }

  const handleClothTypeChange = (value) => {
    setClothSettings(prev => ({ ...prev, clothType: value }))
    setResetKey(prev => prev + 1) // Reset when changing cloth type
  }

  const handleTearingToggle = (value) => {
    setClothSettings(prev => ({ ...prev, enableTearing: value }))
  }

  const handleReset = () => {
    setResetKey(prev => prev + 1)
    setClothSettings(prev => ({
      ...prev,
      windIntensity: 1.0,
      showSphere: true,
      color: "#4080ff"
    }))
  }

  return (
    <ErrorBoundary>
      <Canvas shadows>
        <EightWallBridge>
          <Suspense fallback={'loading...'}>
            <Scene clothSettings={clothSettings} resetKey={resetKey} />
          </Suspense>
        </EightWallBridge>
      </Canvas>
      
      {/* Control Panel - Outside of Canvas */}
      <ClothControls
        windIntensity={clothSettings.windIntensity}
        showSphere={clothSettings.showSphere}
        color={clothSettings.color}
        clothType={clothSettings.clothType}
        enableTearing={clothSettings.enableTearing}
        onWindChange={handleWindChange}
        onShowSphere={handleSphereToggle}
        onColorChange={handleColorChange}
        onClothTypeChange={handleClothTypeChange}
        onTearingToggle={handleTearingToggle}
        onReset={handleReset}
      />
    </ErrorBoundary>
  )
}

export default App
