import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

import EightWallBridge from './EighthWallBridge'
import ErrorBoundary from '../components/ErrorBoundary'

import Scene from './Scene'

function App() {
  return (
    <ErrorBoundary>
      <Canvas shadows>
        <EightWallBridge>
          <Suspense fallback={'loading...'}>
            <Scene />
          </Suspense>
        </EightWallBridge>
      </Canvas>
    </ErrorBoundary>
  )
}

export default App
