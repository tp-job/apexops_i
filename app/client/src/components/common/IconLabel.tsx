import type { FC } from 'react';
import type { IconType } from 'react-icons';

interface IconLabelProps {
    icon: IconType;
    label?: string;
    size?: number | string;
    className?: string;
    iconClassName?: string;
    labelClassName?: string;
    active?: boolean;
    onClick?: () => void;
    as?: 'button' | 'div' | 'span' | 'label';
}

/**
 * IconLabel component - Pattern similar to note components
 * Uses react-icons with note-like class styling
 * 
 * Pattern from note components:
 * - text-lg for icon size
 * - transition-colors duration-200
 * - text-light-text-secondary dark:text-dark-text-secondary
 */
const IconLabel: FC<IconLabelProps> = ({
    icon: Icon,
    label,
    size = 18,
    className = '',
    iconClassName = '',
    labelClassName = '',
    active = false,
    onClick,
    as = 'div',
}) => {
    const baseIconClasses = `text-lg transition-colors duration-200 ${
        active
            ? 'text-light-text-primary dark:text-dark-text-primary'
            : 'text-light-text-secondary dark:text-dark-text-secondary'
    } ${iconClassName}`;

    const baseLabelClasses = `text-sm font-medium tracking-wide ${
        active
            ? 'text-light-text-primary dark:text-dark-text-primary'
            : 'text-light-text-secondary dark:text-dark-text-secondary'
    } ${labelClassName}`;

    const iconElement = (
        <Icon
            className={baseIconClasses}
            style={{ fontSize: typeof size === 'number' ? `${size}px` : size }}
        />
    );

    const content = label ? (
        <>
            {iconElement}
            <span className={baseLabelClasses}>{label}</span>
        </>
    ) : (
        iconElement
    );

    const commonProps = {
        className: className || '',
        onClick,
    };

    switch (as) {
        case 'button':
            return (
                <button type="button" {...commonProps}>
                    {content}
                </button>
            );
        case 'span':
            return <span {...commonProps}>{content}</span>;
        case 'label':
            return <label {...commonProps}>{content}</label>;
        default:
            return <div {...commonProps}>{content}</div>;
    }
};

export default IconLabel;
