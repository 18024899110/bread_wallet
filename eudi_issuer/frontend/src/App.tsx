import { Routes, Route, Navigate } from 'react-router-dom'
import Register from './pages/Register'
import Login from './pages/Login'
import UserDashboard from './pages/UserDashboard'
import Apply from './pages/Apply'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminApplicationDetail from './pages/admin/AdminApplicationDetail'
import AdminUsers from './pages/admin/AdminUsers'
import UserApplicationDetail from './pages/UserApplicationDetail'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  return localStorage.getItem('token') ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const raw = localStorage.getItem('token')
  if (!raw) return <Navigate to="/login" replace />
  try {
    const payload = JSON.parse(atob(raw.split('.')[1]))
    if (payload.role !== 'admin') return <Navigate to="/dashboard" replace />
  } catch { return <Navigate to="/login" replace /> }
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<PrivateRoute><UserDashboard /></PrivateRoute>} />
      <Route path="/apply" element={<PrivateRoute><Apply /></PrivateRoute>} />
      <Route path="/applications/:id" element={<PrivateRoute><UserApplicationDetail /></PrivateRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/applications/:id" element={<AdminRoute><AdminApplicationDetail /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
    </Routes>
  )
}
