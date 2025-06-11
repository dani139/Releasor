import { useState, useEffect } from 'react'
import { useReleasor } from '../context/ReleasorContext'

export default function ConfigModal() {
  const { isConfigModalOpen, config, actions } = useReleasor()
  const [configText, setConfigText] = useState('')
  const [showHelp, setShowHelp] = useState(false)

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
        width: '90%',
        maxWidth: '1000px',
        maxHeight: '90%',
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              onClick={() => setShowHelp(!showHelp)}
              style={{
                background: showHelp ? '#3b82f6' : '#475569',
                border: 'none',
                color: 'white',
                fontSize: '12px',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showHelp ? 'Hide Help' : 'Docker Help'}
            </button>
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
        </div>
        
        <div style={{ 
          flex: 1, 
          padding: '20px', 
          overflowY: 'auto',
          display: 'flex',
          gap: '20px'
        }}>
          <div style={{ flex: 1 }}>
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              style={{
                width: '100%',
                height: '450px',
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
          
          {showHelp && (
            <div style={{
              width: '350px',
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '20px',
              color: '#e2e8f0',
              fontSize: '13px',
              lineHeight: '1.5',
              overflowY: 'auto'
            }}>
              <h4 style={{ 
                color: '#3b82f6', 
                margin: '0 0 15px 0',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                🐳 Docker Naming Guide
              </h4>
              
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  background: '#1e293b',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  <strong style={{ color: '#10b981' }}>Service Name</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Used in docker-compose.yml under <code>services:</code>
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    color: '#fbbf24',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}>
                    Example: "backend"
                  </div>
                </div>
                
                <div style={{
                  background: '#1e293b',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  <strong style={{ color: '#3b82f6' }}>Container Name</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Defined by <code>container_name:</code> in compose file
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    color: '#fbbf24',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}>
                    Example: "backend" or "my-app-backend"
                  </div>
                </div>
                
                <div style={{
                  background: '#1e293b',
                  padding: '12px',
                  borderRadius: '4px',
                  marginBottom: '12px'
                }}>
                  <strong style={{ color: '#f59e0b' }}>Image Name</strong>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                    Auto-generated: project-servicename
                  </div>
                  <div style={{ 
                    fontFamily: 'monospace', 
                    color: '#fbbf24',
                    fontSize: '12px',
                    marginTop: '4px'
                  }}>
                    Example: "chatwithoats-backend"
                  </div>
                </div>
              </div>
              
              <div style={{ 
                background: '#065f46', 
                padding: '12px', 
                borderRadius: '4px',
                marginBottom: '15px'
              }}>
                <div style={{ color: '#10b981', fontWeight: '600', marginBottom: '6px' }}>
                  ✅ For Networking:
                </div>
                <div style={{ fontSize: '12px' }}>
                  Always use <strong>service name</strong> or <strong>container name</strong>
                </div>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '11px',
                  color: '#6ee7b7',
                  marginTop: '4px'
                }}>
                  http://backend:8000/api
                </div>
              </div>
              
              <div style={{ marginBottom: '15px' }}>
                <strong style={{ color: '#e2e8f0', fontSize: '13px' }}>Container Configuration:</strong>
                <pre style={{
                  background: '#1e293b',
                  padding: '10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  color: '#94a3b8',
                  marginTop: '8px',
                  overflow: 'auto'
                }}>
{`{
  "name": "backend",         // Container name
  "displayName": "Backend API", // UI display
  "service": "backend",      // Service name
  "image": "project-backend" // Image name (optional)
}`}
                </pre>
              </div>
              
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                <strong>Note:</strong> Image names are only relevant for Docker image management, 
                not for service communication.
              </div>
            </div>
          )}
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