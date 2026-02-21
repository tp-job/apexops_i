/**
 * Icon mapping utility - Maps remixicon (ri-*) and material-symbols to react-icons
 * Used to migrate from remixicon/material-symbols to react-icons
 */

import {
    // Material Design Icons (for material-symbols-outlined)
    MdSearch,
    MdExpandMore,
    MdEdit,
    MdCall,
    MdVideocam,
    MdInfo,
    MdReply,
    MdEmojiEmotions,
    MdMic,
    MdImage,
    MdAttachFile,
    MdFavorite,
    MdForum,
} from 'react-icons/md';
import {
    // Dashboard & Navigation
    RiDashboardHorizontalFill,
    RiDashboardLine,
    // Bug & Issues
    RiBugFill,
    RiBugLine,
    // Chat & Messages
    RiMessage2Fill,
    RiMessage2Line,
    RiMessage3Fill,
    RiMessage3Line,
    // AI & Assistant
    RiRobotFill,
    RiRobotLine,
    // Note: RiBardFill doesn't exist, use RiRobotFill as fallback
    // Notes & Documents
    RiBookletFill,
    RiBookletLine,
    RiStickyNoteFill,
    RiStickyNoteLine,
    RiFileAddFill,
    RiFileAddLine,
    RiFileEditFill,
    RiFileEditLine,
    // Calendar & Time
    RiCalendarFill,
    RiCalendarLine,
    RiCalendarEventFill,
    RiCalendarEventLine,
    // User & Profile
    RiUserFill,
    RiUserLine,
    RiUserAddFill,
    RiUserAddLine,
    RiUserSettingsFill,
    RiUserSettingsLine,
    // Settings & Config
    RiSettings3Fill,
    RiSettings3Line,
    RiSettings4Fill,
    RiSettings4Line,
    // Actions
    RiAddFill,
    RiAddLine,
    RiEditFill,
    RiEditLine,
    RiDeleteBinFill,
    RiDeleteBinLine,
    RiSaveFill,
    RiSaveLine,
    RiDeleteBin5Fill,
    RiDeleteBin5Line,
    RiArchiveFill,
    RiArchiveLine,
    RiArchiveStackFill,
    RiInboxArchiveFill,
    RiInboxArchiveLine,
    // Visual & Media
    RiImageAddFill,
    RiImageAddLine,
    RiImageFill,
    RiImageLine,
    RiPaletteFill,
    RiPaletteLine,
    // Navigation & UI
    RiMenu3Fill,
    RiMenu3Line,
    RiCloseFill,
    RiCloseLine,
    RiArrowRightWideFill,
    RiArrowLeftWideFill,
    RiArrowUpFill,
    RiArrowDownFill,
    RiMore2Fill,
    RiMore2Line,
    RiMoreFill,
    RiMoreLine,
    // Code & Development
    RiCodeFill,
    RiCodeLine,
    // Notifications & Alerts
    RiNotification3Fill,
    RiNotification3Line,
    RiNotificationFill,
    RiNotificationLine,
    RiLightbulbFill,
    RiLightbulbLine,
    // Tags & Labels
    RiPriceTag3Fill,
    RiPriceTag3Line,
    RiPriceTagFill,
    RiPriceTagLine,
    // Pin & Bookmark
    RiPushpin2Fill,
    RiPushpin2Line,
    RiPushpinFill,
    RiPushpinLine,
    // Link & Share - Note: RiLinkFill/Line don't exist, use RiLinksFill/Line instead
    RiLinksFill,
    RiLinksLine,
    RiShareFill,
    RiShareLine,
    RiShareBoxFill,
    RiShareBoxLine,
    // Theme & Display
    RiMoonFill,
    RiMoonLine,
    RiSunFill,
    RiSunLine,
    // Language & Translation - Note: RiTranslate2Fill/Line don't exist, use RiGlobeFill/Line as fallback
    // Logout & Exit
    RiLogoutBoxFill,
    RiLogoutBoxLine,
    // Folder & Files
    RiFolderFill,
    RiFolderLine,
    RiFolderAddFill,
    RiFolderAddLine,
    // Search
    RiSearchFill,
    RiSearchLine,
    // Check & Validation
    RiCheckboxCircleFill,
    RiCheckboxCircleLine,
    RiCheckFill,
    RiCheckLine,
    RiCheckboxFill,
    RiCheckboxLine,
    RiLoaderFill,
    RiLoaderLine,
    RiPencilFill,
    RiPencilLine,
    RiLayoutGridFill,
    RiLayoutGridLine,
    // Time & Schedule - Note: RiScheduleFill/Line don't exist, use RiTimeFill/Line or RiCalendarEventFill/Line
    RiTimeFill,
    RiTimeLine,
    // Terminal & Console
    RiTerminalFill,
    RiTerminalLine,
    RiTerminalBoxFill,
    RiTerminalBoxLine,
    // Globe & Network
    RiGlobeFill,
    RiGlobeLine,
    // Shield & Security
    RiShieldFill,
    RiShieldLine,
    RiShieldCheckFill,
    RiShieldCheckLine,
    // Lock & Security
    RiLockFill,
    RiLockLine,
    RiLockPasswordFill,
    RiLockPasswordLine,
    RiKeyFill,
    RiKeyLine,
    // Camera & Media
    RiCameraFill,
    RiCameraLine,
    // Building & Company
    RiBuildingFill,
    RiBuildingLine,
    RiBuilding2Fill,
    RiBuilding2Line,
    // Map & Location
    RiMapPinFill,
    RiMapPinLine,
    RiMapPin2Fill,
    RiMapPin2Line,
    // Mail & Email
    RiMailFill,
    RiMailLine,
    // Phone
    RiPhoneFill,
    RiPhoneLine,
    // Analytics & Charts
    RiBarChartFill,
    RiBarChartLine,
    RiLineChartFill,
    RiLineChartLine,
    RiPieChartFill,
    RiPieChartLine,
    // Coupon & Tickets
    RiCoupon3Fill,
    RiCoupon3Line,
    RiCouponFill,
    RiCouponLine,
    // Error & Warning
    RiErrorWarningFill,
    RiErrorWarningLine,
    RiAlertFill,
    RiAlertLine,
    // Social
    RiTwitterFill,
    RiTwitterLine,
    RiInstagramFill,
    RiInstagramLine,
    RiGithubFill,
    RiGithubLine,
} from 'react-icons/ri';

/**
 * Maps remixicon class names (ri-*) to react-icons components
 */
export const iconMap: Record<string, any> = {
    // Dashboard
    'ri-dashboard-horizontal-fill': RiDashboardHorizontalFill,
    'ri-dashboard-horizontal-line': RiDashboardLine,
    // Bug
    'ri-bug-fill': RiBugFill,
    'ri-bug-line': RiBugLine,
    // Messages
    'ri-message-2-fill': RiMessage2Fill,
    'ri-message-2-line': RiMessage2Line,
    'ri-message-3-fill': RiMessage3Fill,
    'ri-message-3-line': RiMessage3Line,
    // AI - Note: ri-bard-fill doesn't exist, use RiRobotFill as fallback
    'ri-bard-fill': RiRobotFill,
    'ri-robot-fill': RiRobotFill,
    'ri-robot-line': RiRobotLine,
    // Notes
    'ri-booklet-fill': RiBookletFill,
    'ri-booklet-line': RiBookletLine,
    'ri-sticky-note-fill': RiStickyNoteFill,
    'ri-sticky-note-line': RiStickyNoteLine,
    'ri-file-add-fill': RiFileAddFill,
    'ri-file-add-line': RiFileAddLine,
    'ri-file-edit-fill': RiFileEditFill,
    'ri-file-edit-line': RiFileEditLine,
    // Calendar
    'ri-calendar-fill': RiCalendarFill,
    'ri-calendar-line': RiCalendarLine,
    'ri-calendar-event-fill': RiCalendarEventFill,
    'ri-calendar-event-line': RiCalendarEventLine,
    // User - Note: ri-user-circle-* doesn't exist, use RiUserFill/Line as fallback
    'ri-user-fill': RiUserFill,
    'ri-user-line': RiUserLine,
    'ri-user-add-fill': RiUserAddFill,
    'ri-user-add-line': RiUserAddLine,
    'ri-user-settings-fill': RiUserSettingsFill,
    'ri-user-settings-line': RiUserSettingsLine,
    'ri-user-circle-fill': RiUserFill,
    'ri-user-circle-line': RiUserLine,
    // Settings
    'ri-settings-3-fill': RiSettings3Fill,
    'ri-settings-3-line': RiSettings3Line,
    'ri-settings-4-fill': RiSettings4Fill,
    'ri-settings-4-line': RiSettings4Line,
    // Actions
    'ri-add-fill': RiAddFill,
    'ri-add-line': RiAddLine,
    'ri-edit-fill': RiEditFill,
    'ri-edit-line': RiEditLine,
    'ri-delete-bin-fill': RiDeleteBinFill,
    'ri-delete-bin-line': RiDeleteBinLine,
    'ri-save-fill': RiSaveFill,
    'ri-save-line': RiSaveLine,
    'ri-delete-bin-5-fill': RiDeleteBin5Fill,
    'ri-delete-bin-5-line': RiDeleteBin5Line,
    'ri-archive-fill': RiArchiveFill,
    'ri-archive-line': RiArchiveLine,
    'ri-archive-stack-fill': RiArchiveStackFill,
    'ri-inbox-archive-fill': RiInboxArchiveFill,
    'ri-inbox-archive-line': RiInboxArchiveLine,
    // Media
    'ri-image-add-fill': RiImageAddFill,
    'ri-image-add-line': RiImageAddLine,
    'ri-image-fill': RiImageFill,
    'ri-image-line': RiImageLine,
    'ri-palette-fill': RiPaletteFill,
    'ri-palette-line': RiPaletteLine,
    // Navigation
    'ri-menu-3-fill': RiMenu3Fill,
    'ri-menu-3-line': RiMenu3Line,
    'ri-close-fill': RiCloseFill,
    'ri-close-line': RiCloseLine,
    'ri-arrow-right-wide-fill': RiArrowRightWideFill,
    'ri-arrow-left-wide-fill': RiArrowLeftWideFill,
    'ri-arrow-up-fill': RiArrowUpFill,
    'ri-arrow-down-fill': RiArrowDownFill,
    'ri-more-2-fill': RiMore2Fill,
    'ri-more-2-line': RiMore2Line,
    'ri-more-fill': RiMoreFill,
    'ri-more-line': RiMoreLine,
    // Code - Note: ri-code-s-slash-* may not exist, use RiCodeFill/Line as fallback
    'ri-code-s-slash-fill': RiCodeFill,
    'ri-code-s-slash-line': RiCodeLine,
    'ri-code-fill': RiCodeFill,
    'ri-code-line': RiCodeLine,
    // Notifications
    'ri-notification-3-fill': RiNotification3Fill,
    'ri-notification-3-line': RiNotification3Line,
    'ri-notification-fill': RiNotificationFill,
    'ri-notification-line': RiNotificationLine,
    'ri-lightbulb-fill': RiLightbulbFill,
    'ri-lightbulb-line': RiLightbulbLine,
    // Tags
    'ri-price-tag-3-fill': RiPriceTag3Fill,
    'ri-price-tag-3-line': RiPriceTag3Line,
    'ri-price-tag-fill': RiPriceTagFill,
    'ri-price-tag-line': RiPriceTagLine,
    // Pin
    'ri-pushpin-2-fill': RiPushpin2Fill,
    'ri-pushpin-2-line': RiPushpin2Line,
    'ri-pushpin-fill': RiPushpinFill,
    'ri-pushpin-line': RiPushpinLine,
    // Link & Share - Note: ri-link-* maps to RiLinks-* (correct icon name)
    'ri-link-fill': RiLinksFill,
    'ri-link-line': RiLinksLine,
    'ri-links-fill': RiLinksFill,
    'ri-links-line': RiLinksLine,
    'ri-share-fill': RiShareFill,
    'ri-share-line': RiShareLine,
    'ri-share-box-fill': RiShareBoxFill,
    'ri-share-box-line': RiShareBoxLine,
    // Theme
    'ri-moon-fill': RiMoonFill,
    'ri-moon-line': RiMoonLine,
    'ri-sun-fill': RiSunFill,
    'ri-sun-line': RiSunLine,
    // Language - Note: ri-translate-* icons don't exist in react-icons, use RiGlobeFill/Line as fallback
    'ri-translate-2-fill': RiGlobeFill,
    'ri-translate-2-line': RiGlobeLine,
    'ri-translate-fill': RiGlobeFill,
    'ri-translate-line': RiGlobeLine,
    // Logout - Note: ri-logout-box-r-* doesn't exist, use RiLogoutBoxFill/Line as fallback
    'ri-logout-box-fill': RiLogoutBoxFill,
    'ri-logout-box-line': RiLogoutBoxLine,
    'ri-logout-box-r-fill': RiLogoutBoxFill,
    'ri-logout-box-r-line': RiLogoutBoxLine,
    // Folders
    'ri-folder-fill': RiFolderFill,
    'ri-folder-line': RiFolderLine,
    'ri-folder-add-fill': RiFolderAddFill,
    'ri-folder-add-line': RiFolderAddLine,
    // Note: ri-create-new-folder-* icons don't exist in react-icons, use ri-folder-add-* instead
    'ri-create-new-folder-fill': RiFolderAddFill,
    'ri-create-new-folder-line': RiFolderAddLine,
    // Search
    'ri-search-fill': RiSearchFill,
    'ri-search-line': RiSearchLine,
    // Check
    'ri-checkbox-circle-fill': RiCheckboxCircleFill,
    'ri-checkbox-circle-line': RiCheckboxCircleLine,
    'ri-check-fill': RiCheckFill,
    'ri-check-line': RiCheckLine,
    'ri-checkbox-fill': RiCheckboxFill,
    'ri-checkbox-line': RiCheckboxLine,
    // List check - use checkbox as fallback
    'ri-list-check': RiCheckboxFill,
    // Loader - use RiLoader instead of RiLoader4
    'ri-loader-4-fill': RiLoaderFill,
    'ri-loader-4-line': RiLoaderLine,
    'ri-loader-fill': RiLoaderFill,
    'ri-loader-line': RiLoaderLine,
    // Image - use existing RiImage
    'ri-image-2-fill': RiImageFill,
    'ri-image-2-line': RiImageLine,
    // List unordered - use checkbox list or menu
    'ri-list-unordered': RiMenu3Line,
    // Pencil
    'ri-pencil-fill': RiPencilFill,
    'ri-pencil-line': RiPencilLine,
    // Menu - use RiMenu3 as fallback
    'ri-menu-fill': RiMenu3Fill,
    'ri-menu-line': RiMenu3Line,
    // Grid - use layout grid
    'ri-grid-fill': RiLayoutGridFill,
    'ri-grid-line': RiLayoutGridLine,
    // Time - Note: ri-schedule-* doesn't exist, use RiCalendarEventFill/Line as fallback
    'ri-time-fill': RiTimeFill,
    'ri-time-line': RiTimeLine,
    'ri-schedule-fill': RiCalendarEventFill,
    'ri-schedule-line': RiCalendarEventLine,
    // Terminal
    'ri-terminal-fill': RiTerminalFill,
    'ri-terminal-line': RiTerminalLine,
    'ri-terminal-box-fill': RiTerminalBoxFill,
    'ri-terminal-box-line': RiTerminalBoxLine,
    // Globe
    'ri-globe-fill': RiGlobeFill,
    'ri-globe-line': RiGlobeLine,
    // Shield
    'ri-shield-fill': RiShieldFill,
    'ri-shield-line': RiShieldLine,
    'ri-shield-check-fill': RiShieldCheckFill,
    'ri-shield-check-line': RiShieldCheckLine,
    // Lock
    'ri-lock-fill': RiLockFill,
    'ri-lock-line': RiLockLine,
    'ri-lock-password-fill': RiLockPasswordFill,
    'ri-lock-password-line': RiLockPasswordLine,
    'ri-key-fill': RiKeyFill,
    'ri-key-line': RiKeyLine,
    // Camera
    'ri-camera-fill': RiCameraFill,
    'ri-camera-line': RiCameraLine,
    // Building
    'ri-building-fill': RiBuildingFill,
    'ri-building-line': RiBuildingLine,
    'ri-building-2-fill': RiBuilding2Fill,
    'ri-building-2-line': RiBuilding2Line,
    // Map
    'ri-map-pin-fill': RiMapPinFill,
    'ri-map-pin-line': RiMapPinLine,
    'ri-map-pin-2-fill': RiMapPin2Fill,
    'ri-map-pin-2-line': RiMapPin2Line,
    // Mail
    'ri-mail-fill': RiMailFill,
    'ri-mail-line': RiMailLine,
    // Phone
    'ri-phone-fill': RiPhoneFill,
    'ri-phone-line': RiPhoneLine,
    // Charts
    'ri-bar-chart-fill': RiBarChartFill,
    'ri-bar-chart-line': RiBarChartLine,
    'ri-line-chart-fill': RiLineChartFill,
    'ri-line-chart-line': RiLineChartLine,
    'ri-pie-chart-fill': RiPieChartFill,
    'ri-pie-chart-line': RiPieChartLine,
    // Coupon
    'ri-coupon-3-fill': RiCoupon3Fill,
    'ri-coupon-3-line': RiCoupon3Line,
    'ri-coupon-fill': RiCouponFill,
    'ri-coupon-line': RiCouponLine,
    // Error
    'ri-error-warning-fill': RiErrorWarningFill,
    'ri-error-warning-line': RiErrorWarningLine,
    'ri-alert-fill': RiAlertFill,
    'ri-alert-line': RiAlertLine,
    // Social
    'ri-twitter-fill': RiTwitterFill,
    'ri-twitter-line': RiTwitterLine,
    'ri-instagram-fill': RiInstagramFill,
    'ri-instagram-line': RiInstagramLine,
    'ri-github-fill': RiGithubFill,
    'ri-github-line': RiGithubLine,
};

/**
 * Material symbols to react-icons mapping
 */
export const materialSymbolsMap: Record<string, any> = {
    'search': MdSearch,
    'expand_more': MdExpandMore,
    'edit_square': MdEdit,
    'call': MdCall,
    'videocam': MdVideocam,
    'info': MdInfo,
    'reply': MdReply,
    'sentiment_satisfied': MdEmojiEmotions,
    'mic': MdMic,
    'image': MdImage,
    'attach_file': MdAttachFile,
    'favorite': MdFavorite,
    'forum': MdForum,
};

/**
 * Get react-icons component from remixicon class name
 */
export const getIcon = (iconClass: string): any => {
    return iconMap[iconClass] || null;
};

/**
 * Get react-icons component from material-symbols name
 */
export const getMaterialIcon = (symbolName: string): any => {
    return materialSymbolsMap[symbolName] || null;
};

/**
 * Check if icon class is a remixicon class
 */
export const isRemixIcon = (iconClass: string): boolean => {
    return iconClass.startsWith('ri-') && iconMap[iconClass] !== undefined;
};
