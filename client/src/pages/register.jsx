import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Play } from "lucide-react";
import { auth } from '@/frameworks/auth';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from "@/components/ui/alert";

const Wave = () => (
    <div className="absolute bottom-0 left-0 right-0" style={{ zIndex: 0 }}>
        <div className="relative w-full h-[50vh]">
            <div
                className="absolute bottom-0 left-0 w-full h-full"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%23A855F7'/%3E%3C/svg%3E")`,
                    animation: 'wave 65s ease-in-out infinite alternate, float2 6s ease-in-out infinite',
                    animationDelay: '11s',
                    opacity: '0.05',
                    width: '220%',
                    height: '100%',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'bottom',
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
            <div
                className="absolute bottom-0 left-0 w-full h-full"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%23A855F7'/%3E%3C/svg%3E")`,
                    animation: 'wave 49s ease-in-out infinite alternate, float2 9s ease-in-out infinite',
                    animationDelay: '-23s',
                    opacity: '0.1',
                    width: '210%',
                    height: '100%',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'bottom',
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
            <div
                className="absolute bottom-0 left-0 w-full h-full"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 88.7'%3E%3Cpath d='M800 56.9c-155.5 0-204.9-50-405.5-49.9-200 0-250 49.9-394.5 49.9v31.8h800v-.2-31.6z' fill='%23A855F7'/%3E%3C/svg%3E")`,
                    animation: 'wave 78s ease-in-out infinite alternate, float2 12s ease-in-out infinite',
                    animationDelay: '-42s',
                    opacity: '0.15',
                    width: '200%',
                    height: '100%',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'bottom',
                    transform: 'translate3d(0, 0, 0)'
                }}
            />
        </div>
        <style>{`
      @keyframes wave {
        0% {
          transform: translateX(0);
        }
        50% {
          transform: translateX(-25%);
        }
        100% {
          transform: translateX(-50%);
        }
      }
    `}</style>
    </div>
);

export default function RegisterPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        if (!username) return "Username is required";
        if (username.length < 3) return "Username must be at least 3 characters";
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Username can only contain letters, numbers, and underscores";
        if (password.length < 8) return "Password must be at least 8 characters";
        if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
        if (!/[a-z]/.test(password)) return "Password must contain a lowercase letter";
        if (!/[0-9]/.test(password)) return "Password must contain a number";
        if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain a special character";
        if (password !== confirmPassword) return "Passwords do not match";
        return "";
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);
        auth.register(email, password, username)
            .then(() => {
                navigate('/');
            })
            .catch(err => {
                setError(err.message || 'Registration failed');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="h-[calc(100vh-0.01px)] relative flex items-center justify-center bg-gradient-to-b from-purple-900 via-purple-800 to-black overflow-hidden">
            <Wave />

            <div className="w-full max-w-md p-6 relative z-10">
                <div style={{ animation: 'float 6s ease-in-out infinite' }}
                    className="flex items-center justify-center mb-8">
                    <Play className="text-purple-500 w-12 h-12" />
                    <span className="text-4xl font-bold text-white ml-2">peak</span>
                </div>

                <Card className="bg-black/60 backdrop-blur-sm border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-2xl text-white text-center">Create Account</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {error && (
                            <Alert variant="destructive" className="mb-4 bg-red-900/50 border-red-800">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                        <form onSubmit={handleRegister} className="space-y-4">
                            <Input
                                type="text"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="bg-zinc-800/50 border-zinc-700 text-white"
                            />
                            <div className="space-y-2">
                                <Input
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Input
                                    type="password"
                                    placeholder="Confirm Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="bg-zinc-800/50 border-zinc-700 text-white"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Creating Account...' : 'Sign Up'}
                            </Button>
                            <div className="text-sm text-zinc-400">
                                By signing up, you agree to our{' '}
                                <a href="#" className="text-white hover:underline">Terms</a>
                                {' '}and{' '}
                                <a href="#" className="text-white hover:underline">Privacy Policy</a>
                            </div>
                        </form>

                        <div className="mt-8">
                            <p className="text-zinc-400">
                                Already have an account?{' '}
                                <a href="#" className="text-white hover:underline" onClick={() => {
                                    navigate('/login')
                                }}>
                                    Sign in
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
                <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
        `}</style>
            </div>
        </div>
    );
}