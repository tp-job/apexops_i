import type { FC } from 'react';
import type { IconType } from 'react-icons';
import IconLabel from './IconLabel';

interface IconButtonProps {
    icon: IconType;
    title?: string;
    size?: number | string;
    className?: string;
    iconClassName?: string;
    onClick?: () => void;
    hoverBgClass?: string;
}

/**
 * IconButton component - Pattern similar to note components
 * Button wrapper with icon, using note-like styling
 */
const IconButton: FC<IconButtonProps> = ({
    icon,
    title,
    size = 18,
    className = '',
    iconClassName = '',
    onClick,
    hoverBgClass = 'hover:bg-light-surface-2 dark:hover:bg-dark-surface-2',
}) => {
    return (
        <button
            className={`p-2 rounded-full ${hoverBgClass} text-light-text-secondary dark:text-dark-text-secondary transition-colors ${className}`}
            title={title}
            onClick={onClick}
        >
            <IconLabel
                icon={icon}
                size={size}
                iconClassName={iconClassName}
                as="span"
            />
        </button>
    );
};

export default IconButton;
