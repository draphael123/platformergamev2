import { Component } from 'react'
import Game from './Game'
import './App.css'

class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 24, maxWidth: 560, background: '#1a0a0a', color: '#ff6b6b',
          fontFamily: 'monospace', fontSize: 14, border: '2px solid #f44336',
          borderRadius: 8, margin: 20,
        }}>
          <h2 style={{ margin: '0 0 12px 0' }}>Something went wrong</h2>
          <pre style={{ overflow: 'auto', margin: 0 }}>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}

function App() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  )
}

export default App
