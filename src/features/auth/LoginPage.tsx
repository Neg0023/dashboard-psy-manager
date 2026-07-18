import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from './AuthContext'

type View = 'inicial' | 'sucesso' | 'erro'

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

export function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState<View>('inicial')

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  function handleSuccess(credential: string) {
    login(credential)
    setView('sucesso')
    setTimeout(() => navigate('/', { replace: true }), 1500)
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
        {view === 'inicial' && (
          <InicialView onSuccess={handleSuccess} onError={() => setView('erro')} />
        )}
        {view === 'sucesso' && <SucessoView />}
        {view === 'erro' && <ErroView onRetry={() => setView('inicial')} />}
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

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2.5px solid #7fb0d8',
          display: 'inline-block',
          boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
        }}
      />
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2.5px solid #cfe0ef',
          display: 'inline-block',
          marginLeft: -13,
        }}
      />
    </div>
  )
}

function InicialView({
  onSuccess,
  onError,
}: {
  onSuccess: (credential: string) => void
  onError: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <Logo />
      <div>
        <div style={{ fontWeight: 800, fontSize: 30, color: '#eef4fa', letterSpacing: '-0.6px' }}>
          Elo
        </div>
        <div style={{ fontSize: 14, color: '#8aa3bf', marginTop: 8, lineHeight: 1.5 }}>
          O cuidado que conecta
        </div>
      </div>

      {/* Botão oficial do Google Identity Services.
          Renderiza dentro de um iframe do accounts.google.com; o clique real do
          usuário abre o popup e onSuccess devolve o ID Token (credential). */}
      <GoogleLogin
        onSuccess={(r) => (r.credential ? onSuccess(r.credential) : onError())}
        onError={onError}
        theme="filled_blue"
        size="large"
        shape="pill"
        text="signin_with"
        width="240"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#5f7896' }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: '#7fcfa0',
            display: 'inline-block',
          }}
        />
        Acesso criptografado · privado
      </div>
    </div>
  )
}

function SucessoView() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'rgba(127,207,160,0.12)',
          border: '2px solid #7fcfa0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#7fcfa0',
          fontSize: 28,
          fontWeight: 800,
        }}
      >
        ✓
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 23, color: '#eef4fa', letterSpacing: '-0.3px' }}>
          Acesso liberado
        </div>
        <div style={{ fontSize: 14, color: '#8aa3bf', marginTop: 8, lineHeight: 1.5 }}>
          Redirecionando para o painel…
        </div>
      </div>
      <div
        style={{
          width: 160,
          height: 4,
          borderRadius: 3,
          background: '#1c2c42',
          overflow: 'hidden',
        }}
      >
        <div
          className="psy-pulse"
          style={{ width: '60%', height: '100%', background: '#7fcfa0', borderRadius: 3 }}
        />
      </div>
    </div>
  )
}

function ErroView({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: 'rgba(224,182,106,0.12)',
          border: '2px solid #e0b66a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#e0b66a',
          fontSize: 30,
          fontWeight: 800,
        }}
      >
        !
      </div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#eef4fa', letterSpacing: '-0.3px' }}>
          Não foi possível conectar
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
          Verifique sua conexão com a internet e tente novamente.
        </div>
      </div>
      <button
        onClick={onRetry}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          background: '#eef4fa',
          border: 'none',
          borderRadius: 11,
          padding: '14px 26px',
          cursor: 'pointer',
          fontFamily: "'Manrope', sans-serif",
          boxShadow: '0 6px 18px rgba(0,0,0,0.30)',
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: '#16243a' }}>Tentar de novo</span>
      </button>
    </div>
  )
}
