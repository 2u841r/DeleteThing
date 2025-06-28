// Popup script for DeleteThing
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const statusDiv = document.getElementById('status');
        const statusText = document.getElementById('status-text');
        
        // Check if the current tab is on a supported site
        const supportedSites = [
            { 
                pattern: /vercel\.com\/[^\/]+\/[^\/]+\/settings/, 
                name: 'Vercel' 
            },
            { 
                pattern: /app\.netlify\.com\/projects\/[^\/]+\/configuration\/general/, 
                name: 'Netlify' 
            },
            { 
                pattern: /dash\.cloudflare\.com\/[^\/]+\/pages\/view\/[^\/]+\/settings\/production/, 
                name: 'Cloudflare Pages' 
            },
            { 
                pattern: /dash\.cloudflare\.com\/[^\/]+\/workers\/services\/view\/[^\/]+\/production\/settings/, 
                name: 'Cloudflare Workers' 
            }
        ];
        
        let isSupported = false;
        let siteName = '';
        
        for (const site of supportedSites) {
            if (site.pattern.test(tab.url)) {
                isSupported = true;
                siteName = site.name;
                break;
            }
        }
        
        if (isSupported) {
            statusDiv.className = 'status active';
            statusText.textContent = `Active on ${siteName}`;
        } else {
            statusDiv.className = 'status inactive';
            statusText.textContent = 'Not active on this page';
        }
        
    } catch (error) {
        console.error('Error in popup:', error);
        const statusDiv = document.getElementById('status');
        const statusText = document.getElementById('status-text');
        statusDiv.className = 'status inactive';
        statusText.textContent = 'Error checking page status';
    }
});