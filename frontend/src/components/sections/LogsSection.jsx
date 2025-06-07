import { useState, useEffect } from 'react'
import { useReleasor } from '../../context/ReleasorContext'

export default function LogsSection() {
  const { actions, activeStreams, currentEnvironment } = useReleasor()
  const [selectedSource, setSelectedSource] = useState('backend')
  const [logOutput, setLogOutput] = useState('')
  const [serviceStatus, setServiceStatus] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)

  const isStreaming = activeStreams.size > 0

  // Available log sources based on environment
  const logSources = {
    development: [
      { value: 'backend', label: 'Backend (Live)', command: 'backend' },
      { value: 'backend_tail', label: 'Backend (Last 100)', command: 'backend_tail' },
      { value: 'wuzapi', label: 'WuzAPI (Live)', command: 'wuzapi' },
      { value: 'wuzapi_tail', label: 'WuzAPI (Last 50)', command: 'wuzapi_tail' },
      { value: 'all_services', label: 'All Services (Live)', command: 'all_services' }
    ],
    production: [
      { value: 'backend', label: 'Backend (Live)', command: 'backend' },
      { value: 'wuzapi', label: 'WuzAPI (Last 50)', command: 'wuzapi' },
      { value: 'all_services', label: 'All Services (Live)', command: 'all_services' }
    ]
  }

  const currentSources = logSources[currentEnvironment] || logSources.development

  useEffect(() => {
    // Reset selected source when environment changes
    setSelectedSource(currentSources[0]?.value || 'backend')
    checkServiceStatus()
  }, [currentEnvironment])

  useEffect(() => {
    // Listen for stream events
    const handleStreamData = (event) => {
      const { data } = event.detail
      if (data && data.data) {
        const timestamp = new Date(data.timestamp).toLocaleTimeString()
        const logLine = `[${timestamp}] ${data.data}`
        setLogOutput(prev => prev + logLine)
      }
    }

    const handleStreamEnd = () => {
      setLogOutput(prev => prev + '\n--- Stream ended ---\n')
    }

    const handleStreamError = (event) => {
      const { error } = event.detail
      setLogOutput(prev => prev + `\n--- Stream error: ${error} ---\n`)
    }

    window.addEventListener('stream-data', handleStreamData)
    window.addEventListener('stream-end', handleStreamEnd)
    window.addEventListener('stream-error', handleStreamError)

    return () => {
      window.removeEventListener('stream-data', handleStreamData)
      window.removeEventListener('stream-end', handleStreamEnd)
      window.removeEventListener('stream-error', handleStreamError)
    }
  }, [])

  const checkServiceStatus = async () => {
    setStatusLoading(true)
    try {
      const result = await actions.executeCommand(`status.${currentEnvironment}.docker_status`)
      setServiceStatus(result.stdout || result.stderr || 'Status check completed')
    } catch (error) {
      setServiceStatus(`Error checking status: ${error.message}`)
    } finally {
      setStatusLoading(false)
    }
  }

  const startLogStream = async () => {
    try {
      const commandKey = `logs.${currentEnvironment}.${selectedSource}`
      await actions.startCommandStream(commandKey)
      setLogOutput('')
    } catch (error) {
      console.error('Failed to start log stream:', error)
      setLogOutput(`Error starting stream: ${error.message}\n`)
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
          📄 Log Monitoring ({currentEnvironment})
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
              fontSize: '14px',
              minWidth: '180px'
            }}
          >
            {currentSources.map(source => (
              <option key={source.value} value={source.value}>
                {source.label}
              </option>
            ))}
          </select>
          
          <button 
            onClick={checkServiceStatus}
            disabled={statusLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: statusLoading ? 'not-allowed' : 'pointer',
              background: statusLoading ? '#6b7280' : '#10b981',
              color: 'white',
              opacity: statusLoading ? 0.5 : 1
            }}
          >
            {statusLoading ? '🔄' : '📊'} Status
          </button>
          
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
              background: !isStreaming ? '#6b7280' : '#ef4444',
              color: 'white',
              opacity: !isStreaming ? 0.5 : 1
            }}
          >
            ⏹️ Stop Stream
          </button>
        </div>
      </div>

      {/* Status Panel */}
      {serviceStatus && (
        <div style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '13px',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          <div style={{ color: '#10b981', fontWeight: 'bold', marginBottom: '10px' }}>
            📊 Service Status ({currentEnvironment}):
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {serviceStatus}
          </pre>
        </div>
      )}
      
      {/* Log Output */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        height: serviceStatus ? 'calc(100vh - 350px)' : 'calc(100vh - 200px)',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#334155',
          padding: '10px 15px',
          borderBottom: '1px solid #475569',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#f1f5f9', fontWeight: '500' }}>
            📄 Live Logs: {currentSources.find(s => s.value === selectedSource)?.label || selectedSource}
          </span>
          {isStreaming && (
            <span style={{ color: '#10b981', fontSize: '12px' }}>
              🟢 Streaming...
            </span>
          )}
        </div>
        <div style={{
          height: 'calc(100% - 50px)',
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