import { useReleasor } from '../context/ReleasorContext'

export default function Header() {
  const { currentEnvironment, actions } = useReleasor()

  const handleEnvironmentChange = () => {
    const newEnvironment = currentEnvironment === 'development' ? 'production' : 'development';
    actions.setEnvironment(newEnvironment);
  }

  const openConfigModal = () => {
    actions.setConfigModal(true)
  }

  return (
    <header style={{ 
      gridArea: 'header', 
      background: '#1e293b', 
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      justifyContent: 'space-between'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{ color: '#3b82f6', fontSize: '24px' }}>🚀</div>
        <h1 style={{ fontSize: '20px', fontWeight: '600', color: '#f1f5f9', margin: 0 }}>
          Releasor
        </h1>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {/* Environment Toggle Switch */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          fontSize: '14px',
          color: '#e2e8f0'
        }}>
          <span style={{ 
            opacity: currentEnvironment === 'development' ? 1 : 0.5,
            fontWeight: currentEnvironment === 'development' ? '600' : '400',
            transition: 'all 0.2s ease'
          }}>
            Dev
          </span>
          
          <div 
            onClick={handleEnvironmentChange}
            style={{
              width: '50px',
              height: '24px',
              backgroundColor: currentEnvironment === 'production' ? '#22c55e' : '#475569',
              borderRadius: '12px',
              position: 'relative',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              border: '2px solid ' + (currentEnvironment === 'production' ? '#16a34a' : '#64748b'),
              boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{
              width: '18px',
              height: '18px',
              backgroundColor: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '1px',
              left: currentEnvironment === 'production' ? '29px' : '1px',
              transition: 'all 0.3s ease',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
            }} />
          </div>
          
          <span style={{ 
            opacity: currentEnvironment === 'production' ? 1 : 0.5,
            fontWeight: currentEnvironment === 'production' ? '600' : '400',
            transition: 'all 0.2s ease'
          }}>
            Prod
          </span>
        </div>
        
        <button 
          data-testid="config-btn"
          onClick={openConfigModal}
          style={{
            background: '#334155',
            border: '1px solid #475569',
            color: '#e2e8f0',
            padding: '8px 10px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
          title="Configuration"
        >
          ⚙️
        </button>
      </div>
    </header>
  )
} 