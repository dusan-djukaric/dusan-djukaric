import {Navigate, Outlet} from "react-router-dom";
import { useEffect, useState } from "react";
import sessionManager from "../helper_functions/sessionManager";

const PrivateRoutes = ({isAuthenticated}) => {
    const [isSessionValid, setIsSessionValid] = useState(false);
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        const checkSession = () => {
            const valid = sessionManager.isSessionValid();
            setIsSessionValid(valid);
            setIsChecking(false);
            
            if (!valid && isAuthenticated) {
                // Session expired, redirect to login
                window.location.href = '/admin';
            }
        };

        checkSession();
        
        // Check session every minute
        const interval = setInterval(checkSession, 60000);
        
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    if (isChecking) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Verifying session...</p>
                </div>
            </div>
        );
    }

    return (
        (isAuthenticated && isSessionValid) ? <Outlet /> : <Navigate to="/admin" replace />
    );
}

export default PrivateRoutes;
