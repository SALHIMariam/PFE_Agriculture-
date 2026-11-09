import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from "react-router";
import ProtectedRoute from "./components/common/ProtectedRoute";
import PublicOnlyRoute from "./components/common/PublicOnlyRoute";
import AdminRoute from "./components/common/AdminRoute";
import { ScrollToTop } from "./components/common/ScrollToTop";
import AppLayout from "./layout/AppLayout";

// Toutes les pages sont chargées à la demande (React.lazy) : chaque route
// devient son propre chunk Vite, au lieu d'être incluse dans le bundle
// initial. Réduit fortement le JS téléchargé/parsé au premier chargement.
const NotFound = lazy(() => import("./pages/OtherPage/NotFound"));
const UserProfiles = lazy(() => import("./pages/UserProfiles"));
const Videos = lazy(() => import("./pages/UiElements/Videos"));
const Images = lazy(() => import("./pages/UiElements/Images"));
const Alerts = lazy(() => import("./pages/UiElements/Alerts"));
const Badges = lazy(() => import("./pages/UiElements/Badges"));
const Avatars = lazy(() => import("./pages/UiElements/Avatars"));
const Buttons = lazy(() => import("./pages/UiElements/Buttons"));
const LineChart = lazy(() => import("./pages/Charts/LineChart"));
const BarChart = lazy(() => import("./pages/Charts/BarChart"));
const Calendar = lazy(() => import("./pages/Calendar"));
const BasicTables = lazy(() => import("./pages/Tables/BasicTables"));
const FormElements = lazy(() => import("./pages/Forms/FormElements"));
const Blank = lazy(() => import("./pages/Blank"));
const FarmerDashboard = lazy(() => import("./pages/farmer/FarmerDashboard"));
const AnalysisDetailPage = lazy(() => import("./pages/farmer/AnalysisDetailPage"));
const Home = lazy(() => import("./pages/Dashboard/Home"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const AgriNovaLoginPage = lazy(() => import("./pages/AuthPages/AgriNovaLoginPage"));
const AgriNovaSignUpPage = lazy(() => import("./pages/AuthPages/AgriNovaSignUpPage"));
const SignIn = lazy(() => import("./pages/AuthPages/SignIn"));
const SignUp = lazy(() => import("./pages/AuthPages/SignUp"));
const AdminUsers = lazy(() => import("./pages/Admin/Users"));
const DiseaseHeatmapPage = lazy(() => import("./pages/Admin/DiseaseHeatmapPage"));
const NewsPage = lazy(() => import("./pages/Admin/NewsPage"));
const AnalysesOverview = lazy(() => import("./pages/Admin/AnalysesOverview"));
const ForcePasswordChange = lazy(() => import("./pages/AuthPages/ForcePasswordChange"));
const ForgotPasswordPage = lazy(() => import("./pages/AuthPages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/AuthPages/ResetPasswordPage"));
const ExpertAnalysesPage = lazy(() => import("./pages/Expert/AnalysesValidation"));
const CopilotPage = lazy(() => import("./pages/Expert/CopilotPage"));
const ExpertAnalyticsPage = lazy(() => import("./pages/Expert/ExpertAnalytics/ExpertAnalyticsPage"));
const NotificationsPage = lazy(() => import("./pages/Notifications/NotificationsPage"));

function PageFallback() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500" />
    </div>
  );
}

function LegacyDashboardRedirect() {
  const location = useLocation();
  const nextPath = location.pathname.replace(/^\/dashbord/, "/dashboard");

  return <Navigate to={`${nextPath}${location.search}${location.hash}`} replace />;
}

function AgriNovaSignInRoute() {
  return <AgriNovaLoginPage />;
}

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />

          {/* Dashboard Layout — protégé par session, accessible aux rôles admin et expert */}
          <Route path="/dashboard" element={<ProtectedRoute><AdminRoute roles={["admin", "expert"]}><AppLayout /></AdminRoute></ProtectedRoute>}>
            <Route index element={<Home />} />

            {/* Others Page */}
            <Route path="profile" element={<UserProfiles />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="blank" element={<Blank />} />

            {/* Forms */}
            <Route path="form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="alerts" element={<Alerts />} />
            <Route path="avatars" element={<Avatars />} />
            <Route path="badge" element={<Badges />} />
            <Route path="buttons" element={<Buttons />} />
            <Route path="images" element={<Images />} />
            <Route path="videos" element={<Videos />} />

            {/* Charts */}
            <Route path="line-chart" element={<LineChart />} />
            <Route path="bar-chart" element={<BarChart />} />

            {/* Admin */}
            <Route path="users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="analyses" element={<AdminRoute roles={["admin", "expert"]}><AnalysesOverview /></AdminRoute>} />
            <Route path="analyses/:id" element={<AnalysisDetailPage />} />
            <Route path="heatmap" element={<DiseaseHeatmapPage />} />
            <Route path="news" element={<NewsPage />} />
            <Route path="expert/analyses" element={<ExpertAnalysesPage />} />
            <Route path="copilot" element={<CopilotPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="expert-analytics" element={<AdminRoute roles={["expert", "admin"]}><ExpertAnalyticsPage /></AdminRoute>} />
          </Route>

          <Route path="/farmer/dashboard" element={<ProtectedRoute><AdminRoute roles={["farmer"]}><FarmerDashboard /></AdminRoute></ProtectedRoute>} />
          <Route path="/farmer/analyses/:id" element={<ProtectedRoute><AnalysisDetailPage /></ProtectedRoute>} />
          <Route path="/dashbord/*" element={<LegacyDashboardRedirect />} />

          <Route
            path="/landing"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />

          {/* Auth Layout — routes publiques uniquement (voir PublicOnlyRoute) */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <AgriNovaSignInRoute />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signin"
            element={
              <PublicOnlyRoute>
                <SignIn />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicOnlyRoute>
                <SignUp />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/agrinova-login"
            element={
              <PublicOnlyRoute>
                <AgriNovaSignInRoute />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/agrinova-signup"
            element={
              <PublicOnlyRoute>
                <AgriNovaSignUpPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />
          {/* /reset-password : hors PublicOnlyRoute — le token doit rester
              accessible même si une session traîne, sans déconnexion forcée */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/force-password-change"
            element={
              <ProtectedRoute>
                <ForcePasswordChange />
              </ProtectedRoute>
            }
          />


          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </Router>
    </>
  );
}
