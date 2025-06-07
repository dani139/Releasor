import { useState, useEffect } from 'react'
import './App.css'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import ConfigModal from './components/ConfigModal'
import LoadingOverlay from './components/LoadingOverlay'
import { ReleasorProvider } from './context/ReleasorContext'

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  useEffect(() => {
    // Set document title
    document.title = 'Releasor - Monitoring Dashboard'
    
    // Apply dark mode class
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return (
    <ReleasorProvider>
      <div data-testid="app" className="app">
        <Header />
        <Sidebar />
        <MainContent />
        <ConfigModal />
        <LoadingOverlay />
      </div>
    </ReleasorProvider>
  )
}

export default App
