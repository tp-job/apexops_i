import React, { useState } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import '@/styles/components/socalmedia.css'

const Auth: React.FC = () => {
    const { login, register } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [keepLoggedIn, setKeepLoggedIn] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                // Validation
                if (!firstName || !lastName || !email || !password || !confirmPassword) {
                    throw new Error('All fields are required');
                }
                if (password.length < 6) {
                    throw new Error('Password must be at least 6 characters');
                }
                if (password !== confirmPassword) {
                    throw new Error('Passwords do not match');
                }
                await register(firstName, lastName, email, password);
            } else {
                if (!email || !password) {
                    throw new Error('Email and password are required');
                }
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-light-bg dark:bg-dark-bg animate-fade-in">
            {/* Left Side - Modern Gradient Section */}
            <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-gradient-to-br from-indigo via-navy to-dark-bg items-center justify-center p-12 text-white">
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

                {/* Animated Background Elements */}
                <div className="absolute top-0 -left-20 w-80 h-80 bg-wine rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-pulse-soft"></div>
                <div className="absolute top-0 -right-20 w-80 h-80 bg-ember rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-pulse-soft" style={{ animationDelay: '1s' }}></div>
                <div className="absolute -bottom-32 left-20 w-80 h-80 bg-indigo rounded-full mix-blend-overlay filter blur-3xl opacity-40 animate-pulse-soft" style={{ animationDelay: '2s' }}></div>

                {/* Content */}
                <div className="relative z-10 max-w-lg text-center animate-fade-in-up">
                    <div className="mb-8 flex justify-center">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl skew-y-3 hover:skew-y-0 transition-transform duration-500">
                            <Shield className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-5xl font-bold mb-6 tracking-tight">Event Jungle</h1>
                    <p className="text-xl text-white/90 font-light leading-relaxed">
                        Join our community and experience the future of event management. clean, fast, and secure.
                    </p>
                </div>
            </div>

            {/* Right Side - Clean Form Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12 relative bg-light-bg dark:bg-dark-bg transition-colors duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-ember/5 to-indigo/5 dark:from-black/0 dark:to-white/0 pointer-events-none"></div>

                <div className="w-full max-w-md relative z-10 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                            {isSignUp ? 'Create Account' : 'Welcome Back'}
                        </h2>
                        <p className="text-light-text-secondary dark:text-dark-text-secondary">
                            {isSignUp ? 'Enter your details to get started' : 'Please enter your details to sign in'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-bounce-in">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {isSignUp && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary ml-1">First Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="input-modern"
                                        placeholder="John"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary ml-1">Last Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="input-modern"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary ml-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-modern"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary ml-1">Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-modern"
                                placeholder="••••••••"
                            />
                        </div>

                        {isSignUp && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary ml-1">Confirm Password</label>
                                <input
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="input-modern"
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <label className="flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={keepLoggedIn}
                                    onChange={(e) => setKeepLoggedIn(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 transition-colors"
                                />
                                <span className="ml-2 text-sm text-light-text-secondary dark:text-dark-text-secondary group-hover:text-light-text dark:group-hover:text-dark-text transition-colors">Keep me signed in</span>
                            </label>
                            <button type="button" className="text-sm font-medium text-ember dark:text-peach hover:text-wine transition-colors">
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-gradient-to-r from-ember to-wine hover:from-ember/90 hover:to-wine/90 text-white rounded-xl font-medium shadow-lg shadow-ember/30 hover:shadow-ember/50 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Processing...
                                </span>
                            ) : (
                                isSignUp ? 'Create Account' : 'Sign In'
                            )}
                        </button>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-4 bg-light-bg dark:bg-dark-bg text-gray-500 dark:text-gray-400">Or continue with</span>
                            </div>
                        </div>

                        {/* Social Media Sign In */}
                        <div className="space-y-4">
                            <div className="flex justify-center gap-4">
                                <ul className="flex items-center justify-center gap-10 mt-4 sm:mt-0 wrapper">
                                    <li className="icon contact">
                                        <span className="tooltip">Twitter</span>
                                        <a href="https://x.com/nevinas_ka" className="hover:text-global-purple transition-colors duration-200">
                                            <i className="text-3xl ri-twitter-fill"></i>
                                        </a>
                                    </li>
                                    <li className="icon contact">
                                        <span className="tooltip">Instagram</span>
                                        <a href="https://www.instagram.com/tp_job_th/?hl=en" className="hover:text-global-purple transition-colors duration-200">
                                            <i className="text-3xl ri-instagram-fill"></i>
                                        </a>
                                    </li>
                                    <li className="icon contact">
                                        <span className="tooltip">Github</span>
                                        <a href="https://github.com/tp-job" className="hover:text-global-purple transition-colors duration-200">
                                            <i className="text-3xl ri-github-fill"></i>
                                        </a>
                                    </li>
                                </ul>

                            </div>
                        </div>

                        <p className="text-center text-sm text-gray-500 mt-8">
                            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignUp(!isSignUp);
                                    setError('');
                                }}
                                className="font-semibold text-ember hover:text-wine transition-colors"
                            >
                                {isSignUp ? 'Sign In' : 'Sign Up'}
                            </button>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Auth;