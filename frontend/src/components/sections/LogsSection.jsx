import { useState, useEffect, useRef } from 'react'
import { useReleasor } from '../../context/ReleasorContext'

export default function LogsSection() {
  const { actions, activeStreams, currentEnvironment } = useReleasor()
  const [selectedService, setSelectedService] = useState('')
  const [serviceType, setServiceType] = useState('docker') // 'docker' or 'frontend'
  const [logOutput, setLogOutput] = useState('')
  const [filteredLogOutput, setFilteredLogOutput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [serviceStatus, setServiceStatus] = useState('')
  const [statusLoading, setStatusLoading] = useState(false)
  const [availableServices, setAvailableServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(false)
  const logContainerRef = useRef(null)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)

  const isStreaming = activeStreams.size > 0

  // Filter logs based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredLogOutput(logOutput)
    } else {
      const filtered = logOutput
        .split('\n')
        .filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
        .join('\n')
      setFilteredLogOutput(filtered)
    }
  }, [logOutput, searchTerm])

  // Auto-scroll to bottom when filtered log output changes
  useEffect(() => {
    if (logContainerRef.current) {
      setIsAutoScrolling(true)
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
      
      // Clear the auto-scrolling indicator after a short delay
      const timeout = setTimeout(() => setIsAutoScrolling(false), 500)
      return () => clearTimeout(timeout)
    }
  }, [filteredLogOutput])

  // Auto-detect available services when environment changes
  useEffect(() => {
    if (serviceType === 'docker') {
      detectAvailableServices()
    } else {
      // For frontend, we have a fixed service
      setAvailableServices(['frontend'])
      setSelectedService('frontend')
    }
  }, [currentEnvironment, serviceType])

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
      setAvailableServices([])
    } finally {
      setServicesLoading(false)
    }
  }

  const checkServiceStatus = async () => {
    setStatusLoading(true)
    try {
      const commandKey = serviceType === 'docker' 
        ? `status.${currentEnvironment}.docker_status`
        : 'status.frontend.vercel_status'
      const result = await actions.executeCommand(commandKey)
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
      
      let command
      if (serviceType === 'frontend') {
        // For frontend, use Vercel logs command
        command = `cd /home/danil/Projects/chatwithoats && vercel logs --limit 100`
      } else {
        // For Docker services, use docker logs
        command = currentEnvironment === 'production' 
          ? `ssh -i aws_key.pem -o StrictHostKeyChecking=no ec2-user@51.84.91.162 "docker logs ${selectedService} -f --tail=100"`
          : `docker logs ${selectedService} -f --tail=100`
      }
      
      // Execute dynamic log streaming
      await actions.startDynamicCommandStream(command, `logs_${selectedService}`)
      setLogOutput('')
      setSearchTerm('') // Clear search when starting new stream
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
    setSearchTerm('') // Clear search when changing service
  }

  const handleServiceTypeChange = (newType) => {
    if (isStreaming) {
      stopLogStream()
    }
    setServiceType(newType)
    setSelectedService('')
    setLogOutput('')
    setSearchTerm('')
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
        </div>
      </div>

      {/* Service Type Selection */}
      <div style={{
        display: 'flex',
        gap: '10px',
        marginBottom: '15px',
        alignItems: 'center'
      }}>
        <span style={{ color: '#e2e8f0', fontWeight: '500' }}>
          Service Type:
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => handleServiceTypeChange('docker')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              background: serviceType === 'docker' ? '#3b82f6' : '#334155',
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            🐳 Docker Services
          </button>
          <button
            onClick={() => handleServiceTypeChange('frontend')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              background: serviceType === 'frontend' ? '#3b82f6' : '#334155',
              color: 'white',
              transition: 'all 0.2s'
            }}
          >
            ⚡ Frontend (Vercel)
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
          {serviceType === 'docker' ? 'Docker Container:' : 'Frontend Service:'}
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
              {serviceType === 'docker' ? `🐳 ${service}` : `⚡ ${service}`}
            </button>
          ))}
        </div>
        {servicesLoading && (
          <span style={{ color: '#6b7280', fontSize: '12px' }}>
            🔄 Auto-detecting services...
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
            📊 {serviceType === 'docker' ? 'Docker' : 'Frontend'} Status ({currentEnvironment}):
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {serviceStatus}
          </pre>
        </div>
      )}

      {/* Search Bar */}
      <div style={{
        marginBottom: '15px',
        position: 'relative'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <span style={{
            position: 'absolute',
            left: '12px',
            color: '#6b7280',
            fontSize: '16px',
            zIndex: 1
          }}>
            🔍
          </span>
          <input
            type="text"
            placeholder="Search logs... (press Escape to clear)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setSearchTerm('')
              }
            }}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease',
              boxShadow: searchTerm ? '0 0 0 2px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6'
              e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)'
            }}
            onBlur={(e) => {
              if (!searchTerm) {
                e.target.style.borderColor = '#334155'
                e.target.style.boxShadow = 'none'
              }
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#374151'
                e.target.style.color = '#e2e8f0'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.color = '#6b7280'
              }}
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>
        {searchTerm && (
          <div style={{
            marginTop: '5px',
            fontSize: '12px',
            color: '#6b7280'
          }}>
            Filtering logs containing "{searchTerm}"
          </div>
        )}
      </div>
      
      {/* Log Output */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        height: serviceStatus ? 'calc(100vh - 520px)' : 'calc(100vh - 400px)',
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
            📄 Live Logs: {selectedService ? 
              `${serviceType === 'docker' ? '🐳' : '⚡'} ${selectedService}` : 
              'No service selected'}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {isAutoScrolling && (
              <span style={{ color: '#3b82f6', fontSize: '12px' }}>
                ↓ Auto-scrolling
              </span>
            )}
            {searchTerm && (
              <span style={{ color: '#f59e0b', fontSize: '12px' }}>
                🔍 Filtered
              </span>
            )}
          </div>
        </div>
        <div 
          ref={logContainerRef}
          style={{
            height: 'calc(100% - 50px)',
            overflowY: 'auto',
            padding: '15px',
            fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
            fontSize: '13px',
            lineHeight: '1.4',
            whiteSpace: 'pre-wrap'
          }}>
          {filteredLogOutput || (
            <div style={{ color: '#6b7280', fontStyle: 'italic' }}>
              {isStreaming ? 'Streaming logs...' : 
               selectedService ? 'Select a service to start streaming logs.' : 
               'Auto-detecting available services...'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 