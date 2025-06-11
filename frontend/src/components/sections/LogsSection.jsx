import React, { useState, useEffect, useRef } from 'react';
import { useReleasor } from '../../context/ReleasorContext';
import { formatLogEntry, shouldFilterLogLine, getLogLevelStyle } from '../../utils/logProcessor';
import { FaPlay, FaStop, FaRedo, FaSyncAlt, FaPlayCircle, FaStopCircle, FaTerminal, FaDatabase, FaServer } from 'react-icons/fa';

export default function ServicesSection() {
  const { currentEnvironment, config, actions } = useReleasor();

  const [containers, setContainers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openTabs, setOpenTabs] = useState([]); // Array of open service tabs
  const [activeTab, setActiveTab] = useState('all-services'); // Currently active tab
  const [tabLogs, setTabLogs] = useState({}); // Logs for each tab {serviceId: logs[]}
  const [tabStreams, setTabStreams] = useState({}); // Stream IDs for each tab {serviceId: streamId}
  const [tabSearchQueries, setTabSearchQueries] = useState({}); // Search queries for each tab
  const logsEndRef = useRef(null);

  // Auto-scroll to bottom when new logs arrive for active tab
  useEffect(() => {
    if (activeTab && tabLogs[activeTab]) {
      logsEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, [tabLogs, activeTab]);

  // Load container status when environment changes and populate services
  useEffect(() => {
    try {
      if (currentEnvironment && config && window.electronAPI) {
        refreshContainerStatus();
      }
    } catch (err) {
      console.error('Error in useEffect:', err);
      setError(err.message);
    }
  }, [currentEnvironment, config]);

  // Generate services from detected containers and configured services
  const getServices = () => {
    const allServices = [];
    
    // Add Docker containers
    if (containers && containers.length > 0) {
      const dockerServices = containers.map(container => {
        // Map container names to appropriate icons and descriptions
        const getServiceInfo = (name, containerData) => {
          const lowerName = name.toLowerCase();
          
          // Extract main port from container data if available
          const extractMainPort = () => {
            if (containerData.ports && containerData.ports.length > 0) {
              // Find the first public port mapping
              const portMapping = containerData.ports[0];
              const match = portMapping.match(/(\d+)->/);
              if (match) {
                return match[1]; // Return the host port
              }
            }
            
            // Default ports based on service type
            if (lowerName.includes('backend') || lowerName.includes('api')) return '8000';
            if (lowerName.includes('postgres') || lowerName.includes('db')) return '5432';
            if (lowerName.includes('wuzapi')) return '8080';
            return '8000';
          };

          if (lowerName.includes('backend') || lowerName.includes('api')) {
            return { icon: FaServer, description: 'Backend API', port: extractMainPort() };
          } else if (lowerName.includes('postgres') || lowerName.includes('db')) {
            return { icon: FaDatabase, description: 'Primary database', port: extractMainPort() };
          } else if (lowerName.includes('wuzapi')) {
            return { icon: FaTerminal, description: 'WhatsApp integration', port: extractMainPort() };
          } else {
            return { icon: FaServer, description: 'Service', port: extractMainPort() };
          }
        };
        
        const serviceInfo = getServiceInfo(container.name || container.service, container);
        return {
          id: container.name || container.service,
          name: container.displayName || container.name || container.service,
          description: serviceInfo.description,
          icon: serviceInfo.icon,
          port: serviceInfo.port,
          containerInfo: { ...container, type: 'docker' }
        };
      });
      allServices.push(...dockerServices);
    }
    
    // Add configured services (like frontend)
    if (config && config.services && config.services[currentEnvironment]) {
      const configuredServices = config.services[currentEnvironment].map(service => {
        const getServiceIcon = (type) => {
          if (type === 'frontend') return FaPlayCircle;
          return FaServer;
        };
        
        const getServiceDescription = (type, name) => {
          if (type === 'frontend') return 'Frontend application';
          return `${name} service`;
        };

        // Get actual port from running process or default
        const getActualPort = async (serviceName) => {
          try {
            if (serviceName === 'frontend') {
              // Check what port Next.js is actually running on
              const statusResult = await window.electronAPI.getServiceStatus(serviceName, currentEnvironment);
              // Extract port from process if possible, otherwise use default
              return '3000'; // Default for Next.js
            }
          } catch (error) {
            console.warn('Could not determine actual port for', serviceName);
          }
          return '3000';
        };

        return {
          id: service.name,
          name: service.name,
          description: getServiceDescription(service.type, service.name),
          icon: getServiceIcon(service.type),
          port: '3000', // Will be updated dynamically
          containerInfo: { ...service, type: service.type }
        };
      });
      allServices.push(...configuredServices);
    }
    
    return allServices;
  };

  const services = getServices();

  // Set up stream event listeners
  useEffect(() => {
    const handleStreamData = (event) => {
      const { streamId, data } = event.detail;
      // Find which tab this stream belongs to
      const serviceId = Object.keys(tabStreams).find(key => tabStreams[key] === streamId);
      if (serviceId) {
        if (shouldFilterLogLine(data.data)) {
          return;
        }
        const formattedLog = formatLogEntry(data);
        setTabLogs(prev => ({
          ...prev,
          [serviceId]: [...(prev[serviceId] || []), formattedLog]
        }));
      }
    };

    const handleStreamEnd = (event) => {
      const { streamId } = event.detail;
      const serviceId = Object.keys(tabStreams).find(key => tabStreams[key] === streamId);
      if (serviceId) {
        setTabStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[serviceId];
          return newStreams;
        });
      }
    };

    const handleStreamError = (event) => {
      const { streamId, error } = event.detail;
      const serviceId = Object.keys(tabStreams).find(key => tabStreams[key] === streamId);
      if (serviceId) {
        setTabLogs(prev => ({
          ...prev,
          [serviceId]: [...(prev[serviceId] || []), {
            type: 'stderr',
            data: `Stream error: ${error}`,
            timestamp: new Date().toISOString(),
            level: 'ERROR'
          }]
        }));
        setTabStreams(prev => {
          const newStreams = { ...prev };
          delete newStreams[serviceId];
          return newStreams;
        });
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
  }, [tabStreams]);

  // Refresh container status
  const refreshContainerStatus = async () => {
    if (!currentEnvironment || !config || !window.electronAPI) return;
    
    setRefreshing(true);
    setError(null);
    try {
      const result = await window.electronAPI.getAllContainersStatus(currentEnvironment);
      
      if (result.success) {
        setContainers(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to get container status');
      }
    } catch (error) {
      console.error('Error getting container status:', error);
      setError(error.message);
      setContainers([]);
    } finally {
      setRefreshing(false);
    }
  };

  // Tab management functions
  const openTab = async (service) => {
    // Check if tab is already open
    const existingTab = openTabs.find(tab => tab.id === service.id);
    if (existingTab) {
      setActiveTab(service.id);
      return;
    }

    // Add new tab
    const newTab = {
      id: service.id,
      name: service.name,
      service: service
    };
    
    setOpenTabs(prev => [...prev, newTab]);
    setActiveTab(service.id);
    
    // Initialize logs and search for this tab
    setTabLogs(prev => ({ ...prev, [service.id]: [] }));
    setTabSearchQueries(prev => ({ ...prev, [service.id]: '' }));
    
    // Start log streaming
    await startTabLogStream(service.id);
    
    // Scroll to bottom immediately when opening new tab
    setTimeout(() => {
      if (logsEndRef.current) {
        logsEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
    }, 100);
  };

  const closeTab = async (serviceId) => {
    // Stop streaming for this tab
    if (tabStreams[serviceId]) {
      try {
        await actions.stopCommandStream(tabStreams[serviceId]);
      } catch (error) {
        console.error('Failed to stop stream:', error);
      }
    }

    // Remove tab
    setOpenTabs(prev => prev.filter(tab => tab.id !== serviceId));
    
    // Clean up tab data
    setTabLogs(prev => {
      const newLogs = { ...prev };
      delete newLogs[serviceId];
      return newLogs;
    });
    
    setTabStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[serviceId];
      return newStreams;
    });
    
    setTabSearchQueries(prev => {
      const newQueries = { ...prev };
      delete newQueries[serviceId];
      return newQueries;
    });

    // If this was the active tab, switch to another tab or back to all-services
    if (activeTab === serviceId) {
      const remainingTabs = openTabs.filter(tab => tab.id !== serviceId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1].id : 'all-services');
    }
  };

  // Handle service row click
  const handleServiceClick = async (service) => {
    await openTab(service);
  };

  // Start log streaming for a specific tab
  const startTabLogStream = async (serviceId) => {
    // Stop existing stream for this service if any
    if (tabStreams[serviceId]) {
      try {
        await actions.stopCommandStream(tabStreams[serviceId]);
      } catch (error) {
        console.error('Failed to stop existing stream:', error);
      }
    }

    try {
      const commandKey = `logs.${currentEnvironment}.${serviceId}`;
      const result = await actions.startCommandStream(commandKey);
      
      if (result) {
        setTabStreams(prev => ({ ...prev, [serviceId]: result }));
        setTabLogs(prev => ({ ...prev, [serviceId]: [] }));
      }
    } catch (error) {
      console.error('Failed to start log stream:', error);
    }
  };

  // Clear logs and restart stream for active tab
  const clearTabLogs = async () => {
    if (activeTab) {
      console.log('Clearing logs for tab:', activeTab);
      
      // Stop current stream first
      if (tabStreams[activeTab]) {
        try {
          console.log('Stopping stream:', tabStreams[activeTab]);
          await window.electronAPI.stopCommandStream(tabStreams[activeTab]);
          console.log('Stream stopped successfully');
        } catch (error) {
          console.error('Failed to stop stream:', error);
        }
      }
      
      // Clear logs immediately
      setTabLogs(prev => {
        const newLogs = { ...prev };
        newLogs[activeTab] = [];
        console.log('Logs cleared for tab:', activeTab);
        return newLogs;
      });
      
      // Remove stream from tracking
      setTabStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[activeTab];
        return newStreams;
      });
      
      // Wait a moment then restart stream
      setTimeout(() => {
        console.log('Restarting stream for tab:', activeTab);
        startTabLogStream(activeTab);
      }, 500);
    }
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

  // Service management functions (for non-Docker services)
  const handleStartService = async (serviceName) => {
    try {
      await window.electronAPI.startService(serviceName, currentEnvironment);
      setTimeout(refreshContainerStatus, 2000);
    } catch (error) {
      console.error('Error starting service:', error);
    }
  };

  const handleStopService = async (serviceName) => {
    try {
      await window.electronAPI.stopService(serviceName, currentEnvironment);
      setTimeout(refreshContainerStatus, 1000);
    } catch (error) {
      console.error('Error stopping service:', error);
    }
  };

  // Start all services (Docker containers and services)
  const handleStartAll = async () => {
    const promises = services.map(service => {
      if (service.containerInfo?.type === 'docker') {
        return handleStartContainer(service.id);
      } else {
        return handleStartService(service.id);
      }
    });
    await Promise.all(promises);
  };

  // Stop all services (Docker containers and services)
  const handleStopAll = async () => {
    const promises = services.map(service => {
      if (service.containerInfo?.type === 'docker') {
        return handleStopContainer(service.id);
      } else {
        return handleStopService(service.id);
      }
    });
    await Promise.all(promises);
  };

  const getContainerStatus = (serviceId) => {
    // First check if it's a Docker container
    const container = containers.find(c => c.name === serviceId || c.service === serviceId);
    if (container) {
      return container.status;
    }
    
    // Then check if it's a configured service
    if (config && config.services && config.services[currentEnvironment]) {
      const service = config.services[currentEnvironment].find(s => s.name === serviceId);
      if (service) {
        // For now, return 'unknown' - we'll get actual status separately
        return 'unknown';
      }
    }
    
    return 'unknown';
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

  // Show error state if there's an error
  if (error) {
    return (
      <div style={{ 
        height: '100%', 
        backgroundColor: '#f8fafc',
        color: '#1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '24px', color: '#ef4444' }}>⚠️ Error</div>
        <div style={{ color: '#64748b', textAlign: 'center', maxWidth: '400px' }}>
          {error}
        </div>
        <button 
          onClick={() => setError(null)}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

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

      {/* Tab Interface */}
      <div style={{ 
        flex: 1, 
        padding: '24px',
        overflow: 'auto' 
      }}>
        {/* Tab Bar */}
        <div style={{
          display: 'flex',
          backgroundColor: '#f8fafc',
          borderRadius: '12px 12px 0 0',
          border: '1px solid #e2e8f0',
          borderBottom: 'none',
          overflow: 'hidden'
        }}>
          {/* All Services Tab */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              backgroundColor: activeTab === 'all-services' ? 'white' : 'transparent',
              borderRight: '1px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
            onClick={() => setActiveTab('all-services')}
          >
            <FaServer style={{ 
              marginRight: '8px', 
              color: activeTab === 'all-services' ? '#3b82f6' : '#6b7280',
              fontSize: '14px'
            }} />
            <span style={{ 
              fontWeight: activeTab === 'all-services' ? '600' : '500',
              color: activeTab === 'all-services' ? '#1f2937' : '#6b7280',
              fontSize: '14px'
            }}>
              All Services
            </span>
          </div>

          {/* Individual Service Tabs */}
          {openTabs.map((tab, index) => (
            <div
              key={tab.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
                borderRight: index < openTabs.length - 1 ? '1px solid #e2e8f0' : 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onClick={() => setActiveTab(tab.id)}
              onMouseDown={(e) => {
                // Handle middle-click to close tab
                if (e.button === 1) {
                  e.preventDefault();
                  closeTab(tab.id);
                }
              }}
            >
              <tab.service.icon style={{ 
                marginRight: '8px', 
                color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
                fontSize: '14px'
              }} />
              <span style={{ 
                fontWeight: activeTab === tab.id ? '600' : '500',
                color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                fontSize: '14px'
              }}>
                {tab.name}
              </span>
              
              {/* Close button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                style={{
                  marginLeft: '8px',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '2px',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#ef4444';
                  e.target.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#9ca3af';
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0 0 12px 12px',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* All Services Content */}
          {activeTab === 'all-services' && (
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
                  textAlign: 'left', 
                  fontWeight: '600',
                  color: '#374151',
                  fontSize: '14px',
                  borderBottom: '1px solid #e5e7eb'
                }}>
                  Service Details
                  <div style={{ 
                    fontSize: '11px', 
                    fontWeight: '400', 
                    color: '#6b7280', 
                    marginTop: '2px' 
                  }}>
                    🐳 Docker / 🌐 Frontend
                  </div>
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
                    transition: 'background-color 0.15s, transform 0.15s',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleServiceClick(service)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
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
                    <td style={{ 
                      padding: '16px 20px',
                      fontSize: '11px',
                      maxWidth: '300px'
                    }}>
                      {service.containerInfo?.type === 'docker' ? (
                        <div style={{ display: 'grid', gap: '3px' }}>
                          <div>
                            <span style={{ color: '#10b981', fontWeight: '500' }}>🐳 Service:</span>
                            <span style={{ 
                              marginLeft: '6px', 
                              fontFamily: 'monospace', 
                              color: '#374151' 
                            }}>
                              {service.containerInfo?.service || service.id}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#3b82f6', fontWeight: '500' }}>Container:</span>
                            <span style={{ 
                              marginLeft: '6px', 
                              fontFamily: 'monospace', 
                              color: '#374151' 
                            }}>
                              {service.containerInfo?.name || service.id}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#f59e0b', fontWeight: '500' }}>Image:</span>
                            <span style={{ 
                              marginLeft: '6px', 
                              fontFamily: 'monospace', 
                              color: '#6b7280',
                              fontSize: '10px'
                            }}>
                              {service.containerInfo?.image ? 
                                (service.containerInfo.image.length > 35 ? 
                                  service.containerInfo.image.substring(0, 35) + '...' : 
                                  service.containerInfo.image
                                ) : 'N/A'
                              }
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gap: '3px' }}>
                          <div>
                            <span style={{ color: '#8b5cf6', fontWeight: '500' }}>🌐 Frontend:</span>
                            <span style={{ 
                              marginLeft: '6px', 
                              fontFamily: 'monospace', 
                              color: '#374151' 
                            }}>
                              {service.name}
                            </span>
                          </div>
                          <div>
                            <span style={{ color: '#6b7280', fontSize: '10px' }}>
                              Next.js Development Server
                            </span>
                          </div>
                        </div>
                      )}
                      {service.containerInfo?.health && (
                        <div style={{
                          fontSize: '10px',
                          color: service.containerInfo.health === 'healthy' ? '#10b981' : '#f59e0b',
                          fontWeight: '500',
                          marginTop: '6px'
                        }}>
                          {service.containerInfo.health === 'healthy' ? '● Healthy' : 
                           service.containerInfo.health === '' ? '' : '● ' + service.containerInfo.health}
                        </div>
                      )}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                openTab(service);
                              }}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                // Clear logs for this service if it has a tab open
                                const serviceTab = openTabs.find(tab => tab.id === service.id);
                                if (serviceTab) {
                                  // Clear logs and restart streaming for this specific service
                                  setTabLogs(prev => ({ ...prev, [service.id]: [] }));
                                  
                                  // Stop current stream and restart
                                  if (tabStreams[service.id]) {
                                    actions.stopCommandStream(tabStreams[service.id]).then(() => {
                                      setTimeout(() => startTabLogStream(service.id), 500);
                                    }).catch(console.error);
                                  } else {
                                    setTimeout(() => startTabLogStream(service.id), 500);
                                  }
                                }
                              }}
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
                              <FaSyncAlt style={{ fontSize: '10px' }} />
                              Clear
                            </button>
                            
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (service.containerInfo?.type === 'docker') {
                                  handleStopContainer(service.id);
                                } else {
                                  handleStopService(service.id);
                                }
                              }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              if (service.containerInfo?.type === 'docker') {
                                handleStartContainer(service.id);
                              } else {
                                handleStartService(service.id);
                              }
                            }}
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
          )}

          {/* Individual Service Tab Content */}
          {activeTab !== 'all-services' && openTabs.find(tab => tab.id === activeTab) && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '0 0 12px 12px',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden'
            }}>
              {/* Service Info for Active Tab */}
              <div style={{
                padding: '20px',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h3 style={{ 
                  margin: '0 0 16px 0', 
                  fontSize: '18px', 
                  fontWeight: '600',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  {(() => {
                    const activeTabData = openTabs.find(tab => tab.id === activeTab);
                    const Icon = activeTabData?.service.icon;
                    return Icon ? <Icon style={{ color: '#3b82f6' }} /> : null;
                  })()}
                  {activeTab} Service Information
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '20px'
                }}>
                  {(() => {
                    const activeTabData = openTabs.find(tab => tab.id === activeTab);
                    const serviceInfo = activeTabData?.service.containerInfo;
                    return serviceInfo ? (
                      <>
                        <div>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Container Details
                          </h4>
                          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                            {/* Service Information Section */}
                            <div style={{ 
                              marginBottom: '12px', 
                              padding: '10px', 
                              background: '#f8fafc', 
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0'
                            }}>
                              <div style={{ 
                                fontSize: '12px', 
                                fontWeight: '600', 
                                color: '#374151', 
                                marginBottom: '6px' 
                              }}>
                                {serviceInfo.type === 'docker' ? '🐳 DOCKER SERVICE' : '🌐 Frontend Service'}
                              </div>
                              {serviceInfo.type === 'docker' ? (
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  <div>
                                    <span style={{ color: '#10b981', fontWeight: '500' }}>Service:</span> 
                                    <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                      {serviceInfo.service || serviceInfo.name || activeTab}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                                      (for networking)
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>Container:</span> 
                                    <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                      {serviceInfo.name || serviceInfo.service || activeTab}
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{ color: '#f59e0b', fontWeight: '500' }}>Image:</span> 
                                    <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                      {serviceInfo.image || serviceInfo.Image || 'N/A'}
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                                      (for Docker mgmt)
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gap: '4px' }}>
                                  <div>
                                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Type:</span> 
                                    <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                                      Next.js Development Server
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>Port:</span> 
                                    <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
                                      {serviceInfo.port || '5175'}
                                    </span>
                                  </div>
                                  <div>
                                    <span style={{ color: '#10b981', fontWeight: '500' }}>Framework:</span> 
                                    <span style={{ marginLeft: '8px', fontSize: '12px' }}>
                                      Next.js
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* Container Details */}
                            <div><strong>Status:</strong> {serviceInfo.status || serviceInfo.state || 'N/A'}</div>
                            <div><strong>Created:</strong> {(() => {
                              const created = serviceInfo.created || serviceInfo.Created;
                              if (!created) return 'N/A';
                              try {
                                const date = new Date(created);
                                return isNaN(date.getTime()) ? created : date.toLocaleString();
                              } catch (e) {
                                return created;
                              }
                            })()}</div>
                            <div><strong>Running For:</strong> {serviceInfo.runningFor || serviceInfo.RunningFor || 'N/A'}</div>
                            <div><strong>Size:</strong> {serviceInfo.size || serviceInfo.Size || 'N/A'}</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 style={{ 
                            margin: '0 0 8px 0', 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: '#374151'
                          }}>
                            Network & Ports
                          </h4>
                          <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
                            <div><strong>Ports:</strong> {serviceInfo.ports ? (Array.isArray(serviceInfo.ports) ? serviceInfo.ports.join(', ') : serviceInfo.ports) : (serviceInfo.Ports ? (Array.isArray(serviceInfo.Ports) ? serviceInfo.Ports.join(', ') : serviceInfo.Ports) : 'N/A')}</div>
                            <div><strong>Networks:</strong> {serviceInfo.networks ? (Array.isArray(serviceInfo.networks) ? serviceInfo.networks.join(', ') : serviceInfo.networks) : (serviceInfo.Networks ? (Array.isArray(serviceInfo.Networks) ? serviceInfo.Networks.join(', ') : serviceInfo.Networks) : 'N/A')}</div>
                          </div>
                        </div>
                        
                        {(serviceInfo.command || serviceInfo.Command) && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <h4 style={{ 
                              margin: '0 0 8px 0', 
                              fontSize: '14px', 
                              fontWeight: '600',
                              color: '#374151'
                            }}>
                              Command
                            </h4>
                            <div style={{ 
                              fontSize: '13px', 
                              color: '#6b7280',
                              backgroundColor: '#f3f4f6',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              fontFamily: 'monospace',
                              wordBreak: 'break-all'
                            }}>
                              {serviceInfo.command || serviceInfo.Command}
                            </div>
                          </div>
                        )}
                      </>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Log Area for Active Tab */}
              <div style={{ padding: '20px' }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '16px'
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
                        {activeTab} Logs
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
                  
                  <button
                    onClick={clearTabLogs}
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
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#f59e0b';
                    }}
                  >
                    <FaSyncAlt style={{ fontSize: '10px' }} />
                    Clear
                  </button>
                </div>
                
                {/* Search Box */}
                <div style={{ position: 'relative', marginBottom: '16px' }}>
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={tabSearchQueries[activeTab] || ''}
                    onChange={(e) => setTabSearchQueries(prev => ({ ...prev, [activeTab]: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                      color: '#374151',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                    }}
                  />
                  <FaTerminal style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }} />
                </div>

                {/* Log Display */}
                <div style={{
                  backgroundColor: '#1e1e1e',
                  borderRadius: '8px',
                  padding: '16px',
                  height: '400px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}>
                  {(() => {
                    const logs = tabLogs[activeTab] || [];
                    const searchQuery = tabSearchQueries[activeTab] || '';
                    const filteredLogs = logs.filter(log => {
                      if (!searchQuery.trim()) return true;
                      const query = searchQuery.toLowerCase();
                      return (
                        log.data.toLowerCase().includes(query) ||
                        log.level.toLowerCase().includes(query) ||
                        new Date(log.timestamp).toLocaleTimeString().toLowerCase().includes(query)
                      );
                    });

                    return filteredLogs.length > 0 ? (
                      filteredLogs.map((log, index) => (
                        <div
                          key={index}
                          style={{
                            marginBottom: '4px',
                            color: getLogLevelStyle(log.level).color,
                            display: 'flex',
                            gap: '8px'
                          }}
                        >
                          <span style={{ color: '#6b7280', minWidth: '60px' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span style={{ 
                            color: getLogLevelStyle(log.level).color,
                            fontWeight: '600',
                            minWidth: '50px'
                          }}>
                            {log.level}
                          </span>
                          <span style={{ color: '#e5e7eb', wordBreak: 'break-word' }}>
                            {log.data}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div style={{ 
                        color: '#6b7280', 
                        textAlign: 'center', 
                        marginTop: '50px' 
                      }}>
                        {searchQuery ? 'No logs match your search' : 'No logs available'}
                      </div>
                    );
                  })()}
                  <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 