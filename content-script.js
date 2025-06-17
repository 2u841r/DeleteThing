// DeleteThing - Content Script
(function() {
    'use strict';

    // Configuration for different platforms
    const platforms = {
        vercel: {
            domain: 'vercel.com',
            urlPattern: /vercel\.com\/[^\/]+\/[^\/]+\/settings/,
            selectors: {
                modal: '[data-geist-modal-body]',
                projectNameInput: 'input[name="resourceName"]',
                confirmationInput: 'input[name="verificationText"]',
                projectNameText: 'b[style*="overflow-wrap"]'
            },
            confirmationText: 'delete my project'
        },
        netlify: {
            domain: 'app.netlify.com',
            urlPattern: /app\.netlify\.com\/projects\/[^\/]+\/configuration\/general/,
            selectors: {
                modal: '.modal-content',
                projectNameInput: 'input[name="Name"]',
                projectNameCode: 'code'
            }
        },
        cloudflare: {
            domain: 'dash.cloudflare.com',
            urlPattern: /dash\.cloudflare\.com\/[^\/]+\/pages\/view\/[^\/]+\/settings\/production/,
            selectors: {
                modal: 'form',
                confirmationInput: 'input[data-testid="deletionChallenge"]',
                projectNameText: 'strong span'
            }
        },
        cloudflareWorkers: {
            domain: 'dash.cloudflare.com',
            urlPattern: /dash\.cloudflare\.com\/[^\/]+\/workers\/services\/view\/[^\/]+\/production\/settings/,
            selectors: {
                modal: 'form',
                confirmationInput: 'input[data-testid="deletionChallenge"]',
                projectNameText: 'strong span'
            }
        }
    };

    // Detect current platform
    function getCurrentPlatform() {
        const hostname = window.location.hostname;
        const url = window.location.href;
        
        for (const [key, platform] of Object.entries(platforms)) {
            if (hostname.includes(platform.domain) && platform.urlPattern.test(url)) {
                return { key, ...platform };
            }
        }
        return null;
    }

    // Extract project name from various sources
    function extractProjectName(platform) {
        // Try to get from URL first
        const urlParts = window.location.pathname.split('/');
        
        if (platform.key === 'vercel') {
            // For Vercel: /user/project/settings
            return urlParts[2];
        } else if (platform.key === 'netlify') {
            // For Netlify: /projects/project-name/configuration/general
            return urlParts[2];
        } else if (platform.key === 'cloudflare') {
            // For Cloudflare: /account/pages/view/project-name/settings/production
            return urlParts[4];
        } else if (platform.key === 'cloudflareWorkers') {
            // For Cloudflare Workers: /account/workers/services/view/worker-name/production/settings
            return urlParts[5];
        }
        
        return null;
    }

    // Auto-fill deletion fields
    function autoFillDeletionFields(platform) {
        const modal = document.querySelector(platform.selectors.modal);
        if (!modal) return false;

        let projectName = null;
        let filled = false;

        // Extract project name from DOM elements
        if (platform.key === 'vercel') {
            const projectNameElement = modal.querySelector(platform.selectors.projectNameText);
            if (projectNameElement) {
                projectName = projectNameElement.textContent.trim();
            }
            
            if (projectName) {
                const projectNameInput = modal.querySelector(platform.selectors.projectNameInput);
                const confirmationInput = modal.querySelector(platform.selectors.confirmationInput);
                
                if (projectNameInput && !projectNameInput.value) {
                    projectNameInput.value = projectName;
                    projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    projectNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    filled = true;
                }
                
                if (confirmationInput && !confirmationInput.value) {
                    confirmationInput.value = platform.confirmationText;
                    confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                    confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                    filled = true;
                }
            }
        } 
        else if (platform.key === 'netlify') {
            const projectNameCode = modal.querySelector(platform.selectors.projectNameCode);
            if (projectNameCode) {
                projectName = projectNameCode.textContent.trim();
            }
            
            if (!projectName) {
                projectName = extractProjectName(platform);
            }
            
            if (projectName) {
                const projectNameInput = modal.querySelector(platform.selectors.projectNameInput);
                if (projectNameInput && !projectNameInput.value) {
                    projectNameInput.value = projectName;
                    projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                    projectNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                    filled = true;
                }
            }
        }
        else if (platform.key === 'cloudflare' || platform.key === 'cloudflareWorkers') {
            const projectNameElements = modal.querySelectorAll(platform.selectors.projectNameText);
            if (projectNameElements.length > 0) {
                projectName = projectNameElements[0].textContent.trim();
            }
            
            if (!projectName) {
                projectName = extractProjectName(platform);
            }
            
            if (projectName) {
                const confirmationInput = modal.querySelector(platform.selectors.confirmationInput);
                if (confirmationInput && !confirmationInput.value) {
                    confirmationInput.value = projectName;
                    confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                    confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                    filled = true;
                }
            }
        }

        return filled;
    }

    // Main function to watch for modals
    function watchForDeletionModals() {
        const platform = getCurrentPlatform();
        if (!platform) return;

        // Create observer to watch for modal appearance
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if the added node or its children contain the modal
                            const modal = node.matches && node.matches(platform.selectors.modal) ? 
                                         node : node.querySelector && node.querySelector(platform.selectors.modal);
                            
                            if (modal) {
                                console.log('Modal detected for platform:', platform.key);
                                console.log('Modal HTML:', modal.outerHTML.substring(0, 500) + '...');
                                // Wait a bit for the modal to fully render
                                setTimeout(() => {
                                    const filled = autoFillDeletionFields(platform);
                                    if (filled) {
                                        console.log('DeleteThing: Fields auto-filled successfully');
                                    } else {
                                        console.log('DeleteThing: No fields were filled');
                                    }
                                }, 300);
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also check if modal is already present
        setTimeout(() => {
            autoFillDeletionFields(platform);
        }, 500);
    }

    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', watchForDeletionModals);
    } else {
        watchForDeletionModals();
    }

})();