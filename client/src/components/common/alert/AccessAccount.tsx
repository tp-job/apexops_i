import type { FC } from 'react';
import { Link } from 'react-router-dom';

const AccessAccount: FC = () => {
    return (
        <>
            <div className="">
                <div className="max-w-xl w-full mx-auto bg-gray-800 rounded-xl overflow-hidden">
                    <div className="max-w-sm mx-auto pt-12 pb-8 px-5 text-center">
                        <div className="inline-flex items-center justify-center w-12 h-12 mb-5 bg-gray-600 rounded-full">
                            <i className="ri-alert-line text-global-red text-3xl"></i>
                        </div>
                        <h4 className="text-xl text-gray-100 font-semibold mb-5">Login</h4>
                        <p className="text-gray-300 font-medium">Please login to access account settings.</p>
                    </div>
                    <div className="pt-5 pb-6 px-6 bg-gray-900 -mb-2 flex flex-col sm:flex-row gap-4 sm:gap-6 items-center justify-center">
                        <Link to="#" className="inline-block w-full sm:w-auto py-3 px-5 text-center font-semibold leading-6 text-gray-200 bg-gray-500 hover:bg-gray-400 rounded-lg transition duration-200">Deactivate</Link>
                        <Link to="/Auth" className="group flex items-center justify-center w-11 h-11 bg-red-600 rounded-full cursor-pointer relative overflow-hidden transition-all duration-300 shadow-lg hover:w-32 hover:rounded-lg active:scale-95">
                            <div className="flex items-center justify-center w-full transition-all duration-300 group-hover:justify-start group-hover:px-3">
                                <i className="ri-login-box-line text-white text-xl"></i>
                            </div>
                            <div className="absolute right-5 transform translate-x-full opacity-0 text-white text-sm font-semibold transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 whitespace-nowrap">Login</div>
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AccessAccount;
