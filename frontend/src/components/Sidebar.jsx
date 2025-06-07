import { useReleasor } from '../context/ReleasorContext'

const navItems = [
  { id: 'logs', icon: '📄', label: 'Logs' },
  { id: 'testing', icon: '🧪', label: 'Testing' },
  { id: 'database', icon: '🗄️', label: 'Database' },
  { id: 'system', icon: '🖥️', label: 'System' }
]

export default function Sidebar() {
  const { currentSection, actions } = useReleasor()

  const handleSectionClick = (sectionId) => {
    actions.setCurrentSection(sectionId)
  }

  return (
    <nav 
      data-testid="sidebar"
      style={{
        gridArea: 'sidebar',
        background: '#1e293b',
        borderRight: '1px solid #334155',
        padding: '20px 0'
      }}
    >
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {navItems.map(item => (
          <li 
            key={item.id}
            data-testid={`nav-${item.id}`}
            onClick={() => handleSectionClick(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 20px',
              cursor: 'pointer',
              borderLeft: `3px solid ${currentSection === item.id ? '#3b82f6' : 'transparent'}`,
              background: currentSection === item.id ? '#1e40af' : 'transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentSection !== item.id) {
                e.target.style.background = '#334155'
              }
            }}
            onMouseLeave={(e) => {
              if (currentSection !== item.id) {
                e.target.style.background = 'transparent'
              }
            }}
          >
            <span style={{ fontSize: '16px', width: '20px' }}>{item.icon}</span>
            <span style={{ fontWeight: '500' }}>{item.label}</span>
          </li>
        ))}
      </ul>
    </nav>
  )
} 