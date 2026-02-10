import type { FC } from 'react';
import '@/styles/components/socalmedia.css';

const Footer: FC = () => {
    const currentYear = new Date().getFullYear();

    return (
        <main className="mt-20">
            <div className="text-center">
                <div className="flex items-center gap-2 mx-auto mt-4 text-xl w-max">
                    <i className="ri-mail-fill"></i>
                    nevinasv@gmail.com
                </div>
            </div>
            <div className="text-center sm:flex items-center justify-between border-t border-r-gray-400 mx-[10%] mt-12 py-6">
                <p>{currentYear} | Nevinas</p>
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
        </main>
    );
};

export default Footer;