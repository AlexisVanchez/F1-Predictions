import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
    const user = useSelector((state) => state.user.user);
    const authLoading = useSelector((state) => state.user.authLoading);

    // Still resolving session – render nothing to avoid premature redirect
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#0a0b0f]">
                <div className="f1-loader"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/" replace />;
    }

    return children ? children : <Outlet />;
};

export default ProtectedRoute;
