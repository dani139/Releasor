import { useReleasor } from '../context/ReleasorContext'
import ServicesSection from './sections/LogsSection'
import DeploymentSection from './sections/DeploymentSection'
import TestingSection from './sections/TestingSection'
import DatabaseSection from './sections/DatabaseSection'
import SystemSection from './sections/SystemSection'

export default function MainContent() {
  const { currentSection } = useReleasor()

  const renderSection = () => {
    switch (currentSection) {
      case 'logs':
        return <ServicesSection />
      case 'deployment':
        return <DeploymentSection />
      case 'testing':
        return <TestingSection />
      case 'database':
        return <DatabaseSection />
      case 'system':
        return <SystemSection />
      default:
        return <ServicesSection />
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