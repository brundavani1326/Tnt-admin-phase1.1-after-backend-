import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import apiClient from "../api/apiClient";
import Loader from "./Loader";

function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const adminUser = await apiClient.getCurrentAdmin();
        setIsAuth(!!adminUser);
      } catch (err) {
        console.error("Auth check failed:", err);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <Loader />;

  return isAuth ? children : <Navigate to="/" replace />;
}

export default ProtectedRoute;
