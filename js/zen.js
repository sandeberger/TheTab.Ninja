/**
 * zen.js - Zen mode functions
 * Handles distraction-free browsing with clock display and search.
 */

// Start zen mode
function startZenMode() {
    zenUserHasScrolled = false;

    updateZenDateTime();
    zenDateTimeInterval = setInterval(updateZenDateTime, 1000);

    zenScrollListener = debounce(handleZenScroll, 50);
    window.addEventListener('scroll', zenScrollListener, { passive: true });

    zenSearchListener = handleZenSearch;
    const searchBox = document.getElementById('searchBox');
    if (searchBox) {
        searchBox.addEventListener('input', zenSearchListener);
    }

    const zenSearchBox = document.getElementById('zenSearchBox');
    if (zenSearchBox) {
        zenSearchBox.addEventListener('input', function(event) {
            const searchValue = event.target.value;
            const mainSearchBox = document.getElementById('searchBox');

            console.log("Zen search input:", searchValue);

            mainSearchBox.value = searchValue;

            if (searchValue.trim().length > 0) {
                console.log("Exiting zen mode and transferring to main search");

                document.body.classList.remove('zen-mode');
                stopZenMode();

                mainSearchBox.dispatchEvent(new Event("input", { bubbles: true }));

                setTimeout(() => {
                    mainSearchBox.focus();
                    mainSearchBox.setSelectionRange(searchValue.length, searchValue.length);
                    console.log("Focused main search box");
                }, 100);
            }
        });

        zenSearchBox.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                const searchTerm = this.value.trim();
                if (searchTerm.startsWith('?') && searchTerm.length > 1) {
                    const googleQuery = searchTerm.substring(1);
                    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;

                    if (bookmarkManagerData.openInNewTab) {
                        window.open(googleUrl, '_blank');
                    } else {
                        window.location.href = googleUrl;
                    }

                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                } else if (searchTerm.startsWith('!') && searchTerm.length > 1) {
                    const chatGptQuery = searchTerm.substring(1);
                    const chatGptUrl = `https://chatgpt.com/?q=${encodeURIComponent(chatGptQuery)}`;

                    if (bookmarkManagerData.openInNewTab) {
                        window.open(chatGptUrl, '_blank');
                    } else {
                        window.location.href = chatGptUrl;
                    }

                    this.value = '';
                    document.body.classList.remove('zen-mode');
                    stopZenMode();
                    event.preventDefault();
                }
            }
        });

        setTimeout(() => {
            zenSearchBox.focus();
            console.log("Zen search box focused");
        }, 200);
    }

    zenKeyboardListener = handleZenKeyboard;
    document.addEventListener('keydown', zenKeyboardListener);

    zenClickListener = handleZenClick;
    document.addEventListener('click', zenClickListener);

    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'flex';
    }
}

// Stop zen mode
function stopZenMode() {
    zenUserHasScrolled = false;

    if (zenDateTimeInterval) {
        clearInterval(zenDateTimeInterval);
        zenDateTimeInterval = null;
    }

    if (zenScrollListener) {
        window.removeEventListener('scroll', zenScrollListener);
        zenScrollListener = null;
    }

    if (zenSearchListener) {
        const searchBox = document.getElementById('searchBox');
        if (searchBox) {
            searchBox.removeEventListener('input', zenSearchListener);
        }

        const zenSearchBox = document.getElementById('zenSearchBox');
        if (zenSearchBox) {
            zenSearchBox.removeEventListener('input', zenSearchListener);
        }

        zenSearchListener = null;
    }

    if (zenKeyboardListener) {
        document.removeEventListener('keydown', zenKeyboardListener);
        zenKeyboardListener = null;
    }

    if (zenClickListener) {
        document.removeEventListener('click', zenClickListener);
        zenClickListener = null;
    }

    const zenDateTime = document.getElementById('zenDateTime');
    if (zenDateTime) {
        zenDateTime.style.display = 'none';
    }

    const collections = document.getElementById('collections');
    if (collections) {
        collections.style.marginTop = '';
    }
    document.body.classList.remove('scrolled', 'searching');
}

// Update zen mode clock display
function updateZenDateTime() {
    const now = new Date();
    const timeElement = document.querySelector('.zen-time');
    const dateElement = document.querySelector('.zen-date');

    if (timeElement && dateElement) {
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };

        timeElement.textContent = now.toLocaleTimeString('sv-SE', timeOptions);
        dateElement.textContent = now.toLocaleDateString('sv-SE', dateOptions);
    }
}

// Handle scroll in zen mode
function handleZenScroll() {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const collections = document.getElementById('collections');

    if (scrollPosition > 50) {
        zenUserHasScrolled = true;
        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('scrolled');
    } else {
        const searchBox = document.getElementById('searchBox');
        const isSearching = searchBox && searchBox.value.trim().length > 0;

        if (document.body.classList.contains('zen-mode') && collections && !isSearching && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
        }

        if (!zenUserHasScrolled) {
            document.body.classList.remove('scrolled');
        }
    }
}

// Handle search in zen mode
function handleZenSearch(event) {
    console.log('handleZenSearch called with value:', event.target.value);
    const searchValue = event.target.value.trim();
    const collections = document.getElementById('collections');
    const mainSearchBox = document.getElementById('searchBox');

    if (searchValue.length > 0) {
        if (mainSearchBox) {
            mainSearchBox.value = searchValue;
        }

        applyFilter(searchValue);

        if (collections) {
            collections.style.marginTop = '0';
        }
        document.body.classList.add('searching');

        if (mainSearchBox) {
            setTimeout(() => {
                mainSearchBox.focus();
            }, 100);
        }
    } else {
        const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
        document.body.classList.remove('searching');

        if (mainSearchBox) {
            mainSearchBox.value = '';
        }

        applyFilter('');

        if (document.body.classList.contains('zen-mode') && scrollPosition <= 50 && collections && !zenUserHasScrolled) {
            collections.style.marginTop = '100vh';
            document.body.classList.remove('scrolled');
        }
    }
}

// Handle keyboard events in zen mode
function handleZenKeyboard(event) {
    if (!document.body.classList.contains('zen-mode')) return;
    console.log("ZEN KEYBOARD EVENT:", event.key);

    const activeElement = document.activeElement;
    const isInInput = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );

    if (event.key === 'Escape') {
        console.log("ESC pressed in zen mode! isSearching:", document.body.classList.contains('searching'), "hasScrolled:", zenUserHasScrolled);
        event.preventDefault();

        const isSearching = document.body.classList.contains('searching');
        const hasScrolled = zenUserHasScrolled;

        if (isSearching || hasScrolled) {
            console.log("ENTERING SCROLL BRANCH! isSearching:", isSearching, "hasScrolled:", hasScrolled);
            const mainSearchBox = document.getElementById('searchBox');
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (mainSearchBox) mainSearchBox.value = '';
            if (zenSearchBox) zenSearchBox.value = '';

            document.body.classList.remove('searching');
            zenUserHasScrolled = false;

            console.log("SCROLLING TO TOP!");

            const collections = document.getElementById("collections");
            if (collections) {
                collections.style.marginTop = "100vh";
                console.log("Set collections marginTop to 100vh");

                document.body.classList.remove('scrolled');
                console.log("Removed scrolled class to show clock");
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });

            setTimeout(() => {
                if (zenSearchBox) {
                    zenSearchBox.focus();
                }
            }, 500);
        } else {
            const zenSearchBox = document.getElementById('zenSearchBox');
            if (zenSearchBox) {
                zenSearchBox.value = '';
                zenSearchBox.focus();
                zenSearchBox.dispatchEvent(new Event('input', { bubbles: true }));
            }

            document.body.classList.remove('searching');
        }
        return;
    }

    const isAlphanumeric = /^[a-zA-Z0-9 #%|]$/.test(event.key);
    if (isAlphanumeric && !isInInput) {
        event.preventDefault();
        const searchBox = getActiveZenSearchBox();
        if (searchBox) {
            searchBox.focus();
            searchBox.value = event.key;
            searchBox.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Handle click events in zen mode (auto-refocus search)
function handleZenClick(event) {
    if (!document.body.classList.contains('zen-mode')) return;

    const target = event.target;

    const interactiveElements = [
        'INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT', 'OPTION'
    ];

    let element = target;
    let isInteractive = false;

    while (element && element !== document.body) {
        if (interactiveElements.includes(element.tagName) ||
            element.isContentEditable ||
            element.classList.contains('pane-toggle') ||
            element.classList.contains('collection-button')) {
            isInteractive = true;
            break;
        }
        element = element.parentElement;
    }

    if (!isInteractive) {
        setTimeout(() => {
            const searchBox = getActiveZenSearchBox();
            if (searchBox) {
                searchBox.focus();
            }
        }, 10);
    }
}

// Get the appropriate search box for current zen state
function getActiveZenSearchBox() {
    const isScrolled = document.body.classList.contains('scrolled') ||
                      document.body.classList.contains('searching');

    if (isScrolled) {
        return document.getElementById('searchBox');
    } else {
        return document.getElementById('zenSearchBox');
    }
}

// Clear zen search and maintain focus
function clearZenSearch() {
    const searchBox = getActiveZenSearchBox();
    if (searchBox) {
        searchBox.value = '';
        searchBox.focus();
        searchBox.dispatchEvent(new Event('input', { bubbles: true }));
    }

    document.body.classList.remove('searching');
}
