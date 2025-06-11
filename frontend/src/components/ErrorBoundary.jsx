import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo)
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          padding: '20px'
        }}>
          <div style={{ fontSize: '24px', color: '#ef4444' }}>⚠️ Something went wrong</div>
          <div style={{ color: '#64748b', textAlign: 'center', maxWidth: '500px' }}>
            {this.state.error && this.state.error.toString()}
          </div>
          <button 
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
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
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '16px', whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              <summary>Error Details (Development Mode)</summary>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 