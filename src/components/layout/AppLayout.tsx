import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthContext'

function getInitials(name: string | undefined, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  }
  return email.slice(0, 2).toUpperCase()
}

const NAV_ITEMS = [
  {
    to: '/', end: true, label: 'Pacientes',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/agenda', end: false, label: 'Agenda',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    to: '/financeiro', end: false, label: 'Financeiro',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
  {
    to: '/formularios', end: false, label: 'Anamnese',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
  },
] as const

type NavItemDef = (typeof NAV_ITEMS)[number]

function NavItem({ to, end, label, icon }: NavItemDef) {
  const [hovered, setHovered] = useState(false)
  return (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 12px', borderRadius: 10, textDecoration: 'none',
        background: isActive ? '#1a2c44' : hovered ? '#16243a' : 'transparent',
        color: isActive ? '#eef4fa' : hovered ? '#cfe0ef' : '#8aa3bf',
        fontSize: 14, fontWeight: isActive ? 700 : 600,
        transition: 'background .15s ease, color .15s ease',
      })}
    >
      {({ isActive }) => (
        <>
          <span style={{ color: isActive ? '#7fb0d8' : 'inherit', display: 'flex', flexShrink: 0 }}>
            {icon}
          </span>
          {label}
        </>
      )}
    </NavLink>
  )
}

function LogoutButton() {
  const { logout } = useAuth()
  const [hovered, setHovered] = useState(false)

  return (
    <button
      type="button"
      onClick={logout}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Sair"
      aria-label="Sair da conta"
      style={{
        marginLeft: 'auto', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 9,
        background: hovered ? '#16243a' : 'transparent',
        border: 'none', cursor: 'pointer', padding: 0,
        color: hovered ? '#cfe0ef' : '#5f7896',
        transition: 'background .15s ease, color .15s ease',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  )
}

export function AppLayout() {
  const { user } = useAuth()
  const initials = getInitials(user?.name, user?.email ?? '')
  const displayName = user?.name || user?.email?.split('@')[0] || 'Admin'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#11192a', color: '#eef4fa', fontFamily: "'Manrope', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ width: 228, flexShrink: 0, background: '#0f1726', borderRight: '1px solid #1c2c42', display: 'flex', flexDirection: 'column', padding: '22px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 24px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid #7fb0d8', display: 'inline-block' }} />
            <span style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid #cfe0ef', display: 'inline-block', marginLeft: -9 }} />
          </span>
          <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.4px' }}>Elo</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {NAV_ITEMS.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 8px', borderTop: '1px solid #1c2c42' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#223850', border: '1px solid #355075', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#cfe0ef', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ lineHeight: 1.3, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
            <div style={{ fontSize: 11, color: '#5f7896' }}>administrador</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main area — each page manages its own padding */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
