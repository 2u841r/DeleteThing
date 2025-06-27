// DeleteThing - Content Script
(function() {
    'use strict';

    // Vercel Platform Configuration
    const vercelPlatform = {
        domain: 'vercel.com',
        urlPattern: /vercel\.com\/[^\/]+\/[^\/]+\/settings/,
        selectors: {
            modal: '[data-geist-modal-body]',
            projectNameInput: 'input[name="resourceName"]',
            confirmationInput: 'input[name="verificationText"]',
            projectNameText: 'b[style*="overflow-wrap"]'
        },
        confirmationText: 'delete my project'
    };

    // Netlify Platform Configuration
    const netlifyPlatform = {
        domain: 'app.netlify.com',
        urlPattern: /app\.netlify\.com\/projects\/[^\/]+\/configuration\/general/,
        selectors: {
            modal: '.modal-content',
            projectNameInput: 'input[name="Name"]',
            projectNameCode: 'code'
        }
    };

    // Cloudflare Platform Configuration
    const cloudflarePlatform = {
        domain: 'dash.cloudflare.com',
        urlPattern: /dash\.cloudflare\.com\/[^\/]+\/pages\/view\/[^\/]+\/settings\/production/,
        selectors: {
            modal: 'form',
            confirmationInput: 'input[data-testid="deletionChallenge"]',
            projectNameText: 'strong span'
        }
    };

    // Cloudflare Workers Platform Configuration
    const cloudflareWorkersPlatform = {
        domain: 'dash.cloudflare.com',
        urlPattern: /dash\.cloudflare\.com\/[^\/]+\/workers\/services\/view\/[^\/]+\/production\/settings/,
        selectors: {
            modal: 'form',
            confirmationInput: 'input[data-testid="deletionChallenge"]',
            projectNameText: 'strong span'
        }
    };

    // GitHub Platform Configuration
    const githubPlatform = {
        domain: 'github.com',
        urlPattern: /github\.com\/[^\/]+\/[^\/]+\/settings/,
        selectors: {
            modal: 'dialog[id="repo-delete-menu-dialog"]',
            firstConfirmButton: 'button[data-next-stage="2"]',
            secondConfirmButton: 'button[data-next-stage="3"]',
            confirmationInput: 'input[data-test-selector="repo-delete-proceed-confirmation"]',
            finalDeleteButton: 'button[data-test-selector="repo-delete-proceed-button"]'
        }
    };

    // Configuration for different platforms
    const platforms = {
        vercel: vercelPlatform,
        netlify: netlifyPlatform,
        cloudflare: cloudflarePlatform,
        cloudflareWorkers: cloudflareWorkersPlatform,
        github: githubPlatform
    };

    // Global state to track observers and prevent duplicates
    let currentObserver = null;
    let isInitialized = false;
    let githubCheckInterval = null;

    // Auto-fill deletion fields for Vercel
    function autoFillVercelFields(modal) {
        let projectName = null;
        let filled = false;

        // Extract project name from DOM elements
        const projectNameElement = modal.querySelector(vercelPlatform.selectors.projectNameText);
        if (projectNameElement) {
            projectName = projectNameElement.textContent.trim();
        }
        
        if (projectName) {
            const projectNameInput = modal.querySelector(vercelPlatform.selectors.projectNameInput);
            const confirmationInput = modal.querySelector(vercelPlatform.selectors.confirmationInput);
            
            if (projectNameInput && !projectNameInput.value) {
                projectNameInput.value = projectName;
                projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                projectNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                filled = true;
            }
            
            if (confirmationInput && !confirmationInput.value) {
                confirmationInput.value = vercelPlatform.confirmationText;
                confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                filled = true;
            }
        }

        return filled;
    }

    // Auto-fill deletion fields for Netlify
    function autoFillNetlifyFields(modal) {
        let projectName = null;
        let filled = false;

        // Extract project name from DOM elements
        const projectNameCode = modal.querySelector(netlifyPlatform.selectors.projectNameCode);
        if (projectNameCode) {
            projectName = projectNameCode.textContent.trim();
        }
        
        if (!projectName) {
            // Try to get from URL
            const urlParts = window.location.pathname.split('/');
            projectName = urlParts[2]; // /projects/project-name/configuration/general
        }
        
        if (projectName) {
            const projectNameInput = modal.querySelector(netlifyPlatform.selectors.projectNameInput);
            if (projectNameInput && !projectNameInput.value) {
                projectNameInput.value = projectName;
                projectNameInput.dispatchEvent(new Event('input', { bubbles: true }));
                projectNameInput.dispatchEvent(new Event('change', { bubbles: true }));
                filled = true;
            }
        }

        return filled;
    }

    // Auto-fill deletion fields for Cloudflare (Pages and Workers)
    function autoFillCloudflareFields(modal, platform) {
        let projectName = null;
        let filled = false;

        // Extract project name from DOM elements
        const projectNameElements = modal.querySelectorAll(platform.selectors.projectNameText);
        if (projectNameElements.length > 0) {
            projectName = projectNameElements[0].textContent.trim();
        }
        
        if (!projectName) {
            // Try to extract from URL based on platform type
            const urlParts = window.location.pathname.split('/');
            if (platform === cloudflarePlatform) {
                projectName = urlParts[4]; // /account/pages/view/project-name/settings/production
            } else if (platform === cloudflareWorkersPlatform) {
                projectName = urlParts[5]; // /account/workers/services/view/worker-name/production/settings
            }
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

        return filled;
    }

    // Handle GitHub deletion process
    function handleGitHubDeletion() {
        const modal = document.querySelector(githubPlatform.selectors.modal);
        if (!modal || !modal.hasAttribute('open')) return false;

        console.log('DeleteThing: Checking GitHub deletion steps...');

        // Step 1: Auto-click "I want to delete this repository" button
        const firstConfirmButton = modal.querySelector(githubPlatform.selectors.firstConfirmButton);
        if (firstConfirmButton && firstConfirmButton.textContent.includes('I want to delete this repository')) {
            console.log('DeleteThing: Step 1 - Auto-clicking "I want to delete this repository"');
            setTimeout(() => {
                firstConfirmButton.click();
            }, 100);
            return true;
        }

        // Step 2: Auto-click "I have read and understand these effects" button
        const secondConfirmButton = modal.querySelector(githubPlatform.selectors.secondConfirmButton);
        if (secondConfirmButton && secondConfirmButton.textContent.includes('I have read and understand these effects')) {
            console.log('DeleteThing: Step 2 - Auto-clicking "I have read and understand these effects"');
            setTimeout(() => {
                secondConfirmButton.click();
            }, 100);
            return true;
        }

        // Step 3: Auto-fill the confirmation input field
        const confirmationInput = modal.querySelector(githubPlatform.selectors.confirmationInput);
        if (confirmationInput && !confirmationInput.value) {
            // Get repository name from the data attribute or URL
            let repoName = confirmationInput.getAttribute('data-repo-nwo');
            
            if (!repoName) {
                // Fallback: get from URL
                const urlParts = window.location.pathname.split('/');
                if (urlParts.length >= 3) {
                    repoName = `${urlParts[1]}/${urlParts[2]}`;
                }
            }

            if (!repoName) {
                // Fallback: get from dialog title
                const titleElement = modal.querySelector('#repo-delete-menu-dialog-title');
                if (titleElement) {
                    const titleText = titleElement.textContent.trim();
                    const match = titleText.match(/Delete (.+)/);
                    if (match) {
                        repoName = match[1];
                    }
                }
            }

            if (repoName) {
                console.log('DeleteThing: Step 3 - Auto-filling confirmation field with:', repoName);
                
                // Clear any existing focus to avoid autofocus blocking
                if (document.activeElement) {
                    document.activeElement.blur();
                }
                
                // Wait a bit then focus and fill
                setTimeout(() => {
                    confirmationInput.focus();
                    confirmationInput.value = repoName;
                    
                    // Dispatch events to trigger validation
                    confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                    confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                    confirmationInput.dispatchEvent(new Event('keyup', { bubbles: true }));
                    
                    // Additional validation trigger
                    setTimeout(() => {
                        confirmationInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        setTimeout(() => {
                            confirmationInput.dispatchEvent(new Event('focus', { bubbles: true }));
                        }, 50);
                    }, 100);
                }, 200);
                
                return true;
            } else {
                console.log('DeleteThing: Could not determine repository name');
            }
        }

        return false;
    }

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

    // Auto-fill deletion fields based on platform
    function autoFillDeletionFields(platform) {
        if (platform.key === 'github') {
            return handleGitHubDeletion();
        }

        const modal = document.querySelector(platform.selectors.modal);
        if (!modal) return false;

        switch (platform.key) {
            case 'vercel':
                return autoFillVercelFields(modal);
            case 'netlify':
                return autoFillNetlifyFields(modal);
            case 'cloudflare':
            case 'cloudflareWorkers':
                return autoFillCloudflareFields(modal, platform);
            default:
                return false;
        }
    }

    // Clean up existing observers and intervals
    function cleanup() {
        if (currentObserver) {
            currentObserver.disconnect();
            currentObserver = null;
        }
        if (githubCheckInterval) {
            clearInterval(githubCheckInterval);
            githubCheckInterval = null;
        }
        isInitialized = false;
    }

    // Main function to watch for modals and GitHub deletion process
    function watchForDeletionModals() {
        // Clean up any existing observers first
        cleanup();

        const platform = getCurrentPlatform();
        if (!platform) return;

        console.log('DeleteThing: Platform detected:', platform.key);
        isInitialized = true;

        if (platform.key === 'github') {
            // For GitHub, watch for the deletion dialog
            currentObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) {
                                // Check if the GitHub deletion dialog appeared or was modified
                                const modal = node.matches && node.matches(githubPlatform.selectors.modal) ? 
                                             node : node.querySelector && node.querySelector(githubPlatform.selectors.modal);
                                
                                if (modal) {
                                    console.log('DeleteThing: GitHub deletion dialog detected');
                                    setTimeout(() => {
                                        handleGitHubDeletion();
                                    }, 500);
                                }
                            }
                        });
                    }
                });
            });

            // Start observing with comprehensive options
            currentObserver.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Set up periodic checks when dialog is open
            githubCheckInterval = setInterval(() => {
                const modal = document.querySelector(githubPlatform.selectors.modal);
                if (modal && modal.hasAttribute('open')) {
                    handleGitHubDeletion();
                }
            }, 300);

            return;
        }

        // For other platforms, use the existing modal detection logic
        currentObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) {
                            const modal = node.matches && node.matches(platform.selectors.modal) ? 
                                         node : node.querySelector && node.querySelector(platform.selectors.modal);
                            
                            if (modal) {
                                console.log('DeleteThing: Modal detected for platform:', platform.key);
                                setTimeout(() => {
                                    const filled = autoFillDeletionFields(platform);
                                    if (filled) {
                                        console.log('DeleteThing: Fields auto-filled successfully');
                                    }
                                }, 300);
                            }
                        }
                    });
                }
            });
        });

        currentObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Also check if modal is already present
        setTimeout(() => {
            autoFillDeletionFields(platform);
        }, 500);
    }

    // Initialize the script
    function initialize() {
        console.log('DeleteThing: Initializing...');
        watchForDeletionModals();
    }

    // Handle both initial load and navigation changes
    function handlePageChange() {
        // Wait a bit for the page to settle after navigation
        setTimeout(() => {
            if (!isInitialized || getCurrentPlatform()) {
                initialize();
            }
        }, 1000);
    }

    // Listen for various page change events
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Listen for GitHub's Turbo navigation events
    document.addEventListener('turbo:load', handlePageChange);
    document.addEventListener('turbo:render', handlePageChange);
    
    // Listen for general navigation events
    window.addEventListener('popstate', handlePageChange);
    
    // Also listen for focus changes that might indicate navigation
    let lastUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            handlePageChange();
        }
    }, 1000);

})();