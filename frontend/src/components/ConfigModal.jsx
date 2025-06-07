import { useState, useEffect } from 'react'
import { useReleasor } from '../context/ReleasorContext'

export default function ConfigModal() {
  const { isConfigModalOpen, config, actions } = useReleasor()
  const [configText, setConfigText] = useState('')

  useEffect(() => {
    if (config && isConfigModalOpen) {
      setConfigText(JSON.stringify(config, null, 2))
    }
  }, [config, isConfigModalOpen])

  const handleSave = async () => {
    try {
      const newConfig = JSON.parse(configText)
      await actions.updateConfig(newConfig)
      actions.setConfigModal(false)
    } catch (error) {
      alert(`Invalid JSON: ${error.message}`)
    }
  }

  const handleClose = () => {
    actions.setConfigModal(false)
  }

  if (!isConfigModalOpen) return null

  return (
    <div 
      data-testid="config-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        width: '80%',
        maxWidth: '800px',
        maxHeight: '80%',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #334155'
        }}>
          <h3 style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#f1f5f9',
            margin: 0
          }}>
            ⚙️ Configuration
          </h3>
          <button 
            data-testid="close-config"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '24px',
              cursor: 'pointer',
              padding: 0,
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
          <textarea
            value={configText}
            onChange={(e) => setConfigText(e.target.value)}
            style={{
              width: '100%',
              height: '400px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '15px',
              color: '#e2e8f0',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            placeholder="Configuration JSON will load here..."
          />
        </div>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          padding: '20px',
          borderTop: '1px solid #334155'
        }}>
          <button 
            onClick={handleSave}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              background: '#3b82f6',
              color: 'white'
            }}
          >
            💾 Save Configuration
          </button>
          <button 
            onClick={handleClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              background: '#6b7280',
              color: 'white'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
} 