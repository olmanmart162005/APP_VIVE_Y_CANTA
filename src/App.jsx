import { Routes, Route } from "react-router-dom"

import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Activities from "./pages/Activities"
import Finance from "./pages/Finance"
import Profile from "./pages/Profile"
import Notices from "./pages/Notices"
import Members from "./pages/Members"
import Gallery from "./pages/Gallery"
import Settings from "./pages/Settings"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/activities"
        element={<Activities />}
      />

      <Route
        path="/finance"
        element={<Finance />}
      />

      <Route
        path="/profile"
        element={<Profile />}
      />

      <Route
        path="/notices"
        element={<Notices />}
      />

      <Route
        path="/members"
        element={<Members />}
      />

      <Route
        path="/gallery"
        element={<Gallery />}
      />

      <Route
        path="/settings"
        element={<Settings />}
      />
    </Routes>
  )
}

export default App