import { useReleasor } from '../context/ReleasorContext'

export default function Header() {
  const { currentEnvironment, actions } = useReleasor()

  const handleEnvironmentChange = (e) => {
    actions.setEnvironment(e.target.value)
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
        <select 
          value={currentEnvironment} 
          onChange={handleEnvironmentChange}
          style={{
            background: '#334155',
            color: '#e2e8f0',
            border: '1px solid #475569',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '14px'
          }}
        >
          <option value="development">Development</option>
          <option value="production">Production</option>
        </select>
        
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