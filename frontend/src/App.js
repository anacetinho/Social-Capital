import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import People from './pages/People';
import PersonDetail from './pages/PersonDetail';
import PersonForm from './pages/PersonForm';
import NetworkGraph from './pages/NetworkGraph';
import Interactions from './pages/Interactions';
import EventForm from './pages/EventForm';
import EventDetail from './pages/EventDetail';
import FavorForm from './pages/FavorForm';
import FavorDetail from './pages/FavorDetail';
import Relationships from './pages/Relationships';
import RelationshipForm from './pages/RelationshipForm';
import RelationshipDetail from './pages/RelationshipDetail';
import Assets from './pages/Assets';
import AssetForm from './pages/AssetForm';
import AssetDetail from './pages/AssetDetail';
import ProfessionalHistoryForm from './pages/ProfessionalHistoryForm';
import ProfessionalHistoryDetail from './pages/ProfessionalHistoryDetail';
import BiographyForm from './pages/BiographyForm';
import BiographyDetail from './pages/BiographyDetail';
import Settings from './pages/Settings';
import './styles/App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/people"
            element={
              <ProtectedRoute>
                <People />
              </ProtectedRoute>
            }
          />

          <Route
            path="/people/new"
            element={
              <ProtectedRoute>
                <PersonForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/people/:id"
            element={
              <ProtectedRoute>
                <PersonDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/people/:id/edit"
            element={
              <ProtectedRoute>
                <PersonForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/network"
            element={
              <ProtectedRoute>
                <NetworkGraph />
              </ProtectedRoute>
            }
          />

          <Route
            path="/interactions"
            element={
              <ProtectedRoute>
                <Interactions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/new"
            element={
              <ProtectedRoute>
                <EventForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id"
            element={
              <ProtectedRoute>
                <EventDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:id/edit"
            element={
              <ProtectedRoute>
                <EventForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/favors/new"
            element={
              <ProtectedRoute>
                <FavorForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/favors/:id"
            element={
              <ProtectedRoute>
                <FavorDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/favors/:id/edit"
            element={
              <ProtectedRoute>
                <FavorForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/relationships"
            element={
              <ProtectedRoute>
                <Relationships />
              </ProtectedRoute>
            }
          />

          <Route
            path="/relationships/new"
            element={
              <ProtectedRoute>
                <RelationshipForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/relationships/:id"
            element={
              <ProtectedRoute>
                <RelationshipDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/relationships/:id/edit"
            element={
              <ProtectedRoute>
                <RelationshipForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <Assets />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets/new"
            element={
              <ProtectedRoute>
                <AssetForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets/:id"
            element={
              <ProtectedRoute>
                <AssetDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/assets/:id/edit"
            element={
              <ProtectedRoute>
                <AssetForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/professional-history/new"
            element={
              <ProtectedRoute>
                <ProfessionalHistoryForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/professional-history/:id"
            element={
              <ProtectedRoute>
                <ProfessionalHistoryDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/professional-history/:id/edit"
            element={
              <ProtectedRoute>
                <ProfessionalHistoryForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/biographies/new"
            element={
              <ProtectedRoute>
                <BiographyForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/biographies/:id"
            element={
              <ProtectedRoute>
                <BiographyDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/biographies/:id/edit"
            element={
              <ProtectedRoute>
                <BiographyForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
