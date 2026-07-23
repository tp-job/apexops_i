import type { FC } from 'react';
import PresentStatPanel from './PresentStatPanel';
import PresentMarketPanel from './PresentMarketPanel';

const Present: FC = () => {
    return (
        <>
            <style>
                {`
        .technical-grid {
            background-size: 100% 100%;
            background-image: 
                linear-gradient(to right, rgba(255, 255, 255, 0.2) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
            background-size: 200px 200px;
            mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
        }
        .dot-intersection {
            width: 12px;
            height: 12px;
            background-color: white;
            border-radius: 50%;
            position: absolute;
            box-shadow: 0 0 15px 2px rgba(255, 255, 255, 0.6);
        }
        .grid-line-h {
            position: absolute;
            left: 0;
            right: 0;
            height: 1px;
            background: rgba(255, 255, 255, 0.4);
            border-top: 1px dotted rgba(255, 255, 255, 0.8);
        }
        .grid-line-v {
            position: absolute;
            top: 0;
            bottom: 0;
            width: 1px;
            background: rgba(255, 255, 255, 0.4);
            border-left: 1px dotted rgba(255, 255, 255, 0.8);
        }
                `}
            </style>
            <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col lg:flex-row overflow-hidden font-display">
                <PresentStatPanel />
                <PresentMarketPanel />
            </div>
        </>
    );
};

export default Present;

