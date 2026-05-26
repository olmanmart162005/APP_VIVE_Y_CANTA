import { Navigate } from "react-router-dom"

function ProtectedRoute({
  user,
  allowedRoles,
  children,
}) {
  if (!user) {
    return <Navigate to="/" />
  }

  if (
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate to="/dashboard" />
    )
  }

  return children
}

export default ProtectedRoute