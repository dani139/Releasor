export default function SystemSection() {
  return (
    <div data-testid="system-section">
      <h2 style={{ color: '#f1f5f9', marginBottom: '20px' }}>🖥️ System Monitoring</h2>
      <div style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '20px',
        color: '#e2e8f0'
      }}>
        <p>System monitoring will be implemented here.</p>
        <p>Features will include:</p>
        <ul>
          <li>CPU and memory usage</li>
          <li>Disk space monitoring</li>
          <li>Network status</li>
          <li>Process monitoring</li>
        </ul>
      </div>
    </div>
  )
} 