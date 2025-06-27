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
            deleteButton: 'button[data-test-selector="repo-delete-button"]',
            firstConfirmButton: 'button[data-next-stage="2"]',
            secondConfirmButton: 'button[data-next-stage="3"]',
            confirmationInput: 'input[data-test-selector="repo-delete-proceed-confirmation"]',
            finalDeleteButton: 'button[type="submit"][data-test-selector="repo-delete-proceed-button"]',
            modal: 'dialog[id="repo-delete-menu-dialog"]',
            // Additional selectors for better detection
            anyButtonWithText: 'button',
            anyInput: 'input[type="text"]'
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

    // Handle GitHub deletion process (3-step process)
    function handleGitHubDeletion() {
        const platform = githubPlatform;
        let handled = false;

        console.log('DeleteThing: Checking GitHub deletion steps...');

        // Step 1: Click "I want to delete this repository" button
        const firstConfirmButton = document.querySelector(platform.selectors.firstConfirmButton);
        if (firstConfirmButton && firstConfirmButton.textContent.includes('I want to delete this repository')) {
            console.log('DeleteThing: Step 1 - Clicking "I want to delete this repository"');
            firstConfirmButton.click();
            handled = true;
            return;
        }

        // Step 2: Click "I have read and understand these effects" button
        const secondConfirmButton = document.querySelector(platform.selectors.secondConfirmButton);
        if (secondConfirmButton && secondConfirmButton.textContent.includes('I have read and understand these effects')) {
            console.log('DeleteThing: Step 2 - Clicking "I have read and understand these effects"');
            secondConfirmButton.click();
            handled = true;
            return;
        }

        // Alternative approach for Step 2: Look for any button with the text
        if (!handled) {
            const allButtons = document.querySelectorAll(platform.selectors.anyButtonWithText);
            for (const button of allButtons) {
                if (button.textContent.includes('I have read and understand these effects')) {
                    console.log('DeleteThing: Step 2 - Found button with alternative method');
                    button.click();
                    handled = true;
                    return;
                }
            }
        }

        // Step 3: Auto-fill the confirmation input field
        const confirmationInput = document.querySelector(platform.selectors.confirmationInput);
        if (confirmationInput && !confirmationInput.value) {
            // Extract repository name from URL or page
            let repoName = null;
            
            // Try to get from URL first
            const urlParts = window.location.pathname.split('/');
            if (urlParts.length >= 3) {
                repoName = `${urlParts[1]}/${urlParts[2]}`; // username/reponame
            }
            
            // If not found in URL, try to get from the page content
            if (!repoName) {
                const titleElement = document.querySelector('h1.Overlay-title');
                if (titleElement) {
                    const titleText = titleElement.textContent.trim();
                    const match = titleText.match(/Delete (.+)/);
                    if (match) {
                        repoName = match[1];
                    }
                }
            }

            // Alternative: Look for any text input that might be the confirmation field
            if (!repoName) {
                const allInputs = document.querySelectorAll(platform.selectors.anyInput);
                for (const input of allInputs) {
                    if (input.placeholder && input.placeholder.includes('repository')) {
                        // This might be our confirmation input
                        if (!input.value) {
                            // Try to get repo name from nearby elements
                            const parent = input.closest('div');
                            if (parent) {
                                const textElements = parent.querySelectorAll('*');
                                for (const element of textElements) {
                                    if (element.textContent && element.textContent.includes('/')) {
                                        const match = element.textContent.match(/([^\/]+\/[^\/\s]+)/);
                                        if (match) {
                                            repoName = match[1];
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if (repoName) {
                console.log('DeleteThing: Step 3 - Auto-filling confirmation field with:', repoName);
                
                // Focus the input first
                confirmationInput.focus();
                
                // Clear any existing value
                confirmationInput.value = '';
                confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Simulate typing the repository name character by character
                let currentText = '';
                const typeInterval = setInterval(() => {
                    if (currentText.length < repoName.length) {
                        currentText += repoName[currentText.length];
                        confirmationInput.value = currentText;
                        
                        // Dispatch multiple events to simulate real typing
                        confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                        confirmationInput.dispatchEvent(new Event('keydown', { bubbles: true, key: repoName[currentText.length - 1] }));
                        confirmationInput.dispatchEvent(new Event('keypress', { bubbles: true, key: repoName[currentText.length - 1] }));
                        confirmationInput.dispatchEvent(new Event('keyup', { bubbles: true, key: repoName[currentText.length - 1] }));
                        confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                    } else {
                        clearInterval(typeInterval);
                        
                        // Final events to ensure validation is triggered
                        confirmationInput.dispatchEvent(new Event('input', { bubbles: true }));
                        confirmationInput.dispatchEvent(new Event('change', { bubbles: true }));
                        confirmationInput.dispatchEvent(new Event('blur', { bubbles: true }));
                        confirmationInput.dispatchEvent(new Event('focus', { bubbles: true }));
                        
                        console.log('DeleteThing: Step 3 - Completed typing simulation');
                    }
                }, 50); // Type each character with 50ms delay
                
                handled = true;
            } else {
                console.log('DeleteThing: Could not find repository name for confirmation');
            }
        }

        // If we found a confirmation input but couldn't fill it, try alternative approach
        if (!handled) {
            const allInputs = document.querySelectorAll('input[type="text"]');
            for (const input of allInputs) {
                if (input.placeholder && input.placeholder.includes('repository') && !input.value) {
                    const urlParts = window.location.pathname.split('/');
                    if (urlParts.length >= 3) {
                        const repoName = `${urlParts[1]}/${urlParts[2]}`;
                        console.log('DeleteThing: Step 3 - Auto-filling alternative input with:', repoName);
                        input.value = repoName;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        handled = true;
                        break;
                    }
                }
            }
        }

        return handled;
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

    // Main function to watch for modals and GitHub deletion process
    function watchForDeletionModals() {
        const platform = getCurrentPlatform();
        if (!platform) return;

        console.log('DeleteThing: Platform detected:', platform.key);

        if (platform.key === 'github') {
            // For GitHub, we need to watch for the deletion dialog and handle the 3-step process
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // Element node
                                // Check if the added node or its children contain the GitHub deletion dialog
                                const modal = node.matches && node.matches(githubPlatform.selectors.modal) ? 
                                             node : node.querySelector && node.querySelector(githubPlatform.selectors.modal);
                                
                                if (modal) {
                                    console.log('DeleteThing: GitHub deletion dialog detected');
                                    // Wait a bit for the dialog to fully render
                                    setTimeout(() => {
                                        handleGitHubDeletion();
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
                handleGitHubDeletion();
            }, 500);

            // Set up periodic checks for GitHub deletion process
            let checkCount = 0;
            const maxChecks = 20; // Check for 10 seconds (20 * 500ms)
            const checkInterval = setInterval(() => {
                checkCount++;
                const handled = handleGitHubDeletion();
                
                // Stop checking if we've handled something or reached max checks
                if (handled || checkCount >= maxChecks) {
                    clearInterval(checkInterval);
                    if (checkCount >= maxChecks) {
                        console.log('DeleteThing: Stopped checking GitHub deletion after max attempts');
                    }
                }
            }, 500);

            return;
        }

        // For other platforms, use the existing modal detection logic
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === 1) { // Element node
                            // Check if the added node or its children contain the modal
                            const modal = node.matches && node.matches(platform.selectors.modal) ? 
                                         node : node.querySelector && node.querySelector(platform.selectors.modal);
                            
                            if (modal) {
                                console.log('DeleteThing: Modal detected for platform:', platform.key);
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