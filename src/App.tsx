import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AccessDeniedPage } from '@/features/auth/AccessDeniedPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { PatientsPage } from '@/features/patients/PatientsPage'
import { AgendaPage } from '@/features/appointments/AgendaPage'
import { FinancePage } from '@/features/finance/FinancePage'
import { FormBuilderPage } from '@/features/forms/FormBuilderPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/acesso-negado" element={<AccessDeniedPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PatientsPage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/financeiro" element={<FinancePage />} />
          <Route path="/formularios" element={<FormBuilderPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
