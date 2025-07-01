import { useThree, useFrame, createPortal } from '@react-three/fiber'
import { useEffect, memo, useCallback, useState, useRef } from 'react'
import * as THREE from 'three'

// Separate component for AR content
const ARContent = memo(({ children }) => {
  const xrScene = window.XR8?.Threejs?.xrScene()
  const { scene, camera } = xrScene || {}
  const set = useThree((state) => state.set)

  useEffect(() => {
    if (camera) {
      set({ camera })
    }
  }, [camera, set])

  useFrame(() => {
    if (scene && xrScene) {
      // Ensure the background color is updated every frame
      const { renderer } = xrScene
      if (renderer && scene.background) {
        renderer.setClearColor(scene.background)
      }
    }
  })

  if (!scene) return null
  return createPortal(children, scene)
})

// Main bridge component
const EightWallBridge = memo(({ children }) => {
  const gl = useThree((state) => state.gl)
  const [xr8Ready, setXr8Ready] = useState(false)
  const [error, setError] = useState(null)
  const initialized = useRef(false)
  const cleanupRef = useRef(null)

  const setupScene = useCallback(({ camera, renderer }) => {
    try {
      // Enhanced shadow configuration
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      
      // Updated for modern THREE.js
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1

      // Safe performance optimizations
      if (renderer.info) {
        renderer.info.autoReset = false
      }
      renderer.powerPreference = 'high-performance'

      // Camera setup
      camera.near = 0.1
      camera.far = 100
      camera.updateProjectionMatrix()
      camera.position.set(0, 3, 4)
    } catch (err) {
      console.error('Error setting up scene:', err)
      setError(err)
    }
  }, [])

  const initScenePipelineModule = useCallback(() => {
    return {
      name: 'threejsinitscene',
      onStart: ({ canvas }) => {
        try {
          const xrScene = window.XR8?.Threejs?.xrScene()
          if (!xrScene) {
            throw new Error('XR8 scene not available')
          }
          
          const { camera, renderer } = xrScene
          setupScene({ camera, renderer })

          // Touch event handlers
          const handleTouchMove = (event) => event.preventDefault()
          const handleTouchStart = (e) => {
            if (e.touches.length === 1) {
              window.XR8?.XrController?.recenter()
            }
          }

          // Add event listeners
          canvas.addEventListener('touchmove', handleTouchMove, {
            passive: false,
          })
          canvas.addEventListener('touchstart', handleTouchStart, {
            passive: true,
          })

          // Sync camera parameters
          if (window.XR8?.XrController?.updateCameraProjectionMatrix) {
            window.XR8.XrController.updateCameraProjectionMatrix({
              origin: camera.position,
              facing: camera.quaternion,
            })
          }

          camera.userData.ready = true
          setXr8Ready(true)

          // Store cleanup function
          cleanupRef.current = () => {
            canvas.removeEventListener('touchmove', handleTouchMove)
            canvas.removeEventListener('touchstart', handleTouchStart)
          }

          return cleanupRef.current
        } catch (err) {
          console.error('Error in pipeline module:', err)
          setError(err)
        }
      },
    }
  }, [setupScene])

  useEffect(() => {
    const initXR = async () => {
      if (!window.XR8 || initialized.current) return
      
      try {
        initialized.current = true

        const canvas = gl.domElement
        window.THREE = THREE

        // Clear any existing pipeline modules
        if (window.XR8.clearCameraPipelineModules) {
          window.XR8.clearCameraPipelineModules()
        }

        // Pipeline modules configuration
        const pipelineModules = [
          window.XR8.GlTextureRenderer?.pipelineModule(),
          window.XR8.Threejs?.pipelineModule(),
          window.XR8.XrController?.pipelineModule(),
          window.XRExtras?.FullWindowCanvas?.pipelineModule(),
          window.XRExtras?.Loading?.pipelineModule(),
          window.XRExtras?.RuntimeError?.pipelineModule(),
          initScenePipelineModule(),
        ].filter(Boolean) // Remove any undefined modules

        window.XR8.addCameraPipelineModules(pipelineModules)

        // Start XR with optimized configuration
        await window.XR8.run({
          canvas,
          disableWorldTracking: false,
          allowedDevices: window.XR8.XrConfig?.device()?.ANY || 'any',
        })
      } catch (err) {
        console.error('Failed to initialize XR8:', err)
        setError(err)
        initialized.current = false
      }
    }

    // Wait for XR8 to be available
    if (window.XR8) {
      initXR()
    } else {
      const handleXRLoaded = () => initXR()
      window.addEventListener('xrloaded', handleXRLoaded)
      
      return () => {
        window.removeEventListener('xrloaded', handleXRLoaded)
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
      if (window.XR8?.stop) {
        window.XR8.stop()
      }
      initialized.current = false
      setXr8Ready(false)
    }
  }, [gl.domElement, initScenePipelineModule])

  // Disable R3F rendering loop since 8th Wall handles it
  useFrame(() => null, 1)

  // Error boundary-like behavior
  if (error) {
    console.error('EightWallBridge Error:', error)
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="red" />
      </mesh>
    )
  }

  if (!xr8Ready) return null

  return <ARContent>{children}</ARContent>
})

export default EightWallBridge
