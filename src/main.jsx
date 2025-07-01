import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Experience from './experience'
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/one" element={<Experience />} />
        <Route path="/" element={<Navigate to="/one" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)