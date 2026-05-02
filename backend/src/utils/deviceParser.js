/**
 * Parse user agent string to extract device information
 */
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return {
            browser: 'Unknown',
            os: 'Unknown',
            deviceType: 'Unknown',
        };
    }

    // Parse browser
    let browser = 'Unknown';
    if (userAgent.includes('Edg/')) {
        browser = 'Microsoft Edge';
    } else if (userAgent.includes('Chrome/')) {
        browser = 'Google Chrome';
    } else if (userAgent.includes('Firefox/')) {
        browser = 'Mozilla Firefox';
    } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
        browser = 'Safari';
    } else if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) {
        browser = 'Opera';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) {
        browser = 'Internet Explorer';
    }

    // Parse OS
    let os = 'Unknown';
    if (userAgent.includes('Windows NT 10.0')) {
        os = 'Windows 10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
        os = 'Windows 8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
        os = 'Windows 8';
    } else if (userAgent.includes('Windows NT 6.1')) {
        os = 'Windows 7';
    } else if (userAgent.includes('Windows')) {
        os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
        const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
        os = match ? `macOS ${match[1].replace('_', '.')}` : 'macOS';
    } else if (userAgent.includes('Linux')) {
        if (userAgent.includes('Android')) {
            os = 'Android';
        } else {
            os = 'Linux';
        }
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
        os = 'iOS';
    }

    // Parse device type
    let deviceType = 'Desktop';
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        deviceType = 'Mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
        deviceType = 'Tablet';
    }

    return {
        browser,
        os,
        deviceType,
    };
}

/**
 * Generate a device name based on device info
 */
function generateDeviceName(browser, os, deviceType) {
    return `${browser} on ${os} (${deviceType})`;
}

/**
 * Get client IP address from request
 */
function getClientIp(req) {
    return (
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.headers['x-real-ip'] ||
        req.socket.remoteAddress ||
        req.connection.remoteAddress ||
        'Unknown'
    );
}

module.exports = {
    parseUserAgent,
    generateDeviceName,
    getClientIp,
};
