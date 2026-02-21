import type { FC } from 'react';
import '@/styles/components/socalmedia.css';

const Footer: FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-surface-dark py-20 px-6 border-t border-white/5">
            <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
                <div className="col-span-2">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                            <span className="material-icons text-white text-xl">layers</span>
                            <p>{currentYear} | Nevinas</p>
                        </div>
                        <span className="text-xl font-bold tracking-tight">ApexOps</span>
                    </div>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary max-w-xs mb-8">Empowering developers with intelligent insights to build the next generation of software.</p>
                    <div className="flex gap-4">
                        <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary hover:text-white transition-colors" href="#">
                            <span className="material-icons">facebook</span>
                        </a>
                        <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary hover:text-white transition-colors" href="#">
                            <span className="material-icons">alternate_email</span>
                        </a>
                        <a className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-light-text-secondary dark:text-dark-text-secondary hover:text-white transition-colors" href="#">
                            <span className="material-icons">language</span>
                        </a>
                    </div>
                </div>
                <div>
                    <h6 className="text-white font-bold mb-6">Product</h6>
                    <ul className="space-y-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">
                        <li><a className="hover:text-primary transition-colors" href="#">Log Management</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">AI Diagnostics</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Error Tracking</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Pricing</a></li>
                    </ul>
                </div>
                <div>
                    <h6 className="text-white font-bold mb-6">Resources</h6>
                    <ul className="space-y-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">
                        <li><a className="hover:text-primary transition-colors" href="#">Documentation</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">API Reference</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Community</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Open Source</a></li>
                    </ul>
                </div>
                <div>
                    <h6 className="text-white font-bold mb-6">Company</h6>
                    <ul className="space-y-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">
                        <li><a className="hover:text-primary transition-colors" href="#">About Us</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Careers</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Blog</a></li>
                        <li><a className="hover:text-primary transition-colors" href="#">Contact</a></li>
                    </ul>
                </div>
            </div>
            <div className="max-w-7xl mx-auto mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-light-text-secondary/80 dark:text-dark-text-secondary/80 text-xs">
                <p>© 2024 ApexOps Inc. All rights reserved.</p>
                <div className="flex gap-8">
                    <a className="hover:text-white transition-colors" href="#">Privacy Policy</a>
                    <a className="hover:text-white transition-colors" href="#">Terms of Service</a>
                    <a className="hover:text-white transition-colors" href="#">Cookies</a>
                </div>
            </div>
        </footer>
    );
};

export default Footer;