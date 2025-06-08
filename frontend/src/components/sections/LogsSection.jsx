import React, { useState, useEffect, useRef } from 'react';
import { useReleasor } from '../../context/ReleasorContext';
import { formatLogEntry, shouldFilterLogLine, getLogLevelStyle } from '../../utils/logProcessor';
import { FaPlay, FaStop, FaRedo, FaSyncAlt, FaPlayCircle, FaStopCircle, FaTerminal, FaDatabase, FaServer } from 'react-icons/fa';

export default function ServicesSection() {
  const { currentEnvironment, config, actions } = useReleasor();
  const [selectedService, setSelectedService] = useState('');
  const [logs, setLogs] = useState([]);
  const [currentStreamId, setCurrentStreamId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [containers, setContainers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Load container status when environment changes and populate services
  useEffect(() => {
    if (currentEnvironment && config) {
      refreshContainerStatus();
    }
  }, [currentEnvironment, config]);

  // Generate services from detected containers
  const getServices = () => {
    if (!containers || containers.length === 0) {
      return [];
    }
    
    return containers.map(container => {
      // Map container names to appropriate icons and descriptions
      const getServiceInfo = (name) => {
        const lowerName = name.toLowerCase();
        if (lowerName.includes('backend') || lowerName.includes('api')) {
          return { icon: FaServer, description: 'Main application server', port: '8000' };
        } else if (lowerName.includes('postgres') || lowerName.includes('db')) {
          return { icon: FaDatabase, description: 'Primary database', port: '5432' };
        } else if (lowerName.includes('wuzapi') || lowerName.includes('whatsapp')) {
          return { icon: FaTerminal, description: 'WhatsApp integration', port: '8080' };
        } else {
          return { icon: FaServer, description: 'Service', port: '8000' };
        }
      };
      
      const serviceInfo = getServiceInfo(container.name);
      return {
        id: container.name,
        name: container.name,
        description: serviceInfo.description,
        icon: serviceInfo.icon,
        port: serviceInfo.port
      };
    });
  };

  const services = getServices();

  // Set up stream event listeners
  useEffect(() => {
    const handleStreamData = (event) => {
      const { streamId, data } = event.detail;
      if (streamId === currentStreamId) {
        if (shouldFilterLogLine(data.data)) {
          return;
        }
        const formattedLog = formatLogEntry(data);
        setLogs(prev => [...prev, formattedLog]);
      }
    };

    const handleStreamEnd = (event) => {
      const { streamId } = event.detail;
      if (streamId === currentStreamId) {
        setIsStreaming(false);
        setCurrentStreamId(null);
      }
    };

    const handleStreamError = (event) => {
      const { streamId, error } = event.detail;
      if (streamId === currentStreamId) {
        setLogs(prev => [...prev, {
          type: 'stderr',
          data: `Stream error: ${error}`,
          timestamp: new Date().toISOString(),
          level: 'ERROR'
        }]);
        setIsStreaming(false);
        setCurrentStreamId(null);
      }
    };

    window.addEventListener('stream-data', handleStreamData);
    window.addEventListener('stream-end', handleStreamEnd);
    window.addEventListener('stream-error', handleStreamError);

    return () => {
      window.removeEventListener('stream-data', handleStreamData);
      window.removeEventListener('stream-end', handleStreamEnd);
      window.removeEventListener('stream-error', handleStreamError);
    };
  }, [currentStreamId]);

  // Refresh container status
  const refreshContainerStatus = async () => {
    if (!currentEnvironment || !config) return;
    
    setRefreshing(true);
    try {
      const result = await window.electronAPI.getAllContainersStatus(currentEnvironment);
      if (result.success) {
        setContainers(result.data);
      }
    } catch (error) {
      console.error('Error getting container status:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Start log streaming for selected service
  const startLogStream = async (serviceId) => {
    if (currentStreamId) {
      await stopLogStream();
    }

    try {
      const commandKey = `logs.${currentEnvironment}.${serviceId}`;
      const result = await actions.startCommandStream(commandKey);
      
      if (result) {
        setCurrentStreamId(result);
        setIsStreaming(true);
        setSelectedService(serviceId);
        setLogs([]);
      }
    } catch (error) {
      console.error('Failed to start log stream:', error);
    }
  };

  // Stop current log stream
  const stopLogStream = async () => {
    if (currentStreamId) {
      try {
        await actions.stopCommandStream(currentStreamId);
      } catch (error) {
        console.error('Failed to stop stream:', error);
      }
    }
    setIsStreaming(false);
    setCurrentStreamId(null);
  };

  // Container management functions
  const handleStartContainer = async (containerName) => {
    try {
      await window.electronAPI.startContainer(containerName, currentEnvironment);
      setTimeout(refreshContainerStatus, 2000);
    } catch (error) {
      console.error('Error starting container:', error);
    }
  };

  const handleStopContainer = async (containerName) => {
    try {
      await window.electronAPI.stopContainer(containerName, currentEnvironment);
      setTimeout(refreshContainerStatus, 2000);
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  };

  const handleRestartContainer = async (containerName) => {
    try {
      await window.electronAPI.restartContainer(containerName, currentEnvironment);
      setTimeout(refreshContainerStatus, 2000);
    } catch (error) {
      console.error('Error restarting container:', error);
    }
  };

  // Start all containers
  const handleStartAll = async () => {
    const promises = services.map(service => 
      handleStartContainer(service.id)
    );
    await Promise.all(promises);
  };

  // Stop all containers
  const handleStopAll = async () => {
    const promises = services.map(service => 
      handleStopContainer(service.id)
    );
    await Promise.all(promises);
  };

  const getContainerStatus = (serviceId) => {
    const container = containers.find(c => c.name === serviceId || c.service === serviceId);
    return container ? container.status : 'unknown';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      running: { 
        backgroundColor: '#10b981',
        color: 'white',
        text: '● Running' 
      },
      stopped: { 
        backgroundColor: '#ef4444',
        color: 'white',
        text: '● Stopped' 
      },
      error: { 
        backgroundColor: '#f59e0b',
        color: 'white',
        text: '● Error' 
      },
      unknown: { 
        backgroundColor: '#6b7280',
        color: 'white',
        text: '● Unknown' 
      }
    };
    
    const config = statusConfig[status] || statusConfig.unknown;
    return (
      <span style={{
        padding: '6px 14px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.1)'
      }}>
        {config.text}
      </span>
    );
  };

  return (
    <div style={{ 
      height: '100%', 
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        padding: '24px',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: 'bold', 
              color: '#1e293b',
              margin: '0 0 8px 0' 
            }}>
              Docker Services
            </h1>
            <p style={{ 
              color: '#64748b', 
              margin: 0,
              fontSize: '14px'
            }}>
              Environment: <strong style={{ color: '#3b82f6' }}>{currentEnvironment}</strong>
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={refreshContainerStatus}
              disabled={refreshing}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                color: '#475569',
                fontSize: '14px',
                fontWeight: '500',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                opacity: refreshing ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!refreshing) {
                  e.target.style.backgroundColor = '#e2e8f0';
                }
              }}
              onMouseLeave={(e) => {
                if (!refreshing) {
                  e.target.style.backgroundColor = '#f1f5f9';
                }
              }}
            >
              <FaSyncAlt style={{ 
                animation: refreshing ? 'spin 1s linear infinite' : 'none' 
              }} />
              Refresh
            </button>
            
            <button
              onClick={handleStartAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#22c55e',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#16a34a';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#22c55e';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <FaPlayCircle />
              Start All
            </button>
            
            <button
              onClick={handleStopAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#ef4444';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
              }}
            >
              <FaStopCircle />
              Stop All
            </button>
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div style={{ 
        flex: 1, 
        padding: '24px',
        overflow: 'auto' 
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse' 
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc' }}>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Service
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Status
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Port
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'center', 
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, index) => {
                const status = getContainerStatus(service.id);
                const isRunning = status === 'running';
                const IconComponent = service.icon;
                
                return (
                  <tr key={service.id} style={{ 
                    borderBottom: index < services.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px' 
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: isRunning ? '#dbeafe' : '#f1f5f9',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1px solid ${isRunning ? '#bfdbfe' : '#e2e8f0'}`
                        }}>
                          <IconComponent style={{ 
                            color: isRunning ? '#3b82f6' : '#6b7280',
                            fontSize: '16px'
                          }} />
                        </div>
                        <div>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#1f2937',
                            fontSize: '14px'
                          }}>
                            {service.name}
                          </div>
                          <div style={{ 
                            color: '#6b7280', 
                            fontSize: '12px',
                            marginTop: '2px'
                          }}>
                            {service.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {getStatusBadge(status)}
                    </td>
                    <td style={{ 
                      padding: '16px 20px',
                      color: '#6b7280',
                      fontSize: '14px',
                      fontFamily: 'monospace'
                    }}>
                      :{service.port}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center',
                        gap: '8px' 
                      }}>
                        {isRunning ? (
                          <>
                            <button
                              onClick={() => startLogStream(service.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: '#3b82f6',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#2563eb';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#3b82f6';
                                e.target.style.transform = 'translateY(0)';
                              }}
                            >
                              <FaTerminal style={{ fontSize: '10px' }} />
                              Logs
                            </button>
                            
                            <button
                              onClick={() => handleRestartContainer(service.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: '#f59e0b',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#d97706';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#f59e0b';
                                e.target.style.transform = 'translateY(0)';
                              }}
                            >
                              <FaRedo style={{ fontSize: '10px' }} />
                              Restart
                            </button>
                            
                            <button
                              onClick={() => handleStopContainer(service.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: '#ef4444',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = '#dc2626';
                                e.target.style.transform = 'translateY(-1px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = '#ef4444';
                                e.target.style.transform = 'translateY(0)';
                              }}
                            >
                              <FaStop style={{ fontSize: '10px' }} />
                              Stop
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStartContainer(service.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 16px',
                              backgroundColor: '#22c55e',
                              border: 'none',
                              borderRadius: '6px',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#16a34a';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#22c55e';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            <FaPlay style={{ fontSize: '10px' }} />
                            Start
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Display Area */}
      {selectedService && (
        <div style={{
          margin: '0 24px 24px 24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px 20px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FaTerminal style={{ color: '#3b82f6' }} />
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '16px', 
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {selectedService} Logs
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '12px', 
                  color: '#6b7280' 
                }}>
                  Real-time container output
                </p>
              </div>
            </div>
            
            {isStreaming && (
              <button
                onClick={stopLogStream}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  backgroundColor: '#ef4444',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#ef4444';
                }}
              >
                <FaStop style={{ fontSize: '10px' }} />
                Stop Stream
              </button>
            )}
          </div>
          
          <div style={{
            height: '300px',
            padding: '16px',
            overflow: 'auto',
            backgroundColor: '#1e293b',
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
            fontSize: '13px',
            color: '#e2e8f0'
          }}>
            {logs.length === 0 ? (
              <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748b'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <FaTerminal style={{ 
                    fontSize: '32px', 
                    marginBottom: '12px',
                    color: '#475569'
                  }} />
                  <p style={{ margin: 0 }}>Waiting for log data...</p>
                </div>
              </div>
            ) : (
              <div>
                {logs.map((log, index) => (
                  <div key={index} style={{
                    padding: '4px 0',
                    borderLeft: '3px solid transparent',
                    paddingLeft: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#334155';
                    e.target.style.borderLeftColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.borderLeftColor = 'transparent';
                  }}>
                    <span style={{ 
                      color: '#64748b', 
                      fontSize: '11px',
                      marginRight: '12px',
                      minWidth: '80px',
                      display: 'inline-block'
                    }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span style={{
                      backgroundColor: log.level === 'ERROR' ? '#dc2626' : 
                                     log.level === 'WARN' ? '#f59e0b' : 
                                     log.level === 'INFO' ? '#3b82f6' : '#6b7280',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600',
                      marginRight: '12px',
                      minWidth: '50px',
                      textAlign: 'center',
                      display: 'inline-block'
                    }}>
                      {log.level}
                    </span>
                    <span style={{ color: '#e2e8f0' }}>
                      {log.data}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 