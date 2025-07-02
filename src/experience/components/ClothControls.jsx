import React, { useState } from 'react'

export default function ClothControls({ 
  onWindChange, 
  onShowSphere, 
  onColorChange, 
  onReset,
  onClothTypeChange,
  onTearingToggle,
  onStiffnessChange,
  onDampingChange,
  onGravityChange,
  onWindDirectionChange,
  onWindTurbulenceChange,
  onClothSizeChange,
  windIntensity = 1.0,
  showSphere = true,
  color = "#4080ff",
  clothType = "basic",
  enableTearing = false,
  stiffness = 0.4,
  damping = 0.99,
  gravity = -0.0098,
  windDirection = { x: 1, z: 0.5 },
  windTurbulence = 1.0,
  clothSize = { width: 2, height: 2 }
}) {
  const [isOpen, setIsOpen] = useState(false)

  const handleColorChange = (event) => {
    onColorChange?.(event.target.value)
  }

  const handleWindChange = (event) => {
    onWindChange?.(parseFloat(event.target.value))
  }

  const handleSphereToggle = (event) => {
    onShowSphere?.(event.target.checked)
  }

  const handleClothTypeChange = (event) => {
    onClothTypeChange?.(event.target.value)
  }

  const handleTearingToggle = (event) => {
    onTearingToggle?.(event.target.checked)
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '10px 15px',
          cursor: 'pointer',
          fontSize: '14px',
          fontFamily: 'monospace'
        }}
      >
        {isOpen ? '✕' : '⚙️'} Cloth Controls
      </button>

      {/* Control panel */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: '70px',
            right: '20px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '20px',
            borderRadius: '8px',
            minWidth: '220px',
            zIndex: 1000,
            fontFamily: 'monospace',
            fontSize: '14px',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}
        >
          <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Cloth Simulation</h3>
          
          {/* Cloth Type Selection */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Simulation Type:
            </label>
            <select
              value={clothType}
              onChange={handleClothTypeChange}
              style={{
                width: '100%',
                padding: '5px',
                background: '#333',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px'
              }}
            >
              <option value="basic">Basic Cloth</option>
              <option value="advanced">Advanced Cloth</option>
            </select>
          </div>

          {/* Wind Control */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Wind Intensity: {windIntensity.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={windIntensity}
              onChange={handleWindChange}
              style={{ width: '100%' }}
            />
          </div>

          {/* Sphere Toggle */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={showSphere}
                onChange={handleSphereToggle}
              />
              Show Sphere Obstacle
            </label>
          </div>

          {/* Tearing Toggle (Advanced only) */}
          {clothType === 'advanced' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={enableTearing}
                  onChange={handleTearingToggle}
                />
                Enable Cloth Tearing
              </label>
            </div>
          )}

          {/* Color Picker */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              Cloth Color:
            </label>
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              style={{ width: '100%', height: '30px', border: 'none', borderRadius: '4px' }}
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={onReset}
            style={{
              width: '100%',
              padding: '8px',
              background: '#ff6040',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '15px'
            }}
          >
            Reset Simulation
          </button>

          <div style={{ fontSize: '12px', opacity: 0.7, lineHeight: '1.4' }}>
            <p><strong>Basic:</strong> Fast, simple cloth physics</p>
            <p><strong>Advanced:</strong> More realistic with self-collision and enhanced materials</p>
            <p>Use mouse to interact and orbit controls to move around!</p>
          </div>
        </div>
      )}
    </>
  )
}
