import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const PAGE: React.CSSProperties = {
  position: 'relative',
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '32px',
  background: '#16243a',
  backgroundImage:
    'radial-gradient(110% 80% at 50% 18%, #1d3045 0%, #16243a 55%, #11192a 100%)',
  fontFamily: "'Manrope', sans-serif",
}

export function AccessDeniedPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleRetry() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div style={PAGE}>
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              background: 'rgba(232,144,144,0.12)',
              border: '2px solid #e89090',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#e89090',
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            ✕
          </div>
          <div>
            <div
              style={{ fontWeight: 800, fontSize: 22, color: '#eef4fa', letterSpacing: '-0.3px' }}
            >
              Acesso negado
            </div>
            <div
              style={{
                fontSize: 14,
                color: '#9bb0c6',
                marginTop: 10,
                lineHeight: 1.55,
                maxWidth: 300,
              }}
            >
              Esta aplicação é privada. Sua conta do Google não está autorizada a entrar.
            </div>
          </div>
          <button
            onClick={handleRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'transparent',
              border: '1.5px solid #355075',
              borderRadius: 11,
              padding: '13px 24px',
              cursor: 'pointer',
              fontFamily: "'Manrope', sans-serif",
              transition: 'background .15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#1c2c42')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: '#cfe0ef' }}>
              Tentar com outra conta
            </span>
          </button>
          <div style={{ fontSize: 12, color: '#5f7896' }}>
            Se isso é um engano, fale com o administrador.
          </div>
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 26,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          color: '#3f5876',
          letterSpacing: '0.5px',
        }}
      >
        Elo · gestão de pacientes de psicologia
      </div>
    </div>
  )
}
