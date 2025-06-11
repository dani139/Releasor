import { useReleasor } from '../context/ReleasorContext'
import ServicesSection from './sections/LogsSection'
import DeploymentSection from './sections/DeploymentSection'
import TestingSection from './sections/TestingSection'
import DatabaseSection from './sections/DatabaseSection'
import SystemSection from './sections/SystemSection'
import ErrorBoundary from './ErrorBoundary'

export default function MainContent() {
  const { currentSection } = useReleasor()

  const renderSection = () => {
    switch (currentSection) {
      case 'logs':
        return <ErrorBoundary><ServicesSection /></ErrorBoundary>
      case 'deployment':
        return <ErrorBoundary><DeploymentSection /></ErrorBoundary>
      case 'testing':
        return <ErrorBoundary><TestingSection /></ErrorBoundary>
      case 'database':
        return <ErrorBoundary><DatabaseSection /></ErrorBoundary>
      case 'system':
        return <ErrorBoundary><SystemSection /></ErrorBoundary>
      default:
        return <ErrorBoundary><ServicesSection /></ErrorBoundary>
    }
  }

  return (
    <main style={{
      gridArea: 'main',
      background: '#0f172a',
      overflowY: 'auto',
      padding: '20px'
    }}>
      {renderSection()}
    </main>
  )
} 