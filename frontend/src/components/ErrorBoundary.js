import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console for debugging
    console.error('React Error Boundary caught an error:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Store error details in state
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // TODO: Send error to error tracking service (e.g., Sentry, LogRocket)
    // this.logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    // Navigate to home/dashboard
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: '#f5f5f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              color: '#e74c3c'
            }}>
              ⚠️
            </div>
            
            <h1 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#2c3e50',
              marginBottom: '10px'
            }}>
              Oops! Something went wrong
            </h1>
            
            <p style={{
              fontSize: '16px',
              color: '#7f8c8d',
              marginBottom: '30px',
              lineHeight: '1.5'
            }}>
              We're sorry for the inconvenience. An unexpected error occurred while rendering this page.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                textAlign: 'left',
                marginBottom: '30px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  fontWeight: '600',
                  color: '#495057',
                  marginBottom: '10px'
                }}>
                  Error Details (Development)
                </summary>
                <pre style={{
                  fontSize: '12px',
                  color: '#e74c3c',
                  overflow: 'auto',
                  margin: '10px 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <pre style={{
                    fontSize: '11px',
                    color: '#6c757d',
                    overflow: 'auto',
                    marginTop: '10px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  backgroundColor: '#3498db',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
              >
                Go to Dashboard
              </button>
              
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#495057',
                  backgroundColor: 'white',
                  border: '2px solid #dee2e6',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#f8f9fa';
                  e.target.style.borderColor = '#adb5bd';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'white';
                  e.target.style.borderColor = '#dee2e6';
                }}
              >
                Reload Page
              </button>
            </div>

            <p style={{
              fontSize: '14px',
              color: '#95a5a6',
              marginTop: '30px'
            }}>
              If this problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
