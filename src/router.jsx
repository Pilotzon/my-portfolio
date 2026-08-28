import { lazy, Suspense } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import Navbar from './components/shared/Navbar/Navbar.jsx';
import Loader from './components/shared/Loader/Loader.jsx';

const HomePage = lazy(() => import('./pages/HomePage/HomePage.jsx'));
const AboutPage = lazy(() => import('./pages/AboutPage/AboutPage.jsx'));
const WorkPage = lazy(() => import('./pages/WorkPage/WorkPage.jsx'));
const ContactPage = lazy(() => import('./pages/ContactPage/ContactPage.jsx'));

function RouteLoading() {
  return <Loader />;
}

function SiteLayout() {
  return (
    <>
      <Navbar />
      <Suspense fallback={<RouteLoading />}>
        <Outlet />
      </Suspense>
    </>
  );
}

export const router = createBrowserRouter([
  {
    element: <SiteLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/about', element: <AboutPage /> },
      { path: '/work', element: <WorkPage /> },
      { path: '/contact', element: <ContactPage /> },
    ],
  },
]);
