import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function AuthSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login } = useAuth();

    useEffect(() => {
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');
        const spreadsheetId = searchParams.get('spreadsheetId');

        if (token && userId && spreadsheetId) {
            const email = searchParams.get('email') || undefined;
            const name = searchParams.get('name') || undefined;
            login(token, userId, spreadsheetId, email, name);
            navigate('/');
        } else {
            navigate('/login');
        }
    }, [searchParams, login, navigate]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse">A preparar o seu espaço financeiro...</p>
            </div>
        </div>
    );
}
