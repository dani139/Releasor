import { createContext, useContext, useReducer, useEffect } from 'react'

const ReleasorContext = createContext()

// Initial state
const initialState = {
  config: null,
  currentEnvironment: 'development',
  activeStreams: new Map(),
  currentSection: 'logs',
  loading: false,
  isConfigModalOpen: false
}

// Action types
const actionTypes = {
  SET_CONFIG: 'SET_CONFIG',
  SET_ENVIRONMENT: 'SET_ENVIRONMENT',
  SET_CURRENT_SECTION: 'SET_CURRENT_SECTION',
  SET_LOADING: 'SET_LOADING',
  SET_CONFIG_MODAL: 'SET_CONFIG_MODAL',
  ADD_STREAM: 'ADD_STREAM',
  REMOVE_STREAM: 'REMOVE_STREAM'
}

// Reducer
function releasorReducer(state, action) {
  switch (action.type) {
    case actionTypes.SET_CONFIG:
      return { ...state, config: action.payload }
    case actionTypes.SET_ENVIRONMENT:
      return { ...state, currentEnvironment: action.payload }
    case actionTypes.SET_CURRENT_SECTION:
      return { ...state, currentSection: action.payload }
    case actionTypes.SET_LOADING:
      return { ...state, loading: action.payload }
    case actionTypes.SET_CONFIG_MODAL:
      return { ...state, isConfigModalOpen: action.payload }
    case actionTypes.ADD_STREAM:
      return { 
        ...state, 
        activeStreams: new Map(state.activeStreams).set(action.payload.id, action.payload.data)
      }
    case actionTypes.REMOVE_STREAM:
      const newStreams = new Map(state.activeStreams)
      newStreams.delete(action.payload)
      return { ...state, activeStreams: newStreams }
    default:
      return state
  }
}

export function ReleasorProvider({ children }) {
  const [state, dispatch] = useReducer(releasorReducer, initialState)

  // Load configuration on mount
  useEffect(() => {
    if (window.electronAPI) {
      loadConfig()
      setupStreamEventListeners()
    }
  }, [])

  const setupStreamEventListeners = () => {
    // Handle stream data
    window.electronAPI.onStreamData((event, data) => {
      // You can emit this data to components that need it
      window.dispatchEvent(new CustomEvent('stream-data', { detail: data }))
    })

    // Handle stream end
    window.electronAPI.onStreamEnd((event, data) => {
      window.dispatchEvent(new CustomEvent('stream-end', { detail: data }))
    })

    // Handle stream error  
    window.electronAPI.onStreamError((event, data) => {
      window.dispatchEvent(new CustomEvent('stream-error', { detail: data }))
    })
  }

  const loadConfig = async () => {
    try {
      const result = await window.electronAPI.getConfig()
      if (result.success) {
        dispatch({ type: actionTypes.SET_CONFIG, payload: result.data })
      }
    } catch (error) {
      console.error('Failed to load config:', error)
    }
  }

  const executeCommand = async (commandKey, targetElement = null) => {
    dispatch({ type: actionTypes.SET_LOADING, payload: true })
    
    try {
      const result = await window.electronAPI.executeCommand(commandKey, state.currentEnvironment)
      
      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Command execution failed:', error)
      throw error
    } finally {
      dispatch({ type: actionTypes.SET_LOADING, payload: false })
    }
  }

  const startCommandStream = async (commandKey) => {
    try {
      const result = await window.electronAPI.startCommandStream(commandKey, state.currentEnvironment)
      
      if (result.success) {
        dispatch({ 
          type: actionTypes.ADD_STREAM, 
          payload: { 
            id: result.streamId, 
            data: { commandKey, startTime: new Date() }
          }
        })
        return result.streamId
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to start stream:', error)
      throw error
    }
  }

  const startDynamicCommandStream = async (command, streamId) => {
    try {
      const result = await window.electronAPI.startDynamicCommandStream(command, streamId)
      
      if (result.success) {
        dispatch({ 
          type: actionTypes.ADD_STREAM, 
          payload: { 
            id: result.streamId, 
            data: { command, startTime: new Date() }
          }
        })
        return result.streamId
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to start dynamic stream:', error)
      throw error
    }
  }

  const stopCommandStream = async (streamId) => {
    try {
      await window.electronAPI.stopCommandStream(streamId)
      dispatch({ type: actionTypes.REMOVE_STREAM, payload: streamId })
    } catch (error) {
      console.error('Failed to stop stream:', error)
      throw error
    }
  }

  const updateConfig = async (newConfig) => {
    try {
      const result = await window.electronAPI.updateConfig(newConfig)
      if (result.success) {
        dispatch({ type: actionTypes.SET_CONFIG, payload: newConfig })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('Failed to update config:', error)
      throw error
    }
  }

  const contextValue = {
    ...state,
    actions: {
      setEnvironment: (env) => dispatch({ type: actionTypes.SET_ENVIRONMENT, payload: env }),
      setCurrentSection: (section) => dispatch({ type: actionTypes.SET_CURRENT_SECTION, payload: section }),
      setConfigModal: (open) => dispatch({ type: actionTypes.SET_CONFIG_MODAL, payload: open }),
      executeCommand,
      startCommandStream,
      startDynamicCommandStream,
      stopCommandStream,
      updateConfig,
      loadConfig
    }
  }

  return (
    <ReleasorContext.Provider value={contextValue}>
      {children}
    </ReleasorContext.Provider>
  )
}

export function useReleasor() {
  const context = useContext(ReleasorContext)
  if (!context) {
    throw new Error('useReleasor must be used within a ReleasorProvider')
  }
  return context
} 