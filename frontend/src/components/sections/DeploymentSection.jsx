import { useState, useEffect } from 'react'
import { useReleasor } from '../../context/ReleasorContext'

export default function DeploymentSection() {
  const { actions } = useReleasor()
  const [deploymentStatus, setDeploymentStatus] = useState('')
  const [githubActions, setGithubActions] = useState('')
  const [currentCommit, setCurrentCommit] = useState('')
  const [remoteCommit, setRemoteCommit] = useState('')
  const [currentBranch, setCurrentBranch] = useState('')
  const [vercelStatus, setVercelStatus] = useState('')
  const [loading, setLoading] = useState({
    deployment: false,
    github: false,
    git: false,
    vercel: false
  })

  useEffect(() => {
    loadDeploymentInfo()
    // Refresh every 30 seconds
    const interval = setInterval(loadDeploymentInfo, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDeploymentInfo = async () => {
    await Promise.all([
      loadGitInfo(),
      loadGithubActions(),
      loadVercelStatus(),
      loadDeploymentStatus()
    ])
  }

  const loadGitInfo = async () => {
    setLoading(prev => ({ ...prev, git: true }))
    try {
      const [currentResult, remoteResult, branchResult] = await Promise.all([
        actions.executeCommand('deployment.git_current_commit'),
        actions.executeCommand('deployment.git_remote_commit'),
        actions.executeCommand('deployment.vercel_current_branch')
      ])
      
      setCurrentCommit(currentResult.stdout?.trim() || 'Unknown')
      setRemoteCommit(remoteResult.stdout?.trim() || 'Unknown')
      setCurrentBranch(branchResult.stdout?.trim() || 'Unknown')
    } catch (error) {
      console.error('Failed to load git info:', error)
    } finally {
      setLoading(prev => ({ ...prev, git: false }))
    }
  }

  const loadGithubActions = async () => {
    setLoading(prev => ({ ...prev, github: true }))
    try {
      const result = await actions.executeCommand('deployment.github_actions')
      setGithubActions(result.stdout || result.stderr || 'No GitHub Actions found')
    } catch (error) {
      setGithubActions('GitHub CLI not available or not authenticated')
    } finally {
      setLoading(prev => ({ ...prev, github: false }))
    }
  }

  const loadVercelStatus = async () => {
    setLoading(prev => ({ ...prev, vercel: true }))
    try {
      const result = await actions.executeCommand('deployment.vercel_deployments')
      setVercelStatus(result.stdout || result.stderr || 'No Vercel deployments found')
    } catch (error) {
      setVercelStatus('Vercel CLI not available or not authenticated')
    } finally {
      setLoading(prev => ({ ...prev, vercel: false }))
    }
  }

  const loadDeploymentStatus = async () => {
    setLoading(prev => ({ ...prev, deployment: true }))
    try {
      const result = await actions.executeCommand('deployment.docker_status')
      setDeploymentStatus(result.stdout || result.stderr || 'No Docker containers running')
    } catch (error) {
      setDeploymentStatus(`Error checking deployment status: ${error.message}`)
    } finally {
      setLoading(prev => ({ ...prev, deployment: false }))
    }
  }

  const getCommitSyncStatus = () => {
    if (currentCommit === remoteCommit) {
      return { status: 'synced', color: '#10b981', icon: '✅', text: 'In sync' }
    } else {
      return { status: 'out-of-sync', color: '#f59e0b', icon: '⚠️', text: 'Out of sync' }
    }
  }

  const syncStatus = getCommitSyncStatus()

  return (
    <div data-testid="deployment-section">
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
          🚀 Deployment Status
        </h2>
        
        <button 
          onClick={loadDeploymentInfo}
          disabled={Object.values(loading).some(l => l)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: Object.values(loading).some(l => l) ? 'not-allowed' : 'pointer',
            background: Object.values(loading).some(l => l) ? '#6b7280' : '#10b981',
            color: 'white',
            opacity: Object.values(loading).some(l => l) ? 0.5 : 1
          }}
        >
          {Object.values(loading).some(l => l) ? '🔄' : '🔄'} Refresh
        </button>
      </div>

      {/* Git Status */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          color: '#3b82f6', 
          fontWeight: 'bold', 
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📋 Git Status
          {loading.git && <span style={{ color: '#6b7280', fontSize: '12px' }}>🔄</span>}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '5px' }}>
              Current Branch:
            </div>
            <div style={{ 
              color: '#10b981', 
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              background: '#0f172a',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              🌿 {currentBranch}
            </div>
          </div>
          
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '5px' }}>
              Sync Status:
            </div>
            <div style={{ 
              color: syncStatus.color,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              {syncStatus.icon} {syncStatus.text}
            </div>
          </div>
          
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '5px' }}>
              Local Commit:
            </div>
            <div style={{ 
              color: '#f1f5f9',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              background: '#0f172a',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              📝 {currentCommit}
            </div>
          </div>
          
          <div>
            <div style={{ color: '#e2e8f0', fontSize: '14px', marginBottom: '5px' }}>
              Remote Commit:
            </div>
            <div style={{ 
              color: '#f1f5f9',
              fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
              fontSize: '13px',
              background: '#0f172a',
              padding: '4px 8px',
              borderRadius: '4px'
            }}>
              🌐 {remoteCommit}
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Actions */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          color: '#a855f7', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚡ GitHub Actions
          {loading.github && <span style={{ color: '#6b7280', fontSize: '12px' }}>🔄</span>}
        </div>
        <div style={{
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '13px',
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#0f172a',
          padding: '10px',
          borderRadius: '4px'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {githubActions}
          </pre>
        </div>
      </div>

      {/* Vercel Deployments */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          color: '#06b6d4', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⚡ Vercel Deployments
          {loading.vercel && <span style={{ color: '#6b7280', fontSize: '12px' }}>🔄</span>}
        </div>
        <div style={{
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '13px',
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#0f172a',
          padding: '10px',
          borderRadius: '4px'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {vercelStatus}
          </pre>
        </div>
      </div>

      {/* Docker Status */}
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '15px'
      }}>
        <div style={{ 
          color: '#10b981', 
          fontWeight: 'bold', 
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🐳 Docker Status
          {loading.deployment && <span style={{ color: '#6b7280', fontSize: '12px' }}>🔄</span>}
        </div>
        <div style={{
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '13px',
          maxHeight: '200px',
          overflowY: 'auto',
          background: '#0f172a',
          padding: '10px',
          borderRadius: '4px'
        }}>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0' }}>
            {deploymentStatus}
          </pre>
        </div>
      </div>
    </div>
  )
} 