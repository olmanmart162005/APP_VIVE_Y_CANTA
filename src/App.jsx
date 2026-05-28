import { Routes, Route } from "react-router-dom"
import { useEffect, useState } from "react"

import SplashScreen from "./components/SplashScreen"

import EditProfile from "./pages/EditProfile"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import MemberDetails from "./pages/MemberDetails"
import MemberCard from "./pages/MemberCard"
import Activities from "./pages/Activities"
import Finance from "./pages/Finance"
import Profile from "./pages/Profile"
import Notices from "./pages/Notices"
import Members from "./pages/Members"
import Gallery from "./pages/Gallery"
import Settings from "./pages/Settings"

function App() {

  const [loading,
    setLoading] =
    useState(true)

  useEffect(() => {

    const timer =
      setTimeout(() => {

        setLoading(false)

      }, 2500)

    return () =>
      clearTimeout(timer)

  }, [])

  if (loading) {
    return (
      <SplashScreen />
    )
  }

  return (
    <Routes>

      <Route
        path="/"
        element={<Login />}
      />

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
        path="/members"
        element={<Members />}
      />

      <Route
        path="/member/:id"
        element={<MemberDetails />}
      />

      <Route
        path="/carnet/:id"
        element={<MemberCard />}
      />

      <Route
        path="/profile"
        element={<Profile />}
      />

      <Route
        path="/profile/edit"
        element={<EditProfile />}
      />

      <Route
        path="/notices"
        element={<Notices />}
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