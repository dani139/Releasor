import { useState, useEffect } from 'react'
import { useReleasor } from '../../context/ReleasorContext'

export default function LogsSection() {
  const { actions, activeStreams, currentEnvironment } = useReleasor()
  const [selectedService, setSelectedService] = useState('')
  const [logOutput, setLogOutput] = useState('')
  const [serviceStatus, setServiceStatus] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [availableServices, setAvailableServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)

  const isStreaming = activeStreams.size > 0

  // Detect available services when environment changes
  useEffect(() => {
    detectAvailableServices()
  }, [currentEnvironment])

  // Auto-start streaming when service is selected
  useEffect(() => {
    if (selectedService && !isStreaming) {
      startLogStream()
    }
  }, [selectedService])

  // Listen for stream events
  useEffect(() => {
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

  const detectAvailableServices = async () => {
    setServicesLoading(true)
    try {
      const result = await actions.executeCommand(`status.${currentEnvironment}.list_containers`)
      const services = result.stdout
        .split('\n')
        .filter(service => service.trim() !== '')
        .map(service => service.trim())
      
      setAvailableServices(services)
      if (services.length > 0 && !selectedService) {
        setSelectedService(services[0])
      }
    } catch (error) {
      console.error('Failed to detect services:', error)
      setAvailableServices(['backend', 'wuzapi']) // Fallback services
      if (!selectedService) {
        setSelectedService('backend')
      }
    } finally {
      setServicesLoading(false)
    }
  }

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
    if (!selectedService) return
    
    try {
      // Stop any existing streams first
      if (isStreaming) {
        await stopLogStream()
      }
      
      // Create dynamic command for the selected service
      const command = currentEnvironment === 'production' 
        ? `ssh -i aws_key.pem -o StrictHostKeyChecking=no ec2-user@51.84.91.162 "cd /home/ec2-user/chatwithoats && docker compose -f docker-compose.prod.yml logs ${selectedService} -f --tail=100"`
        : `docker compose -f docker-compose.dev.yml logs ${selectedService} -f`
      
      // Execute dynamic log streaming
      await actions.startDynamicCommandStream(command, `logs_${selectedService}`)
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

  const handleServiceChange = async (newService) => {
    if (isStreaming) {
      await stopLogStream()
    }
    setSelectedService(newService)
    setLogOutput('')
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
          📄 {currentEnvironment === 'production' ? '🔴 Production' : '🟢 Development'} Logs
        </h2>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            onClick={detectAvailableServices}
            disabled={servicesLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: servicesLoading ? 'not-allowed' : 'pointer',
              background: servicesLoading ? '#6b7280' : '#8b5cf6',
              color: 'white',
              opacity: servicesLoading ? 0.5 : 1
            }}
          >
            {servicesLoading ? '🔄' : '🔍'} Detect Services
          </button>
          
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

      {/* Service Selection */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '20px',
        alignItems: 'center'
      }}>
        <span style={{ color: '#e2e8f0', fontWeight: '500' }}>
          Service:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {availableServices.map(service => (
            <button
              key={service}
              onClick={() => handleServiceChange(service)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                background: selectedService === service ? '#3b82f6' : '#334155',
                color: 'white',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedService !== service) {
                  e.target.style.background = '#475569'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedService !== service) {
                  e.target.style.background = '#334155'
                }
              }}
            >
              {service} {selectedService === service && isStreaming && '🟢'}
            </button>
          ))}
        </div>
        {servicesLoading && (
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            Detecting services...
          </span>
        )}
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
        height: serviceStatus ? 'calc(100vh - 400px)' : 'calc(100vh - 280px)',
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
            📄 Live Logs: {selectedService || 'No service selected'}
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
              {isStreaming ? 'Streaming logs...' : 
               selectedService ? 'Select a service to start streaming logs.' : 
               'Detecting available services...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 