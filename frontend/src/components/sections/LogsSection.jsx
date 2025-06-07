import { useState } from 'react'
import { useReleasor } from '../../context/ReleasorContext'

export default function LogsSection() {
  const { actions, activeStreams, currentEnvironment } = useReleasor()
  const [selectedSource, setSelectedSource] = useState('backend')
  const [logOutput, setLogOutput] = useState('')

  const isStreaming = activeStreams.size > 0

  const startLogStream = async () => {
    try {
      const commandKey = `logs.${currentEnvironment}.${selectedSource}`
      await actions.startCommandStream(commandKey)
      setLogOutput('')
    } catch (error) {
      console.error('Failed to start log stream:', error)
    }
  }

  const stopLogStream = async () => {
    try {
      for (const streamId of activeStreams.keys()) {
        await actions.stopCommandStream(streamId)
      }
    } catch (error) {
      console.error('Failed to stop log stream:', error)
    }
  }

  return (
    <div data-testid="logs-section">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: '1px solid #334155'
      }}>
        <h2 style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '24px',
          color: '#f1f5f9',
          margin: 0
        }}>
          📄 Log Monitoring
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select 
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            style={{
              background: '#334155',
              color: '#e2e8f0',
              border: '1px solid #475569',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px'
            }}
          >
            <option value="backend">Backend</option>
            <option value="frontend">Frontend</option>
            <option value="database">Database</option>
          </select>
          
          <button 
            onClick={startLogStream}
            disabled={isStreaming}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isStreaming ? 'not-allowed' : 'pointer',
              background: isStreaming ? '#6b7280' : '#3b82f6',
              color: 'white',
              opacity: isStreaming ? 0.5 : 1
            }}
          >
            ▶️ Start Stream
          </button>
          
          <button 
            onClick={stopLogStream}
            disabled={!isStreaming}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: !isStreaming ? 'not-allowed' : 'pointer',
              background: !isStreaming ? '#6b7280' : '#6b7280',
              color: 'white',
              opacity: !isStreaming ? 0.5 : 1
            }}
          >
            ⏹️ Stop Stream
          </button>
        </div>
      </div>
      
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        height: 'calc(100vh - 200px)',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          overflowY: 'auto',
          padding: '15px',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '13px',
          lineHeight: '1.4',
          whiteSpace: 'pre-wrap'
        }}>
          {logOutput || (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              {isStreaming ? 'Streaming logs...' : 'No logs. Click "Start Stream" to begin monitoring.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 