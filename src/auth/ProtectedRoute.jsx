import React from "react";
import {Navigate, Outlet, useLocation} from "react-router-dom";
import {useAuth} from "./AuthContext";

export default function ProtectedRoute() {
    const {user, loading} = useAuth();
    const loc = useLocation();

    if (loading) return <div style={{maxWidth: 1100, margin: "40px auto"}}>로딩중…</div>;
    if (!user) return <Navigate to="/login" replace state={{from: loc}}/>;
    return <Outlet/>;
}
