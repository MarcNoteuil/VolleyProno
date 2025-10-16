import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold">VolleyProno</Link>
          <nav className="space-x-4 text-sm">
            <Link to="/groups" className="hover:underline">Groupes</Link>
            <Link to="/predictions" className="hover:underline">Pronostics</Link>
            <Link to="/ranking" className="hover:underline">Classement</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}

function Home() {
  return <div className="text-lg">Bienvenue sur VolleyProno</div>
}

function Groups() {
  return <div>Groupes</div>
}

function Predictions() {
  return <div>Pronostics</div>
}

function Ranking() {
  return <div>Classement</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
